const express = require('express');
const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs');
const { z } = require('zod');
const { Op } = require('sequelize');
const { Decoration, DesignItem } = require('../models');
const { authWajib, adminSaja } = require('../middleware/auth');

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

router.get('/', authWajib, async (req, res) => {
  const { q, kategori } = req.query;
  const where = {};
  if (req.user.role !== 'admin') where.is_active = true;
  if (kategori) where.kategori = kategori;
  if (q) where.nama_dekorasi = { [Op.like]: `%${q}%` };
  const data = await Decoration.findAll({ where, order: [['id', 'ASC']] });
  return res.json({ data });
});

router.get('/:id', authWajib, async (req, res) => {
  const item = await Decoration.findByPk(req.params.id);
  if (!item) return res.status(404).json({ pesan: 'Dekorasi tidak ditemukan.' });
  if (req.user.role !== 'admin' && !item.is_active) {
    return res.status(404).json({ pesan: 'Dekorasi tidak ditemukan.' });
  }
  return res.json({ data: item });
});

router.post('/', authWajib, adminSaja, (req, res, next) => {
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
  const dibuat = await Decoration.create({
    ...parsed.data,
    gambar: fileGambar ? `/uploads/gambar/${fileGambar.filename}` : null,
    model_3d: fileModel ? `/uploads/model/${fileModel.filename}` : null,
  });
  return res.status(201).json({ data: dibuat });
});

router.put('/:id', authWajib, adminSaja, async (req, res) => {
  const item = await Decoration.findByPk(req.params.id);
  if (!item) return res.status(404).json({ pesan: 'Dekorasi tidak ditemukan.' });
  const parsed = skemaDekorasi.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ pesan: parsed.error.issues[0].message });
  }
  await item.update(parsed.data);
  return res.json({ data: item });
});

router.delete('/:id', authWajib, adminSaja, async (req, res) => {
  const item = await Decoration.findByPk(req.params.id);
  if (!item) return res.status(404).json({ pesan: 'Dekorasi tidak ditemukan.' });
  const dipakai = await DesignItem.count({ where: { decoration_id: item.id } });
  if (dipakai > 0) {
    await item.update({ is_active: false });
    return res.json({ pesan: 'Dekorasi sedang dipakai di rancangan, jadi dinonaktifkan.', data: item });
  }
  await item.destroy();
  return res.json({ pesan: 'Dekorasi dihapus.' });
});

module.exports = router;
