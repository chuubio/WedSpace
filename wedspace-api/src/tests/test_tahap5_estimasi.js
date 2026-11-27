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
const dekorasiRoutes = require('../routes/dekorasi');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/rancangan', rancanganRoutes);
app.use('/api/dekorasi', dekorasiRoutes);

const TEST_PORT = 3095;
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

async function runTahap5Tests() {
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

  // Setup Proyek untuk WO A dengan anggaran 10.000.000
  const [proyekA] = await Project.findOrCreate({
    where: { user_id: woA.id, nama_proyek: 'Pernikahan Uji Estimasi' },
    defaults: {
      user_id: woA.id,
      nama_proyek: 'Pernikahan Uji Estimasi',
      nama_venue: 'Lotus Ballroom',
      panjang_venue: 20,
      lebar_venue: 15,
      anggaran: 10000000, // 10 juta
    },
  });

  // Setup Rancangan untuk WO A
  const [rancanganA] = await Design.findOrCreate({
    where: { project_id: proyekA.id, nama_rancangan: 'Rancangan Estimasi A' },
    defaults: { project_id: proyekA.id, nama_rancangan: 'Rancangan Estimasi A' },
  });

  // Setup Dekorasi 1: Meja (Rp 250.000)
  const [dekorasiMeja] = await Decoration.findOrCreate({
    where: { nama_dekorasi: 'Meja Bundar Estimasi Test' },
    defaults: {
      nama_dekorasi: 'Meja Bundar Estimasi Test',
      kategori: 'Meja',
      harga: 250000,
      panjang: 180,
      lebar: 180,
      tinggi: 75,
      created_by_user_id: woA.id,
      visibility: 'public',
      is_active: true,
    },
  });

  // Setup Dekorasi 2: Kursi (Rp 35.000)
  const [dekorasiKursi] = await Decoration.findOrCreate({
    where: { nama_dekorasi: 'Kursi Tiffany Estimasi Test' },
    defaults: {
      nama_dekorasi: 'Kursi Tiffany Estimasi Test',
      kategori: 'Kursi',
      harga: 35000,
      panjang: 45,
      lebar: 45,
      tinggi: 90,
      created_by_user_id: woA.id,
      visibility: 'public',
      is_active: true,
    },
  });

  // Setup Dekorasi 3: Gratis/Rp 0 (Rp 0)
  const [dekorasiGratis] = await Decoration.findOrCreate({
    where: { nama_dekorasi: 'Buku Tamu Gratis Test' },
    defaults: {
      nama_dekorasi: 'Buku Tamu Gratis Test',
      kategori: 'Aksesoris',
      harga: 0,
      panjang: 30,
      lebar: 20,
      tinggi: 5,
      created_by_user_id: woA.id,
      visibility: 'public',
      is_active: true,
    },
  });

  // Setup Dekorasi 4: Harga Berubah (awalnya Rp 1.000.000)
  const [dekorasiDinamis] = await Decoration.findOrCreate({
    where: { nama_dekorasi: 'Floral Backdrop Dinamis Test' },
    defaults: {
      nama_dekorasi: 'Floral Backdrop Dinamis Test',
      kategori: 'Pelaminan',
      harga: 1000000,
      panjang: 300,
      lebar: 50,
      tinggi: 250,
      created_by_user_id: woA.id,
      visibility: 'public',
      is_active: true,
    },
  });
  // Reset harga ke 1.000.000 pada awal test agar idempotent saat dijalankan berulang
  await dekorasiDinamis.update({ harga: 1000000 });

  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, resolve);
  });

  console.log(`Test server running on port ${TEST_PORT}\nStarting Tahap 5 Estimasi Biaya verification tests...\n`);

  try {
    // Skenario 1: Satu dekorasi dengan jumlah 1 -> Subtotal = harga satuan
    await request(`/rancangan/${rancanganA.id}`, {
      method: 'PUT',
      headers: authWoA,
      body: JSON.stringify({
        item: [
          { decoration_id: dekorasiMeja.id, posisi_x: 100, posisi_y: 100, jumlah: 1 },
        ],
      }),
    });

    const res1 = await request(`/rancangan/${rancanganA.id}/estimasi`, { headers: authWoA });
    const item1 = res1.data?.data?.detail_biaya?.[0];
    const ok1 = res1.status === 200 &&
      item1?.harga_satuan === 250000 &&
      item1?.jumlah === 1 &&
      item1?.subtotal === 250000 &&
      res1.data?.data?.total_estimasi === 250000;
    record('Perhitungan', 'Satu dekorasi dengan jumlah 1 (Subtotal = harga satuan)', ok1, `Subtotal: ${item1?.subtotal}, Total: ${res1.data?.data?.total_estimasi}`);

    // Skenario 2: Satu dekorasi dengan jumlah > 1 -> Subtotal = harga * jumlah
    await request(`/rancangan/${rancanganA.id}`, {
      method: 'PUT',
      headers: authWoA,
      body: JSON.stringify({
        item: [
          { decoration_id: dekorasiMeja.id, posisi_x: 100, posisi_y: 100, jumlah: 10 },
        ],
      }),
    });
    const res2 = await request(`/rancangan/${rancanganA.id}/estimasi`, { headers: authWoA });
    const item2 = res2.data?.data?.detail_biaya?.[0];
    const ok2 = item2?.jumlah === 10 && item2?.subtotal === 2500000 && res2.data?.data?.total_estimasi === 2500000;
    record('Perhitungan', 'Satu dekorasi dengan jumlah 10 (Subtotal = harga * jumlah)', ok2, `Subtotal: ${item2?.subtotal}, Total: ${res2.data?.data?.total_estimasi}`);

    // Skenario 3: Beberapa dekorasi berbeda -> Total adalah jumlah semua subtotal
    // Meja (250.000 x 10 = 2.500.000) + Kursi (35.000 x 100 = 3.500.000) = 6.000.000
    const resSimpan3 = await request(`/rancangan/${rancanganA.id}`, {
      method: 'PUT',
      headers: authWoA,
      body: JSON.stringify({
        item: [
          { decoration_id: dekorasiMeja.id, posisi_x: 100, posisi_y: 100, jumlah: 10 },
          { decoration_id: dekorasiKursi.id, posisi_x: 300, posisi_y: 300, jumlah: 100 },
        ],
      }),
    });
    const res3 = await request(`/rancangan/${rancanganA.id}/estimasi`, { headers: authWoA });
    const ok3 = res3.data?.data?.detail_biaya?.length === 2 &&
      res3.data?.data?.total_estimasi === 6000000;
    record('Perhitungan', 'Beberapa dekorasi berbeda (Total = akumulasi subtotal)', ok3, `Total: ${res3.data?.data?.total_estimasi} (Expected: 6000000)`);

    // Skenario 4: Rancangan tanpa dekorasi -> Total Rp0
    await request(`/rancangan/${rancanganA.id}`, {
      method: 'PUT',
      headers: authWoA,
      body: JSON.stringify({ item: [] }),
    });
    const res4 = await request(`/rancangan/${rancanganA.id}/estimasi`, { headers: authWoA });
    const ok4 = res4.data?.data?.total_estimasi === 0 && (res4.data?.data?.detail_biaya || []).length === 0;
    record('Perhitungan', 'Rancangan tanpa dekorasi menghasilkan Total Rp0', ok4, `Total: ${res4.data?.data?.total_estimasi}, Items: ${res4.data?.data?.detail_biaya?.length}`);

    // Skenario 5: Dekorasi dengan harga Rp0 -> Subtotal Rp0
    await request(`/rancangan/${rancanganA.id}`, {
      method: 'PUT',
      headers: authWoA,
      body: JSON.stringify({
        item: [
          { decoration_id: dekorasiGratis.id, posisi_x: 50, posisi_y: 50, jumlah: 5 },
        ],
      }),
    });
    const res5 = await request(`/rancangan/${rancanganA.id}/estimasi`, { headers: authWoA });
    const item5 = res5.data?.data?.detail_biaya?.[0];
    const ok5 = item5?.harga_satuan === 0 && item5?.subtotal === 0 && res5.data?.data?.total_estimasi === 0;
    record('Perhitungan', 'Dekorasi dengan harga Rp0 menghasilkan subtotal Rp0', ok5, `Harga: ${item5?.harga_satuan}, Subtotal: ${item5?.subtotal}`);

    // Skenario 6: Anggaran Proyek - Dalam Anggaran (Total 6.000.000 < Anggaran 10.000.000)
    await request(`/rancangan/${rancanganA.id}`, {
      method: 'PUT',
      headers: authWoA,
      body: JSON.stringify({
        item: [
          { decoration_id: dekorasiMeja.id, posisi_x: 100, posisi_y: 100, jumlah: 10 },
          { decoration_id: dekorasiKursi.id, posisi_x: 300, posisi_y: 300, jumlah: 100 },
        ],
      }),
    });
    const res6 = await request(`/rancangan/${rancanganA.id}/estimasi`, { headers: authWoA });
    const d6 = res6.data?.data;
    const ok6 = d6?.status_anggaran === 'dalam_anggaran' &&
      d6?.anggaran === 10000000 &&
      d6?.sisa_anggaran === 4000000;
    record('Anggaran', 'Total < Anggaran -> status "dalam_anggaran" & sisa positif', ok6, `Status: ${d6?.status_anggaran}, Sisa: ${d6?.sisa_anggaran}`);

    // Skenario 7: Anggaran Proyek - Anggaran Tepat (Total 10.000.000 == Anggaran 10.000.000)
    // Meja (250.000 x 40 = 10.000.000)
    await request(`/rancangan/${rancanganA.id}`, {
      method: 'PUT',
      headers: authWoA,
      body: JSON.stringify({
        item: [
          { decoration_id: dekorasiMeja.id, posisi_x: 100, posisi_y: 100, jumlah: 40 },
        ],
      }),
    });
    const res7 = await request(`/rancangan/${rancanganA.id}/estimasi`, { headers: authWoA });
    const d7 = res7.data?.data;
    const ok7 = d7?.status_anggaran === 'anggaran_tepat' && d7?.sisa_anggaran === 0;
    record('Anggaran', 'Total == Anggaran -> status "anggaran_tepat" & sisa Rp0', ok7, `Status: ${d7?.status_anggaran}, Sisa: ${d7?.sisa_anggaran}`);

    // Skenario 8: Anggaran Proyek - Melebihi Anggaran (Total 12.500.000 > Anggaran 10.000.000)
    // Meja (250.000 x 50 = 12.500.000)
    await request(`/rancangan/${rancanganA.id}`, {
      method: 'PUT',
      headers: authWoA,
      body: JSON.stringify({
        item: [
          { decoration_id: dekorasiMeja.id, posisi_x: 100, posisi_y: 100, jumlah: 50 },
        ],
      }),
    });
    const res8 = await request(`/rancangan/${rancanganA.id}/estimasi`, { headers: authWoA });
    const d8 = res8.data?.data;
    const ok8 = d8?.status_anggaran === 'melebihi_anggaran' && d8?.sisa_anggaran === -2500000;
    record('Anggaran', 'Total > Anggaran -> status "melebihi_anggaran" & sisa negatif', ok8, `Status: ${d8?.status_anggaran}, Sisa: ${d8?.sisa_anggaran}`);

    // Skenario 9: Anggaran NULL -> Status 'belum_ditentukan'
    const [proyekTanpaAnggaran] = await Project.findOrCreate({
      where: { user_id: woA.id, nama_proyek: 'Proyek Tanpa Anggaran' },
      defaults: {
        user_id: woA.id,
        nama_proyek: 'Proyek Tanpa Anggaran',
        nama_venue: 'Aula Terbuka',
        panjang_venue: 15,
        lebar_venue: 10,
        anggaran: null,
      },
    });
    const [rancanganTanpaAnggaran] = await Design.findOrCreate({
      where: { project_id: proyekTanpaAnggaran.id, nama_rancangan: 'Rancangan Tanpa Anggaran' },
      defaults: { project_id: proyekTanpaAnggaran.id, nama_rancangan: 'Rancangan Tanpa Anggaran' },
    });
    await request(`/rancangan/${rancanganTanpaAnggaran.id}`, {
      method: 'PUT',
      headers: authWoA,
      body: JSON.stringify({
        item: [{ decoration_id: dekorasiMeja.id, posisi_x: 100, posisi_y: 100, jumlah: 2 }],
      }),
    });
    const res9 = await request(`/rancangan/${rancanganTanpaAnggaran.id}/estimasi`, { headers: authWoA });
    const d9 = res9.data?.data;
    const ok9 = d9?.anggaran === null && d9?.sisa_anggaran === null && d9?.status_anggaran === 'belum_ditentukan';
    record('Anggaran', 'Proyek tanpa anggaran (NULL) -> status "belum_ditentukan"', ok9, `Status: ${d9?.status_anggaran}, Anggaran: ${d9?.anggaran}`);

    // Skenario 10: Snapshot Harga - Penambahan dekorasi menyimpan snapshot harga saat itu
    // Masukkan dekorasiDinamis (harga katalog = 1.000.000)
    const resSimpanDinamis = await request(`/rancangan/${rancanganA.id}`, {
      method: 'PUT',
      headers: authWoA,
      body: JSON.stringify({
        item: [
          { decoration_id: dekorasiDinamis.id, posisi_x: 200, posisi_y: 200, jumlah: 1 },
        ],
      }),
    });
    const designItemId = resSimpanDinamis.data?.data?.DesignItems?.[0]?.id;
    const res10 = await request(`/rancangan/${rancanganA.id}/estimasi`, { headers: authWoA });
    const ok10 = res10.data?.data?.detail_biaya?.[0]?.harga_satuan === 1000000;
    record('Snapshot Harga', 'Dekorasi baru disimpan dengan snapshot harga katalog saat penambahan', ok10, `Item ID: ${designItemId}, Snapshot: ${res10.data?.data?.detail_biaya?.[0]?.harga_satuan}`);

    // Skenario 11: Snapshot Harga - Perubahan harga katalog TIDAK mengubah snapshot rancangan lama!
    // Ubah harga dekorasiDinamis di katalog menjadi 2.500.000
    await dekorasiDinamis.update({ harga: 2500000 });
    const res11 = await request(`/rancangan/${rancanganA.id}/estimasi`, { headers: authWoA });
    const ok11 = res11.data?.data?.detail_biaya?.[0]?.harga_satuan === 1000000; // Tetap 1.000.000
    record('Snapshot Harga', 'Harga katalog naik (1jt -> 2.5jt), snapshot rancangan lama TIDAK berubah', ok11, `Snapshot: ${res11.data?.data?.detail_biaya?.[0]?.harga_satuan} (Katalog saat ini: 2500000)`);

    // Skenario 12: Snapshot Harga - Layout dipindahkan, diputar, & jumlah diubah (PUT dengan ID) -> ID stabil & snapshot lama TETAP dipertahankan!
    await request(`/rancangan/${rancanganA.id}`, {
      method: 'PUT',
      headers: authWoA,
      body: JSON.stringify({
        item: [
          {
            id: designItemId,
            decoration_id: dekorasiDinamis.id,
            posisi_x: 800,
            posisi_y: 800,
            rotasi: 90,
            jumlah: 3,
            harga_satuan_snapshot: 1, // Harus diabaikan oleh backend
          },
        ],
      }),
    });
    const res12 = await request(`/rancangan/${rancanganA.id}/estimasi`, { headers: authWoA });
    const item12 = res12.data?.data?.detail_biaya?.[0];
    const ok12 =
      item12?.design_item_id === designItemId &&
      item12?.harga_satuan === 1000000 &&
      item12?.jumlah === 3 &&
      item12?.subtotal === 3000000;
    record('Snapshot Harga', 'Posisi/rotasi/jumlah diubah -> ID stabil, snapshot lama bertahan, subtotal terupdate, snapshot client diabaikan', ok12, `ID: ${item12?.design_item_id} (expected ${designItemId}), Snapshot: ${item12?.harga_satuan}, Subtotal: ${item12?.subtotal}`);

    // Skenario 12b: Validasi ID DesignItem tidak valid / milik rancangan lain -> ditolak 400
    const resIdIlegal = await request(`/rancangan/${rancanganA.id}`, {
      method: 'PUT',
      headers: authWoA,
      body: JSON.stringify({
        item: [
          { id: 99999999, decoration_id: dekorasiDinamis.id, posisi_x: 100, posisi_y: 100, jumlah: 1 },
        ],
      }),
    });
    const ok12b = resIdIlegal.status === 400;
    record('Validasi ID', 'DesignItem ID yang tidak cocok dengan rancangan ditolak (400)', ok12b, `Status: ${resIdIlegal.status}, Pesan: ${resIdIlegal.data?.pesan}`);

    // Skenario 12c: Validasi jumlah tidak valid (0 atau negatif) -> ditolak 400
    const resJumlahIlegal = await request(`/rancangan/${rancanganA.id}`, {
      method: 'PUT',
      headers: authWoA,
      body: JSON.stringify({
        item: [
          { decoration_id: dekorasiMeja.id, posisi_x: 100, posisi_y: 100, jumlah: 0 },
        ],
      }),
    });
    const ok12c = resJumlahIlegal.status === 400;
    record('Validasi Input', 'Jumlah item tidak valid (0) ditolak backend (400)', ok12c, `Status: ${resJumlahIlegal.status}, Pesan: ${resJumlahIlegal.data?.pesan}`);

    // Skenario 12d: Validasi harga negatif pada dekorasi -> ditolak 400
    const resHargaNegatif = await request('/dekorasi', {
      method: 'POST',
      headers: authWoA,
      body: JSON.stringify({
        nama_dekorasi: 'Dekorasi Harga Negatif Test',
        kategori: 'Meja',
        harga: -50000,
        panjang: 100,
        lebar: 100,
        tinggi: 100,
      }),
    });
    const ok12d = resHargaNegatif.status === 400;
    record('Validasi Input', 'Harga dekorasi negatif ditolak backend (400)', ok12d, `Status: ${resHargaNegatif.status}, Pesan: ${resHargaNegatif.data?.pesan}`);

    // Skenario 12e: Dekorasi dinonaktifkan -> estimasi rancangan lama tetap dapat dihitung
    await dekorasiDinamis.update({ is_active: false });
    const resNonaktif = await request(`/rancangan/${rancanganA.id}/estimasi`, { headers: authWoA });
    const ok12e =
      resNonaktif.status === 200 &&
      resNonaktif.data?.data?.detail_biaya?.[0]?.harga_satuan === 1000000 &&
      resNonaktif.data?.data?.detail_biaya?.[0]?.subtotal === 3000000;
    record('Snapshot Harga', 'Dekorasi dinonaktifkan -> estimasi rancangan lama tetap dapat dihitung', ok12e, `Status: ${resNonaktif.status}, Subtotal: ${resNonaktif.data?.data?.detail_biaya?.[0]?.subtotal}`);
    await dekorasiDinamis.update({ is_active: true });

    // Skenario 13: Snapshot Harga - Dekorasi dihapus lalu ditambahkan kembali sebagai item baru -> mendapat harga terbaru (2.500.000)
    // Hapus (kosongkan)
    await request(`/rancangan/${rancanganA.id}`, {
      method: 'PUT',
      headers: authWoA,
      body: JSON.stringify({ item: [] }),
    });
    // Tambah kembali tanpa id (item baru)
    await request(`/rancangan/${rancanganA.id}`, {
      method: 'PUT',
      headers: authWoA,
      body: JSON.stringify({
        item: [
          { decoration_id: dekorasiDinamis.id, posisi_x: 200, posisi_y: 200, jumlah: 1 },
        ],
      }),
    });
    const res13 = await request(`/rancangan/${rancanganA.id}/estimasi`, { headers: authWoA });
    const ok13 = res13.data?.data?.detail_biaya?.[0]?.harga_satuan === 2500000; // Mendapat harga 2.500.000
    record('Snapshot Harga', 'Item dihapus lalu ditambahkan baru -> mengambil harga katalog terkini (2.5jt)', ok13, `Snapshot baru: ${res13.data?.data?.detail_biaya?.[0]?.harga_satuan}`);

    // Skenario 14: Hak Akses - WO B tidak dapat mengakses estimasi rancangan WO A (Ditolak 403)
    const res14 = await request(`/rancangan/${rancanganA.id}/estimasi`, { headers: authWoB });
    const ok14 = res14.status === 403;
    record('Hak Akses', 'WO B dilarang mengakses estimasi rancangan WO A (Ditolak 403)', ok14, `Status: ${res14.status}`);

    // Skenario 15: Hak Akses - Permintaan tanpa token ditolak (401 Unauthorized)
    const res15 = await request(`/rancangan/${rancanganA.id}/estimasi`);
    const ok15 = res15.status === 401;
    record('Hak Akses', 'Akses estimasi tanpa token autentikasi ditolak (401)', ok15, `Status: ${res15.status}`);

    // Skenario 16: Format Response - Struktur data & ringkasan lengkap untuk kebutuhan UI
    const res16 = await request(`/rancangan/${rancanganA.id}/estimasi`, { headers: authWoA });
    const data16 = res16.data?.data;
    const ok16 = data16?.rancangan?.nama_rancangan &&
      data16?.proyek?.nama_proyek &&
      Array.isArray(data16?.detail_biaya) &&
      typeof data16?.total_estimasi === 'number' &&
      typeof data16?.ringkasan?.jumlah_jenis_dekorasi === 'number' &&
      typeof data16?.ringkasan?.total_unit_dekorasi === 'number' &&
      data16?.ringkasan?.total_estimasi === data16?.total_estimasi &&
      data16?.status_anggaran !== undefined;
    record('Integrasi API', 'Response endpoint menyertakan struktur data & ringkasan lengkap untuk frontend', ok16, `Rancangan: ${data16?.rancangan?.nama_rancangan}, Jenis: ${data16?.ringkasan?.jumlah_jenis_dekorasi}, Unit: ${data16?.ringkasan?.total_unit_dekorasi}, Total: ${data16?.total_estimasi}`);

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    server.close();
    await sequelize.close();
  }

  const passed = results.filter((r) => r.lulus).length;
  const failed = results.filter((r) => !r.lulus).length;
  console.log(`\n========================================`);
  console.log(`HASIL VERIFIKASI TAHAP 5: ${passed} PASS, ${failed} FAIL dari ${results.length} Skenario`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTahap5Tests();
