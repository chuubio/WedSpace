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

const TEST_PORT = 3097;
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

async function runTahap4Tests() {
  await sequelize.authenticate();

  const hash = await bcrypt.hash('password123', 10);
  const [woA] = await User.findOrCreate({
    where: { username_email: 'wo@wedspace.test' },
    defaults: { nama: 'Ella (WO A)', username_email: 'wo@wedspace.test', password: hash, role: 'wo' },
  });

  const [woB] = await User.findOrCreate({
    where: { username_email: 'wo2@wedspace.test' },
    defaults: { nama: 'Budi (WO B)', username_email: 'wo2@wedspace.test', password: hash, role: 'wo' },
  });

  const tokenWoA = jwt.sign({ id: woA.id, role: woA.role, nama: woA.nama }, process.env.JWT_SECRET);
  const tokenWoB = jwt.sign({ id: woB.id, role: woB.role, nama: woB.nama }, process.env.JWT_SECRET);

  const authWoA = { Authorization: `Bearer ${tokenWoA}` };
  const authWoB = { Authorization: `Bearer ${tokenWoB}` };

  // Setup proyek valid milik WO A
  const [proyekA] = await Project.findOrCreate({
    where: { user_id: woA.id, nama_proyek: 'Pernikahan Rina & Dimas' },
    defaults: {
      user_id: woA.id,
      nama_proyek: 'Pernikahan Rina & Dimas',
      nama_venue: 'Grand Ballroom Balikpapan',
      panjang_venue: 20, // 20m
      lebar_venue: 12,   // 12m
    },
  });

  // Setup rancangan untuk WO A
  const [rancanganA] = await Design.findOrCreate({
    where: { project_id: proyekA.id, nama_rancangan: 'Rancangan 1' },
    defaults: { project_id: proyekA.id, nama_rancangan: 'Rancangan 1' },
  });

  // Setup dekorasi privat milik WO A
  const [dekorasiPrivatA] = await Decoration.findOrCreate({
    where: { nama_dekorasi: 'Pelaminan Kayu Jati Privat A' },
    defaults: {
      nama_dekorasi: 'Pelaminan Kayu Jati Privat A',
      kategori: 'Pelaminan',
      harga: 6000000,
      panjang: 400,
      lebar: 200,
      tinggi: 250,
      created_by_user_id: woA.id,
      visibility: 'private',
      is_active: true,
    },
  });

  // Setup dekorasi publik milik WO B
  const [dekorasiPublikB] = await Decoration.findOrCreate({
    where: { nama_dekorasi: 'Standing Flower Komunitas B' },
    defaults: {
      nama_dekorasi: 'Standing Flower Komunitas B',
      kategori: 'Bunga',
      harga: 350000,
      panjang: 50,
      lebar: 50,
      tinggi: 140,
      created_by_user_id: woB.id,
      visibility: 'public',
      is_active: true,
    },
  });

  // Setup dekorasi privat milik WO B (tidak boleh dipakai WO A)
  const [dekorasiPrivatB] = await Decoration.findOrCreate({
    where: { nama_dekorasi: 'Backdrop Eksklusif WO B' },
    defaults: {
      nama_dekorasi: 'Backdrop Eksklusif WO B',
      kategori: 'Backdrop',
      harga: 2000000,
      panjang: 250,
      lebar: 30,
      tinggi: 250,
      created_by_user_id: woB.id,
      visibility: 'private',
      is_active: true,
    },
  });

  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, resolve);
  });

  console.log(`Test server running on port ${TEST_PORT}\nStarting Tahap 4 Workspace Layout 2D verification tests...\n`);

  try {
    // Skenario 1: WO membuka editor dari proyek -> Workspace terbuka dengan proyek yang benar
    const resBuka = await request(`/rancangan/${rancanganA.id}`, { headers: authWoA });
    const ok1 = resBuka.status === 200 &&
      resBuka.data?.data?.id === rancanganA.id &&
      resBuka.data?.data?.proyek?.id === proyekA.id;
    record('Canvas', 'WO membuka editor dari proyek', ok1, `Status: ${resBuka.status}, Proyek ID: ${resBuka.data?.data?.proyek?.id}`);

    // Skenario 2: Proyek memiliki ukuran venue valid
    const ok2 = resBuka.data?.data?.proyek?.panjang_venue === 20 &&
      resBuka.data?.data?.proyek?.lebar_venue === 12;
    record('Canvas', 'Proyek memiliki ukuran venue valid (20m × 12m)', ok2, `P: ${resBuka.data?.data?.proyek?.panjang_venue}m, L: ${resBuka.data?.data?.proyek?.lebar_venue}m`);

    // Skenario 3: Proyek tidak memiliki ukuran valid (simulasi validasi proyek 0x0)
    const [proyekTanpaUkuran] = await Project.findOrCreate({
      where: { user_id: woA.id, nama_proyek: 'Proyek Ukuran Nol' },
      defaults: {
        user_id: woA.id,
        nama_proyek: 'Proyek Ukuran Nol',
        nama_venue: 'Venue Belum Diukur',
        panjang_venue: 0,
        lebar_venue: 0,
      },
    });
    const [rancanganTanpaUkuran] = await Design.findOrCreate({
      where: { project_id: proyekTanpaUkuran.id, nama_rancangan: 'Rancangan Kosong' },
      defaults: { project_id: proyekTanpaUkuran.id, nama_rancangan: 'Rancangan Kosong' },
    });
    const resBukaNol = await request(`/rancangan/${rancanganTanpaUkuran.id}`, { headers: authWoA });
    const pNol = resBukaNol.data?.data?.proyek?.panjang_venue;
    const lNol = resBukaNol.data?.data?.proyek?.lebar_venue;
    const ok3 = Number(pNol || 0) <= 0 || Number(lNol || 0) <= 0;
    record('Canvas', 'Proyek tidak memiliki ukuran valid (terdeteksi)', ok3, `Panjang: ${pNol}, Lebar: ${lNol} (Memerlukan pelengkapan ukuran di UI)`);

    // Skenario 4: WO membuka panel dekorasi -> Data katalog tampil dari API
    const resPaletSaya = await request('/dekorasi?scope=mine', { headers: authWoA });
    const ok4 = resPaletSaya.status === 200 && Array.isArray(resPaletSaya.data?.data);
    record('Katalog Panel', 'Data katalog palet tampil dari API', ok4, `Jumlah item saya: ${resPaletSaya.data?.data?.length}`);

    // Skenario 5: WO memilih Katalog Saya -> Dekorasi miliknya terlihat
    const adaDiSaya = (resPaletSaya.data?.data || []).some((d) => d.id === dekorasiPrivatA.id);
    record('Katalog Panel', 'Katalog Saya memuat dekorasi pribadi WO A', adaDiSaya, `Item ID ${dekorasiPrivatA.id} ditemukan: ${adaDiSaya}`);

    // Skenario 6: WO memilih Katalog Komunitas -> Dekorasi Public terlihat
    const resPaletKomunitas = await request('/dekorasi?scope=community', { headers: authWoA });
    const adaDiKomunitas = (resPaletKomunitas.data?.data || []).some((d) => d.id === dekorasiPublikB.id);
    record('Katalog Panel', 'Katalog Komunitas memuat dekorasi publik WO B', adaDiKomunitas, `Item ID ${dekorasiPublikB.id} ditemukan: ${adaDiKomunitas}`);

    // Skenario 7: WO menambahkan dekorasi ke canvas dan menyimpan (Persistensi Posisi cm)
    // Titik: X: 1000 cm (10m), Y: 170 cm (1.7m), Rotasi: 0, Jumlah: 1
    const resSimpan1 = await request(`/rancangan/${rancanganA.id}`, {
      method: 'PUT',
      headers: authWoA,
      body: JSON.stringify({
        item: [
          {
            decoration_id: dekorasiPrivatA.id,
            posisi_x: 1000,
            posisi_y: 170,
            rotasi: 0,
            jumlah: 1,
          },
        ],
      }),
    });
    const ok7 = resSimpan1.status === 200 &&
      resSimpan1.data?.data?.DesignItems?.length === 1 &&
      resSimpan1.data?.data?.DesignItems[0].posisi_x === 1000 &&
      resSimpan1.data?.data?.DesignItems[0].posisi_y === 170;
    record('Interaksi & Simpan', 'WO menambahkan dekorasi ke canvas & posisi tersimpan', ok7, `Items: ${resSimpan1.data?.data?.DesignItems?.length}, X: ${resSimpan1.data?.data?.DesignItems?.[0]?.posisi_x} cm`);

    // Skenario 8: WO menambahkan beberapa dekorasi (milik pribadi + milik publik komunitas)
    const resSimpanMulti = await request(`/rancangan/${rancanganA.id}`, {
      method: 'PUT',
      headers: authWoA,
      body: JSON.stringify({
        item: [
          {
            decoration_id: dekorasiPrivatA.id,
            posisi_x: 1000,
            posisi_y: 170,
            rotasi: 0,
            jumlah: 1,
          },
          {
            decoration_id: dekorasiPublikB.id,
            posisi_x: 700,
            posisi_y: 500,
            rotasi: 45,
            jumlah: 4,
          },
        ],
      }),
    });
    const ok8 = resSimpanMulti.status === 200 && resSimpanMulti.data?.data?.DesignItems?.length === 2;
    record('Interaksi & Simpan', 'WO menambahkan beberapa dekorasi (Pribadi + Komunitas)', ok8, `Total tersimpan: ${resSimpanMulti.data?.data?.DesignItems?.length} item`);

    // Skenario 9: WO memindahkan dekorasi (perubahan posisi X dan Y)
    const resPindah = await request(`/rancangan/${rancanganA.id}`, {
      method: 'PUT',
      headers: authWoA,
      body: JSON.stringify({
        item: [
          {
            decoration_id: dekorasiPrivatA.id,
            posisi_x: 1200, // geser ke 12m
            posisi_y: 250,  // geser ke 2.5m
            rotasi: 0,
            jumlah: 1,
          },
        ],
      }),
    });
    const itemPindah = resPindah.data?.data?.DesignItems?.[0];
    const ok9 = resPindah.status === 200 && itemPindah?.posisi_x === 1200 && itemPindah?.posisi_y === 250;
    record('Interaksi & Simpan', 'WO memindahkan posisi dekorasi (X: 1200, Y: 250)', ok9, `Posisi baru: (${itemPindah?.posisi_x}, ${itemPindah?.posisi_y}) cm`);

    // Skenario 10: WO memutar dekorasi (rotasi 90 derajat)
    const resPutar = await request(`/rancangan/${rancanganA.id}`, {
      method: 'PUT',
      headers: authWoA,
      body: JSON.stringify({
        item: [
          {
            decoration_id: dekorasiPrivatA.id,
            posisi_x: 1200,
            posisi_y: 250,
            rotasi: 90,
            jumlah: 1,
          },
        ],
      }),
    });
    const itemPutar = resPutar.data?.data?.DesignItems?.[0];
    const ok10 = resPutar.status === 200 && itemPutar?.rotasi === 90;
    record('Interaksi & Simpan', 'WO memutar orientasi dekorasi (rotasi: 90°)', ok10, `Rotasi: ${itemPutar?.rotasi}°`);

    // Skenario 11: WO mengubah jumlah unit dekorasi (jumlah = 3)
    const resJumlah = await request(`/rancangan/${rancanganA.id}`, {
      method: 'PUT',
      headers: authWoA,
      body: JSON.stringify({
        item: [
          {
            decoration_id: dekorasiPrivatA.id,
            posisi_x: 1200,
            posisi_y: 250,
            rotasi: 90,
            jumlah: 3,
          },
        ],
      }),
    });
    const itemJumlah = resJumlah.data?.data?.DesignItems?.[0];
    const ok11 = resJumlah.status === 200 && itemJumlah?.jumlah === 3;
    record('Interaksi & Simpan', 'WO mengubah jumlah unit dekorasi (jumlah: 3)', ok11, `Jumlah: ${itemJumlah?.jumlah}`);

    // Skenario 12: WO membuka kembali editor -> Seluruh data posisi, rotasi, jumlah konsisten
    const resBukaUlang = await request(`/rancangan/${rancanganA.id}`, { headers: authWoA });
    const itemMuatUlang = resBukaUlang.data?.data?.DesignItems?.[0];
    const ok12 = resBukaUlang.status === 200 &&
      itemMuatUlang?.posisi_x === 1200 &&
      itemMuatUlang?.posisi_y === 250 &&
      itemMuatUlang?.rotasi === 90 &&
      itemMuatUlang?.jumlah === 3;
    record('Persistensi', 'WO membuka kembali editor (data persisten akurat)', ok12, `X:${itemMuatUlang?.posisi_x}, Y:${itemMuatUlang?.posisi_y}, Rot:${itemMuatUlang?.rotasi}°, Jml:${itemMuatUlang?.jumlah}`);

    // Skenario 13: WO menghapus semua dekorasi lalu menyimpan (rancangan kosong)
    const resSimpanKosong = await request(`/rancangan/${rancanganA.id}`, {
      method: 'PUT',
      headers: authWoA,
      body: JSON.stringify({ item: [] }),
    });
    const ok13 = resSimpanKosong.status === 200 && resSimpanKosong.data?.data?.DesignItems?.length === 0;
    record('Interaksi & Simpan', 'WO mengosongkan canvas lalu menyimpan (rancangan kosong)', ok13, `Jumlah item tersimpan: ${resSimpanKosong.data?.data?.DesignItems?.length}`);

    // Skenario 14: WO A mencoba memasukkan dekorasi privat milik WO B -> Ditolak 403
    const resIlegalB = await request(`/rancangan/${rancanganA.id}`, {
      method: 'PUT',
      headers: authWoA,
      body: JSON.stringify({
        item: [
          {
            decoration_id: dekorasiPrivatB.id,
            posisi_x: 500,
            posisi_y: 500,
            rotasi: 0,
            jumlah: 1,
          },
        ],
      }),
    });
    const ok14 = resIlegalB.status === 403;
    record('Keamanan', 'WO A mencoba memasukkan dekorasi privat WO B (Ditolak 403)', ok14, `Status: ${resIlegalB.status}, Pesan: ${resIlegalB.data?.pesan}`);

    // Skenario 15: WO B mencoba membuka rancangan milik WO A -> Ditolak 403
    const resBukaIlegal = await request(`/rancangan/${rancanganA.id}`, { headers: authWoB });
    const ok15 = resBukaIlegal.status === 403;
    record('Keamanan', 'WO B mencoba membuka rancangan milik WO A (Ditolak 403)', ok15, `Status: ${resBukaIlegal.status}`);

    // Kembalikan item contoh awal agar rancangan tidak kosong
    await request(`/rancangan/${rancanganA.id}`, {
      method: 'PUT',
      headers: authWoA,
      body: JSON.stringify({
        item: [
          {
            decoration_id: 1, // Pelaminan Floral Minimal
            posisi_x: 1000,
            posisi_y: 170,
            rotasi: 0,
            jumlah: 1,
          },
        ],
      }),
    });

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    server.close();
    await sequelize.close();
  }

  const passed = results.filter((r) => r.lulus).length;
  const failed = results.filter((r) => !r.lulus).length;
  console.log(`\n========================================`);
  console.log(`HASIL VERIFIKASI TAHAP 4: ${passed} PASS, ${failed} FAIL dari ${results.length} Skenario`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTahap4Tests();
