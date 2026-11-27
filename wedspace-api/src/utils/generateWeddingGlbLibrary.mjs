import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

// Load Three.js & GLTFExporter from wedspace-web/node_modules/three
const THREE_ROOT = 'D:/Cooolege/naga/IPPL/tuGED/WedSpace/wedspace-web/node_modules/three'
const THREE = await import(`file:///${THREE_ROOT}/build/three.module.js`)
const { GLTFExporter } = await import(`file:///${THREE_ROOT}/examples/jsm/exporters/GLTFExporter.js`)

// Polyfill FileReader for GLTFExporter binary mode in Node.js
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class FileReader {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf
        if (this.onloadend) this.onloadend()
        else if (this.onload) this.onload({ target: this })
      })
    }
    readAsDataURL(blob) {
      blob.arrayBuffer().then((buf) => {
        const b64 = Buffer.from(buf).toString('base64')
        this.result = `data:${blob.type || 'application/octet-stream'};base64,${b64}`
        if (this.onloadend) this.onloadend()
        else if (this.onload) this.onload({ target: this })
      })
    }
  }
}

const LIB_DIR = 'D:/Cooolege/naga/IPPL/tuGED/WedSpace/wedspace-api/uploads/library'
fs.mkdirSync(LIB_DIR, { recursive: true })

// Shared PBR materials helper
const mat = (hex, roughness = 0.65, metalness = 0.05, emissive = 0x000000, emissiveIntensity = 0) =>
  new THREE.MeshStandardMaterial({ color: hex, roughness, metalness, emissive, emissiveIntensity })

const M_WHITE = mat(0xfaf8f5, 0.55, 0.02)
const M_CREAM = mat(0xf3ece0, 0.72, 0.0)
const M_GOLD = mat(0xd4af37, 0.28, 0.85)
const M_WOOD = mat(0x8b5a2b, 0.7, 0.05)
const M_PINK = mat(0xf4b6c2, 0.78, 0.0)
const M_ROSE = mat(0xd86c82, 0.75, 0.0)
const M_BLUSH = mat(0xfce4ec, 0.78, 0.0)
const M_LEAF = mat(0x4f7942, 0.75, 0.0)
const M_BURGUNDY = mat(0x7f1125, 0.65, 0.05)
const M_SILVER = mat(0xd8dde6, 0.22, 0.9)
const M_CRYSTAL = mat(0xfffdf8, 0.08, 0.15, 0xfff3d1, 0.45)
const M_MARBLE = mat(0xf5f1eb, 0.35, 0.05)

function box(w, h, d, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
  m.position.set(x, y, z)
  return m
}

function cyl(rt, rb, h, material, x = 0, y = 0, z = 0, seg = 20) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material)
  m.position.set(x, y, z)
  return m
}

function sphere(r, material, x = 0, y = 0, z = 0, seg = 14) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), material)
  m.position.set(x, y, z)
  return m
}

function floralCluster(scale = 1) {
  const g = new THREE.Group()
  g.add(sphere(0.14 * scale, M_LEAF, -0.1 * scale, -0.02 * scale, 0))
  g.add(sphere(0.14 * scale, M_LEAF, 0.11 * scale, -0.02 * scale, 0.04 * scale))
  g.add(sphere(0.12 * scale, M_PINK, 0, 0.05 * scale, 0.03 * scale))
  g.add(sphere(0.1 * scale, M_BLUSH, -0.09 * scale, 0.04 * scale, -0.03 * scale))
  g.add(sphere(0.1 * scale, M_ROSE, 0.09 * scale, 0.03 * scale, -0.02 * scale))
  g.add(sphere(0.08 * scale, M_WHITE, 0, 0.1 * scale, -0.04 * scale))
  return g
}

// 1. Meja Bundar Perjamuan 10 Orang
function buildMejaBundar() {
  const g = new THREE.Group()
  g.add(cyl(0.88, 0.92, 0.72, M_CREAM, 0, 0.36, 0, 28))
  g.add(cyl(0.9, 0.9, 0.04, M_WHITE, 0, 0.74, 0, 28))
  // Centerpiece vas + bunga
  g.add(cyl(0.08, 0.1, 0.22, M_GOLD, 0, 0.87, 0, 16))
  const f = floralCluster(1.2)
  f.position.set(0, 1.02, 0)
  g.add(f)
  // 8 piring di sekeliling meja
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    g.add(cyl(0.12, 0.1, 0.015, M_WHITE, Math.cos(a) * 0.66, 0.77, Math.sin(a) * 0.66, 14))
    g.add(cyl(0.025, 0.02, 0.09, M_GOLD, Math.cos(a + 0.18) * 0.54, 0.81, Math.sin(a + 0.18) * 0.54, 10))
  }
  return g
}

// 2. Kursi Tiffany Putih Klasik
function buildKursiTiffany() {
  const g = new THREE.Group()
  // 4 kaki
  for (const sx of [-0.18, 0.18]) {
    for (const sz of [-0.18, 0.18]) {
      g.add(cyl(0.016, 0.014, 0.45, M_WHITE, sx, 0.225, sz, 10))
    }
  }
  // Dudukan + bantalan
  g.add(box(0.42, 0.04, 0.42, M_WHITE, 0, 0.45, 0))
  g.add(box(0.38, 0.045, 0.38, M_CREAM, 0, 0.485, 0))
  // Tiang sandaran kiri & kanan
  g.add(cyl(0.016, 0.016, 0.46, M_WHITE, -0.18, 0.68, -0.18, 10))
  g.add(cyl(0.016, 0.016, 0.46, M_WHITE, 0.18, 0.68, -0.18, 10))
  // Palang atas & bawah sandaran + jeruji khas Tiffany
  g.add(box(0.38, 0.03, 0.025, M_WHITE, 0, 0.9, -0.18))
  g.add(box(0.38, 0.025, 0.025, M_WHITE, 0, 0.62, -0.18))
  for (const x of [-0.1, -0.033, 0.033, 0.1]) {
    g.add(cyl(0.009, 0.009, 0.42, M_WHITE, x, 0.68, -0.18, 8))
  }
  // Pita emas/blush di sandaran
  g.add(box(0.39, 0.05, 0.032, M_PINK, 0, 0.72, -0.18))
  return g
}

// 3. Floral Wedding Arch Modern
function buildWeddingArch() {
  const g = new THREE.Group()
  // Base kiri & kanan
  g.add(box(0.4, 0.08, 0.5, M_GOLD, -1.1, 0.04, 0))
  g.add(box(0.4, 0.08, 0.5, M_GOLD, 1.1, 0.04, 0))
  // Pilar vertikal
  g.add(cyl(0.04, 0.04, 1.75, M_GOLD, -1.1, 0.95, 0, 14))
  g.add(cyl(0.04, 0.04, 1.75, M_GOLD, 1.1, 0.95, 0, 14))
  // Lengkung atas (torus setengah lingkaran)
  const archGeo = new THREE.TorusGeometry(1.1, 0.042, 12, 32, Math.PI)
  const archMesh = new THREE.Mesh(archGeo, M_GOLD)
  archMesh.position.set(0, 1.82, 0)
  g.add(archMesh)
  // Rangkaian bunga di puncak & sisi kiri-kanan
  const pts = [
    [0, 2.92, 0, 1.5],
    [-0.55, 2.75, 0, 1.3],
    [0.55, 2.75, 0, 1.3],
    [-1.02, 2.2, 0, 1.2],
    [1.02, 2.2, 0, 1.2],
  ]
  for (const [x, y, z, s] of pts) {
    const f = floralCluster(s)
    f.position.set(x, y, z)
    g.add(f)
  }
  return g
}

// 4. Pelaminan Floral Elegan
function buildPelaminanFloral() {
  const g = new THREE.Group()
  // Panggung 2 tingkat
  g.add(box(4.5, 0.25, 2.2, M_MARBLE, 0, 0.125, 0))
  g.add(box(2.2, 0.12, 0.45, M_CREAM, 0, 0.06, 1.25))
  // Backdrop 3 panel di belakang
  g.add(box(1.9, 2.4, 0.12, M_WHITE, 0, 1.45, -0.95))
  g.add(box(1.98, 2.48, 0.08, M_GOLD, 0, 1.45, -0.98))
  g.add(box(1.15, 2.0, 0.1, M_CREAM, -1.55, 1.25, -0.85))
  g.add(box(1.15, 2.0, 0.1, M_CREAM, 1.55, 1.25, -0.85))
  // Mahkota bunga atas backdrop
  for (const x of [-0.75, -0.25, 0.25, 0.75]) {
    const f = floralCluster(1.5)
    f.position.set(x, 2.62, -0.86)
    g.add(f)
  }
  // Sofa pengantin di tengah panggung
  g.add(box(1.6, 0.4, 0.7, M_CREAM, 0, 0.45, -0.1))
  g.add(box(1.6, 0.65, 0.16, M_WHITE, 0, 0.9, -0.4))
  g.add(box(1.68, 0.72, 0.08, M_GOLD, 0, 0.92, -0.45))
  g.add(box(0.14, 0.55, 0.7, M_WHITE, -0.78, 0.55, -0.1))
  g.add(box(0.14, 0.55, 0.7, M_WHITE, 0.78, 0.55, -0.1))
  // 2 Kursi orang tua
  for (const sx of [-1.45, 1.45]) {
    g.add(box(0.6, 0.38, 0.58, M_CREAM, sx, 0.44, 0.0))
    g.add(box(0.6, 0.58, 0.12, M_WHITE, sx, 0.85, -0.25))
  }
  // 2 Standing flower di pojok depan panggung
  for (const sx of [-1.95, 1.95]) {
    g.add(cyl(0.05, 0.08, 0.95, M_GOLD, sx, 0.72, 0.7, 12))
    const f = floralCluster(1.35)
    f.position.set(sx, 1.28, 0.7)
    g.add(f)
  }
  return g
}

// 5. Sofa Pengantin Klasik Emas
function buildSofaPengantin() {
  const g = new THREE.Group()
  // Kaki emas
  for (const sx of [-0.78, 0.78]) {
    for (const sz of [-0.32, 0.32]) {
      g.add(cyl(0.03, 0.022, 0.22, M_GOLD, sx, 0.11, sz, 10))
    }
  }
  // Rangka & dudukan
  g.add(box(1.72, 0.1, 0.78, M_GOLD, 0, 0.25, 0))
  g.add(box(1.64, 0.22, 0.72, M_CREAM, 0, 0.4, 0.02))
  // Sandaran & trim emas
  g.add(box(1.66, 0.62, 0.16, M_CREAM, 0, 0.8, -0.3))
  g.add(box(1.74, 0.7, 0.06, M_GOLD, 0, 0.82, -0.37))
  // Armrest kiri & kanan
  g.add(box(0.14, 0.42, 0.74, M_CREAM, -0.8, 0.52, 0))
  g.add(box(0.14, 0.42, 0.74, M_CREAM, 0.8, 0.52, 0))
  // 2 bantal aksen blush
  g.add(box(0.28, 0.26, 0.1, M_PINK, -0.52, 0.62, -0.15))
  g.add(box(0.28, 0.26, 0.1, M_PINK, 0.52, 0.62, -0.15))
  return g
}

// 6. Meja Prasmanan VIP
function buildMejaPrasmanan() {
  const g = new THREE.Group()
  g.add(box(2.96, 0.84, 0.82, M_CREAM, 0, 0.42, 0))
  g.add(box(3.0, 0.05, 0.86, M_WHITE, 0, 0.865, 0))
  // Aksen pita burgundy di bagian depan meja
  g.add(box(2.98, 0.12, 0.03, M_BURGUNDY, 0, 0.72, 0.42))
  // 3 Chafing dish stainless steel
  for (const x of [-0.95, 0, 0.95]) {
    g.add(box(0.56, 0.14, 0.38, M_SILVER, x, 0.96, 0))
    g.add(box(0.52, 0.08, 0.34, M_SILVER, x, 1.07, 0))
    g.add(cyl(0.02, 0.02, 0.05, M_GOLD, x, 1.13, 0, 8))
  }
  return g
}

// 7. Standing Flower Peony Emas
function buildStandingFlower() {
  const g = new THREE.Group()
  g.add(box(0.42, 0.04, 0.42, M_GOLD, 0, 0.02, 0))
  // 4 tiang sudut tipis rangka kotak emas
  for (const sx of [-0.16, 0.16]) {
    for (const sz of [-0.16, 0.16]) {
      g.add(cyl(0.012, 0.012, 1.15, M_GOLD, sx, 0.6, sz, 8))
    }
  }
  g.add(box(0.36, 0.03, 0.36, M_GOLD, 0, 1.18, 0))
  g.add(cyl(0.18, 0.12, 0.16, M_WHITE, 0, 1.27, 0, 16))
  const f = floralCluster(1.65)
  f.position.set(0, 1.42, 0)
  g.add(f)
  return g
}

// 8. Backdrop Photobooth Floral
function buildPhotobooth() {
  const g = new THREE.Group()
  // Base lantai
  g.add(box(2.6, 0.06, 0.85, M_CREAM, 0, 0.03, 0))
  // Panel utama & panel lengkung samping
  g.add(box(1.5, 2.25, 0.12, M_BLUSH, -0.3, 1.18, -0.25))
  g.add(box(1.1, 1.95, 0.1, M_WHITE, 0.65, 1.03, -0.18))
  // Trim bingkai emas
  g.add(box(1.56, 2.31, 0.06, M_GOLD, -0.3, 1.18, -0.29))
  // Bangku foto di depan
  g.add(box(1.15, 0.42, 0.4, M_WHITE, 0, 0.27, 0.2))
  // Rangkaian bunga pojok kiri atas & kanan bawah
  const f1 = floralCluster(1.5)
  f1.position.set(-0.9, 2.2, -0.14)
  g.add(f1)
  const f2 = floralCluster(1.3)
  f2.position.set(1.05, 0.45, -0.05)
  g.add(f2)
  return g
}

// 9. Lampu Gantung Kristal Chandelier
function buildChandelier() {
  const g = new THREE.Group()
  g.add(cyl(0.08, 0.12, 0.08, M_GOLD, 0, 1.16, 0, 14))
  g.add(cyl(0.015, 0.015, 0.5, M_GOLD, 0, 0.9, 0, 8))
  // Cincin atas & bawah
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.025, 10, 28), M_GOLD)
  ring1.rotation.x = Math.PI / 2
  ring1.position.y = 0.62
  g.add(ring1)
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.02, 10, 24), M_GOLD)
  ring2.rotation.x = Math.PI / 2
  ring2.position.y = 0.36
  g.add(ring2)
  // Deretan kristal gantung
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    g.add(cyl(0.018, 0.005, 0.24, M_CRYSTAL, Math.cos(a) * 0.42, 0.48, Math.sin(a) * 0.42, 6))
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    g.add(cyl(0.016, 0.004, 0.2, M_CRYSTAL, Math.cos(a) * 0.28, 0.24, Math.sin(a) * 0.28, 6))
  }
  g.add(sphere(0.07, M_CRYSTAL, 0, 0.12, 0, 10))
  return g
}

// 10. Gazebo Akad Nikah
function buildGazeboAkad() {
  const g = new THREE.Group()
  g.add(box(3.5, 0.12, 3.5, M_MARBLE, 0, 0.06, 0))
  // 4 pilar sudut + tirai putih
  for (const sx of [-1.6, 1.6]) {
    for (const sz of [-1.6, 1.6]) {
      g.add(cyl(0.07, 0.08, 2.7, M_WHITE, sx, 1.45, sz, 14))
      g.add(box(0.24, 0.12, 0.24, M_GOLD, sx, 0.18, sz))
      g.add(box(0.22, 0.1, 0.22, M_GOLD, sx, 2.75, sz))
    }
  }
  // Balok atap keliling
  g.add(box(3.4, 0.14, 0.12, M_WHITE, 0, 2.85, -1.6))
  g.add(box(3.4, 0.14, 0.12, M_WHITE, 0, 2.85, 1.6))
  g.add(box(0.12, 0.14, 3.4, M_WHITE, -1.6, 2.85, 0))
  g.add(box(0.12, 0.14, 3.4, M_WHITE, 1.6, 2.85, 0))
  // Hiasan bunga di keempat sudut atas
  for (const sx of [-1.5, 1.5]) {
    for (const sz of [-1.5, 1.5]) {
      const f = floralCluster(1.4)
      f.position.set(sx, 2.95, sz)
      g.add(f)
    }
  }
  return g
}

// 11. Welcome Sign Kayu & Floral
function buildWelcomeSign() {
  const g = new THREE.Group()
  // 2 kaki depan easel + 1 kaki belakang
  const legL = cyl(0.02, 0.02, 1.65, M_WOOD, -0.22, 0.8, 0.08, 8)
  legL.rotation.z = -0.1
  legL.rotation.x = -0.08
  g.add(legL)
  const legR = cyl(0.02, 0.02, 1.65, M_WOOD, 0.22, 0.8, 0.08, 8)
  legR.rotation.z = 0.1
  legR.rotation.x = -0.08
  g.add(legR)
  const legB = cyl(0.02, 0.02, 1.6, M_WOOD, 0, 0.78, -0.26, 8)
  legB.rotation.x = 0.26
  g.add(legB)
  // Papan welcome sign berbingkai emas
  const board = new THREE.Group()
  board.add(box(0.68, 0.88, 0.03, M_WHITE, 0, 0, 0))
  board.add(box(0.72, 0.92, 0.02, M_GOLD, 0, 0, -0.015))
  const f = floralCluster(0.85)
  f.position.set(-0.24, 0.38, 0.04)
  board.add(f)
  board.position.set(0, 1.05, 0.06)
  board.rotation.x = -0.12
  g.add(board)
  return g
}

// 12. Meja Akad Nikah VIP
function buildMejaAkad() {
  const g = new THREE.Group()
  g.add(box(1.96, 0.72, 0.86, M_WHITE, 0, 0.36, 0))
  g.add(box(2.0, 0.04, 0.9, M_MARBLE, 0, 0.74, 0))
  g.add(box(1.98, 0.06, 0.03, M_GOLD, 0, 0.68, 0.44))
  g.add(box(1.98, 0.06, 0.03, M_GOLD, 0, 0.68, -0.44))
  // Rangkaian bunga memanjang di tengah meja akad
  for (const x of [-0.45, 0, 0.45]) {
    const f = floralCluster(0.95)
    f.position.set(x, 0.82, 0)
    g.add(f)
  }
  return g
}

const MODELS = [
  { file: 'meja_bundar.glb', builder: buildMejaBundar },
  { file: 'kursi_tiffany.glb', builder: buildKursiTiffany },
  { file: 'wedding_arch.glb', builder: buildWeddingArch },
  { file: 'pelaminan_floral_elegan.glb', builder: buildPelaminanFloral },
  { file: 'sofa_pengantin_klasik.glb', builder: buildSofaPengantin },
  { file: 'meja_prasmanan_vip.glb', builder: buildMejaPrasmanan },
  { file: 'standing_flower_peony.glb', builder: buildStandingFlower },
  { file: 'backdrop_photobooth_floral.glb', builder: buildPhotobooth },
  { file: 'lampu_gantung_kristal.glb', builder: buildChandelier },
  { file: 'gazebo_akad_nikah.glb', builder: buildGazeboAkad },
  { file: 'welcome_sign_easel.glb', builder: buildWelcomeSign },
  { file: 'meja_akad_nikah.glb', builder: buildMejaAkad },
]

const exporter = new GLTFExporter()

for (const item of MODELS) {
  const scene = new THREE.Scene()
  const model = item.builder()
  model.name = item.file.replace('.glb', '')
  scene.add(model)

  const arrayBuffer = await new Promise((resolve, reject) => {
    exporter.parse(scene, resolve, reject, { binary: true })
  })
  const outPath = path.join(LIB_DIR, item.file)
  fs.writeFileSync(outPath, Buffer.from(arrayBuffer))
  console.log(`[GLB OK] ${item.file} (${(arrayBuffer.byteLength / 1024).toFixed(1)} KB)`)
}
