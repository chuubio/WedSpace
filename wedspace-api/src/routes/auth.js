const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs');
const { z } = require('zod');
const { User } = require('../models');
const { authWajib } = require('../middleware/auth');

const router = express.Router();

// Folder upload foto profil: wedspace-api/uploads/profil
const dirProfil = path.join(__dirname, '..', '..', 'uploads', 'profil');
fs.mkdirSync(dirProfil, { recursive: true });

const penyimpanan = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, dirProfil);
  },
  filename(req, file, cb) {
    const unik = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, unik);
  },
});

const uploadFoto = multer({
  storage: penyimpanan,
  fileFilter(req, file, cb) {
    if (/^image\/(png|jpe?g|webp)$/.test(file.mimetype)) return cb(null, true);
    return cb(new Error('Foto profil harus PNG, JPG, atau WebP.'));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('foto_profil');

const skemaLogin = z.object({
  username_email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

function userPublik(user) {
  return {
    id: user.id,
    nama: user.nama,
    username_email: user.username_email,
    role: user.role,
    foto_profil: user.foto_profil || null,
  };
}

// POST /api/auth/login — FR-AUTH1, UC-01
router.post('/login', async (req, res) => {
  const parsed = skemaLogin.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ pesan: parsed.error.issues[0].message });
  }
  const { username_email, password } = parsed.data;

  const user = await User.findOne({ where: { username_email } });
  if (!user) {
    return res.status(401).json({ pesan: 'Email atau password salah.' });
  }
  const cocok = await bcrypt.compare(password, user.password);
  if (!cocok) {
    return res.status(401).json({ pesan: 'Email atau password salah.' });
  }

  const token = jwt.sign(
    { id: user.id, role: user.role, nama: user.nama },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  return res.json({ token, user: userPublik(user) });
});

// GET /api/auth/me — profil user dari token
router.get('/me', authWajib, async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    attributes: ['id', 'nama', 'username_email', 'role', 'foto_profil'],
  });
  if (!user) {
    return res.status(404).json({ pesan: 'Akun tidak ditemukan.' });
  }
  return res.json({ user: userPublik(user) });
});

// PUT /api/auth/profil — ubah nama + foto profil (multipart: foto_profil)
router.put('/profil', authWajib, (req, res, next) => {
  uploadFoto(req, res, (err) => {
    if (err) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ pesan: err.message });
    }
    return next();
  });
}, async (req, res) => {
  const parsed = z.object({
    nama: z.string().min(1, 'Nama tidak boleh kosong').max(100, 'Nama maksimal 100 karakter'),
  }).safeParse(req.body || {});
  if (!parsed.success) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ pesan: parsed.error.issues[0].message });
  }

  const user = await User.findByPk(req.user.id);
  if (!user) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(404).json({ pesan: 'Akun tidak ditemukan.' });
  }

  const dataBaru = { nama: parsed.data.nama.trim() };
  if (req.file) {
    if (user.foto_profil && user.foto_profil.startsWith('/uploads/profil/')) {
      fs.unlink(path.join(__dirname, '..', '..', user.foto_profil), () => {});
    }
    dataBaru.foto_profil = `/uploads/profil/${req.file.filename}`;
  }

  await user.update(dataBaru);
  return res.json({ pesan: 'Pengaturan akun berhasil disimpan.', user: userPublik(user) });
});

module.exports = router;
