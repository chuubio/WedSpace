const path = require('node:path');
const fs = require('node:fs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { Decoration } = require('../models');

/**
 * Middleware untuk mengamankan akses file dekorasi (gambar dan model 3D).
 * - File dekorasi publik: dapat diakses langsung untuk kebutuhan rendering frontend (img/3D).
 * - File dekorasi privat: HANYA dapat diakses oleh WO pemilik file tersebut (melalui Authorization header atau query param ?token=).
 * - File profil pengguna: tetap dapat diakses publik.
 */
async function periksaAksesMedia(req, res, next) {
  const { tipe, file } = req.params;
  if (!['gambar', 'model'].includes(tipe)) {
    return next();
  }

  const filePath = path.join(__dirname, '..', '..', 'uploads', tipe, file);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ pesan: 'File tidak ditemukan.' });
  }

  const urlRelatif = `/uploads/${tipe}/${file}`;

  try {
    // Cari dekorasi yang menggunakan file ini
    const dekorasi = await Decoration.findOne({
      where: {
        [Op.or]: [
          { gambar: urlRelatif },
          { model_3d: urlRelatif },
        ],
      },
    });

    // Jika file tidak tercatat di dekorasi mana pun, tetap sajikan jika ada di folder
    if (!dekorasi) {
      return res.sendFile(filePath);
    }

    // Jika dekorasi publik atau aset bawaan platform WedSpace, izinkan akses publik
    if (dekorasi.visibility === 'public') {
      return res.sendFile(filePath);
    }

    // Jika dekorasi berstatus privat, verifikasi token kepemilikan
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(403).json({ pesan: 'Akses ditolak ke file dekorasi privat.' });
    }

    let user;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(403).json({ pesan: 'Token tidak valid untuk mengakses file privat.' });
    }

    // Hanya WO pemilik yang berhak mengakses file privat
    if (user.role === 'wo' && user.id === dekorasi.created_by_user_id) {
      return res.sendFile(filePath);
    }

    return res.status(403).json({ pesan: 'Akses ditolak ke file dekorasi privat milik pengguna lain.' });
  } catch (error) {
    return next(error);
  }
}

module.exports = { periksaAksesMedia };
