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
  DesignItem,
  Design3DElement,
} = require('../models');
const rancanganRoutes = require('../routes/rancangan');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/rancangan', rancanganRoutes);

const TEST_PORT = 3093;
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
    where: { user_id: woA.id, nama_proyek: 'Proyek Uji Workspace 3D Studio' },
    defaults: {
      user_id: woA.id,
      nama_proyek: 'Proyek Uji Workspace 3D Studio',
      nama_venue: 'Hall 3D Studio',
      panjang_venue: 18,
      lebar_venue: 12,
    },
  });
  const [rancanganA] = await Design.findOrCreate({
    where: { project_id: proyekA.id, nama_rancangan: 'Rancangan 3D Studio 1' },
    defaults: { project_id: proyekA.id, nama_rancangan: 'Rancangan 3D Studio 1' },
  });

  const [dekA] = await Decoration.findOrCreate({
    where: { nama_dekorasi: 'Meja Bundar 3D Studio Test' },
    defaults: {
      nama_dekorasi: 'Meja Bundar 3D Studio Test',
      kategori: 'Meja',
      harga: 300000,
      panjang: 180,
      lebar: 180,
      tinggi: 75,
      created_by_user_id: woA.id,
      visibility: 'public',
      is_active: true,
    },
  });

  await new Promise((resolve) => { server = app.listen(TEST_PORT, resolve); });

  try {
    // 1. Simpan Scene 3D lengkap: 2 tembok, 1 pintu ber-parent_id tembok, 1 plafon, 1 basic shape, 1 dekorasi + floor & lighting
    const resSave = await request(`/rancangan/${rancanganA.id}/scene3d`, {
      method: 'PUT',
      headers: authWoA,
      body: JSON.stringify({
        scene_3d_settings: {
          floor: { color: '#D8CFC4', roughness: 0.5, texturePreset: 'marble', textureScale: 2, textureRotation: 0 },
          lighting: { preset: 'morning', ambientIntensity: 0.9, directionalIntensity: 1.4, shadowsEnabled: true },
          quality: 'high',
        },
        items: [
          {
            decoration_id: dekA.id,
            posisi_x: 600,
            posisi_y: 400,
            rotasi: 45,
            jumlah: 2,
            transform_3d: { elevationY: 0.2, scaleX: 1.2, scaleY: 1.2, scaleZ: 1.2, isVisible: true, isLocked: false },
          },
        ],
        elements: [
          {
            temp_id: 'w1',
            element_type: 'wall',
            name: 'Tembok Utara',
            geometry_data: { startX: -6, startZ: -4, endX: 6, endZ: -4, length: 12, height: 3.5, thickness: 0.2 },
            material_data: { color: '#F3EFEA', texturePreset: 'plaster' },
          },
          {
            temp_id: 'w2',
            element_type: 'wall',
            name: 'Tembok Timur',
            geometry_data: { startX: 6, startZ: -4, endX: 6, endZ: 4, length: 8, height: 3.5, thickness: 0.2 },
            material_data: { color: '#F3EFEA', texturePreset: 'plaster' },
          },
          {
            temp_id: 'd1',
            parent_id: 'w1',
            element_type: 'door',
            name: 'Pintu Utama',
            geometry_data: { width: 1.4, height: 2.2, offsetRatio: 0.5 },
            material_data: { color: '#7F1125' },
          },
          {
            temp_id: 'p1',
            element_type: 'primitive',
            name: 'Panggung Box',
            geometry_data: { shape: 'box', width: 4, height: 0.6, depth: 2.5 },
            position_data: { x: 0, y: 0, z: -2.5 },
            material_data: { color: '#E9D8C8' },
          },
        ],
      }),
    });

    const dSave = resSave.data?.data;
    const savedWall = (dSave?.Design3DElements || []).find((e) => e.name === 'Tembok Utara');
    const savedDoor = (dSave?.Design3DElements || []).find((e) => e.element_type === 'door');
    const savedItem = dSave?.DesignItems?.[0];

    record(
      'Scene 3D Persistence',
      'Simpan tembok, pintu ber-relasi parent_id, basic shape, dekorasi, dan material lantai',
      resSave.status === 200 &&
        dSave?.Design3DElements?.length === 4 &&
        savedDoor?.parent_id === savedWall?.id &&
        savedItem?.posisi_x === 600 &&
        savedItem?.transform_3d?.elevationY === 0.2,
      `Elements: ${dSave?.Design3DElements?.length}, Door parent_id: ${savedDoor?.parent_id} (Wall ID: ${savedWall?.id})`
    );

    // 2. Sinkronisasi 3D -> 2D: GET /api/rancangan/:id (endpoint 2D) menerima posisi X/Y/rotasi terbaru
    const res2D = await request(`/rancangan/${rancanganA.id}`, { headers: authWoA });
    const item2D = res2D.data?.data?.DesignItems?.[0];
    record(
      'Sinkronisasi 2D & 3D',
      'Perubahan posisi horizontal & rotasi dari 3D tersinkron ke endpoint Workspace 2D',
      res2D.status === 200 && item2D?.posisi_x === 600 && item2D?.posisi_y === 400 && item2D?.rotasi === 45,
      `2D X:${item2D?.posisi_x}, Y:${item2D?.posisi_y}, Rot:${item2D?.rotasi}°`
    );

    // 3. Reload Scene 3D: floor material & lighting tetap tersimpan
    const res3D = await request(`/rancangan/${rancanganA.id}/scene3d`, { headers: authWoA });
    const s3 = res3D.data?.data?.scene_3d_settings;
    record(
      'Material & Lighting',
      'Material lantai & preset pencahayaan tetap utuh setelah dibuka kembali',
      res3D.status === 200 && s3?.floor?.texturePreset === 'marble' && s3?.lighting?.preset === 'morning',
      `Floor: ${s3?.floor?.texturePreset}, Lighting: ${s3?.lighting?.preset}`
    );

    // 4. Hapus tembok induk -> pintu dependen ikut terhapus (tidak ada pintu yatim)
    const remainingWalls = (dSave?.Design3DElements || []).filter((e) => e.id !== savedWall.id);
    const resDelHost = await request(`/rancangan/${rancanganA.id}/scene3d`, {
      method: 'PUT',
      headers: authWoA,
      body: JSON.stringify({ elements: remainingWalls }),
    });
    const hasOrphanDoor = (resDelHost.data?.data?.Design3DElements || []).some((e) => e.element_type === 'door');
    record(
      'Integritas Relasi',
      'Menghapus tembok induk mencegah pintu yatim (orphan door)',
      resDelHost.status === 200 && !hasOrphanDoor,
      `Orphan door exists: ${hasOrphanDoor}`
    );

    // 5. Keamanan: WO B ditolak mengakses scene3d milik WO A (403)
    const res403 = await request(`/rancangan/${rancanganA.id}/scene3d`, { headers: authWoB });
    record('Keamanan', 'WO B ditolak membuka scene 3D milik WO A (403)', res403.status === 403, `Status: ${res403.status}`);

    // Cleanup
    await request(`/rancangan/${rancanganA.id}/scene3d`, {
      method: 'PUT',
      headers: authWoA,
      body: JSON.stringify({ items: [], elements: [] }),
    });
  } finally {
    server.close();
    await sequelize.close();
  }

  const passed = results.filter((r) => r.lulus).length;
  const failed = results.filter((r) => !r.lulus).length;
  console.log(`\n========================================`);
  console.log(`HASIL VERIFIKASI WORKSPACE 3D STUDIO: ${passed} PASS, ${failed} FAIL dari ${results.length} Skenario`);
  console.log(`========================================`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
