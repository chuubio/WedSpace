const express = require('express');
const { z } = require('zod');
const { Op } = require('sequelize');
const { sequelize, Design, DesignItem, Decoration, Project, User, Model3DLibrary } = require('../models');
const { authWajib } = require('../middleware/auth');
const { getUserPlan } = require('../services/subscription');
const { batasPaket } = require('../config/subscription');
const { buatPdfRancangan } = require('../services/pdf');
const { bisaMenggunakanDekorasi, formatDekorasiRespons } = require('../services/dekorasiAuth');

const router = express.Router();

async function muatRancangan(req, res, next) {
  const rancangan = await Design.findByPk(req.params.id, {
    include: [
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
      { model: Project },
    ],
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
    })).optional().default([]),
  });
  const parsed = skema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ pesan: parsed.error.issues[0].message });
  }

  // Muat item lama untuk mempertahankan harga_satuan_snapshot item yang sudah ada
  const existingDesignItems = await DesignItem.findAll({
    where: { design_id: req.rancangan.id },
  });
  const existingMap = new Map(existingDesignItems.map((di) => [di.id, di]));

  // Validasi dekorasi yang akan ditambahkan ke rancangan
  let dekorasiMap = new Map();
  if (parsed.data.item.length > 0) {
    const decorationIds = [...new Set(parsed.data.item.map((i) => i.decoration_id))];
    const dekorasiList = await Decoration.findAll({
      where: { id: { [Op.in]: decorationIds } },
    });
    dekorasiMap = new Map(dekorasiList.map((d) => [d.id, d]));

    for (const id of decorationIds) {
      const d = dekorasiMap.get(id);
      if (!d) {
        return res.status(400).json({ pesan: `Dekorasi dengan ID ${id} tidak ditemukan.` });
      }
      if (!bisaMenggunakanDekorasi(req.user, d)) {
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

  // Tentukan snapshot harga: pertahankan snapshot lama jika item ID valid & dekorasi cocok, atau gunakan harga katalog saat ini
  const itemsToCreate = parsed.data.item.map((i) => {
    let snapshot = null;
    if (i.id && existingMap.has(i.id)) {
      const oldItem = existingMap.get(i.id);
      if (
        oldItem.decoration_id === i.decoration_id &&
        oldItem.harga_satuan_snapshot !== null &&
        oldItem.harga_satuan_snapshot !== undefined
      ) {
        snapshot = oldItem.harga_satuan_snapshot;
      }
    }
    if (snapshot === null) {
      snapshot = Number(dekorasiMap.get(i.decoration_id)?.harga || 0);
    }
    return {
      design_id: req.rancangan.id,
      decoration_id: i.decoration_id,
      posisi_x: i.posisi_x,
      posisi_y: i.posisi_y,
      rotasi: i.rotasi,
      jumlah: i.jumlah,
      harga_satuan_snapshot: snapshot,
    };
  });

  await sequelize.transaction(async (t) => {
    if (parsed.data.nama_rancangan) {
      await req.rancangan.update({ nama_rancangan: parsed.data.nama_rancangan }, { transaction: t });
    }

    await DesignItem.destroy({ where: { design_id: req.rancangan.id }, transaction: t });
    if (itemsToCreate.length > 0) {
      await DesignItem.bulkCreate(itemsToCreate, { transaction: t });
    }
  });

  const segar = await Design.findByPk(req.rancangan.id, {
    include: [
      {
        model: DesignItem,
        include: [{ model: Decoration, include: [{ model: User, attributes: ['id', 'nama'] }] }],
      },
      { model: Project },
    ],
  });
  const segarPolos = segar.toJSON();
  return res.json({
    data: {
      ...segarPolos,
      proyek: segarPolos.Project,
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
      harga_satuan,
      jumlah,
      subtotal,
    };
  });

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
