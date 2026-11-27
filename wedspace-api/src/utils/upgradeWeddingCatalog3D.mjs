import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
require('dotenv').config({ path: 'D:/Cooolege/naga/IPPL/tuGED/WedSpace/wedspace-api/.env' })
const { sequelize, Model3DLibrary, Decoration } = require('../models')

const THREE_ROOT = 'D:/Cooolege/naga/IPPL/tuGED/WedSpace/wedspace-web/node_modules/three'
const THREE = await import(`file:///${THREE_ROOT}/build/three.module.js`)
const { GLTFExporter } = await import(`file:///${THREE_ROOT}/examples/jsm/exporters/GLTFExporter.js`)

if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class FileReader {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf
        if (this.onloadend) this.onloadend()
        else if (this.onload) this.onload({ target: this })
      })
    }
  }
}

const LIB_DIR = 'D:/Cooolege/naga/IPPL/tuGED/WedSpace/wedspace-api/uploads/library'
const PH_DIR = path.join(LIB_DIR, 'polyhaven')
fs.mkdirSync(LIB_DIR, { recursive: true })
fs.mkdirSync(PH_DIR, { recursive: true })

const mat = (hex, roughness = 0.6, metalness = 0.05, emissive = 0x000000, emissiveIntensity = 0) =>
  new THREE.MeshStandardMaterial({ color: hex, roughness, metalness, emissive, emissiveIntensity })

const M_WHITE = mat(0xfaf8f5, 0.5, 0.02)
const M_CREAM = mat(0xf4ede1, 0.7, 0.0)
const M_GOLD = mat(0xd4af37, 0.24, 0.88)
const M_GOLD_LIGHT = mat(0xe8c96b, 0.3, 0.8)
const M_WOOD = mat(0x7c4f26, 0.72, 0.05)
const M_PINK = mat(0xf4b6c2, 0.75, 0.0)
const M_ROSE = mat(0xd45572, 0.72, 0.0)
const M_RED = mat(0xb91c1c, 0.7, 0.0)
const M_BLUSH = mat(0xfce4ec, 0.75, 0.0)
const M_LEAF = mat(0x4b783e, 0.75, 0.0)
const M_JANUR = mat(0xc8d95b, 0.65, 0.0)
const M_BURGUNDY = mat(0x7f1125, 0.65, 0.05)
const M_DARK = mat(0x2a262c, 0.6, 0.15)
const M_LIGHT_WARM = mat(0xfff5d6, 0.1, 0.0, 0xffe4a0, 1.4)
const M_MARBLE = mat(0xf5f1eb, 0.32, 0.05)

const box = (w, h, d, m, x = 0, y = 0, z = 0) => {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
  o.position.set(x, y, z)
  return o
}
const cyl = (rt, rb, h, m, x = 0, y = 0, z = 0, seg = 18) => {
  const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m)
  o.position.set(x, y, z)
  return o
}
const sph = (r, m, x = 0, y = 0, z = 0, seg = 12) => {
  const o = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), m)
  o.position.set(x, y, z)
  return o
}

function floralCluster(scale = 1, redAccent = false) {
  const g = new THREE.Group()
  g.add(sph(0.13 * scale, M_LEAF, -0.1 * scale, -0.02 * scale, 0))
  g.add(sph(0.13 * scale, M_LEAF, 0.1 * scale, -0.02 * scale, 0.03 * scale))
  g.add(sph(0.11 * scale, redAccent ? M_RED : M_PINK, 0, 0.05 * scale, 0.02 * scale))
  g.add(sph(0.095 * scale, M_BLUSH, -0.08 * scale, 0.04 * scale, -0.03 * scale))
  g.add(sph(0.095 * scale, M_ROSE, 0.08 * scale, 0.03 * scale, -0.02 * scale))
  g.add(sph(0.08 * scale, M_WHITE, 0, 0.09 * scale, -0.03 * scale))
  return g
}

// 1. Kursi Chiavari Emas (pengganti #7)
function buildKursiChiavariEmas() {
  const g = new THREE.Group()
  for (const sx of [-0.18, 0.18]) {
    for (const sz of [-0.18, 0.18]) {
      g.add(cyl(0.015, 0.013, 0.45, M_GOLD, sx, 0.225, sz, 10))
    }
  }
  // Rangka penyangga kaki khas Chiavari
  const braceBack = cyl(0.008, 0.008, 0.36, M_GOLD, 0, 0.16, -0.18, 8)
  braceBack.rotation.z = Math.PI / 2
  g.add(braceBack)
  const braceFront = cyl(0.008, 0.008, 0.36, M_GOLD, 0, 0.16, 0.18, 8)
  braceFront.rotation.z = Math.PI / 2
  g.add(braceFront)
  // Dudukan + bantalan putih gading
  g.add(box(0.4, 0.035, 0.4, M_GOLD, 0, 0.45, 0))
  g.add(box(0.37, 0.045, 0.37, M_CREAM, 0, 0.485, 0))
  // Tiang sandaran beruas emas
  for (const sx of [-0.18, 0.18]) {
    g.add(cyl(0.015, 0.015, 0.47, M_GOLD, sx, 0.68, -0.18, 10))
    for (const y of [0.58, 0.72, 0.86]) {
      g.add(sph(0.022, M_GOLD_LIGHT, sx, y, -0.18, 8))
    }
  }
  g.add(box(0.38, 0.028, 0.024, M_GOLD, 0, 0.91, -0.18))
  g.add(box(0.38, 0.024, 0.022, M_GOLD, 0, 0.62, -0.18))
  for (const x of [-0.1, -0.033, 0.033, 0.1]) {
    g.add(cyl(0.008, 0.008, 0.43, M_GOLD, x, 0.68, -0.18, 8))
  }
  return g
}

// 2. Pelaminan Klasik Emas (pengganti #2)
function buildPelaminanKlasikEmas() {
  const g = new THREE.Group()
  g.add(box(4.5, 0.28, 2.2, M_MARBLE, 0, 0.14, 0))
  g.add(box(4.54, 0.04, 2.24, M_GOLD, 0, 0.27, 0))
  g.add(box(2.0, 0.14, 0.45, M_CREAM, 0, 0.07, 1.25))
  // Backdrop klasik 3 panel + 4 pilar emas
  g.add(box(2.1, 2.4, 0.14, M_CREAM, 0, 1.48, -0.95))
  g.add(box(2.22, 2.52, 0.08, M_GOLD, 0, 1.5, -1.0))
  g.add(box(1.1, 2.05, 0.12, M_WHITE, -1.65, 1.3, -0.88))
  g.add(box(1.1, 2.05, 0.12, M_WHITE, 1.65, 1.3, -0.88))
  for (const x of [-2.15, -1.1, 1.1, 2.15]) {
    g.add(cyl(0.08, 0.09, 2.35, M_GOLD, x, 1.45, -0.82, 14))
  }
  // Sofa pengantin emas + kursi orang tua
  g.add(box(1.65, 0.42, 0.72, M_CREAM, 0, 0.48, -0.1))
  g.add(box(1.75, 0.78, 0.12, M_GOLD, 0, 0.96, -0.44))
  for (const sx of [-1.45, 1.45]) {
    g.add(box(0.62, 0.4, 0.6, M_CREAM, sx, 0.48, 0))
    g.add(box(0.66, 0.65, 0.1, M_GOLD, sx, 0.88, -0.26))
  }
  // Rangkaian bunga putih-emas di puncak & pilar
  for (const x of [-0.7, 0, 0.7]) {
    const f = floralCluster(1.5)
    f.position.set(x, 2.74, -0.86)
    g.add(f)
  }
  return g
}

// 3. Meja Persegi 6 Orang (pengganti #4)
function buildMejaPersegi() {
  const g = new THREE.Group()
  g.add(box(1.46, 0.72, 0.86, M_CREAM, 0, 0.36, 0))
  g.add(box(1.5, 0.04, 0.9, M_WHITE, 0, 0.74, 0))
  g.add(box(1.51, 0.012, 0.24, M_BURGUNDY, 0, 0.765, 0))
  const f = floralCluster(0.95)
  f.position.set(0, 0.84, 0)
  g.add(f)
  for (const x of [-0.45, 0, 0.45]) {
    g.add(cyl(0.11, 0.09, 0.015, M_WHITE, x, 0.77, 0.3, 12))
    g.add(cyl(0.11, 0.09, 0.015, M_WHITE, x, 0.77, -0.3, 12))
  }
  return g
}

// 4. Buket Meja Mawar (pengganti #9)
function buildBuketMawar() {
  const g = new THREE.Group()
  g.add(cyl(0.08, 0.06, 0.16, M_GOLD, 0, 0.08, 0, 16))
  const f1 = floralCluster(1.1, true)
  f1.position.set(0, 0.22, 0)
  g.add(f1)
  const f2 = floralCluster(0.85, false)
  f2.position.set(0, 0.3, 0)
  g.add(f2)
  return g
}

// 5. Fairy Light Curtain (pengganti #11)
function buildFairyLightCurtain() {
  const g = new THREE.Group()
  g.add(cyl(0.025, 0.03, 2.5, M_GOLD, -1.48, 1.25, 0, 10))
  g.add(cyl(0.025, 0.03, 2.5, M_GOLD, 1.48, 1.25, 0, 10))
  const topBar = cyl(0.022, 0.022, 3.0, M_GOLD, 0, 2.48, 0, 10)
  topBar.rotation.z = Math.PI / 2
  g.add(topBar)
  g.add(box(2.9, 2.4, 0.02, M_CREAM, 0, 1.25, -0.02))
  // Deretan untaian bohlam fairy light hangat menyala
  for (let i = 0; i < 11; i++) {
    const x = -1.3 + i * 0.26
    for (let j = 0; j < 7; j++) {
      const y = 0.35 + j * 0.32
      g.add(sph(0.022, M_LIGHT_WARM, x, y, 0.03, 6))
    }
  }
  return g
}

// 6. Karpet Aisle Putih Elegan (pengganti #94)
function buildKarpetAisle() {
  const g = new THREE.Group()
  g.add(box(1.5, 0.025, 6.0, M_WHITE, 0, 0.0125, 0))
  g.add(box(0.06, 0.028, 6.0, M_GOLD, -0.72, 0.014, 0))
  g.add(box(0.06, 0.028, 6.0, M_GOLD, 0.72, 0.014, 0))
  // Kelopak bunga mawar tipis di sepanjang tepi karpet
  for (let i = -5; i <= 5; i++) {
    g.add(sph(0.04, M_PINK, -0.62, 0.03, i * 0.52, 6))
    g.add(sph(0.04, M_ROSE, 0.62, 0.03, i * 0.52 + 0.15, 6))
  }
  return g
}

// 7. Meja Penerima Tamu & Kotak Angpao (pengganti #96)
function buildMejaPenerimaTamu() {
  const g = new THREE.Group()
  g.add(box(1.76, 0.78, 0.68, M_CREAM, 0, 0.39, 0))
  g.add(box(1.8, 0.04, 0.72, M_WHITE, 0, 0.8, 0))
  g.add(box(1.78, 0.1, 0.02, M_PINK, 0, 0.68, 0.35))
  // Buku tamu terbuka di sisi kiri
  g.add(box(0.42, 0.03, 0.28, M_WHITE, -0.45, 0.835, 0.04))
  // Kotak angpao emas di sisi kanan
  g.add(box(0.38, 0.42, 0.34, M_WHITE, 0.5, 1.03, 0))
  g.add(box(0.4, 0.44, 0.02, M_GOLD, 0.5, 1.03, 0.175))
  // Vas bunga di tengah
  const f = floralCluster(0.85)
  f.position.set(0, 0.92, -0.1)
  g.add(f)
  return g
}

// 8. Tenda Roder Drapery Putih Emas (Baru)
function buildTendaRoder() {
  const g = new THREE.Group()
  for (const sx of [-2.85, 2.85]) {
    for (const sz of [-2.85, 2.85]) {
      g.add(cyl(0.08, 0.08, 2.8, M_WHITE, sx, 1.4, sz, 12))
      g.add(box(0.24, 0.12, 0.24, M_GOLD, sx, 0.06, sz))
    }
  }
  // Atap limas / tenda putih-krem
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.25, 1.2, 4), M_CREAM)
  roof.rotation.y = Math.PI / 4
  roof.position.y = 3.4
  g.add(roof)
  // Balok lis emas keliling
  g.add(box(5.8, 0.14, 0.1, M_GOLD, 0, 2.8, -2.85))
  g.add(box(5.8, 0.14, 0.1, M_GOLD, 0, 2.8, 2.85))
  g.add(box(0.1, 0.14, 5.8, M_GOLD, -2.85, 2.8, 0))
  g.add(box(0.1, 0.14, 5.8, M_GOLD, 2.85, 2.8, 0))
  return g
}

// 9. Panggung Musik & Band Pernikahan (Baru)
function buildPanggungMusik() {
  const g = new THREE.Group()
  g.add(box(4.0, 0.45, 2.5, M_DARK, 0, 0.225, 0))
  g.add(box(3.92, 0.04, 2.42, M_BURGUNDY, 0, 0.46, 0))
  g.add(box(4.04, 0.05, 2.54, M_GOLD, 0, 0.44, 0))
  // 2 speaker kiri kanan + stand mic di tengah
  g.add(box(0.45, 0.75, 0.4, M_DARK, -1.65, 0.85, 0.7))
  g.add(box(0.45, 0.75, 0.4, M_DARK, 1.65, 0.85, 0.7))
  g.add(cyl(0.12, 0.14, 0.04, M_DARK, 0, 0.5, 0.5, 12))
  g.add(cyl(0.015, 0.015, 1.35, M_GOLD, 0, 1.18, 0.5, 8))
  g.add(sph(0.045, M_DARK, 0, 1.88, 0.52, 8))
  return g
}

// 10. Pergola Lorong Bunga Aisle (Baru)
function buildPergolaBunga() {
  const g = new THREE.Group()
  for (const z of [-1.8, 0, 1.8]) {
    g.add(cyl(0.04, 0.04, 1.8, M_GOLD, -1.25, 0.9, z, 12))
    g.add(cyl(0.04, 0.04, 1.8, M_GOLD, 1.25, 0.9, z, 12))
    const arch = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.04, 10, 28, Math.PI), M_GOLD)
    arch.position.set(0, 1.8, z)
    g.add(arch)
    for (const x of [-0.7, 0, 0.7]) {
      const f = floralCluster(1.25)
      f.position.set(x, 2.95 - Math.abs(x) * 0.25, z)
      g.add(f)
    }
  }
  // Penghubung atas
  const beamL = cyl(0.025, 0.025, 3.6, M_GOLD, -1.25, 1.8, 0, 8)
  beamL.rotation.x = Math.PI / 2
  g.add(beamL)
  const beamR = cyl(0.025, 0.025, 3.6, M_GOLD, 1.25, 1.8, 0, 8)
  beamR.rotation.x = Math.PI / 2
  g.add(beamR)
  return g
}

// 11. Kotak Angpao & Stand Emas (Baru)
function buildKotakAngpao() {
  const g = new THREE.Group()
  g.add(box(0.46, 0.04, 0.46, M_GOLD, 0, 0.02, 0))
  g.add(box(0.4, 0.7, 0.4, M_WHITE, 0, 0.39, 0))
  g.add(box(0.44, 0.44, 0.44, M_CREAM, 0, 0.96, 0))
  g.add(box(0.46, 0.05, 0.46, M_GOLD, 0, 1.18, 0))
  g.add(box(0.18, 0.02, 0.03, M_DARK, 0, 1.21, 0))
  return g
}

// 12. Kue Pernikahan 3 Tingkat Floral (Baru)
function buildWeddingCake3Tier() {
  const g = new THREE.Group()
  // Meja pedestal cake stand
  g.add(cyl(0.32, 0.25, 0.75, M_WHITE, 0, 0.375, 0, 20))
  g.add(cyl(0.35, 0.35, 0.04, M_GOLD, 0, 0.77, 0, 20))
  // 3 tingkat kue putih-krem + trim emas + bunga
  g.add(cyl(0.26, 0.26, 0.18, M_WHITE, 0, 0.88, 0, 20))
  g.add(cyl(0.2, 0.2, 0.16, M_CREAM, 0, 1.05, 0, 20))
  g.add(cyl(0.13, 0.13, 0.14, M_WHITE, 0, 1.2, 0, 20))
  const f = floralCluster(0.75)
  f.position.set(0, 1.32, 0)
  g.add(f)
  return g
}

// 13. Gerbang Janur & Melati Tradisional (Baru)
function buildJanurMelatiGate() {
  const g = new THREE.Group()
  g.add(box(0.42, 0.12, 0.42, M_WOOD, -1.2, 0.06, 0))
  g.add(box(0.42, 0.12, 0.42, M_WOOD, 1.2, 0.06, 0))
  g.add(cyl(0.05, 0.06, 2.0, M_LEAF, -1.2, 1.1, 0, 12))
  g.add(cyl(0.05, 0.06, 2.0, M_LEAF, 1.2, 1.1, 0, 12))
  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.06, 10, 28, Math.PI), M_JANUR)
  arch.position.set(0, 2.05, 0)
  g.add(arch)
  // Untaian melati putih menjuntai di puncak gerbang
  for (let i = -4; i <= 4; i++) {
    const x = i * 0.24
    const len = 0.55 - Math.abs(i) * 0.06
    g.add(cyl(0.015, 0.015, len, M_WHITE, x, 2.95 - len / 2 - Math.abs(i) * 0.06, 0.05, 8))
  }
  return g
}

const NEW_GLBS = [
  { file: 'kursi_chiavari_emas.glb', builder: buildKursiChiavariEmas },
  { file: 'pelaminan_klasik_emas.glb', builder: buildPelaminanKlasikEmas },
  { file: 'meja_persegi_6_orang.glb', builder: buildMejaPersegi },
  { file: 'buket_meja_mawar.glb', builder: buildBuketMawar },
  { file: 'fairy_light_curtain.glb', builder: buildFairyLightCurtain },
  { file: 'karpet_aisle_putih.glb', builder: buildKarpetAisle },
  { file: 'meja_penerima_tamu_angpao.glb', builder: buildMejaPenerimaTamu },
  { file: 'tenda_roder_drapery.glb', builder: buildTendaRoder },
  { file: 'panggung_musik_wedding.glb', builder: buildPanggungMusik },
  { file: 'lorong_pergola_bunga.glb', builder: buildPergolaBunga },
  { file: 'kotak_angpao_emas.glb', builder: buildKotakAngpao },
  { file: 'kue_pernikahan_3_tingkat.glb', builder: buildWeddingCake3Tier },
  { file: 'janur_melati_gate.glb', builder: buildJanurMelatiGate },
]

async function downloadFile(url, dest) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()))
}

async function downloadPlasticChair() {
  const id = 'plastic_monobloc_chair_01'
  const filesJson = await (await fetch(`https://api.polyhaven.com/files/${id}`)).json()
  const gltfEntry = filesJson.gltf?.['1k']?.gltf
  const assetDir = path.join(PH_DIR, id)
  fs.mkdirSync(assetDir, { recursive: true })
  const gltfFilename = path.basename(new URL(gltfEntry.url).pathname)
  await downloadFile(gltfEntry.url, path.join(assetDir, gltfFilename))
  for (const [relPath, info] of Object.entries(gltfEntry.include || {})) {
    if (info?.url) await downloadFile(info.url, path.join(assetDir, relPath))
  }
  const thumbPath = path.join(assetDir, 'thumb.png')
  await downloadFile(`https://cdn.polyhaven.com/asset_img/thumbs/${id}.png?height=300`, thumbPath).catch(() => {})
  return {
    modelPath: `/uploads/library/polyhaven/${id}/${gltfFilename}`,
    thumbPath: fs.existsSync(thumbPath) ? `/uploads/library/polyhaven/${id}/thumb.png` : null,
  }
}

const exporter = new GLTFExporter()
for (const item of NEW_GLBS) {
  const scene = new THREE.Scene()
  const m = item.builder()
  m.name = item.file.replace('.glb', '')
  scene.add(m)
  const buf = await new Promise((res, rej) => exporter.parse(scene, res, rej, { binary: true }))
  fs.writeFileSync(path.join(LIB_DIR, item.file), Buffer.from(buf))
  console.log(`[GLB OK] ${item.file} (${(buf.byteLength / 1024).toFixed(1)} KB)`)
}

const plasticChair = await downloadPlasticChair()
console.log('[POLYHAVEN OK] plastic_monobloc_chair_01 ->', plasticChair.modelPath)

await sequelize.authenticate()

async function ensureLib(data) {
  const [lib] = await Model3DLibrary.findOrCreate({
    where: { file_path: data.file_path },
    defaults: {
      nama_model: data.nama_model,
      kategori: data.kategori,
      file_path: data.file_path,
      thumbnail_path: data.thumbnail_path || null,
      panjang: data.panjang,
      lebar: data.lebar,
      tinggi: data.tinggi,
      sumber: data.sumber || 'WedSpace Wedding 3D Studio',
      license_name: data.license_name || 'CC-BY-4.0',
      license_url: data.license_url || 'https://creativecommons.org/licenses/by/4.0/',
      attribution_text: data.attribution_text || 'Aset 3D Dekorasi Pernikahan WedSpace',
      is_active: true,
    },
  })
  return lib
}

// 1. Daftarkan model pengganti & hubungkan ke semua 19 dekorasi awal WedSpace (0 placeholder tersisa!)
const UPGRADE_MAP = [
  { matchName: 'Pelaminan Floral Minimal', file_path: '/uploads/library/pelaminan_floral_elegan.glb', kategori: 'Pelaminan', p: 400, l: 200, t: 250 },
  { matchName: 'Pelaminan Klasik Emas', file_path: '/uploads/library/pelaminan_klasik_emas.glb', kategori: 'Pelaminan', p: 450, l: 220, t: 260 },
  { matchName: 'Meja Bundar 10 Orang', file_path: '/uploads/library/meja_bundar.glb', kategori: 'Meja', p: 180, l: 180, t: 75 },
  { matchName: 'Meja Persegi 6 Orang', file_path: '/uploads/library/meja_persegi_6_orang.glb', kategori: 'Meja', p: 150, l: 90, t: 75 },
  { matchName: 'Meja Prasmanan Panjang', file_path: '/uploads/library/meja_prasmanan_vip.glb', kategori: 'Meja', p: 300, l: 80, t: 90 },
  { matchName: 'Meja Prasmanan Catering', file_path: '/uploads/library/meja_prasmanan_vip.glb', kategori: 'Meja', p: 300, l: 80, t: 90 },
  { matchName: 'Kursi Tiffany Putih', file_path: '/uploads/library/kursi_tiffany.glb', kategori: 'Kursi', p: 45, l: 45, t: 90 },
  { matchName: 'Kursi Chiavari Emas', file_path: '/uploads/library/kursi_chiavari_emas.glb', kategori: 'Kursi', p: 45, l: 45, t: 92 },
  { matchName: 'Kursi plastik Napolly', file_path: plasticChair.modelPath, thumb: plasticChair.thumbPath, kategori: 'Kursi', p: 45, l: 45, t: 82, sumber: 'Poly Haven', license_name: 'CC0' },
  { matchName: 'Standing Flower Peony', file_path: '/uploads/library/standing_flower_peony.glb', kategori: 'Bunga', p: 50, l: 50, t: 140 },
  { matchName: 'Buket Meja Mawar', file_path: '/uploads/library/buket_meja_mawar.glb', kategori: 'Bunga', p: 30, l: 30, t: 40 },
  { matchName: 'Backdrop Photobooth', file_path: '/uploads/library/backdrop_photobooth_floral.glb', kategori: 'Backdrop', p: 200, l: 30, t: 250 },
  { matchName: 'Photobooth Floral Rustic', file_path: '/uploads/library/backdrop_photobooth_floral.glb', kategori: 'Photobooth', p: 260, l: 85, t: 240 },
  { matchName: 'Fairy Light Curtain', file_path: '/uploads/library/fairy_light_curtain.glb', kategori: 'Lighting', p: 300, l: 20, t: 250 },
  { matchName: 'Lampu Gantung Kristal', file_path: '/uploads/library/lampu_gantung_kristal.glb', kategori: 'Lighting', p: 80, l: 80, t: 100 },
  { matchName: 'Lampu Gantung Chandelier Kristal', file_path: '/uploads/library/polyhaven/Chandelier_01/Chandelier_01_1k.gltf', thumb: '/uploads/library/polyhaven/Chandelier_01/thumb.png', kategori: 'Lighting', p: 90, l: 90, t: 110, sumber: 'Poly Haven', license_name: 'CC0' },
  { matchName: 'Welcome Sign Easel Kayu', file_path: '/uploads/library/welcome_sign_easel.glb', kategori: 'Welcome Sign', p: 75, l: 65, t: 165 },
  { matchName: 'Karpet Aisle Putih Elegan', file_path: '/uploads/library/karpet_aisle_putih.glb', kategori: 'Karpet', p: 150, l: 600, t: 3 },
  { matchName: 'Meja Penerima Tamu & Kotak Angpao', file_path: '/uploads/library/meja_penerima_tamu_angpao.glb', kategori: 'Meja', p: 180, l: 72, t: 110 },
]

for (const u of UPGRADE_MAP) {
  const lib = await ensureLib({
    nama_model: u.matchName,
    kategori: u.kategori,
    file_path: u.file_path,
    thumbnail_path: u.thumb || null,
    panjang: u.p,
    lebar: u.l,
    tinggi: u.t,
    sumber: u.sumber,
    license_name: u.license_name,
  })
  const rows = await Decoration.findAll({ where: { nama_dekorasi: u.matchName, created_by_user_id: null } })
  for (const r of rows) {
    await r.update({
      model_3d_source: 'library',
      library_model_id: lib.id,
      model_3d: u.file_path,
      ...(u.thumb && !r.gambar ? { gambar: u.thumb } : {}),
    })
    console.log(`[UPGRADED] #${r.id} ${r.nama_dekorasi} -> ${u.file_path}`)
  }
}

// 2. Tambahkan 6 Dekorasi Pernikahan Ikonik Baru
const NEW_WEDDING_ITEMS = [
  {
    nama: 'Tenda Roder Drapery Putih Emas',
    kategori: 'Pelaminan',
    file_path: '/uploads/library/tenda_roder_drapery.glb',
    p: 600, l: 600, t: 380, harga: 7500000,
    deskripsi: 'Tenda roder outdoor putih-krem dengan rangka lis emas untuk resepsi halaman dan taman.',
  },
  {
    nama: 'Panggung Musik & Band Pernikahan',
    kategori: 'Pelaminan',
    file_path: '/uploads/library/panggung_musik_wedding.glb',
    p: 400, l: 250, t: 190, harga: 3200000,
    deskripsi: 'Panggung hiburan akustik/band beralas karpet burgundy lengkap dengan speaker dan stand mic.',
  },
  {
    nama: 'Pergola Lorong Bunga Aisle',
    kategori: 'Bunga',
    file_path: '/uploads/library/lorong_pergola_bunga.glb',
    p: 280, l: 400, t: 295, harga: 4800000,
    deskripsi: 'Terowongan pergola 3 lengkung emas berhias rangkaian bunga untuk lorong kirab pengantin.',
  },
  {
    nama: 'Kotak Angpao & Stand Emas',
    kategori: 'Aksesoris',
    file_path: '/uploads/library/kotak_angpao_emas.glb',
    p: 50, l: 50, t: 120, harga: 250000,
    deskripsi: 'Kotak angpao pernikahan elegan dengan stand pilar putih dan trim emas.',
  },
  {
    nama: 'Kue Pernikahan 3 Tingkat Floral',
    kategori: 'Aksesoris',
    file_path: '/uploads/library/kue_pernikahan_3_tingkat.glb',
    p: 70, l: 70, t: 135, harga: 1500000,
    deskripsi: 'Dummy/display wedding cake 3 tingkat berhias bunga di atas meja pedestal emas.',
  },
  {
    nama: 'Gerbang Janur & Melati Tradisional',
    kategori: 'Pelaminan',
    file_path: '/uploads/library/janur_melati_gate.glb',
    p: 260, l: 80, t: 295, harga: 2200000,
    deskripsi: 'Gerbang pintu masuk berhias lengkung janur kuning dan ronce melati khas pernikahan Indonesia.',
  },
]

for (const nw of NEW_WEDDING_ITEMS) {
  const lib = await ensureLib({
    nama_model: nw.nama,
    kategori: nw.kategori,
    file_path: nw.file_path,
    panjang: nw.p,
    lebar: nw.l,
    tinggi: nw.t,
  })
  const [dek] = await Decoration.findOrCreate({
    where: { nama_dekorasi: nw.nama, created_by_user_id: null },
    defaults: {
      nama_dekorasi: nw.nama,
      kategori: nw.kategori,
      harga: nw.harga,
      panjang: nw.p,
      lebar: nw.l,
      tinggi: nw.t,
      deskripsi: nw.deskripsi,
      visibility: 'public',
      is_active: true,
      model_3d_source: 'library',
      library_model_id: lib.id,
      model_3d: nw.file_path,
      created_by_user_id: null,
    },
  })
  console.log(`[NEW WEDDING] #${dek.id} ${nw.nama} -> ${nw.file_path}`)
}

const remainingPlaceholders = await Decoration.count({
  where: { created_by_user_id: null, model_3d_source: 'placeholder' },
})
console.log(`\nSelesai! Sisa dekorasi publik berstatus placeholder: ${remainingPlaceholders}`)
await sequelize.close()
