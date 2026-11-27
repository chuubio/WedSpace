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
} = require('../models');

const express = require('express');
const cors = require('cors');
const rancanganRoutes = require('../routes/rancangan');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/rancangan', rancanganRoutes);

const TEST_PORT = 3096;
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

async function runTahap4aTests() {
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

  const [proyekA] = await Project.findOrCreate({
    where: { user_id: woA.id, nama_proyek: 'Pernikahan Rina & Dimas' },
    defaults: {
      user_id: woA.id,
      nama_proyek: 'Pernikahan Rina & Dimas',
      nama_venue: 'Grand Ballroom Balikpapan',
      panjang_venue: 20,
      lebar_venue: 12,
    },
  });

  const [rancanganA] = await Design.findOrCreate({
    where: { project_id: proyekA.id, nama_rancangan: 'Rancangan 1' },
    defaults: { project_id: proyekA.id, nama_rancangan: 'Rancangan 1' },
  });

  const [dekorasiA] = await Decoration.findOrCreate({
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

  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, resolve);
  });

  console.log(`Test server running on port ${TEST_PORT}\nStarting Tahap 4A verification tests...\n`);

  try {
    // 1. Transaction & Persistence: Simpan item normal
    const resSimpanNormal = await request(`/rancangan/${rancanganA.id}`, {
      method: 'PUT',
      headers: authWoA,
      body: JSON.stringify({
        nama_rancangan: 'Rancangan 1 Updated',
        item: [
          {
            decoration_id: dekorasiA.id,
            posisi_x: 500,
            posisi_y: 300,
            rotasi: 0,
            jumlah: 2,
          },
        ],
      }),
    });

    const itemsAwal = resSimpanNormal.data?.data?.DesignItems || [];
    const ok1 = resSimpanNormal.status === 200 && itemsAwal.length === 1 && typeof itemsAwal[0].id === 'number';
    record('Database Transaction', 'Penyimpanan normal dalam transaction berhasil committed', ok1, `Status: ${resSimpanNormal.status}, Item ID DB: ${itemsAwal[0]?.id}`);

    // 2. ID Synchronization: Item tersimpan memiliki ID database integer valid
    const ok2 = typeof itemsAwal[0]?.id === 'number' && itemsAwal[0]?.id > 0;
    record('Sinkronisasi ID', 'Item hasil simpan mengembalikan ID asli dari database MySQL', ok2, `ID: ${itemsAwal[0]?.id}, Posisi: (${itemsAwal[0]?.posisi_x}, ${itemsAwal[0]?.posisi_y})`);

    // 3. Transaction Rollback (Failure Injection pada endpoint PUT /api/rancangan/:id):
    // Simulasi kegagalan DesignItem.bulkCreate saat menyimpan via HTTP PUT
    const originalBulkCreate = DesignItem.bulkCreate;
    let rollbackViaEndpointBerhasil = false;
    let statusGagal = null;
    try {
      DesignItem.bulkCreate = async () => {
        throw new Error('SIMULASI_KEGAGALAN_BULK_CREATE');
      };
      const resGagal = await request(`/rancangan/${rancanganA.id}`, {
        method: 'PUT',
        headers: authWoA,
        body: JSON.stringify({
          nama_rancangan: 'Nama Seharusnya Rollback',
          item: [
            {
              decoration_id: dekorasiA.id,
              posisi_x: 999,
              posisi_y: 888,
              rotasi: 45,
              jumlah: 5,
            },
          ],
        }),
      });
      statusGagal = resGagal.status;
    } finally {
      DesignItem.bulkCreate = originalBulkCreate;
    }
    const cekItemSetelahGagal = await DesignItem.findAll({ where: { design_id: rancanganA.id } });
    const cekDesignSetelahGagal = await Design.findByPk(rancanganA.id);
    rollbackViaEndpointBerhasil =
      statusGagal === 500 &&
      cekItemSetelahGagal.length === 1 &&
      cekItemSetelahGagal[0].id === itemsAwal[0].id &&
      cekItemSetelahGagal[0].posisi_x === 500 &&
      cekDesignSetelahGagal.nama_rancangan === 'Rancangan 1 Updated';
    record(
      'Database Transaction',
      'Kegagalan bulkCreate pada PUT me-rollback destroy & update nama (data lama utuh)',
      rollbackViaEndpointBerhasil,
      `HTTP: ${statusGagal}, Item utuh: ${cekItemSetelahGagal.length} (ID ${cekItemSetelahGagal[0]?.id}), Nama: "${cekDesignSetelahGagal?.nama_rancangan}"`
    );

    // 4. Kasus khusus: PUT tanpa field `item` (hanya ubah nama) tidak menghapus item lama
    const resTanpaItem = await request(`/rancangan/${rancanganA.id}`, {
      method: 'PUT',
      headers: authWoA,
      body: JSON.stringify({
        nama_rancangan: 'Rancangan 1 Rename Saja',
      }),
    });
    const okTanpaItem =
      resTanpaItem.status === 200 &&
      resTanpaItem.data?.data?.nama_rancangan === 'Rancangan 1 Rename Saja' &&
      (resTanpaItem.data?.data?.DesignItems || []).length === 1 &&
      resTanpaItem.data?.data?.DesignItems[0].id === itemsAwal[0].id;
    record(
      'Database Transaction',
      'PUT tanpa field `item` mempertahankan item lama dan hanya memperbarui nama',
      okTanpaItem,
      `Items count: ${resTanpaItem.data?.data?.DesignItems?.length}, Nama: "${resTanpaItem.data?.data?.nama_rancangan}"`
    );

    // 5. Kasus khusus: Simpan rancangan kosong (item: [])
    const resKosong = await request(`/rancangan/${rancanganA.id}`, {
      method: 'PUT',
      headers: authWoA,
      body: JSON.stringify({
        item: [],
      }),
    });
    const ok4 = resKosong.status === 200 && (resKosong.data?.data?.DesignItems || []).length === 0;
    record('Database Transaction', 'Menyimpan rancangan kosong (item: []) berhasil committed', ok4, `Items count: ${resKosong.data?.data?.DesignItems?.length}`);

    // 6. Error State 404: Buka rancangan yang tidak ada
    const res404 = await request('/rancangan/9999999', { headers: authWoA });
    const ok5 = res404.status === 404 && res404.data?.pesan?.includes('tidak ditemukan');
    record('Error State', 'Membuka rancangan yang tidak ada menghasilkan 404 (bukan venue tidak valid)', ok5, `Status: ${res404.status}, Pesan: ${res404.data?.pesan}`);

    // 7. Error State 403: Buka rancangan milik WO lain
    const res403 = await request(`/rancangan/${rancanganA.id}`, { headers: authWoB });
    const ok6 = res403.status === 403 && res403.data?.pesan?.includes('tidak punya akses');
    record('Error State', 'Membuka rancangan pengguna lain menghasilkan 403', ok6, `Status: ${res403.status}, Pesan: ${res403.data?.pesan}`);

    // 8. Error State 401: Token tidak valid / kedaluwarsa
    const res401 = await request(`/rancangan/${rancanganA.id}`, {
      headers: { Authorization: 'Bearer token_tidak_valid_expired' },
    });
    const ok401 = res401.status === 401;
    record('Error State', 'Token tidak valid atau kedaluwarsa menghasilkan 401', ok401, `Status: ${res401.status}, Pesan: ${res401.data?.pesan}`);

    // 7. Kembalikan item awal rancangan agar tetap terisi
    await request(`/rancangan/${rancanganA.id}`, {
      method: 'PUT',
      headers: authWoA,
      body: JSON.stringify({
        item: [
          {
            decoration_id: dekorasiA.id,
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
  console.log(`HASIL VERIFIKASI TAHAP 4A: ${passed} PASS, ${failed} FAIL dari ${results.length} Skenario`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTahap4aTests();
