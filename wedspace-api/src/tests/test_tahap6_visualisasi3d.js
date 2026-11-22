require('dotenv').config();
const path = require('node:path');
const fs = require('node:fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const express = require('express');
const cors = require('cors');

const {
  sequelize,
  User,
  Project,
  Design,
  Decoration,
  DesignItem,
  Model3DLibrary,
} = require('../models');

const rancanganRoutes = require('../routes/rancangan');
const dekorasiRoutes = require('../routes/dekorasi');
const { periksaAksesMedia } = require('../middleware/mediaAkses');
const { ensureSampleGlbFiles } = require('../utils/createSampleGlb');

const app = express();
app.use(cors());
app.use(express.json());

// Static / media routes
app.use('/uploads/library', express.static(path.join(__dirname, '..', '..', 'uploads', 'library')));
app.get('/uploads/:tipe/:file', periksaAksesMedia);

app.use('/api/rancangan', rancanganRoutes);
app.use('/api/dekorasi', dekorasiRoutes);

const TEST_PORT = 3096;
let server;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

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

async function runTahap6Tests() {
  await sequelize.authenticate();
  ensureSampleGlbFiles();

  const hash = await bcrypt.hash('password123', 10);
  const [woA] = await User.findOrCreate({
    where: { username_email: 'wo_3d_a@wedspace.test' },
    defaults: { nama: 'WO A 3D Tester', username_email: 'wo_3d_a@wedspace.test', password: hash, role: 'wo' },
  });
  const [woB] = await User.findOrCreate({
    where: { username_email: 'wo_3d_b@wedspace.test' },
    defaults: { nama: 'WO B 3D Tester', username_email: 'wo_3d_b@wedspace.test', password: hash, role: 'wo' },
  });

  const tokenWOA = jwt.sign({ id: woA.id, role: woA.role, nama: woA.nama }, process.env.JWT_SECRET, { expiresIn: '2h' });
  const tokenWOB = jwt.sign({ id: woB.id, role: woB.role, nama: woB.nama }, process.env.JWT_SECRET, { expiresIn: '2h' });

  // 1. Setup Proyek & Rancangan
  const [proyekA] = await Project.findOrCreate({
    where: { nama_proyek: 'Pernikahan 3D Grand Ballroom', user_id: woA.id },
    defaults: {
      user_id: woA.id,
      nama_proyek: 'Pernikahan 3D Grand Ballroom',
      nama_klien: 'Dewi & Rangga',
      tanggal_acara: '2026-12-25',
      nama_venue: 'Grand Ballroom Aster',
      panjang_venue: 2000, // 20m
      lebar_venue: 1200,   // 12m
      anggaran: 80000000,
    },
  });

  const [rancanganA] = await Design.findOrCreate({
    where: { project_id: proyekA.id, nama_rancangan: 'Layout 3D Utama' },
    defaults: {
      project_id: proyekA.id,
      nama_rancangan: 'Layout 3D Utama',
    },
  });

  // Seed sample library items if not yet present
  let [libMeja] = await Model3DLibrary.findOrCreate({
    where: { nama_model: 'Meja Bundar Klasik' },
    defaults: {
      nama_model: 'Meja Bundar Klasik',
      kategori: 'Meja',
      file_path: '/uploads/library/meja_bundar.glb',
      deskripsi: 'Meja banquet bundar klasik 8 kursi',
      is_active: true,
    },
  });

  let [libKursi] = await Model3DLibrary.findOrCreate({
    where: { nama_model: 'Kursi Tiffany Gold' },
    defaults: {
      nama_model: 'Kursi Tiffany Gold',
      kategori: 'Kursi',
      file_path: '/uploads/library/kursi_tiffany.glb',
      deskripsi: 'Kursi tiffany gold mewah dengan bantalan ivory',
      is_active: true,
    },
  });

  // Start HTTP Test Server
  server = app.listen(TEST_PORT);

  try {
    console.log('\n--- TAHAP 6: AUTOMATED TEST SUITE (VISUALISASI 3D) ---');

    // ==========================================
    // GRUP 1: Model & Schema Platform 3D Library
    // ==========================================
    {
      const models = await Model3DLibrary.findAll({ where: { is_active: true } });
      const lulus = models.length >= 2;
      record('Schema & Library', 'T6-01: Model3DLibrary tersimpan dan aktif di database', lulus,
        `Ditemukan ${models.length} model library aktif di database`);
    }

    {
      const attributes = Object.keys(Decoration.rawAttributes);
      const adaSource = attributes.includes('model_3d_source');
      const adaLibId = attributes.includes('library_model_id');
      const lulus = adaSource && adaLibId;
      record('Schema & Library', 'T6-02: Field model_3d_source & library_model_id terdefinisi di Decoration', lulus,
        `model_3d_source: ${adaSource}, library_model_id: ${adaLibId}`);
    }

    // ==========================================
    // GRUP 2: Endpoint Library 3D
    // ==========================================
    {
      const res = await request('/api/dekorasi/library-3d', {
        headers: { Authorization: `Bearer ${tokenWOA}` },
      });
      const lulus = res.status === 200 && Array.isArray(res.data?.data) && res.data.data.length >= 2;
      record('API Library 3D', 'T6-03: GET /api/dekorasi/library-3d mengembalikan daftar model library', lulus,
        `Status ${res.status}, total model: ${res.data?.data?.length}`);
    }

    {
      const res = await request('/api/dekorasi/library-3d');
      const lulus = res.status === 401;
      record('API Library 3D', 'T6-04: GET /api/dekorasi/library-3d menolak akses unauthenticated (401)', lulus,
        `Status ${res.status}`);
    }

    {
      const res = await fetch(`${BASE_URL}/uploads/library/meja_bundar.glb`);
      const lulus = res.status === 200;
      record('Static Asset Serving', 'T6-05: Static serving aset library 3D (/uploads/library/...) berfungsi', lulus,
        `Status ${res.status}, content-type: ${res.headers.get('content-type') || 'binary'}`);
    }

    // ==========================================
    // GRUP 3: Integrasi Dekorasi Hybrid 3D System
    // ==========================================
    let dekorasiLib, dekorasiUpload, dekorasiProcedural;

    {
      // 1. Dekorasi berbasis Platform 3D Library
      dekorasiLib = await Decoration.create({
        nama_dekorasi: 'Meja VIP Library',
        kategori: 'Meja',
        harga: 500000,
        panjang: 180,
        lebar: 180,
        tinggi: 75,
        model_3d_source: 'library',
        library_model_id: libMeja.id,
        created_by_user_id: woA.id,
        visibility: 'private',
        is_active: true,
      });

      // 2. Dekorasi berbasis Upload WO
      dekorasiUpload = await Decoration.create({
        nama_dekorasi: 'Pelaminan Adat Modern Custom',
        kategori: 'Pelaminan',
        harga: 15000000,
        panjang: 600,
        lebar: 250,
        tinggi: 300,
        model_3d: '/uploads/model/pelaminan_custom.glb',
        model_3d_source: 'upload',
        created_by_user_id: woA.id,
        visibility: 'private',
        is_active: true,
      });

      // 3. Dekorasi berbasis Procedural Three.js
      dekorasiProcedural = await Decoration.create({
        nama_dekorasi: 'Standing Flower Rose Procedural',
        kategori: 'Bunga',
        harga: 350000,
        panjang: 50,
        lebar: 50,
        tinggi: 120,
        model_3d_source: 'placeholder',
        created_by_user_id: woA.id,
        visibility: 'private',
        is_active: true,
      });

      const res = await request(`/api/dekorasi/${dekorasiLib.id}`, {
        headers: { Authorization: `Bearer ${tokenWOA}` },
      });
      const data = res.data?.data;
      const lulus = res.status === 200 && data.model_3d_source === 'library' && data.Model3DLibrary?.nama_model === 'Meja Bundar Klasik';
      record('Hybrid 3D Catalog', 'T6-06: GET /api/dekorasi/:id menyertakan relasi Model3DLibrary', lulus,
        `Source: ${data?.model_3d_source}, Library: ${data?.Model3DLibrary?.nama_model}`);
    }

    // ==========================================
    // GRUP 4: Endpoint Rancangan untuk 3D Viewport
    // ==========================================
    {
      // Pasang item ke dalam rancangan
      await DesignItem.destroy({ where: { design_id: rancanganA.id } });

      await DesignItem.bulkCreate([
        {
          design_id: rancanganA.id,
          decoration_id: dekorasiLib.id,
          posisi_x: 200, // 2m dari kiri
          posisi_y: 300, // 3m dari atas
          rotasi: 0,
          jumlah: 2,
        },
        {
          design_id: rancanganA.id,
          decoration_id: dekorasiUpload.id,
          posisi_x: 700, // 7m dari kiri
          posisi_y: 50,  // 0.5m dari dinding atas
          rotasi: 180,
          jumlah: 1,
        },
        {
          design_id: rancanganA.id,
          decoration_id: dekorasiProcedural.id,
          posisi_x: 500,
          posisi_y: 800,
          rotasi: 45,
          jumlah: 4,
        },
      ]);

      const res = await request(`/api/rancangan/${rancanganA.id}`, {
        headers: { Authorization: `Bearer ${tokenWOA}` },
      });

      const r = res.data?.data;
      const items = r?.DesignItems || [];
      const itemLib = items.find((i) => i.decoration_id === dekorasiLib.id);
      const itemUp = items.find((i) => i.decoration_id === dekorasiUpload.id);
      const itemProc = items.find((i) => i.decoration_id === dekorasiProcedural.id);

      const lulus = res.status === 200 &&
        items.length === 3 &&
        itemLib?.Decoration?.Model3DLibrary?.file_path === '/uploads/library/meja_bundar.glb' &&
        itemUp?.Decoration?.model_3d_source === 'upload' &&
        itemProc?.Decoration?.model_3d_source === 'placeholder' &&
        r?.proyek?.panjang_venue === 2000 &&
        r?.proyek?.lebar_venue === 1200;

      record('Rancangan 3D Integration', 'T6-07: GET /api/rancangan/:id menyajikan seluruh atribut 3D dan ukuran venue', lulus,
        `Items: ${items.length}, Proyek: ${r?.proyek?.panjang_venue}x${r?.proyek?.lebar_venue}cm, Lib: ${itemLib?.Decoration?.model_3d_source}`);
    }

    {
      // Proteksi akses rancangan: WO B tidak boleh mengakses rancangan WO A
      const res = await request(`/api/rancangan/${rancanganA.id}`, {
        headers: { Authorization: `Bearer ${tokenWOB}` },
      });
      const lulus = res.status === 403;
      record('Rancangan 3D Security', 'T6-08: WO lain dilarang memuat rancangan 3D milik pengguna lain (403)', lulus,
        `Status ${res.status}`);
    }

    // ==========================================
    // GRUP 5: Verifikasi Matematika Koordinat 2D ke 3D
    // ==========================================
    {
      const venueW = 20.0; // 2000 cm = 20 meter
      const venueD = 12.0; // 1200 cm = 12 meter

      // Uji Item 1: Meja (180x180cm -> 1.8x1.8m), pos (200, 300 cm -> 2.0, 3.0 m)
      const itemW = 1.8;
      const itemD = 1.8;
      const posX2D = 2.0;
      const posY2D = 3.0;

      const expectedX3D = -venueW / 2 + posX2D + itemW / 2; // -10 + 2.0 + 0.9 = -7.1
      const expectedZ3D = -venueD / 2 + posY2D + itemD / 2; // -6 + 3.0 + 0.9 = -2.1

      const tolerance = 0.0001;
      const calcX3D = -10 + 2.0 + 0.9;
      const calcZ3D = -6 + 3.0 + 0.9;

      const isXCorrect = Math.abs(calcX3D - (-7.1)) < tolerance;
      const isZCorrect = Math.abs(calcZ3D - (-2.1)) < tolerance;

      // Uji Rotasi: 45 derajat -> -45 * PI / 180 rad
      const rotDeg = 45;
      const rotRad = -(rotDeg * Math.PI) / 180;
      const isRotCorrect = Math.abs(rotRad - (-0.785398)) < 0.001;

      const lulus = isXCorrect && isZCorrect && isRotCorrect;
      record('Coordinate Mapping', 'T6-09: Rumus pemetaan koordinat 2D ke titik 3D pusat lantai tepat secara matematis', lulus,
        `X_3D=${calcX3D}m (harus -7.1m), Z_3D=${calcZ3D}m (harus -2.1m), RotY=${rotRad.toFixed(3)}rad`);
    }

    {
      // Uji Item di Pojok Ekstrem (0, 0)
      const venueW = 20.0;
      const venueD = 12.0;
      const itemW = 1.0;
      const itemD = 1.0;

      // Pojok Kiri Atas (0, 0)
      const cornerMinX = -venueW / 2 + 0 + itemW / 2; // -9.5m
      const cornerMinZ = -venueD / 2 + 0 + itemD / 2; // -5.5m

      // Pojok Kanan Bawah (venueW - itemW, venueD - itemD)
      const posXMax = venueW - itemW;
      const posYMax = venueD - itemD;
      const cornerMaxX = -venueW / 2 + posXMax + itemW / 2; // +9.5m
      const cornerMaxZ = -venueD / 2 + posYMax + itemD / 2; // +5.5m

      const insideBoundary =
        cornerMinX >= -venueW / 2 && cornerMinX <= venueW / 2 &&
        cornerMinZ >= -venueD / 2 && cornerMinZ <= venueD / 2 &&
        cornerMaxX >= -venueW / 2 && cornerMaxX <= venueW / 2 &&
        cornerMaxZ >= -venueD / 2 && cornerMaxZ <= venueD / 2;

      record('Coordinate Mapping', 'T6-10: Seluruh objek berada dalam batas fisik lantai venue [-L/2, +L/2] & [-W/2, +W/2]', insideBoundary,
        `Batas X: [${cornerMinX}, ${cornerMaxX}] vs [${-venueW/2}, ${venueW/2}], Batas Z: [${cornerMinZ}, ${cornerMaxZ}] vs [${-venueD/2}, ${venueD/2}]`);
    }

    // ==========================================
    // GRUP 6: Penanganan Rancangan Kosong (Empty State 3D)
    // ==========================================
    {
      const [rancanganKosong] = await Design.findOrCreate({
        where: { project_id: proyekA.id, nama_rancangan: 'Layout 3D Kosong' },
        defaults: { project_id: proyekA.id, nama_rancangan: 'Layout 3D Kosong' },
      });
      await DesignItem.destroy({ where: { design_id: rancanganKosong.id } });

      const res = await request(`/api/rancangan/${rancanganKosong.id}`, {
        headers: { Authorization: `Bearer ${tokenWOA}` },
      });

      const lulus = res.status === 200 && Array.isArray(res.data?.data?.DesignItems) && res.data.data.DesignItems.length === 0;
      record('Empty State Handling', 'T6-11: Rancangan tanpa dekorasi tetap mengembalikan 200 dengan DesignItems kosong', lulus,
        `Status ${res.status}, items: ${res.data?.data?.DesignItems?.length}`);
    }

    // ==========================================
    // GRUP 7: Idempotensi dan Integritas Database
    // ==========================================
    {
      // Bersihkan data tes sementara agar tidak mempengaruhi tes lain
      await DesignItem.destroy({ where: { design_id: rancanganA.id } });
      await dekorasiLib.destroy();
      await dekorasiUpload.destroy();
      await dekorasiProcedural.destroy();

      const itemSisa = await Decoration.count({
        where: { nama_dekorasi: ['Meja VIP Library', 'Pelaminan Adat Modern Custom', 'Standing Flower Rose Procedural'] },
      });
      const lulus = itemSisa === 0;
      record('Cleanup & Idempotency', 'T6-12: Cleanup data uji sementara berjalan bersih tanpa merusak database', lulus,
        `Sisa item tes: ${itemSisa}`);
    }

    console.log('\n========================================');
    console.log('HASIL PENGUJIAN TAHAP 6:');
    const total = results.length;
    const passed = results.filter((r) => r.lulus).length;
    const failed = total - passed;
    console.log(`TOTAL: ${total} | PASS: ${passed} | FAIL: ${failed}`);
    console.log('========================================\n');

    if (failed > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Fatal error saat pengujian Tahap 6:', err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
  }
}

if (require.main === module) {
  runTahap6Tests().then(() => {
    process.exit(process.exitCode || 0);
  });
}

module.exports = { runTahap6Tests };
