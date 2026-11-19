require('dotenv').config();
const http = require('node:http');
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

// Buat server test dinamis
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

const TEST_PORT = 3099;
let server;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;

const results = [];

function recordTest(no, skenario, lulus, detail) {
  results.push({ no, skenario, lulus, detail });
  const status = lulus ? 'PASS' : 'FAIL';
  console.log(`[${status}] Skenario ${no}: ${skenario} -> ${detail}`);
}

async function request(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
  const res = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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

async function runAllTests() {
  await sequelize.authenticate();

  // Setup user accounts
  const hash = await bcrypt.hash('password123', 10);
  const [admin] = await User.findOrCreate({
    where: { username_email: 'admin@wedspace.test' },
    defaults: { nama: 'Admin WedSpace', username_email: 'admin@wedspace.test', password: hash, role: 'admin' },
  });

  const [woA] = await User.findOrCreate({
    where: { username_email: 'wo@wedspace.test' },
    defaults: { nama: 'WO Ella', username_email: 'wo@wedspace.test', password: hash, role: 'wo' },
  });

  const [woB] = await User.findOrCreate({
    where: { username_email: 'wo2@wedspace.test' },
    defaults: { nama: 'WO Budi', username_email: 'wo2@wedspace.test', password: hash, role: 'wo' },
  });

  // Pastikan WO B punya langganan & proyek untuk pengujian rancangan
  await Subscription.findOrCreate({
    where: { user_id: woB.id },
    defaults: { user_id: woB.id, plan: 'free', status: 'active' },
  });

  const [proyekB] = await Project.findOrCreate({
    where: { user_id: woB.id, nama_proyek: 'Proyek WO Budi' },
    defaults: {
      user_id: woB.id,
      nama_proyek: 'Proyek WO Budi',
      nama_venue: 'Venue WO B',
      panjang_venue: 15,
      lebar_venue: 10,
      tema: 'Modern',
    },
  });

  const [rancanganB] = await Design.findOrCreate({
    where: { project_id: proyekB.id, nama_rancangan: 'Rancangan B 1' },
    defaults: { project_id: proyekB.id, nama_rancangan: 'Rancangan B 1' },
  });

  // Generate tokens
  const tokenAdmin = jwt.sign({ id: admin.id, role: admin.role, nama: admin.nama }, process.env.JWT_SECRET);
  const tokenWoA = jwt.sign({ id: woA.id, role: woA.role, nama: woA.nama }, process.env.JWT_SECRET);
  const tokenWoB = jwt.sign({ id: woB.id, role: woB.role, nama: woB.nama }, process.env.JWT_SECRET);

  const authAdmin = { Authorization: `Bearer ${tokenAdmin}` };
  const authWoA = { Authorization: `Bearer ${tokenWoA}` };
  const authWoB = { Authorization: `Bearer ${tokenWoB}` };

  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, resolve);
  });

  console.log(`Test server running on port ${TEST_PORT}\nStarting 22 Scenarios...\n`);

  let idDekorasiWoA = null;
  let idDekorasiWoB = null;

  try {
    // Skenario 1: WO A menambahkan dekorasi -> Berhasil, owner WO A, visibility Private
    const res1 = await request('/dekorasi', {
      method: 'POST',
      headers: authWoA,
      body: JSON.stringify({
        nama_dekorasi: 'Pelaminan Kayu Jati WO A',
        kategori: 'Pelaminan',
        harga: 7500000,
        panjang: 400,
        lebar: 200,
        tinggi: 250,
        deskripsi: 'Pelaminan privat milik WO A',
      }),
    });
    idDekorasiWoA = res1.data?.data?.id;
    const ok1 = res1.status === 201 &&
      res1.data?.data?.created_by_user_id === woA.id &&
      res1.data?.data?.visibility === 'private';
    recordTest(1, 'WO A menambahkan dekorasi', ok1, `Status: ${res1.status}, Owner: ${res1.data?.data?.created_by_user_id}, Visibility: ${res1.data?.data?.visibility}`);

    // Skenario 2: WO A melihat katalognya -> Dekorasi miliknya terlihat
    const res2 = await request('/dekorasi', { headers: authWoA });
    const adaDiKatalogA = (res2.data?.data || []).some((d) => d.id === idDekorasiWoA);
    recordTest(2, 'WO A melihat katalognya', res2.status === 200 && adaDiKatalogA, `Ditemukan di katalog WO A: ${adaDiKatalogA}`);

    // Skenario 3: WO B melihat katalog -> Dekorasi Private WO A tidak terlihat
    const res3 = await request('/dekorasi', { headers: authWoB });
    const adaDiKatalogB = (res3.data?.data || []).some((d) => d.id === idDekorasiWoA);
    recordTest(3, 'WO B melihat katalog', res3.status === 200 && !adaDiKatalogB, `Dekorasi privat WO A tersembunyi dari WO B: ${!adaDiKatalogB}`);

    // Skenario 4: WO B mengakses ID Private WO A -> Ditolak
    const res4 = await request(`/dekorasi/${idDekorasiWoA}`, { headers: authWoB });
    const ok4 = res4.status === 403 || res4.status === 404;
    recordTest(4, 'WO B mengakses ID Private WO A', ok4, `Status respon: ${res4.status} (Ditolak: ${ok4})`);

    // Skenario 5: WO A mengubah dekorasi menjadi Public -> Berhasil
    const res5 = await request(`/dekorasi/${idDekorasiWoA}/visibility`, {
      method: 'PATCH',
      headers: authWoA,
      body: JSON.stringify({ visibility: 'public' }),
    });
    const ok5 = res5.status === 200 && res5.data?.data?.visibility === 'public';
    recordTest(5, 'WO A mengubah dekorasi menjadi Public', ok5, `Status: ${res5.status}, Visibility baru: ${res5.data?.data?.visibility}`);

    // Skenario 6: WO B melihat katalog komunitas -> Dekorasi WO A terlihat
    const res6 = await request('/dekorasi', { headers: authWoB });
    const terlihatDiKatalogB = (res6.data?.data || []).some((d) => d.id === idDekorasiWoA);
    recordTest(6, 'WO B melihat katalog komunitas', res6.status === 200 && terlihatDiKatalogB, `Terlihat setelah diubah ke public: ${terlihatDiKatalogB}`);

    // Skenario 7: WO B membuka detail Public WO A -> Berhasil, informasi kontributor terlihat
    const res7 = await request(`/dekorasi/${idDekorasiWoA}`, { headers: authWoB });
    const ok7 = res7.status === 200 &&
      Boolean(res7.data?.data?.kontributor) &&
      res7.data?.data?.kontributor === woA.nama;
    recordTest(7, 'WO B membuka detail Public WO A', ok7, `Status: ${res7.status}, Kontributor: ${res7.data?.data?.kontributor}`);

    // Skenario 8: WO B mengubah dekorasi WO A -> Ditolak
    const res8 = await request(`/dekorasi/${idDekorasiWoA}`, {
      method: 'PUT',
      headers: authWoB,
      body: JSON.stringify({ nama_dekorasi: 'Nama Diubah Oleh WO B' }),
    });
    const ok8 = res8.status === 403;
    recordTest(8, 'WO B mengubah dekorasi WO A', ok8, `Status: ${res8.status} (Ditolak hak akses)`);

    // Skenario 9: WO B menghapus dekorasi WO A -> Ditolak
    const res9 = await request(`/dekorasi/${idDekorasiWoA}`, {
      method: 'DELETE',
      headers: authWoB,
    });
    const ok9 = res9.status === 403;
    recordTest(9, 'WO B menghapus dekorasi WO A', ok9, `Status: ${res9.status} (Ditolak hak akses)`);

    // Skenario 10: WO B mengubah visibilitas dekorasi WO A -> Ditolak
    const res10 = await request(`/dekorasi/${idDekorasiWoA}/visibility`, {
      method: 'PATCH',
      headers: authWoB,
      body: JSON.stringify({ visibility: 'private' }),
    });
    const ok10 = res10.status === 403;
    recordTest(10, 'WO B mengubah visibilitas dekorasi WO A', ok10, `Status: ${res10.status} (Ditolak hak akses)`);

    // Skenario 11: WO B menggunakan dekorasi Public WO A dalam rancangan -> Berhasil
    const res11 = await request(`/rancangan/${rancanganB.id}`, {
      method: 'PUT',
      headers: authWoB,
      body: JSON.stringify({
        item: [
          { decoration_id: idDekorasiWoA, posisi_x: 200, posisi_y: 200, rotasi: 0, jumlah: 1 },
        ],
      }),
    });
    const ok11 = res11.status === 200 && (res11.data?.data?.DesignItems || []).length > 0;
    recordTest(11, 'WO B menggunakan dekorasi Public WO A dalam rancangan', ok11, `Status: ${res11.status}, Item tersimpan: ${(res11.data?.data?.DesignItems || []).length}`);

    // Skenario 12: WO A mengubah dekorasi menjadi Private -> Berhasil
    const res12 = await request(`/dekorasi/${idDekorasiWoA}/visibility`, {
      method: 'PATCH',
      headers: authWoA,
      body: JSON.stringify({ visibility: 'private' }),
    });
    const ok12 = res12.status === 200 && res12.data?.data?.visibility === 'private';
    recordTest(12, 'WO A mengubah dekorasi menjadi Private', ok12, `Status: ${res12.status}, Visibility: ${res12.data?.data?.visibility}`);

    // Skenario 13: WO B mencoba menggunakan ulang dekorasi tersebut -> Ditolak
    const res13 = await request(`/rancangan/${rancanganB.id}`, {
      method: 'PUT',
      headers: authWoB,
      body: JSON.stringify({
        item: [
          { decoration_id: idDekorasiWoA, posisi_x: 300, posisi_y: 300, rotasi: 45, jumlah: 2 },
        ],
      }),
    });
    const ok13 = res13.status === 403;
    recordTest(13, 'WO B mencoba menggunakan ulang dekorasi privat tersebut', ok13, `Status: ${res13.status} (Ditolak penggunaan dekorasi privat)`);

    // Skenario 14: WO B membuka rancangan lama yang menggunakan dekorasi tadi -> Tetap berhasil
    const res14 = await request(`/rancangan/${rancanganB.id}`, { headers: authWoB });
    const itemTersimpanAda = (res14.data?.data?.DesignItems || []).some((i) => i.decoration_id === idDekorasiWoA);
    const ok14 = res14.status === 200 && itemTersimpanAda;
    recordTest(14, 'WO B membuka rancangan lama yang menggunakan dekorasi tadi', ok14, `Status: ${res14.status}, Referensi item lama tetap utuh: ${itemTersimpanAda}`);

    // Skenario 15: Admin mencoba menambahkan dekorasi -> Ditolak
    const res15 = await request('/dekorasi', {
      method: 'POST',
      headers: authAdmin,
      body: JSON.stringify({
        nama_dekorasi: 'Dekorasi Admin Ilegal',
        kategori: 'Pelaminan',
        harga: 1000000,
        panjang: 100,
        lebar: 100,
        tinggi: 100,
      }),
    });
    const ok15 = res15.status === 403;
    recordTest(15, 'Admin mencoba menambahkan dekorasi', ok15, `Status: ${res15.status} (Ditolak)`);

    // Skenario 16: Admin mencoba mengubah dekorasi -> Ditolak
    const res16 = await request(`/dekorasi/${idDekorasiWoA}`, {
      method: 'PUT',
      headers: authAdmin,
      body: JSON.stringify({ nama_dekorasi: 'Diubah Admin' }),
    });
    const ok16 = res16.status === 403;
    recordTest(16, 'Admin mencoba mengubah dekorasi', ok16, `Status: ${res16.status} (Ditolak)`);

    // Skenario 17: Admin mencoba menghapus dekorasi -> Ditolak
    const res17 = await request(`/dekorasi/${idDekorasiWoA}`, {
      method: 'DELETE',
      headers: authAdmin,
    });
    const ok17 = res17.status === 403;
    recordTest(17, 'Admin mencoba menghapus dekorasi', ok17, `Status: ${res17.status} (Ditolak)`);

    // Skenario 18: WO A mengakses dekorasi WO B yang Private -> Ditolak
    // Tambah dekorasi private milik WO B dulu
    const resTambahWoB = await request('/dekorasi', {
      method: 'POST',
      headers: authWoB,
      body: JSON.stringify({
        nama_dekorasi: 'Standing Flower Privat WO B',
        kategori: 'Bunga',
        harga: 500000,
        panjang: 50,
        lebar: 50,
        tinggi: 120,
      }),
    });
    idDekorasiWoB = resTambahWoB.data?.data?.id;

    const res18 = await request(`/dekorasi/${idDekorasiWoB}`, { headers: authWoA });
    const ok18 = res18.status === 403 || res18.status === 404;
    recordTest(18, 'WO A mengakses dekorasi WO B yang Private', ok18, `Status: ${res18.status} (Ditolak)`);

    // Skenario 19: WO membuka dekorasi bawaan WedSpace -> Berhasil
    // ID 1 adalah 'Pelaminan Floral Minimal' (aset bawaan platform)
    const res19 = await request('/dekorasi/1', { headers: authWoA });
    const ok19 = res19.status === 200 && res19.data?.data?.kontributor === 'WedSpace' && res19.data?.data?.created_by_user_id === null;
    recordTest(19, 'WO membuka dekorasi bawaan WedSpace', ok19, `Status: ${res19.status}, Kontributor: ${res19.data?.data?.kontributor}, Owner: ${res19.data?.data?.created_by_user_id}`);

    // Skenario 20: AI Recommendation dijalankan -> Hanya dekorasi yang dapat diakses WO yang digunakan
    // Uji fungsi ambilKatalogUntukGemini(userId) secara langsung
    const { ambilKatalogUntukGemini } = require('../services/gemini');
    const katalogUntukWoA = await ambilKatalogUntukGemini(woA.id);
    const adaMilikWoB = katalogUntukWoA.some((d) => d.id === idDekorasiWoB);
    const adaMilikSendiri = katalogUntukWoA.some((d) => d.id === idDekorasiWoA);
    const adaBawaan = katalogUntukWoA.some((d) => d.id === 1);
    const ok20 = !adaMilikWoB && adaMilikSendiri && adaBawaan;
    recordTest(20, 'AI Recommendation katalog akses', ok20, `Milik privat WO B disaring: ${!adaMilikWoB}, Milik WO A ada: ${adaMilikSendiri}, Bawaan ada: ${adaBawaan}`);

    // Skenario 21: Pengguna tanpa token mengakses endpoint terproteksi -> Ditolak
    const res21 = await request('/dekorasi');
    const ok21 = res21.status === 401;
    recordTest(21, 'Pengguna tanpa token mengakses endpoint terproteksi', ok21, `Status: ${res21.status} (Ditolak 401 Unauthorized)`);

    // Skenario 22: WO mengirim created_by_user_id palsu -> Sistem mengabaikan nilai tersebut
    const res22 = await request('/dekorasi', {
      method: 'POST',
      headers: authWoA,
      body: JSON.stringify({
        nama_dekorasi: 'Dekorasi Percobaan Spoofing Owner',
        kategori: 'Meja',
        harga: 300000,
        panjang: 120,
        lebar: 80,
        tinggi: 75,
        created_by_user_id: 9999, // user ID palsu
      }),
    });
    const idSpoof = res22.data?.data?.id;
    const ok22 = res22.status === 201 && res22.data?.data?.created_by_user_id === woA.id;
    recordTest(22, 'WO mengirim created_by_user_id palsu', ok22, `Status: ${res22.status}, Owner sebenarnya: ${res22.data?.data?.created_by_user_id} (bukan 9999)`);

    // Bersihkan dekorasi uji
    if (idSpoof) await Decoration.destroy({ where: { id: idSpoof } });
    if (idDekorasiWoB) await Decoration.destroy({ where: { id: idDekorasiWoB } });
    if (idDekorasiWoA) {
      await DesignItem.destroy({ where: { decoration_id: idDekorasiWoA } });
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
  console.log(`HASIL PENGUJIAN: ${passed} PASS, ${failed} FAIL dari ${results.length} Skenario`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests();
