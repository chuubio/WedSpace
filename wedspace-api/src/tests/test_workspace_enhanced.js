require('dotenv').config();
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
  DesignStructure,
  DesignNote,
} = require('../models');
const rancanganRoutes = require('../routes/rancangan');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/rancangan', rancanganRoutes);

const TEST_PORT = 3094;
let server;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;

const results = [];
function record(kategori, skenario, lulus, detail) {
  results.push({ kategori, skenario, lulus, detail });
  console.log(`[${lulus ? 'PASS' : 'FAIL'}] [${kategori}] ${skenario} -> ${detail}`);
}

async function request(url, options = {}) {
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data, ok: res.ok };
}

async function runTests() {
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

  const authWoA = { Authorization: `Bearer ${jwt.sign({ id: woA.id, role: woA.role, nama: woA.nama }, process.env.JWT_SECRET)}` };
  const authWoB = { Authorization: `Bearer ${jwt.sign({ id: woB.id, role: woB.role, nama: woB.nama }, process.env.JWT_SECRET)}` };

  const [proyekA] = await Project.findOrCreate({
    where: { user_id: woA.id, nama_proyek: 'Proyek Uji Workspace Enhanced' },
    defaults: {
      user_id: woA.id,
      nama_proyek: 'Proyek Uji Workspace Enhanced',
      nama_venue: 'Grand Hall WedSpace',
      panjang_venue: 20,
      lebar_venue: 14,
      tema: 'Rustic Floral',
    },
  });
  const [rancanganA] = await Design.findOrCreate({
    where: { project_id: proyekA.id, nama_rancangan: 'Rancangan Enhanced 1' },
    defaults: { project_id: proyekA.id, nama_rancangan: 'Rancangan Enhanced 1' },
  });

  await new Promise((resolve) => { server = app.listen(TEST_PORT, resolve); });

  const createdCustomDekIds = [];

  try {
    // 1. Tambah Tembok & Pintu
    const resWall = await request(`/rancangan/${rancanganA.id}/struktur`, {
      method: 'POST',
      headers: authWoA,
      body: JSON.stringify({ tipe: 'wall', label: 'Tembok Uji', posisi_x: 100, posisi_y: 200, panjang: 400, tinggi: 300 }),
    });
    const wallId = resWall.data?.data?.id;
    record('Struktur 2D/3D', 'Menambah tembok ruangan ke MySQL', resWall.status === 201 && Boolean(wallId), `Status: ${resWall.status}, ID: ${wallId}`);

    const resDoor = await request(`/rancangan/${rancanganA.id}/struktur`, {
      method: 'POST',
      headers: authWoA,
      body: JSON.stringify({ tipe: 'door', label: 'Pintu Utama', posisi_x: 900, posisi_y: 0, panjang: 180, tinggi: 220 }),
    });
    const doorId = resDoor.data?.data?.id;
    record('Struktur 2D/3D', 'Menambah pintu ruangan ke MySQL', resDoor.status === 201 && Boolean(doorId), `Status: ${resDoor.status}, ID: ${doorId}`);

    // 2. Edit struktur
    const resUpdWall = await request(`/rancangan/${rancanganA.id}/struktur/${wallId}`, {
      method: 'PUT',
      headers: authWoA,
      body: JSON.stringify({ rotasi: 90, panjang: 500 }),
    });
    record('Struktur 2D/3D', 'Mengubah rotasi & panjang tembok', resUpdWall.status === 200 && resUpdWall.data?.data?.rotasi === 90 && resUpdWall.data?.data?.panjang === 500, `Rotasi: ${resUpdWall.data?.data?.rotasi}, Panjang: ${resUpdWall.data?.data?.panjang}`);

    // 3. Keamanan struktur: WO B ditolak 403
    const resStrIlegal = await request(`/rancangan/${rancanganA.id}/struktur`, {
      method: 'POST',
      headers: authWoB,
      body: JSON.stringify({ tipe: 'wall', label: 'Ilegal' }),
    });
    record('Keamanan', 'WO B ditolak menambah struktur pada rancangan WO A (403)', resStrIlegal.status === 403, `Status: ${resStrIlegal.status}`);

    // 4. Catatan WO (tanpa pin & dengan pin canvas X,Y)
    const resNote = await request(`/rancangan/${rancanganA.id}/catatan`, {
      method: 'POST',
      headers: authWoA,
      body: JSON.stringify({ judul: 'Jalur Catering', isi: 'Pastikan pintu samping terbuka jam 06.00', warna: '#F5C6D6', posisi_x: 500, posisi_y: 300 }),
    });
    const noteId = resNote.data?.data?.id;
    record('Catatan WO', 'Menambah catatan WO dengan pin koordinat canvas', resNote.status === 201 && resNote.data?.data?.posisi_x === 500, `ID: ${noteId}, Pin: (${resNote.data?.data?.posisi_x}, ${resNote.data?.data?.posisi_y})`);

    const resNoteToggle = await request(`/rancangan/${rancanganA.id}/catatan/${noteId}`, {
      method: 'PUT',
      headers: authWoA,
      body: JSON.stringify({ selesai: true }),
    });
    record('Catatan WO', 'Mengubah status checklist selesai catatan', resNoteToggle.status === 200 && resNoteToggle.data?.data?.selesai === true, `Selesai: ${resNoteToggle.data?.data?.selesai}`);

    // 5. AI Workspace Assistant: Tambah aset katalog / struktur / custom asset
    const resAiStr = await request(`/rancangan/${rancanganA.id}/ai-asset`, {
      method: 'POST',
      headers: authWoA,
      body: JSON.stringify({ prompt: 'Buatkan pintu masuk utama di bagian depan', allow_custom: true }),
    });
    const adaAksiStr = (resAiStr.data?.data?.aksi_diterapkan || []).length > 0;
    record('AI Workspace', 'AI menambahkan struktur pintu dari prompt WO', resAiStr.status === 200 && adaAksiStr, `Status: ${resAiStr.status}, Pesan: ${resAiStr.data?.pesan || '-'}, Aksi: ${resAiStr.data?.data?.aksi_diterapkan?.map((a) => `${a.jenis}:${a.nama}`).join(', ')}`);

    const resAiCustom = await request(`/rancangan/${rancanganA.id}/ai-asset`, {
      method: 'POST',
      headers: authWoA,
      body: JSON.stringify({ prompt: 'Tambahkan 1 gazebo kristal unik khusus outdoor', allow_custom: true }),
    });
    const aksiCustom = resAiCustom.data?.data?.aksi_diterapkan || [];
    for (const a of aksiCustom) {
      if (a.jenis === 'create_and_add' && a.decoration_id) {
        createdCustomDekIds.push(a.decoration_id);
      }
    }
    record('AI Workspace', 'AI memproses aset baru & menempatkannya ke rancangan', resAiCustom.status === 200 && aksiCustom.length > 0, `Aksi: ${aksiCustom.map((a) => `${a.jenis}:${a.nama}`).join(', ')}`);

    // 6. GET /api/rancangan/:id menyertakan DesignItems, DesignStructures, DesignNotes
    const resGet = await request(`/rancangan/${rancanganA.id}`, { headers: authWoA });
    const dGet = resGet.data?.data;
    const okGet = resGet.status === 200 &&
      Array.isArray(dGet?.DesignItems) &&
      Array.isArray(dGet?.DesignStructures) && dGet.DesignStructures.length >= 2 &&
      Array.isArray(dGet?.DesignNotes) && dGet.DesignNotes.length >= 1;
    record('Integrasi', 'GET rancangan mengembalikan DesignItems, DesignStructures, dan DesignNotes', okGet, `Items: ${dGet?.DesignItems?.length}, Structures: ${dGet?.DesignStructures?.length}, Notes: ${dGet?.DesignNotes?.length}`);

    // Cleanup data uji
    await request(`/rancangan/${rancanganA.id}/struktur/${wallId}`, { method: 'DELETE', headers: authWoA });
    await request(`/rancangan/${rancanganA.id}/struktur/${doorId}`, { method: 'DELETE', headers: authWoA });
    await request(`/rancangan/${rancanganA.id}/catatan/${noteId}`, { method: 'DELETE', headers: authWoA });
    await DesignStructure.destroy({ where: { design_id: rancanganA.id } });
    await DesignNote.destroy({ where: { design_id: rancanganA.id } });
    await request(`/rancangan/${rancanganA.id}`, { method: 'PUT', headers: authWoA, body: JSON.stringify({ item: [] }) });
    for (const id of createdCustomDekIds) {
      await Decoration.destroy({ where: { id } }).catch(() => {});
    }
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    server.close();
    await sequelize.close();
  }

  const passed = results.filter((r) => r.lulus).length;
  const failed = results.filter((r) => !r.lulus).length;
  console.log(`\n========================================`);
  console.log(`HASIL VERIFIKASI WORKSPACE ENHANCED: ${passed} PASS, ${failed} FAIL dari ${results.length} Skenario`);
  console.log(`========================================`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
