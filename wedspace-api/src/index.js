require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('node:path');
const { sequelize } = require('./models');
const authRoutes = require('./routes/auth');
const dekorasiRoutes = require('./routes/dekorasi');
const proyekRoutes = require('./routes/proyek');
const rancanganRoutes = require('./routes/rancangan');
const dashboardRoutes = require('./routes/dashboard');
const subscriptionRoutes = require('./routes/subscription');
const rekomendasiRoutes = require('./routes/rekomendasi');
const { periksaAksesMedia } = require('./middleware/mediaAkses');

const app = express();
app.use(cors({
  origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
}));
app.use(express.json());

// File profil pengguna dapat diakses publik
app.use('/uploads/profil', express.static(path.join(__dirname, '..', 'uploads', 'profil')));
// File library model 3D platform dapat diakses publik
app.use('/uploads/library', express.static(path.join(__dirname, '..', 'uploads', 'library')));
// File gambar dan model dekorasi diperiksa izin aksesnya (privat vs publik)
app.get('/uploads/:tipe/:file', periksaAksesMedia);

app.get('/api/ping', (req, res) => {
  res.json({ pesan: 'API WedSpace berjalan' });
});
app.use('/api/auth', authRoutes);
app.use('/api/dekorasi', dekorasiRoutes);
app.use('/api/proyek', proyekRoutes);
app.use('/api/rancangan', rancanganRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/rekomendasi', rekomendasiRoutes);

const PORT = process.env.PORT || 3000;

sequelize
  .authenticate()
  .then(() => sequelize.sync())
  .then(() => {
    console.log('Terhubung ke MySQL');
    app.listen(PORT, () => console.log(`Server jalan di http://localhost:${PORT}`));
  })
  .catch((err) => console.error('Gagal terhubung ke database:', err.message));
