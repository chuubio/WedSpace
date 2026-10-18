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

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/ping', (req, res) => {
  res.json({ pesan: 'API WedSpace berjalan' });
});
app.use('/api/auth', authRoutes);
app.use('/api/dekorasi', dekorasiRoutes);
app.use('/api/proyek', proyekRoutes);
app.use('/api/rancangan', rancanganRoutes);
app.use('/api/dashboard', dashboardRoutes);

const PORT = process.env.PORT || 3000;

sequelize
  .authenticate()
  .then(() => sequelize.sync())
  .then(() => {
    console.log('Terhubung ke MySQL');
    app.listen(PORT, () => console.log(`Server jalan di http://localhost:${PORT}`));
  })
  .catch((err) => console.error('Gagal terhubung ke database:', err.message));
