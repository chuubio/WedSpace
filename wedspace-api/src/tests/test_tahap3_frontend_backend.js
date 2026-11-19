require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {
  sequelize,
  User,
  Project,
  Design,
  Decoration,
  DesignItem,
  Subscription,
} = require('../models');

const express = require('express');
const cors = require('cors');
const path = require('node:path');
const authRoutes = require('../routes/auth');
const dekorasiRoutes = require('../routes/dekorasi');
const proyekRoutes = require('../routes/proyek');
const rancanganRoutes = require('../routes/rancangan');
const dashboardRoutes = require('../routes/dashboard');
const subscriptionRoutes = require('../routes/subscription');
const rekomendasiRoutes = require('../routes/rekomendasi');
const { periksaAksesMedia } = require('../middleware/mediaAkses');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads/profil', express.static(path.join(__dirname, '..', '..', 'uploads', 'profil')));
app.get('/uploads/:tipe/:file', periksaAksesMedia);
app.use('/api/auth', authRoutes);
app.use('/api/dekorasi', dekorasiRoutes);
app.use('/api/proyek', proyekRoutes);
app.use('/api/rancangan', rancanganRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/rekomendasi', rekomendasiRoutes);

const TEST_PORT = 3098;
let server;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;

const results = [];

function record(kategori, skenario, lulus, detail) {
  results.push({ kategori, skenario, lulus, detail });
  const status = lulus ? 'PASS' : 'FAIL';
  console.log(`[${status}] [${kategori}] ${skenario} -> ${detail}`);
}

async function request(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
  const res = await fetch(fullUrl, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    },
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, data, ok: res.ok };
}

async function runTahap3Tests() {
  await sequelize.authenticate();

  const hash = await bcrypt.hash('password123', 10);
  const [admin] = await User.findOrCreate({
    where: { username_email: 'admin@wedspace.test' },
    defaults: { nama: 'Admin WedSpace', username_email: 'admin@wedspace.test', password: hash, role: 'admin' },
  });

  const [woA] = await User.findOrCreate({
    where: { username_email: 'wo@wedspace.test' },
    defaults: { nama: 'Ella (WO A)', username_email: 'wo@wedspace.test', password: hash, role: 'wo' },
  });

  const [woB] = await User.findOrCreate({
    where: { username_email: 'wo2@wedspace.test' },
    defaults: { nama: 'Budi (WO B)', username_email: 'wo2@wedspace.test', password: hash, role: 'wo' },
  });

  const tokenAdmin = jwt.sign({ id: admin.id, role: admin.role, nama: admin.nama }, process.env.JWT_SECRET);
  const tokenWoA = jwt.sign({ id: woA.id, role: woA.role, nama: woA.nama }, process.env.JWT_SECRET);
  const tokenWoB = jwt.sign({ id: woB.id, role: woB.role, nama: woB.nama }, process.env.JWT_SECRET);

  const authAdmin = { Authorization: `Bearer ${tokenAdmin}` };
  const authWoA = { Authorization: `Bearer ${tokenWoA}` };
  const authWoB = { Authorization: `Bearer ${tokenWoB}` };

  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, resolve);
  });

  console.log(`Test server running on port ${TEST_PORT}\nStarting Tahap 3 verification tests...\n`);

  let idDekorasiWoA = null;

  try {
    // === 1. PENGUJIAN KATALOG SAYA ===

    // Skenario 1.1: WO A menambahkan dekorasi via POST /api/dekorasi (otomatis Private, owner WO A)
    const resTambah = await request('/dekorasi', {
      method: 'POST',
      headers: authWoA,
      body: JSON.stringify({
        nama_dekorasi: 'Pelaminan Kayu Jati Klasik WO A',
        kategori: 'Pelaminan',
        harga: 8500000,
        panjang: 450,
        lebar: 220,
        tinggi: 260,
        deskripsi: 'Dekorasi eksklusif WO A',
      }),
    });
    idDekorasiWoA = resTambah.data?.data?.id;
    const ok1 = resTambah.status === 201 &&
      resTambah.data?.data?.created_by_user_id === woA.id &&
      resTambah.data?.data?.visibility === 'private' &&
      resTambah.data?.data?.is_owner === true;
    record('Katalog Saya', 'WO A menambahkan dekorasi', ok1, `ID: ${idDekorasiWoA}, Vis: ${resTambah.data?.data?.visibility}, Owner: ${resTambah.data?.data?.created_by_user_id}`);

    // Skenario 1.2: WO A membuka Katalog Saya (scope=mine) -> Menampilkan dekorasi milik WO A
    const resKatalogSaya = await request('/dekorasi?scope=mine', { headers: authWoA });
    const adaDiKatalogSaya = (resKatalogSaya.data?.data || []).some((d) => d.id === idDekorasiWoA);
    record('Katalog Saya', 'WO A membuka Katalog Saya', resKatalogSaya.status === 200 && adaDiKatalogSaya, `Ditemukan item ID ${idDekorasiWoA} di scope=mine`);

    // Skenario 1.3: WO A mengedit dekorasi via PUT /api/dekorasi/:id
    const resEdit = await request(`/dekorasi/${idDekorasiWoA}`, {
      method: 'PUT',
      headers: authWoA,
      body: JSON.stringify({
        nama_dekorasi: 'Pelaminan Kayu Jati Klasik WO A (Updated)',
        harga: 9000000,
      }),
    });
    const okEdit = resEdit.status === 200 &&
      resEdit.data?.data?.nama_dekorasi === 'Pelaminan Kayu Jati Klasik WO A (Updated)' &&
      resEdit.data?.data?.harga === 9000000;
    record('Katalog Saya', 'WO A mengedit dekorasi', okEdit, `Status: ${resEdit.status}, Nama baru: ${resEdit.data?.data?.nama_dekorasi}`);

    // Skenario 1.4: WO A mencari dekorasi di Katalog Saya
    const resCari = await request('/dekorasi?scope=mine&q=Kayu+Jati', { headers: authWoA });
    const cocokCari = (resCari.data?.data || []).every((d) => d.nama_dekorasi.includes('Kayu Jati'));
    record('Katalog Saya', 'WO A mencari dekorasi', resCari.status === 200 && cocokCari, `Hasil pencarian sesuai kata kunci: ${cocokCari}`);

    // Skenario 1.5: WO A mengubah status Private menjadi Public
    const resPublic = await request(`/dekorasi/${idDekorasiWoA}/visibility`, {
      method: 'PATCH',
      headers: authWoA,
      body: JSON.stringify({ visibility: 'public' }),
    });
    const okPublic = resPublic.status === 200 && resPublic.data?.data?.visibility === 'public';
    record('Katalog Saya', 'WO A mengubah Private menjadi Public', okPublic, `Status baru: ${resPublic.data?.data?.visibility}`);

    // Skenario 1.6: WO A mengubah Public menjadi Private kembali
    const resPrivate = await request(`/dekorasi/${idDekorasiWoA}/visibility`, {
      method: 'PATCH',
      headers: authWoA,
      body: JSON.stringify({ visibility: 'private' }),
    });
    const okPrivate = resPrivate.status === 200 && resPrivate.data?.data?.visibility === 'private';
    record('Katalog Saya', 'WO A mengubah Public menjadi Private', okPrivate, `Status baru: ${resPrivate.data?.data?.visibility}`);

    // Skenario 1.7: WO A menonaktifkan dekorasi (DELETE -> is_active = false)
    const resHapus = await request(`/dekorasi/${idDekorasiWoA}`, {
      method: 'DELETE',
      headers: authWoA,
    });
    const okHapus = resHapus.status === 200 && resHapus.data?.data?.is_active === false;
    record('Katalog Saya', 'WO A menonaktifkan dekorasi', okHapus, `is_active: ${resHapus.data?.data?.is_active}, pesan: ${resHapus.data?.pesan}`);

    // Aktifkan kembali untuk pengujian katalog komunitas
    await Decoration.update({ is_active: true, visibility: 'public' }, { where: { id: idDekorasiWoA } });

    // === 2. PENGUJIAN KATALOG KOMUNITAS ===

    // Skenario 2.1: WO B membuka Katalog Komunitas (scope=community)
    const resKomunitas = await request('/dekorasi?scope=community', { headers: authWoB });
    const adaItemWoA = (resKomunitas.data?.data || []).some((d) => d.id === idDekorasiWoA);
    const adaItemPlatform = (resKomunitas.data?.data || []).some((d) => d.created_by_user_id === null);
    record('Katalog Komunitas', 'WO B membuka Katalog Komunitas', resKomunitas.status === 200 && adaItemWoA && adaItemPlatform, `Item WO A ada: ${adaItemWoA}, Item platform ada: ${adaItemPlatform}`);

    // Skenario 2.2: WO B melihat kontributor dekorasi bawaan platform adalah "WedSpace"
    const itemPlatform = (resKomunitas.data?.data || []).find((d) => d.created_by_user_id === null);
    const okKontributorPlatform = itemPlatform && itemPlatform.kontributor === 'WedSpace';
    record('Katalog Komunitas', 'Kontributor dekorasi bawaan platform = "WedSpace"', Boolean(okKontributorPlatform), `Kontributor: ${itemPlatform?.kontributor}`);

    // Skenario 2.3: WO B melihat kontributor dekorasi milik WO A
    const itemWoA = (resKomunitas.data?.data || []).find((d) => d.id === idDekorasiWoA);
    const okKontributorWoA = itemWoA && Boolean(itemWoA.kontributor);
    record('Katalog Komunitas', 'Kontributor dekorasi milik WO A tampil', Boolean(okKontributorWoA), `Kontributor: ${itemWoA?.kontributor}`);

    // Skenario 2.4: WO B mencoba mengubah dekorasi WO A -> Ditolak backend 403
    const resEditIlegal = await request(`/dekorasi/${idDekorasiWoA}`, {
      method: 'PUT',
      headers: authWoB,
      body: JSON.stringify({ nama_dekorasi: 'Dibajak WO B' }),
    });
    record('Katalog Komunitas', 'WO B mencoba mengedit dekorasi WO A (Ditolak)', resEditIlegal.status === 403, `Status respon: ${resEditIlegal.status}`);

    // Skenario 2.5: WO B mencoba menghapus dekorasi WO A -> Ditolak backend 403
    const resHapusIlegal = await request(`/dekorasi/${idDekorasiWoA}`, {
      method: 'DELETE',
      headers: authWoB,
    });
    record('Katalog Komunitas', 'WO B mencoba menghapus dekorasi WO A (Ditolak)', resHapusIlegal.status === 403, `Status respon: ${resHapusIlegal.status}`);

    // Skenario 2.6: WO A mengubah dekorasinya jadi Private, lalu WO B mengakses detailnya -> Ditolak backend 403
    await Decoration.update({ visibility: 'private' }, { where: { id: idDekorasiWoA } });
    const resAksesPrivate = await request(`/dekorasi/${idDekorasiWoA}`, { headers: authWoB });
    record('Katalog Komunitas', 'WO B membuka dekorasi Private WO A (Ditolak)', resAksesPrivate.status === 403, `Status respon: ${resAksesPrivate.status}`);

    // === 3. PENGUJIAN ADMIN ===

    // Skenario 3.1: Admin membuka katalog -> Hanya melihat item public, tidak ada item private
    const resAdminKatalog = await request('/dekorasi', { headers: authAdmin });
    const adaItemPrivateDiAdmin = (resAdminKatalog.data?.data || []).some((d) => d.id === idDekorasiWoA);
    record('Admin', 'Admin melihat katalog (Private WO A tersembunyi)', resAdminKatalog.status === 200 && !adaItemPrivateDiAdmin, `Private tersembunyi: ${!adaItemPrivateDiAdmin}`);

    // Skenario 3.2: Admin mencoba menambahkan dekorasi -> Ditolak backend 403
    const resAdminTambah = await request('/dekorasi', {
      method: 'POST',
      headers: authAdmin,
      body: JSON.stringify({
        nama_dekorasi: 'Pelaminan Admin',
        kategori: 'Pelaminan',
        harga: 5000000,
        panjang: 300,
        lebar: 200,
        tinggi: 200,
      }),
    });
    record('Admin', 'Admin mencoba menambahkan dekorasi (Ditolak)', resAdminTambah.status === 403, `Status respon: ${resAdminTambah.status}`);

    // Skenario 3.3: Admin mencoba mengubah dekorasi -> Ditolak backend 403
    const resAdminEdit = await request(`/dekorasi/${idDekorasiWoA}`, {
      method: 'PUT',
      headers: authAdmin,
      body: JSON.stringify({ nama_dekorasi: 'Diubah Admin' }),
    });
    record('Admin', 'Admin mencoba mengubah dekorasi (Ditolak)', resAdminEdit.status === 403, `Status respon: ${resAdminEdit.status}`);

    // Skenario 3.4: Admin mencoba menghapus dekorasi -> Ditolak backend 403
    const resAdminHapus = await request(`/dekorasi/${idDekorasiWoA}`, {
      method: 'DELETE',
      headers: authAdmin,
    });
    record('Admin', 'Admin mencoba menghapus dekorasi (Ditolak)', resAdminHapus.status === 403, `Status respon: ${resAdminHapus.status}`);

    // Bersihkan dekorasi uji
    if (idDekorasiWoA) {
      await Decoration.destroy({ where: { id: idDekorasiWoA } });
    }

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    server.close();
    await sequelize.close();
  }

  const passed = results.filter((r) => r.lulus).length;
  const failed = results.filter((r) => !r.lulus).length;
  console.log(`\n========================================`);
  console.log(`HASIL VERIFIKASI TAHAP 3: ${passed} PASS, ${failed} FAIL dari ${results.length} Skenario`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTahap3Tests();
