const express = require('express');
const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs');
const { z } = require('zod');
const { Op } = require('sequelize');
const { Decoration, DesignItem, User } = require('../models');
const { authWajib } = require('../middleware/auth');
const {
  adalahPemilik,
  bisaMelihatDekorasi,
  bisaMengubahDekorasi,
  bisaMenghapusDekorasi,
  bisaMengubahVisibilitas,
  formatDekorasiRespons,
  filterKatalogAkses,
} = require('../services/dekorasiAuth');

const router = express.Router();

const dirGambar = path.join(__dirname, '..', '..', 'uploads', 'gambar');
const dirModel = path.join(__dirname, '..', '..', 'uploads', 'model');
for (const dir of [dirGambar, dirModel]) fs.mkdirSync(dir, { recursive: true });

const penyimpanan = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, file.fieldname === 'model_3d' ? dirModel : dirGambar);
  },
  filename(req, file, cb) {
    const unik = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, unik);
  },
});

function filterFile(req, file, cb) {
  if (file.fieldname === 'gambar') {
    if (/^image\/(png|jpe?g|webp)$/.test(file.mimetype)) return cb(null, true);
    return cb(new Error('File gambar harus PNG, JPG, atau WebP.'));
  }
  if (file.fieldname === 'model_3d') {
    const ekstensi = path.extname(file.originalname).toLowerCase();
    if (ekstensi === '.glb' || ekstensi === '.gltf') return cb(null, true);
    return cb(new Error('File model 3D harus berformat GLB atau glTF.'));
  }
  return cb(new Error(`Field file tidak dikenal: ${file.fieldname}.`));
}

const upload = multer({ storage: penyimpanan, fileFilter: filterFile, limits: { fileSize: 50 * 1024 * 1024 } });
const uploadDuaFile = upload.fields([
  { name: 'gambar', maxCount: 1 },
  { name: 'model_3d', maxCount: 1 },
]);

function hapusFileUpload(req) {
  const semua = [...(req.files?.gambar || []), ...(req.files?.model_3d || [])];
  for (const f of semua) fs.unlink(f.path, () => {});
}

// Middleware: Hanya Wedding Organizer (bukan admin) yang boleh membuat atau mengelola dekorasi
function hanyaWO(req, res, next) {
  if (req.user?.role !== 'wo') {
    return res.status(403).json({ pesan: 'Hanya Wedding Organizer yang berhak mengelola dekorasi.' });
  }
  return next();
}

const skemaDekorasi = z.object({
  nama_dekorasi: z.string().min(1, 'Nama dekorasi wajib diisi'),
  kategori: z.string().min(1, 'Kategori wajib diisi'),
  harga: z.coerce.number().int('Harga harus bilangan bulat').nonnegative('Harga tidak boleh negatif'),
  panjang: z.coerce.number().positive('Panjang harus lebih dari 0'),
  lebar: z.coerce.number().positive('Lebar harus lebih dari 0'),
  tinggi: z.coerce.number().positive('Tinggi harus lebih dari 0'),
  deskripsi: z.string().optional().default(''),
  is_active: z.coerce.boolean().optional().default(true),
});

const skemaVisibilitas = z.object({
  visibility: z.enum(['private', 'public'], {
    errorMap: () => ({ message: 'Visibilitas harus private atau public.' }),
  }),
});

/**
 * GET /api/dekorasi
 * Mengambil katalog dekorasi aktif yang dapat diakses pengguna:
 * - WO: Dekorasi miliknya (private/public), dekorasi public WO lain, dan dekorasi platform WedSpace.
 * - Admin: Hanya dekorasi public platform / komunitas (tidak boleh mengakses dekorasi private).
 */
router.get('/', authWajib, async (req, res) => {
  const { q, kategori, scope, visibility } = req.query;

  const kondisiAnd = [...filterKatalogAkses(req.user)];

  // Default: hanya dekorasi aktif yang muncul di katalog
  kondisiAnd.push({ is_active: true });

  if (kategori) {
    kondisiAnd.push({ kategori });
  }

  if (q) {
    kondisiAnd.push({ nama_dekorasi: { [Op.like]: `%${q}%` } });
  }

  // Filter opsional untuk fleksibilitas (mendukung Tahap 3)
  if (visibility && ['private', 'public'].includes(visibility)) {
    kondisiAnd.push({ visibility });
  }

  if (scope === 'mine' && req.user.role === 'wo') {
    kondisiAnd.push({ created_by_user_id: req.user.id });
  } else if (scope === 'community') {
    kondisiAnd.push({
      visibility: 'public',
      [Op.or]: [
        { created_by_user_id: { [Op.ne]: req.user.id } },
        { created_by_user_id: null },
      ],
    });
  }

  const data = await Decoration.findAll({
    where: { [Op.and]: kondisiAnd },
    include: [{ model: User, attributes: ['id', 'nama', 'username_email'] }],
    order: [['id', 'ASC']],
  });

  return res.json({
    data: data.map((d) => formatDekorasiRespons(d, req.user)),
  });
});

/**
 * GET /api/dekorasi/:id
 * Melihat detail dekorasi.
 * Ditolak jika dekorasi private milik pengguna lain.
 */
router.get('/:id', authWajib, async (req, res) => {
  const item = await Decoration.findByPk(req.params.id, {
    include: [{ model: User, attributes: ['id', 'nama', 'username_email'] }],
  });

  if (!item) {
    return res.status(404).json({ pesan: 'Dekorasi tidak ditemukan.' });
  }

  // Cek hak akses melihat dekorasi
  if (!bisaMelihatDekorasi(req.user, item)) {
    return res.status(403).json({ pesan: 'Kamu tidak memiliki akses ke dekorasi ini.' });
  }

  // Jika dekorasi tidak aktif, hanya pemilik yang boleh melihatnya
  if (!item.is_active && !adalahPemilik(req.user, item)) {
    return res.status(404).json({ pesan: 'Dekorasi tidak ditemukan.' });
  }

  return res.json({ data: formatDekorasiRespons(item, req.user) });
});

/**
 * POST /api/dekorasi
 * Menambahkan dekorasi baru.
 * Hanya dapat dilakukan oleh WO yang sudah login.
 * - created_by_user_id otomatis diisi dari req.user.id (JWT)
 * - visibility otomatis private
 * - Input created_by_user_id dari client diabaikan
 */
router.post('/', authWajib, hanyaWO, (req, res, next) => {
  uploadDuaFile(req, res, (err) => {
    if (err) {
      hapusFileUpload(req);
      return res.status(400).json({ pesan: err.message });
    }
    return next();
  });
}, async (req, res) => {
  const parsed = skemaDekorasi.safeParse(req.body);
  if (!parsed.success) {
    hapusFileUpload(req);
    return res.status(400).json({ pesan: parsed.error.issues[0].message });
  }

  const fileGambar = req.files?.gambar?.[0];
  const fileModel = req.files?.model_3d?.[0];

  // Identitas pemilik dan visibilitas awal ditentukan backend secara ketat
  const payload = {
    ...parsed.data,
    gambar: fileGambar ? `/uploads/gambar/${fileGambar.filename}` : null,
    model_3d: fileModel ? `/uploads/model/${fileModel.filename}` : null,
    created_by_user_id: req.user.id,
    visibility: 'private',
  };

  const dibuat = await Decoration.create(payload);
  const baru = await Decoration.findByPk(dibuat.id, {
    include: [{ model: User, attributes: ['id', 'nama', 'username_email'] }],
  });

  return res.status(201).json({
    pesan: 'Dekorasi berhasil ditambahkan ke katalog pribadi.',
    data: formatDekorasiRespons(baru, req.user),
  });
});

/**
 * PUT /api/dekorasi/:id
 * Mengubah informasi dekorasi.
 * Hanya WO pemilik yang berhak mengubah dekorasi miliknya.
 * Perubahan created_by_user_id diabaikan / tidak diizinkan.
 */
router.put('/:id', authWajib, hanyaWO, (req, res, next) => {
  uploadDuaFile(req, res, (err) => {
    if (err) {
      hapusFileUpload(req);
      return res.status(400).json({ pesan: err.message });
    }
    return next();
  });
}, async (req, res) => {
  const item = await Decoration.findByPk(req.params.id, {
    include: [{ model: User, attributes: ['id', 'nama', 'username_email'] }],
  });

  if (!item) {
    hapusFileUpload(req);
    return res.status(404).json({ pesan: 'Dekorasi tidak ditemukan.' });
  }

  if (!bisaMengubahDekorasi(req.user, item)) {
    hapusFileUpload(req);
    return res.status(403).json({ pesan: 'Kamu tidak memiliki hak untuk mengubah dekorasi ini.' });
  }

  const parsed = skemaDekorasi.partial().safeParse(req.body);
  if (!parsed.success) {
    hapusFileUpload(req);
    return res.status(400).json({ pesan: parsed.error.issues[0].message });
  }

  const dataUpdate = { ...parsed.data };
  // Cegah manipulasi pemilik dekorasi
  delete dataUpdate.created_by_user_id;

  // Perbarui file jika ada file baru diunggah
  const fileGambar = req.files?.gambar?.[0];
  const fileModel = req.files?.model_3d?.[0];
  if (fileGambar) {
    dataUpdate.gambar = `/uploads/gambar/${fileGambar.filename}`;
  }
  if (fileModel) {
    dataUpdate.model_3d = `/uploads/model/${fileModel.filename}`;
  }

  // Jika payload mengirimkan perubahan visibility, validasi nilainya
  if (req.body.visibility !== undefined) {
    const validasiVis = skemaVisibilitas.safeParse({ visibility: req.body.visibility });
    if (!validasiVis.success) {
      return res.status(400).json({ pesan: validasiVis.error.issues[0].message });
    }
    dataUpdate.visibility = validasiVis.data.visibility;
  }

  await item.update(dataUpdate);
  const segar = await Decoration.findByPk(item.id, {
    include: [{ model: User, attributes: ['id', 'nama', 'username_email'] }],
  });

  return res.json({
    pesan: 'Dekorasi berhasil diperbarui.',
    data: formatDekorasiRespons(segar, req.user),
  });
});

/**
 * PATCH /api/dekorasi/:id/visibility
 * Mengatur visibilitas dekorasi (private atau public).
 * Hanya WO pemilik yang dapat mengubah visibilitas.
 */
router.patch('/:id/visibility', authWajib, hanyaWO, async (req, res) => {
  const parsed = skemaVisibilitas.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ pesan: parsed.error.issues[0].message });
  }

  const item = await Decoration.findByPk(req.params.id, {
    include: [{ model: User, attributes: ['id', 'nama', 'username_email'] }],
  });

  if (!item) {
    return res.status(404).json({ pesan: 'Dekorasi tidak ditemukan.' });
  }

  if (!bisaMengubahVisibilitas(req.user, item)) {
    return res.status(403).json({ pesan: 'Hanya pemilik yang dapat mengubah visibilitas dekorasi.' });
  }

  await item.update({ visibility: parsed.data.visibility });

  const segar = await Decoration.findByPk(item.id, {
    include: [{ model: User, attributes: ['id', 'nama', 'username_email'] }],
  });

  return res.json({
    pesan: `Visibilitas dekorasi berhasil diubah menjadi ${parsed.data.visibility}.`,
    data: formatDekorasiRespons(segar, req.user),
  });
});

/**
 * DELETE /api/dekorasi/:id
 * Menonaktifkan dekorasi (is_active = false) untuk menjaga integritas rancangan lama.
 * Hanya WO pemilik yang berhak menonaktifkan.
 */
router.delete('/:id', authWajib, hanyaWO, async (req, res) => {
  const item = await Decoration.findByPk(req.params.id, {
    include: [{ model: User, attributes: ['id', 'nama', 'username_email'] }],
  });

  if (!item) {
    return res.status(404).json({ pesan: 'Dekorasi tidak ditemukan.' });
  }

  if (!bisaMenghapusDekorasi(req.user, item)) {
    return res.status(403).json({ pesan: 'Kamu tidak memiliki hak untuk menghapus dekorasi ini.' });
  }

  // Gunakan mekanisme penonaktifan melalui is_active = false sebagai pendekatan utama
  await item.update({ is_active: false });

  return res.json({
    pesan: 'Dekorasi dinonaktifkan.',
    data: formatDekorasiRespons(item, req.user),
  });
});

module.exports = router;
