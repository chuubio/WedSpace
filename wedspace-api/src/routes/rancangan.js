const express = require('express');
const { z } = require('zod');
const { Op } = require('sequelize');
const { sequelize, Design, DesignItem, Design3DElement, DesignStructure, DesignNote, Decoration, Project, User, Model3DLibrary } = require('../models');
const { authWajib } = require('../middleware/auth');
const { getUserPlan } = require('../services/subscription');
const { batasPaket } = require('../config/subscription');
const { buatPdfRancangan } = require('../services/pdf');
const { bisaMenggunakanDekorasi, namaKontributor } = require('../services/dekorasiAuth');
const { ambilKatalogUntukGemini, buatAksiAiWorkspace } = require('../services/gemini');

const router = express.Router();

function includeRancanganLengkap() {
  return [
    {
      model: DesignItem,
      include: [{
        model: Decoration,
        include: [
          { model: User, attributes: ['id', 'nama'] },
          { model: Model3DLibrary },
        ],
      }],
    },
    { model: Design3DElement },
    { model: DesignStructure },
    { model: DesignNote },
    { model: Project },
  ];
}

async function muatRancangan(req, res, next) {
  const rancangan = await Design.findByPk(req.params.id, {
    include: includeRancanganLengkap(),
  });
  if (!rancangan) {
    return res.status(404).json({ pesan: 'Rancangan tidak ditemukan.' });
  }
  if (req.user.role !== 'admin' && rancangan.Project.user_id !== req.user.id) {
    return res.status(403).json({ pesan: 'Kamu tidak punya akses ke rancangan ini.' });
  }
  req.rancangan = rancangan;
  return next();
}

router.get('/:id', authWajib, muatRancangan, async (req, res) => {
  const polos = req.rancangan.toJSON();
  return res.json({
    data: {
      ...polos,
      proyek: polos.Project,
    },
  });
});

router.put('/:id', authWajib, muatRancangan, async (req, res) => {
  const skema = z.object({
    nama_rancangan: z.string().min(1, 'Nama rancangan wajib diisi').optional(),
    item: z.array(z.object({
      id: z.coerce.number().int().positive().optional(),
      decoration_id: z.coerce.number().int().positive('decoration_id tidak valid'),
      posisi_x: z.coerce.number(),
      posisi_y: z.coerce.number(),
      rotasi: z.coerce.number().optional().default(0),
      jumlah: z.coerce.number().int().positive('Jumlah minimal 1').optional().default(1),
    })).optional(),
  });
  const parsed = skema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ pesan: parsed.error.issues[0].message });
  }

  // Bedakan antara field `item` tidak dikirim (undefined) vs dikirim array kosong ([])
  const adaFieldItem = parsed.data.item !== undefined;
  let itemsToUpdate = [];
  let itemsToCreate = [];
  let keptExistingIds = [];

  if (adaFieldItem) {
    // Muat item lama untuk mempertahankan identitas DesignItem & harga_satuan_snapshot
    const existingDesignItems = await DesignItem.findAll({
      where: { design_id: req.rancangan.id },
    });
    const existingMap = new Map(existingDesignItems.map((di) => [di.id, di]));

    // Validasi kepemilikan & keunikan ID DesignItem yang dikirim client
    const seenIds = new Set();
    for (const i of parsed.data.item) {
      if (i.id !== undefined) {
        if (!existingMap.has(i.id)) {
          return res.status(400).json({
            pesan: `DesignItem dengan ID ${i.id} tidak ditemukan pada rancangan ini.`,
          });
        }
        if (seenIds.has(i.id)) {
          return res.status(400).json({
            pesan: `DesignItem dengan ID ${i.id} terduplikasi dalam payload.`,
          });
        }
        seenIds.add(i.id);
      }
    }

    // Validasi dekorasi yang digunakan
    let dekorasiMap = new Map();
    if (parsed.data.item.length > 0) {
      const decorationIds = [...new Set(parsed.data.item.map((i) => i.decoration_id))];
      const dekorasiList = await Decoration.findAll({
        where: { id: { [Op.in]: decorationIds } },
      });
      dekorasiMap = new Map(dekorasiList.map((d) => [d.id, d]));

      for (const i of parsed.data.item) {
        const d = dekorasiMap.get(i.decoration_id);
        if (!d) {
          return res.status(400).json({ pesan: `Dekorasi dengan ID ${i.decoration_id} tidak ditemukan.` });
        }

        // Jika item lama tetap menggunakan decoration_id yang sama, izinkan agar rancangan lama tetap dapat disimpan
        // meskipun pemilik dekorasi kemudian menonaktifkan atau menjadikannya privat.
        const oldItem = i.id ? existingMap.get(i.id) : null;
        const dekorasiSamaDenganLama = Boolean(oldItem && oldItem.decoration_id === i.decoration_id);

        if (!dekorasiSamaDenganLama && !bisaMenggunakanDekorasi(req.user, d)) {
          if (!d.is_active) {
            return res.status(400).json({
              pesan: `Dekorasi "${d.nama_dekorasi}" sudah tidak aktif dan tidak dapat digunakan dalam rancangan.`,
            });
          }
          return res.status(403).json({
            pesan: `Dekorasi "${d.nama_dekorasi}" bersifat privat dan tidak dapat digunakan dalam rancangan.`,
          });
        }
      }
    }

    // Pisahkan item lama (diperbarui in-place agar ID & snapshot stabil) vs item baru (buat snapshot harga terkini)
    for (const i of parsed.data.item) {
      if (i.id && existingMap.has(i.id)) {
        const oldItem = existingMap.get(i.id);
        let snapshot = oldItem.harga_satuan_snapshot;
        if (oldItem.decoration_id !== i.decoration_id || snapshot === null || snapshot === undefined) {
          snapshot = Number(dekorasiMap.get(i.decoration_id)?.harga || 0);
        }
        keptExistingIds.push(oldItem.id);
        itemsToUpdate.push({
          instance: oldItem,
          values: {
            decoration_id: i.decoration_id,
            posisi_x: i.posisi_x,
            posisi_y: i.posisi_y,
            rotasi: i.rotasi,
            jumlah: i.jumlah,
            harga_satuan_snapshot: snapshot,
          },
        });
      } else {
        itemsToCreate.push({
          design_id: req.rancangan.id,
          decoration_id: i.decoration_id,
          posisi_x: i.posisi_x,
          posisi_y: i.posisi_y,
          rotasi: i.rotasi,
          jumlah: i.jumlah,
          harga_satuan_snapshot: Number(dekorasiMap.get(i.decoration_id)?.harga || 0),
        });
      }
    }
  }

  try {
    await sequelize.transaction(async (t) => {
      if (parsed.data.nama_rancangan) {
        await req.rancangan.update({ nama_rancangan: parsed.data.nama_rancangan }, { transaction: t });
      }

      if (adaFieldItem) {
        // 1. Hapus hanya item yang tidak lagi ada di payload
        const whereDelete = keptExistingIds.length > 0
          ? { design_id: req.rancangan.id, id: { [Op.notIn]: keptExistingIds } }
          : { design_id: req.rancangan.id };
        await DesignItem.destroy({ where: whereDelete, transaction: t });

        // 2. Perbarui item lama secara in-place (mempertahankan ID & harga_satuan_snapshot)
        for (const itemUpd of itemsToUpdate) {
          await itemUpd.instance.update(itemUpd.values, { transaction: t });
        }

        // 3. Tambahkan item baru dengan snapshot harga katalog terkini
        if (itemsToCreate.length > 0) {
          await DesignItem.bulkCreate(itemsToCreate, { transaction: t });
        }
      }
    });
  } catch (err) {
    return res.status(500).json({
      pesan: 'Gagal menyimpan rancangan. Seluruh perubahan dibatalkan.',
      detail: err.message,
    });
  }

  const segar = await Design.findByPk(req.rancangan.id, {
    include: includeRancanganLengkap(),
  });
  const segarPolos = segar.toJSON();
  return res.json({
    data: {
      ...segarPolos,
      proyek: segarPolos.Project,
    },
  });
});

// =========================================================================
// SCENE 3D PERSISTENCE (WORKSPACE 3D: ITEMS + WALLS/DOORS/SHAPES + SETTINGS)
// =========================================================================

router.get('/:id/scene3d', authWajib, muatRancangan, async (req, res) => {
  const polos = req.rancangan.toJSON();
  return res.json({
    data: {
      ...polos,
      proyek: polos.Project,
      scene_3d_settings: polos.scene_3d_settings || {
        floor: { color: '#EDE4D8', roughness: 0.65, texturePreset: 'none', textureScale: 1, textureRotation: 0 },
        lighting: { preset: 'day', ambientIntensity: 0.85, directionalIntensity: 1.2, shadowsEnabled: true },
        quality: 'high',
      },
    },
  });
});

router.put('/:id/scene3d', authWajib, muatRancangan, async (req, res) => {
  const skemaElement = z.object({
    id: z.union([z.coerce.number().int().positive(), z.string()]).optional(),
    temp_id: z.string().optional(),
    parent_id: z.union([z.coerce.number().int().positive(), z.string(), z.null()]).optional(),
    element_type: z.enum(['wall', 'door', 'window', 'ceiling', 'primitive']),
    name: z.string().min(1).max(120).default('Elemen 3D'),
    geometry_data: z.record(z.string(), z.any()).nullable().optional(),
    position_data: z.record(z.string(), z.any()).nullable().optional(),
    rotation_data: z.record(z.string(), z.any()).nullable().optional(),
    scale_data: z.record(z.string(), z.any()).nullable().optional(),
    material_data: z.record(z.string(), z.any()).nullable().optional(),
    is_visible: z.coerce.boolean().optional().default(true),
    is_locked: z.coerce.boolean().optional().default(false),
    sort_order: z.coerce.number().int().optional().default(0),
  });

  const skemaItem3d = z.object({
    id: z.coerce.number().int().positive().optional(),
    decoration_id: z.coerce.number().int().positive(),
    posisi_x: z.coerce.number(),
    posisi_y: z.coerce.number(),
    rotasi: z.coerce.number().optional().default(0),
    jumlah: z.coerce.number().int().positive().optional().default(1),
    transform_3d: z.record(z.string(), z.any()).nullable().optional(),
  });

  const skema = z.object({
    scene_3d_settings: z.record(z.string(), z.any()).nullable().optional(),
    elements: z.array(skemaElement).optional(),
    items: z.array(skemaItem3d).optional(),
  });

  const parsed = skema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ pesan: parsed.error.issues[0].message });
  }

  // Validasi items dekorasi jika dikirim
  let itemsToUpdate = [];
  let itemsToCreate = [];
  let keptItemIds = [];

  if (parsed.data.items !== undefined) {
    const existingItems = await DesignItem.findAll({ where: { design_id: req.rancangan.id } });
    const existingItemMap = new Map(existingItems.map((i) => [i.id, i]));

    const decIds = [...new Set(parsed.data.items.map((i) => i.decoration_id))];
    const decList = decIds.length > 0 ? await Decoration.findAll({ where: { id: { [Op.in]: decIds } } }) : [];
    const decMap = new Map(decList.map((d) => [d.id, d]));

    for (const i of parsed.data.items) {
      if (i.id !== undefined && !existingItemMap.has(i.id)) {
        return res.status(400).json({ pesan: `DesignItem ID ${i.id} tidak ditemukan pada rancangan ini.` });
      }
      const d = decMap.get(i.decoration_id);
      if (!d) {
        return res.status(400).json({ pesan: `Dekorasi ID ${i.decoration_id} tidak ditemukan.` });
      }
      const oldItem = i.id ? existingItemMap.get(i.id) : null;
      const sama = Boolean(oldItem && oldItem.decoration_id === i.decoration_id);
      if (!sama && !bisaMenggunakanDekorasi(req.user, d)) {
        return res.status(d.is_active ? 403 : 400).json({
          pesan: `Dekorasi "${d.nama_dekorasi}" tidak dapat digunakan dalam rancangan.`,
        });
      }

      if (oldItem) {
        keptItemIds.push(oldItem.id);
        let snap = oldItem.harga_satuan_snapshot;
        if (!sama || snap === null || snap === undefined) snap = Number(d.harga || 0);
        itemsToUpdate.push({
          instance: oldItem,
          values: {
            decoration_id: i.decoration_id,
            posisi_x: i.posisi_x,
            posisi_y: i.posisi_y,
            rotasi: i.rotasi,
            jumlah: i.jumlah,
            harga_satuan_snapshot: snap,
            transform_3d: i.transform_3d ?? oldItem.transform_3d ?? null,
          },
        });
      } else {
        itemsToCreate.push({
          design_id: req.rancangan.id,
          decoration_id: i.decoration_id,
          posisi_x: i.posisi_x,
          posisi_y: i.posisi_y,
          rotasi: i.rotasi,
          jumlah: i.jumlah,
          harga_satuan_snapshot: Number(d.harga || 0),
          transform_3d: i.transform_3d ?? null,
        });
      }
    }
  }

  try {
    await sequelize.transaction(async (t) => {
      if (parsed.data.scene_3d_settings !== undefined) {
        await req.rancangan.update({ scene_3d_settings: parsed.data.scene_3d_settings }, { transaction: t });
      }

      // Sinkronisasi DesignItems (shared 2D & 3D)
      if (parsed.data.items !== undefined) {
        const whereDel = keptItemIds.length > 0
          ? { design_id: req.rancangan.id, id: { [Op.notIn]: keptItemIds } }
          : { design_id: req.rancangan.id };
        await DesignItem.destroy({ where: whereDel, transaction: t });
        for (const u of itemsToUpdate) {
          await u.instance.update(u.values, { transaction: t });
        }
        if (itemsToCreate.length > 0) {
          await DesignItem.bulkCreate(itemsToCreate, { transaction: t });
        }
      }

      // Sinkronisasi Design3DElements (walls, ceiling, primitives terlebih dahulu, lalu doors/windows ber-parent_id)
      if (parsed.data.elements !== undefined) {
        const existingEls = await Design3DElement.findAll({
          where: { design_id: req.rancangan.id },
          transaction: t,
        });
        const existingElMap = new Map(existingEls.map((e) => [e.id, e]));

        const hostElements = parsed.data.elements.filter((e) => !['door', 'window'].includes(e.element_type));
        const childElements = parsed.data.elements.filter((e) => ['door', 'window'].includes(e.element_type));

        const idResolver = new Map(); // client key (numeric id or temp_id) -> real DB id
        const keptElIds = [];

        const upsertElement = async (el, resolvedParentId = null) => {
          const numId = typeof el.id === 'number' ? el.id : (typeof el.id === 'string' && /^\d+$/.test(el.id) ? Number(el.id) : null);
          const payloadEl = {
            design_id: req.rancangan.id,
            parent_id: resolvedParentId,
            element_type: el.element_type,
            name: el.name,
            geometry_data: el.geometry_data || null,
            position_data: el.position_data || null,
            rotation_data: el.rotation_data || null,
            scale_data: el.scale_data || null,
            material_data: el.material_data || null,
            is_visible: el.is_visible !== false,
            is_locked: Boolean(el.is_locked),
            sort_order: Number(el.sort_order || 0),
          };

          let saved;
          if (numId && existingElMap.has(numId)) {
            saved = await existingElMap.get(numId).update(payloadEl, { transaction: t });
          } else {
            saved = await Design3DElement.create(payloadEl, { transaction: t });
          }
          keptElIds.push(saved.id);
          if (el.id !== undefined) idResolver.set(String(el.id), saved.id);
          if (el.temp_id) idResolver.set(String(el.temp_id), saved.id);
          return saved;
        };

        for (const host of hostElements) {
          await upsertElement(host, null);
        }

        for (const child of childElements) {
          const rawParent = child.parent_id !== null && child.parent_id !== undefined ? String(child.parent_id) : null;
          // Hanya izinkan parent_id yang masih ada di daftar hostElements aktif (idResolver)
          const resolvedParent = rawParent ? (idResolver.get(rawParent) || null) : null;
          if (!resolvedParent) continue; // Cegah pintu/jendela yatim tanpa tembok induk
          await upsertElement(child, resolvedParent);
        }

        const whereDelEl = keptElIds.length > 0
          ? { design_id: req.rancangan.id, id: { [Op.notIn]: keptElIds } }
          : { design_id: req.rancangan.id };
        await Design3DElement.destroy({ where: whereDelEl, transaction: t });
      }
    });
  } catch (err) {
    return res.status(500).json({
      pesan: 'Gagal menyimpan scene 3D. Seluruh perubahan dibatalkan.',
      detail: err.message,
    });
  }

  const segar = await Design.findByPk(req.rancangan.id, {
    include: includeRancanganLengkap(),
  });
  const segarPolos = segar.toJSON();
  return res.json({
    data: {
      ...segarPolos,
      proyek: segarPolos.Project,
    },
  });
});

// =========================================================================
// STRUKTUR RUANGAN (TEMBOK, PINTU, JENDELA) UNTUK WORKSPACE 2D & 3D
// =========================================================================

const skemaStruktur = z.object({
  tipe: z.enum(['wall', 'door', 'window']).default('wall'),
  label: z.string().min(1).max(120).optional(),
  posisi_x: z.coerce.number().default(0),
  posisi_y: z.coerce.number().default(0),
  panjang: z.coerce.number().positive('Panjang struktur harus lebih dari 0').default(300),
  tebal: z.coerce.number().positive('Tebal struktur harus lebih dari 0').default(15),
  tinggi: z.coerce.number().positive('Tinggi struktur harus lebih dari 0').default(300),
  rotasi: z.coerce.number().default(0),
  warna: z.string().max(32).optional(),
});

router.post('/:id/struktur', authWajib, muatRancangan, async (req, res) => {
  const parsed = skemaStruktur.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ pesan: parsed.error.issues[0].message });
  }
  const d = parsed.data;
  const defaultLabel = d.tipe === 'door' ? 'Pintu' : d.tipe === 'window' ? 'Jendela' : 'Tembok';
  const defaultWarna = d.tipe === 'door' ? '#7F1125' : d.tipe === 'window' ? '#D4E4F7' : '#EFE7DD';

  const dibuat = await DesignStructure.create({
    design_id: req.rancangan.id,
    tipe: d.tipe,
    label: d.label || defaultLabel,
    posisi_x: d.posisi_x,
    posisi_y: d.posisi_y,
    panjang: d.panjang,
    tebal: d.tebal,
    tinggi: d.tinggi,
    rotasi: ((Math.round(d.rotasi) % 360) + 360) % 360,
    warna: d.warna || defaultWarna,
  });

  return res.status(201).json({ data: dibuat });
});

router.put('/:id/struktur/:structureId', authWajib, muatRancangan, async (req, res) => {
  const struktur = await DesignStructure.findOne({
    where: { id: req.params.structureId, design_id: req.rancangan.id },
  });
  if (!struktur) {
    return res.status(404).json({ pesan: 'Struktur ruangan tidak ditemukan.' });
  }
  const parsed = skemaStruktur.partial().safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ pesan: parsed.error.issues[0].message });
  }
  const updateData = { ...parsed.data };
  if (updateData.rotasi !== undefined) {
    updateData.rotasi = ((Math.round(updateData.rotasi) % 360) + 360) % 360;
  }
  await struktur.update(updateData);
  return res.json({ data: struktur });
});

router.delete('/:id/struktur/:structureId', authWajib, muatRancangan, async (req, res) => {
  const struktur = await DesignStructure.findOne({
    where: { id: req.params.structureId, design_id: req.rancangan.id },
  });
  if (!struktur) {
    return res.status(404).json({ pesan: 'Struktur ruangan tidak ditemukan.' });
  }
  await struktur.destroy();
  return res.json({ pesan: 'Struktur ruangan dihapus.' });
});

// =========================================================================
// CATATAN WO (NOTES + PIN OPSIONAL DI CANVAS 2D & 3D)
// =========================================================================

const skemaCatatan = z.object({
  judul: z.string().min(1).max(150).optional().default('Catatan WO'),
  isi: z.string().min(1, 'Isi catatan wajib diisi'),
  warna: z.string().max(32).optional().default('#F7E3A8'),
  posisi_x: z.coerce.number().nullable().optional(),
  posisi_y: z.coerce.number().nullable().optional(),
  selesai: z.coerce.boolean().optional().default(false),
});

const skemaUpdateCatatan = z.object({
  judul: z.string().min(1).max(150).optional(),
  isi: z.string().min(1, 'Isi catatan wajib diisi').optional(),
  warna: z.string().max(32).optional(),
  posisi_x: z.coerce.number().nullable().optional(),
  posisi_y: z.coerce.number().nullable().optional(),
  selesai: z.coerce.boolean().optional(),
});

router.get('/:id/catatan', authWajib, muatRancangan, async (req, res) => {
  const daftar = await DesignNote.findAll({
    where: { design_id: req.rancangan.id },
    order: [['id', 'DESC']],
  });
  return res.json({ data: daftar });
});

router.post('/:id/catatan', authWajib, muatRancangan, async (req, res) => {
  const parsed = skemaCatatan.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ pesan: parsed.error.issues[0].message });
  }
  const dibuat = await DesignNote.create({
    design_id: req.rancangan.id,
    judul: parsed.data.judul,
    isi: parsed.data.isi,
    warna: parsed.data.warna,
    posisi_x: parsed.data.posisi_x ?? null,
    posisi_y: parsed.data.posisi_y ?? null,
    selesai: Boolean(parsed.data.selesai),
  });
  return res.status(201).json({ data: dibuat });
});

router.put('/:id/catatan/:noteId', authWajib, muatRancangan, async (req, res) => {
  const catatan = await DesignNote.findOne({
    where: { id: req.params.noteId, design_id: req.rancangan.id },
  });
  if (!catatan) {
    return res.status(404).json({ pesan: 'Catatan tidak ditemukan.' });
  }
  const parsed = skemaUpdateCatatan.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ pesan: parsed.error.issues[0].message });
  }
  await catatan.update(parsed.data);
  return res.json({ data: catatan });
});

router.delete('/:id/catatan/:noteId', authWajib, muatRancangan, async (req, res) => {
  const catatan = await DesignNote.findOne({
    where: { id: req.params.noteId, design_id: req.rancangan.id },
  });
  if (!catatan) {
    return res.status(404).json({ pesan: 'Catatan tidak ditemukan.' });
  }
  await catatan.destroy();
  return res.json({ pesan: 'Catatan dihapus.' });
});

// =========================================================================
// AI WORKSPACE ASSISTANT (2D & 3D: PILIH KATALOG, BUAT CUSTOM ASSET, STRUKTUR)
// =========================================================================

router.post('/:id/ai-asset', authWajib, muatRancangan, async (req, res) => {
  if (req.user.role !== 'wo') {
    return res.status(403).json({ pesan: 'AI Workspace hanya tersedia untuk Wedding Organizer.' });
  }

  const skema = z.object({
    prompt: z.string().min(2, 'Tuliskan permintaan aset atau penataan untuk AI.'),
    allow_custom: z.coerce.boolean().optional().default(true),
  });
  const parsed = skema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ pesan: parsed.error.issues[0].message });
  }

  const katalog = await ambilKatalogUntukGemini(req.user.id);
  const katalogMap = new Map(katalog.map((d) => [d.id, d]));

  const hasilAi = await buatAksiAiWorkspace({
    prompt: parsed.data.prompt,
    proyek: req.rancangan.Project,
    katalog,
    existingItems: req.rancangan.DesignItems || [],
    allowCustom: parsed.data.allow_custom,
  });

  const venueW = Math.max(100, Number(req.rancangan.Project?.panjang_venue || 15) * 100);
  const venueH = Math.max(100, Number(req.rancangan.Project?.lebar_venue || 10) * 100);
  const aksiDiterapkan = [];

  try {
    await sequelize.transaction(async (t) => {
      for (const act of hasilAi.aksi || []) {
        if (act.jenis === 'add_existing') {
          const dek = katalogMap.get(Number(act.decoration_id));
          if (!dek) continue;
          const maxX = Math.max(0, venueW - Number(dek.panjang || 100));
          const maxY = Math.max(0, venueH - Number(dek.lebar || 100));
          const px = Math.round(Math.max(0, Math.min(Number(act.posisi_x || 0), maxX)));
          const py = Math.round(Math.max(0, Math.min(Number(act.posisi_y || 0), maxY)));
          const rot = ((Math.round(Number(act.rotasi || 0)) % 360) + 360) % 360;
          const jml = Math.max(1, Math.min(200, Math.round(Number(act.jumlah || 1))));

          const itemBaru = await DesignItem.create({
            design_id: req.rancangan.id,
            decoration_id: dek.id,
            posisi_x: px,
            posisi_y: py,
            rotasi: rot,
            jumlah: jml,
            harga_satuan_snapshot: Number(dek.harga || 0),
          }, { transaction: t });

          aksiDiterapkan.push({
            jenis: 'add_existing',
            nama: dek.nama_dekorasi,
            kategori: dek.kategori,
            jumlah: jml,
            design_item_id: itemBaru.id,
            alasan: act.alasan || 'Ditambahkan dari katalog WedSpace.',
          });
        } else if (act.jenis === 'create_and_add' && parsed.data.allow_custom && act.custom_dekorasi) {
          const c = act.custom_dekorasi;
          const panjang = Math.max(20, Math.min(2000, Number(c.panjang || 150)));
          const lebar = Math.max(20, Math.min(2000, Number(c.lebar || 100)));
          const tinggi = Math.max(5, Math.min(600, Number(c.tinggi || 150)));
          const harga = Math.max(0, Math.round(Number(c.harga || 1000000)));

          const dekBaru = await Decoration.create({
            nama_dekorasi: String(c.nama_dekorasi || 'Dekorasi Custom AI').slice(0, 120),
            kategori: String(c.kategori || 'Aksesoris').slice(0, 60),
            harga,
            panjang,
            lebar,
            tinggi,
            deskripsi: c.deskripsi || `Dibuat via AI Workspace: ${parsed.data.prompt}`,
            created_by_user_id: req.user.id,
            visibility: 'private',
            is_active: true,
            model_3d_source: 'placeholder',
          }, { transaction: t });

          const maxX = Math.max(0, venueW - panjang);
          const maxY = Math.max(0, venueH - lebar);
          const px = Math.round(Math.max(0, Math.min(Number(act.posisi_x || maxX / 2), maxX)));
          const py = Math.round(Math.max(0, Math.min(Number(act.posisi_y || maxY / 2), maxY)));
          const rot = ((Math.round(Number(act.rotasi || 0)) % 360) + 360) % 360;
          const jml = Math.max(1, Math.min(200, Math.round(Number(act.jumlah || 1))));

          const itemBaru = await DesignItem.create({
            design_id: req.rancangan.id,
            decoration_id: dekBaru.id,
            posisi_x: px,
            posisi_y: py,
            rotasi: rot,
            jumlah: jml,
            harga_satuan_snapshot: harga,
          }, { transaction: t });

          aksiDiterapkan.push({
            jenis: 'create_and_add',
            nama: dekBaru.nama_dekorasi,
            kategori: dekBaru.kategori,
            jumlah: jml,
            decoration_id: dekBaru.id,
            design_item_id: itemBaru.id,
            alasan: act.alasan || 'Aset custom baru dibuat di Katalog Saya dan ditempatkan ke venue.',
          });
        } else if (act.jenis === 'add_structure' && act.struktur) {
          const s = act.struktur;
          const tipe = ['wall', 'door', 'window'].includes(s.tipe) ? s.tipe : 'wall';
          const panjang = Math.max(40, Math.min(venueW, Number(s.panjang || (tipe === 'door' ? 120 : 300))));
          const tebal = Math.max(8, Math.min(60, Number(s.tebal || 15)));
          const tinggi = Math.max(50, Math.min(600, Number(s.tinggi || (tipe === 'door' ? 220 : 300))));
          const px = Math.round(Math.max(0, Math.min(Number(act.posisi_x || 0), Math.max(0, venueW - panjang))));
          const py = Math.round(Math.max(0, Math.min(Number(act.posisi_y || 0), Math.max(0, venueH - tebal))));
          const rot = ((Math.round(Number(act.rotasi || 0)) % 360) + 360) % 360;

          const strBaru = await DesignStructure.create({
            design_id: req.rancangan.id,
            tipe,
            label: String(s.label || (tipe === 'door' ? 'Pintu' : 'Tembok')).slice(0, 120),
            posisi_x: px,
            posisi_y: py,
            panjang,
            tebal,
            tinggi,
            rotasi: rot,
            warna: s.warna || (tipe === 'door' ? '#7F1125' : '#EFE7DD'),
          }, { transaction: t });

          aksiDiterapkan.push({
            jenis: 'add_structure',
            nama: strBaru.label,
            tipe: strBaru.tipe,
            structure_id: strBaru.id,
            alasan: act.alasan || 'Struktur ruangan ditambahkan ke venue.',
          });
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ pesan: 'Gagal menerapkan aksi AI ke rancangan.', detail: err.message });
  }

  const segar = await Design.findByPk(req.rancangan.id, {
    include: includeRancanganLengkap(),
  });
  const segarPolos = segar.toJSON();

  return res.json({
    data: {
      sumber_ai: hasilAi.sumber,
      ringkasan: hasilAi.ringkasan,
      aksi_diterapkan: aksiDiterapkan,
      rancangan: {
        ...segarPolos,
        proyek: segarPolos.Project,
      },
    },
  });
});

router.get('/:id/estimasi', authWajib, muatRancangan, async (req, res) => {
  const detail_biaya = (req.rancangan.DesignItems || []).map((i) => {
    const harga_satuan = i.harga_satuan_snapshot !== null && i.harga_satuan_snapshot !== undefined
      ? Number(i.harga_satuan_snapshot)
      : Number(i.Decoration?.harga || 0);
    const jumlah = Number(i.jumlah || 1);
    const subtotal = harga_satuan * jumlah;

    return {
      design_item_id: i.id,
      decoration_id: i.decoration_id,
      nama_dekorasi: i.Decoration?.nama_dekorasi || 'Dekorasi dihapus',
      kategori: i.Decoration?.kategori || '-',
      gambar: i.Decoration?.gambar || null,
      visibility: i.Decoration?.visibility || 'public',
      kontributor: namaKontributor(i.Decoration),
      is_active: i.Decoration?.is_active !== false,
      harga_satuan,
      jumlah,
      subtotal,
    };
  });

  const jumlah_jenis_dekorasi = detail_biaya.length;
  const total_unit_dekorasi = detail_biaya.reduce((s, r) => s + r.jumlah, 0);
  const total_estimasi = detail_biaya.reduce((s, r) => s + r.subtotal, 0);

  // Anggaran proyek
  const rawAnggaran = req.rancangan.Project?.anggaran;
  const memilikiAnggaran = rawAnggaran !== null && rawAnggaran !== undefined && Number(rawAnggaran) > 0;
  const anggaran = memilikiAnggaran ? Number(rawAnggaran) : null;
  const sisa_anggaran = memilikiAnggaran ? anggaran - total_estimasi : null;

  let status_anggaran = 'belum_ditentukan';
  if (memilikiAnggaran) {
    if (total_estimasi < anggaran) {
      status_anggaran = 'dalam_anggaran';
    } else if (total_estimasi === anggaran) {
      status_anggaran = 'anggaran_tepat';
    } else {
      status_anggaran = 'melebihi_anggaran';
    }
  }

  const ringkasan = {
    jumlah_jenis_dekorasi,
    total_unit_dekorasi,
    total_estimasi,
    anggaran,
    sisa_anggaran,
    status_anggaran,
  };

  return res.json({
    data: {
      rancangan: {
        id: req.rancangan.id,
        nama_rancangan: req.rancangan.nama_rancangan,
      },
      proyek: {
        id: req.rancangan.Project?.id,
        nama_proyek: req.rancangan.Project?.nama_proyek,
        nama_venue: req.rancangan.Project?.nama_venue,
        panjang_venue: req.rancangan.Project?.panjang_venue,
        lebar_venue: req.rancangan.Project?.lebar_venue,
        anggaran,
      },
      detail_biaya,
      ringkasan,
      total_estimasi,
      anggaran,
      sisa_anggaran,
      status_anggaran,
      // Backward compatibility fields
      rancangan_id: req.rancangan.id,
      rincian: detail_biaya,
      total: total_estimasi,
    },
  });
});

router.get('/:id/ekspor', authWajib, muatRancangan, async (req, res) => {
  const plan = await getUserPlan(req.user.id);
  if (!batasPaket(plan).ekspor_pdf) {
    return res.status(403).json({
      pesan: 'Ekspor rancangan ke PDF hanya tersedia pada paket Premium. Upgrade ke Premium untuk membuka fitur ini.',
      paket: plan,
    });
  }

  const pdf = buatPdfRancangan(req.rancangan);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="rancangan-${req.rancangan.id}.pdf"`);
  res.setHeader('Content-Length', pdf.length);
  return res.send(pdf);
});

module.exports = router;
