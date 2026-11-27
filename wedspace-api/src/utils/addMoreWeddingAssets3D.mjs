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
fs.mkdirSync(LIB_DIR, { recursive: true })

const mat = (hex, roughness = 0.6, metalness = 0.05, emissive = 0x000000, emissiveIntensity = 0) =>
  new THREE.MeshStandardMaterial({ color: hex, roughness, metalness, emissive, emissiveIntensity })

const M_WHITE = mat(0xfaf8f5, 0.5, 0.02)
const M_CREAM = mat(0xf3ece0, 0.72, 0.0)
const M_GOLD = mat(0xd4af37, 0.24, 0.88)
const M_WOOD = mat(0x8b5a2b, 0.72, 0.05)
const M_WOOD_DARK = mat(0x5c3a1e, 0.75, 0.05)
const M_PINK = mat(0xf4b6c2, 0.75, 0.0)
const M_SAKURA = mat(0xffcad4, 0.72, 0.0)
const M_ROSE = mat(0xd45572, 0.72, 0.0)
const M_BLUSH = mat(0xfce4ec, 0.75, 0.0)
const M_RED = mat(0xa91d2c, 0.68, 0.02)
const M_BURGUNDY = mat(0x7f1125, 0.65, 0.05)
const M_LEAF = mat(0x4b783e, 0.75, 0.0)
const M_GRASS = mat(0x558b3e, 0.88, 0.0)
const M_DARK = mat(0x28262e, 0.55, 0.2)
const M_SILVER = mat(0xdce2ea, 0.22, 0.88)
const M_MARBLE = mat(0xf5f1eb, 0.32, 0.05)
const M_GLASS = mat(0xeef6ff, 0.12, 0.15)
const M_WARM = mat(0xfff4d2, 0.1, 0.0, 0xffe299, 1.5)
const M_NEON = mat(0xfff0f5, 0.1, 0.0, 0xff9ec4, 1.4)

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
const sph = (r, m, x = 0, y = 0, z = 0, seg = 10) => {
  const o = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), m)
  o.position.set(x, y, z)
  return o
}
function floralCluster(scale = 1) {
  const g = new THREE.Group()
  g.add(sph(0.13 * scale, M_LEAF, -0.1 * scale, -0.02 * scale, 0))
  g.add(sph(0.13 * scale, M_LEAF, 0.1 * scale, -0.02 * scale, 0.03 * scale))
  g.add(sph(0.11 * scale, M_PINK, 0, 0.05 * scale, 0.02 * scale))
  g.add(sph(0.095 * scale, M_BLUSH, -0.08 * scale, 0.04 * scale, -0.03 * scale))
  g.add(sph(0.095 * scale, M_ROSE, 0.08 * scale, 0.03 * scale, -0.02 * scale))
  return g
}

// 1. Pelaminan Modern Minimalis Putih
function buildPelaminanMinimalis() {
  const g = new THREE.Group()
  g.add(box(4.2, 0.24, 2.0, M_WHITE, 0, 0.12, 0))
  g.add(box(1.8, 2.2, 0.12, M_WHITE, 0, 1.34, -0.85))
  g.add(box(1.0, 1.85, 0.1, M_CREAM, -1.35, 1.16, -0.78))
  g.add(box(1.0, 1.85, 0.1, M_CREAM, 1.35, 1.16, -0.78))
  g.add(box(1.5, 0.4, 0.65, M_CREAM, 0, 0.44, -0.1))
  g.add(box(1.5, 0.55, 0.14, M_WHITE, 0, 0.85, -0.38))
  for (const x of [-0.6, 0.6]) {
    const f = floralCluster(1.2)
    f.position.set(x, 2.42, -0.78)
    g.add(f)
  }
  return g
}

// 2. Pelaminan Rustic Kayu & Floral
function buildPelaminanRustic() {
  const g = new THREE.Group()
  g.add(box(4.0, 0.22, 2.0, M_WOOD, 0, 0.11, 0))
  g.add(box(2.4, 2.2, 0.1, M_WOOD_DARK, 0, 1.32, -0.85))
  for (const sx of [-1.45, 1.45]) {
    g.add(cyl(0.06, 0.07, 2.3, M_WOOD, sx, 1.35, -0.78, 10))
  }
  g.add(box(1.5, 0.42, 0.68, M_CREAM, 0, 0.43, -0.1))
  g.add(box(1.56, 0.58, 0.12, M_WOOD, 0, 0.84, -0.4))
  for (const x of [-0.9, 0, 0.9]) {
    const f = floralCluster(1.35)
    f.position.set(x, 2.42, -0.76)
    g.add(f)
  }
  return g
}

// 3. Backdrop Akad Lengkung Emas
function buildBackdropAkad() {
  const g = new THREE.Group()
  g.add(box(3.0, 0.06, 0.6, M_CREAM, 0, 0.03, 0))
  g.add(box(1.8, 2.3, 0.1, M_WHITE, 0, 1.21, -0.15))
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.04, 10, 28, Math.PI), M_GOLD)
  arch.position.set(0, 1.6, -0.08)
  g.add(arch)
  g.add(box(0.85, 1.85, 0.08, M_BLUSH, -1.1, 0.98, -0.1))
  g.add(box(0.85, 1.85, 0.08, M_BLUSH, 1.1, 0.98, -0.1))
  const f1 = floralCluster(1.4)
  f1.position.set(-0.7, 2.35, -0.02)
  g.add(f1)
  const f2 = floralCluster(1.4)
  f2.position.set(0.7, 2.35, -0.02)
  g.add(f2)
  return g
}

// 4. Backdrop Tirai Drapery Putih
function buildBackdropDrapery() {
  const g = new THREE.Group()
  g.add(cyl(0.03, 0.035, 2.8, M_GOLD, -1.75, 1.4, 0, 10))
  g.add(cyl(0.03, 0.035, 2.8, M_GOLD, 1.75, 1.4, 0, 10))
  const bar = cyl(0.025, 0.025, 3.55, M_GOLD, 0, 2.78, 0, 10)
  bar.rotation.z = Math.PI / 2
  g.add(bar)
  for (let i = -5; i <= 5; i++) {
    g.add(cyl(0.14, 0.16, 2.72, i % 2 === 0 ? M_WHITE : M_CREAM, i * 0.3, 1.38, 0, 10))
  }
  return g
}

// 5. Backdrop Hexagon Bunga Emas
function buildBackdropHexagon() {
  const g = new THREE.Group()
  g.add(box(2.2, 0.06, 0.55, M_GOLD, 0, 0.03, 0))
  const hex = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.045, 8, 6), M_GOLD)
  hex.position.set(0, 1.3, 0)
  g.add(hex)
  const f1 = floralCluster(1.45)
  f1.position.set(-0.7, 2.15, 0.05)
  g.add(f1)
  const f2 = floralCluster(1.35)
  f2.position.set(0.85, 0.75, 0.05)
  g.add(f2)
  return g
}

// 6. Platform Photobooth 360
function buildPhotobooth360() {
  const g = new THREE.Group()
  g.add(cyl(0.68, 0.72, 0.16, M_DARK, 0, 0.08, 0, 28))
  g.add(cyl(0.65, 0.65, 0.02, M_GOLD, 0, 0.17, 0, 28))
  // Lengan kamera 360 + ring light
  const arm = cyl(0.02, 0.02, 1.35, M_DARK, 0.65, 0.68, 0, 8)
  arm.rotation.z = -0.35
  g.add(arm)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 8, 20), M_WARM)
  ring.position.set(0.95, 1.4, 0)
  ring.rotation.y = Math.PI / 2
  g.add(ring)
  return g
}

// 7. Photobooth Ayunan Floral
function buildPhotoboothAyunan() {
  const g = new THREE.Group()
  g.add(cyl(0.045, 0.05, 2.35, M_GOLD, -1.05, 1.18, 0, 12))
  g.add(cyl(0.045, 0.05, 2.35, M_GOLD, 1.05, 1.18, 0, 12))
  const top = cyl(0.045, 0.045, 2.2, M_GOLD, 0, 2.35, 0, 12)
  top.rotation.z = Math.PI / 2
  g.add(top)
  // Tali + dudukan ayunan
  g.add(cyl(0.012, 0.012, 1.7, M_CREAM, -0.55, 1.48, 0, 8))
  g.add(cyl(0.012, 0.012, 1.7, M_CREAM, 0.55, 1.48, 0, 8))
  g.add(box(1.2, 0.08, 0.52, M_WHITE, 0, 0.62, 0))
  for (const x of [-0.6, 0, 0.6]) {
    const f = floralCluster(1.25)
    f.position.set(x, 2.38, 0.04)
    g.add(f)
  }
  return g
}

// 8. Photobooth Lengkung Neon & Sofa
function buildPhotoboothNeon() {
  const g = new THREE.Group()
  g.add(box(2.8, 0.06, 1.0, M_MARBLE, 0, 0.03, 0))
  g.add(box(2.5, 2.35, 0.12, M_DARK, 0, 1.24, -0.35))
  const neonRing = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.025, 8, 28), M_NEON)
  neonRing.position.set(0, 1.55, -0.27)
  g.add(neonRing)
  g.add(box(1.4, 0.42, 0.55, M_BLUSH, 0, 0.27, 0.12))
  g.add(box(1.4, 0.45, 0.12, M_BLUSH, 0, 0.65, -0.1))
  return g
}

// 9. Welcome Sign Akrilik Lengkung
function buildWelcomeAkrilik() {
  const g = new THREE.Group()
  g.add(box(0.75, 0.08, 0.4, M_WOOD, 0, 0.04, 0))
  g.add(box(0.68, 1.35, 0.03, M_GLASS, 0, 0.76, 0))
  g.add(box(0.72, 1.39, 0.02, M_GOLD, 0, 0.76, -0.02))
  const f = floralCluster(0.95)
  f.position.set(-0.28, 0.22, 0.06)
  g.add(f)
  return g
}

// 10. Welcome Sign Cermin Emas Easel
function buildWelcomeCermin() {
  const g = new THREE.Group()
  const l1 = cyl(0.02, 0.02, 1.68, M_GOLD, -0.24, 0.82, 0.08, 8)
  l1.rotation.z = -0.09
  g.add(l1)
  const l2 = cyl(0.02, 0.02, 1.68, M_GOLD, 0.24, 0.82, 0.08, 8)
  l2.rotation.z = 0.09
  g.add(l2)
  const lb = cyl(0.02, 0.02, 1.6, M_GOLD, 0, 0.78, -0.26, 8)
  lb.rotation.x = 0.25
  g.add(lb)
  g.add(box(0.72, 0.96, 0.04, M_GOLD, 0, 1.05, 0.06))
  g.add(box(0.64, 0.88, 0.045, M_SILVER, 0, 1.05, 0.065))
  const f = floralCluster(0.8)
  f.position.set(0.24, 1.48, 0.09)
  g.add(f)
  return g
}

// 11. Welcome Sign Rangka Besi Emas
function buildWelcomeStandingFrame() {
  const g = new THREE.Group()
  g.add(box(0.88, 0.04, 0.45, M_GOLD, 0, 0.02, 0))
  g.add(cyl(0.018, 0.018, 1.72, M_GOLD, -0.4, 0.88, 0, 8))
  g.add(cyl(0.018, 0.018, 1.72, M_GOLD, 0.4, 0.88, 0, 8))
  const top = cyl(0.018, 0.018, 0.84, M_GOLD, 0, 1.73, 0, 8)
  top.rotation.z = Math.PI / 2
  g.add(top)
  g.add(box(0.68, 0.95, 0.025, M_WHITE, 0, 1.15, 0))
  const f = floralCluster(0.85)
  f.position.set(0, 1.73, 0.04)
  g.add(f)
  return g
}

// 12. Karpet Merah Aisle VIP
function buildKarpetMerah() {
  const g = new THREE.Group()
  g.add(box(1.8, 0.025, 6.0, M_RED, 0, 0.0125, 0))
  g.add(box(0.07, 0.028, 6.0, M_GOLD, -0.86, 0.014, 0))
  g.add(box(0.07, 0.028, 6.0, M_GOLD, 0.86, 0.014, 0))
  return g
}

// 13. Karpet Beludru Krem Pelaminan
function buildKarpetKrem() {
  const g = new THREE.Group()
  g.add(box(3.0, 0.025, 4.0, M_CREAM, 0, 0.0125, 0))
  g.add(box(2.85, 0.028, 3.85, M_WHITE, 0, 0.014, 0))
  return g
}

// 14. Karpet Rumput Sintetis Garden
function buildKarpetRumput() {
  const g = new THREE.Group()
  g.add(box(1.6, 0.03, 5.0, M_GRASS, 0, 0.015, 0))
  for (let i = -4; i <= 4; i++) {
    g.add(sph(0.05, M_WHITE, -0.72, 0.04, i * 0.55, 6))
    g.add(sph(0.05, M_WHITE, 0.72, 0.04, i * 0.55, 6))
  }
  return g
}

// 15. Stall Gubukan Makanan Kayu
function buildStallGubukan() {
  const g = new THREE.Group()
  g.add(box(1.75, 0.86, 0.85, M_WOOD, 0, 0.43, 0))
  g.add(box(1.8, 0.05, 0.9, M_CREAM, 0, 0.885, 0))
  for (const sx of [-0.84, 0.84]) {
    for (const sz of [-0.38, 0.38]) {
      g.add(cyl(0.03, 0.03, 1.25, M_WOOD_DARK, sx, 1.52, sz, 8))
    }
  }
  const roof = box(1.95, 0.14, 1.05, M_CREAM, 0, 2.16, 0)
  g.add(roof)
  g.add(box(1.82, 0.14, 0.04, M_BURGUNDY, 0, 2.02, 0.46))
  g.add(box(0.55, 0.16, 0.36, M_SILVER, 0, 0.98, 0))
  return g
}

// 16. Dessert & Sweet Corner Table
function buildDessertTable() {
  const g = new THREE.Group()
  g.add(box(2.16, 0.84, 0.76, M_BLUSH, 0, 0.42, 0))
  g.add(box(2.2, 0.04, 0.8, M_WHITE, 0, 0.86, 0))
  // Tier dessert stands
  for (const x of [-0.65, 0, 0.65]) {
    g.add(cyl(0.18, 0.18, 0.03, M_GOLD, x, 0.96, 0, 16))
    g.add(cyl(0.04, 0.06, 0.1, M_GOLD, x, 0.91, 0, 10))
    g.add(cyl(0.12, 0.12, 0.12, M_PINK, x, 1.04, 0, 14))
  }
  return g
}

// 17. Meja Cocktail Standing Party
function buildMejaCocktail() {
  const g = new THREE.Group()
  g.add(cyl(0.32, 0.36, 1.06, M_WHITE, 0, 0.53, 0, 24))
  g.add(cyl(0.36, 0.36, 0.04, M_MARBLE, 0, 1.08, 0, 24))
  g.add(cyl(0.24, 0.24, 0.08, M_BURGUNDY, 0, 0.58, 0, 24))
  const f = floralCluster(0.65)
  f.position.set(0, 1.16, 0)
  g.add(f)
  return g
}

// 18. Meja VIP Bundar Taplak Emas
function buildMejaVipEmas() {
  const g = new THREE.Group()
  g.add(cyl(0.88, 0.92, 0.72, M_GOLD_LIGHT_MAT(), 0, 0.36, 0, 28))
  g.add(cyl(0.9, 0.9, 0.04, M_WHITE, 0, 0.74, 0, 28))
  g.add(cyl(0.09, 0.11, 0.26, M_GOLD, 0, 0.89, 0, 16))
  const f = floralCluster(1.3)
  f.position.set(0, 1.08, 0)
  g.add(f)
  return g
}
function M_GOLD_LIGHT_MAT() { return mat(0xe6d3a3, 0.65, 0.15) }

// 19. Kursi Crossback Kayu Rustic
function buildKursiCrossback() {
  const g = new THREE.Group()
  for (const sx of [-0.18, 0.18]) {
    for (const sz of [-0.18, 0.18]) {
      g.add(cyl(0.018, 0.015, 0.45, M_WOOD, sx, 0.225, sz, 10))
    }
  }
  g.add(box(0.42, 0.04, 0.42, M_WOOD, 0, 0.45, 0))
  g.add(box(0.36, 0.035, 0.36, M_CREAM, 0, 0.485, 0))
  g.add(cyl(0.016, 0.016, 0.45, M_WOOD, -0.18, 0.68, -0.18, 10))
  g.add(cyl(0.016, 0.016, 0.45, M_WOOD, 0.18, 0.68, -0.18, 10))
  g.add(box(0.38, 0.035, 0.025, M_WOOD, 0, 0.9, -0.18))
  // Silang X khas Crossback
  const x1 = cyl(0.012, 0.012, 0.48, M_WOOD_DARK, 0, 0.68, -0.18, 8)
  x1.rotation.z = 0.75
  g.add(x1)
  const x2 = cyl(0.012, 0.012, 0.48, M_WOOD_DARK, 0, 0.68, -0.18, 8)
  x2.rotation.z = -0.75
  g.add(x2)
  return g
}

// 20. Kursi Futura Cover Pita Emas
function buildKursiFutura() {
  const g = new THREE.Group()
  g.add(box(0.44, 0.46, 0.46, M_WHITE, 0, 0.23, 0))
  g.add(box(0.44, 0.44, 0.1, M_WHITE, 0, 0.68, -0.18))
  g.add(box(0.46, 0.09, 0.12, M_GOLD, 0, 0.66, -0.18))
  g.add(sph(0.06, M_GOLD, 0, 0.66, -0.25, 8))
  return g
}

// 21. Pohon Sakura Dekorasi Venue
function buildPohonSakura() {
  const g = new THREE.Group()
  g.add(box(0.55, 0.38, 0.55, M_WHITE, 0, 0.19, 0))
  g.add(cyl(0.08, 0.12, 1.5, M_WOOD_DARK, 0, 1.1, 0, 12))
  // Kanopi bunga sakura pink-putih rimbun
  const spots = [
    [0, 2.2, 0, 0.55],
    [-0.52, 2.05, 0.25, 0.42],
    [0.52, 2.05, -0.2, 0.42],
    [0.2, 2.1, 0.5, 0.4],
    [-0.25, 2.1, -0.48, 0.4],
    [0, 2.5, 0.1, 0.38],
  ]
  for (const [x, y, z, r] of spots) {
    g.add(sph(r, M_SAKURA, x, y, z, 12))
  }
  return g
}

// 22. Flower Wall Panel Mawar
function buildFlowerWall() {
  const g = new THREE.Group()
  g.add(box(2.4, 0.08, 0.45, M_GOLD, 0, 0.04, 0))
  g.add(box(2.36, 2.34, 0.12, M_BLUSH, 0, 1.24, 0))
  for (let i = -3; i <= 3; i++) {
    for (let j = 0; j <= 4; j++) {
      g.add(sph(0.16, (i + j) % 3 === 0 ? M_PINK : (i + j) % 3 === 1 ? M_WHITE : M_ROSE, i * 0.33, 0.32 + j * 0.46, 0.08, 8))
    }
  }
  return g
}

// 23. Lampu Pilar Aisle Hangat
function buildStandingLampPillar() {
  const g = new THREE.Group()
  g.add(box(0.32, 0.05, 0.32, M_GOLD, 0, 0.025, 0))
  g.add(cyl(0.025, 0.03, 1.18, M_GOLD, 0, 0.64, 0, 12))
  g.add(cyl(0.14, 0.11, 0.28, M_WARM, 0, 1.36, 0, 16))
  return g
}

// 24. String Light Canopy Outdoor
function buildStringLightCanopy() {
  const g = new THREE.Group()
  for (const sx of [-1.95, 1.95]) {
    for (const sz of [-1.95, 1.95]) {
      g.add(cyl(0.035, 0.04, 2.75, M_DARK, sx, 1.38, sz, 10))
    }
  }
  // Deretan lampu gantung bersilang di atas
  for (let i = -4; i <= 4; i++) {
    g.add(sph(0.045, M_WARM, i * 0.45, 2.72, i * 0.45, 8))
    g.add(sph(0.045, M_WARM, i * 0.45, 2.72, -i * 0.45, 8))
  }
  return g
}

// 25. Podium MC & Sambutan
function buildPodiumMC() {
  const g = new THREE.Group()
  g.add(box(0.62, 0.06, 0.5, M_WOOD_DARK, 0, 0.03, 0))
  g.add(box(0.46, 1.02, 0.36, M_WHITE, 0, 0.57, 0))
  g.add(box(0.48, 0.04, 0.38, M_GOLD, 0, 0.85, 0))
  const desk = box(0.64, 0.05, 0.48, M_WOOD, 0, 1.12, 0.02)
  desk.rotation.x = 0.2
  g.add(desk)
  g.add(cyl(0.01, 0.01, 0.22, M_DARK, 0, 1.24, -0.05, 8))
  return g
}

// 26. Rak Display Souvenir Pernikahan
function buildRakSouvenir() {
  const g = new THREE.Group()
  for (const sx of [-0.58, 0.58]) {
    for (const sz of [-0.2, 0.2]) {
      g.add(cyl(0.016, 0.016, 1.8, M_GOLD, sx, 0.9, sz, 8))
    }
  }
  for (const y of [0.22, 0.65, 1.08, 1.5, 1.78]) {
    g.add(box(1.18, 0.03, 0.42, M_WHITE, 0, y, 0))
  }
  // Kotak souvenir kecil di tiap rak
  for (const y of [0.32, 0.75, 1.18]) {
    for (const x of [-0.36, 0, 0.36]) {
      g.add(box(0.18, 0.16, 0.18, M_PINK, x, y, 0))
    }
  }
  return g
}

const ITEMS = [
  { file: 'pelaminan_modern_minimalis.glb', builder: buildPelaminanMinimalis, nama: 'Pelaminan Modern Minimalis Putih', kategori: 'Pelaminan', p: 420, l: 200, t: 260, harga: 7200000, deskripsi: 'Pelaminan minimalis serba putih bersih dengan panel bertingkat dan hiasan floral pastel.' },
  { file: 'pelaminan_rustic_kayu.glb', builder: buildPelaminanRustic, nama: 'Pelaminan Rustic Kayu & Floral', kategori: 'Pelaminan', p: 400, l: 200, t: 250, harga: 6800000, deskripsi: 'Pelaminan bergaya rustic dengan backdrop kayu natural dan rangkaian bunga hangat.' },
  { file: 'backdrop_akad_lengkung.glb', builder: buildBackdropAkad, nama: 'Backdrop Akad Lengkung Emas', kategori: 'Backdrop', p: 300, l: 60, t: 260, harga: 2800000, deskripsi: 'Backdrop akad nikah 3 panel blush-putih dengan aksen lengkung emas dan bunga.' },
  { file: 'backdrop_drapery_tirai.glb', builder: buildBackdropDrapery, nama: 'Backdrop Tirai Drapery Putih', kategori: 'Backdrop', p: 360, l: 50, t: 280, harga: 1600000, deskripsi: 'Tirai kain drapery putih-krem menjuntai pada rangka besi emas untuk backdrop venue.' },
  { file: 'backdrop_hexagon_floral.glb', builder: buildBackdropHexagon, nama: 'Backdrop Hexagon Bunga Emas', kategori: 'Backdrop', p: 260, l: 60, t: 250, harga: 1900000, deskripsi: 'Backdrop rangka heksagonal emas dengan rangkaian bunga sudut untuk akad atau lamaran.' },
  { file: 'photobooth_360_platform.glb', builder: buildPhotobooth360, nama: 'Platform Photobooth 360°', kategori: 'Photobooth', p: 140, l: 140, t: 210, harga: 3500000, deskripsi: 'Platform kamera photobooth 360 derajat lengkap dengan lengan berputar dan ring light.' },
  { file: 'photobooth_ayunan_bunga.glb', builder: buildPhotoboothAyunan, nama: 'Photobooth Ayunan Floral', kategori: 'Photobooth', p: 220, l: 110, t: 240, harga: 2400000, deskripsi: 'Spot foto ayunan putih berhias rangkaian bunga di atas rangka emas.' },
  { file: 'photobooth_lengkung_neon.glb', builder: buildPhotoboothNeon, nama: 'Photobooth Lengkung Neon & Sofa', kategori: 'Photobooth', p: 280, l: 100, t: 250, harga: 2900000, deskripsi: 'Area photobooth modern dengan backdrop gelap, cincin neon menyala, dan sofa blush.' },
  { file: 'welcome_sign_akrilik_arch.glb', builder: buildWelcomeAkrilik, nama: 'Welcome Sign Akrilik Lengkung', kategori: 'Welcome Sign', p: 80, l: 45, t: 155, harga: 450000, deskripsi: 'Papan sambutan akrilik bening berbingkai emas di atas dudukan kayu dengan aksen bunga.' },
  { file: 'welcome_sign_cermin_easel.glb', builder: buildWelcomeCermin, nama: 'Welcome Sign Cermin Emas Easel', kategori: 'Welcome Sign', p: 85, l: 65, t: 170, harga: 550000, deskripsi: 'Welcome sign cermin klasik di atas tripod easel emas dengan bunga sudut.' },
  { file: 'welcome_sign_standing_frame.glb', builder: buildWelcomeStandingFrame, nama: 'Welcome Sign Rangka Besi Emas', kategori: 'Welcome Sign', p: 90, l: 50, t: 175, harga: 420000, deskripsi: 'Papan ucapan selamat datang gantung pada standing frame besi emas.' },
  { file: 'karpet_merah_vip.glb', builder: buildKarpetMerah, nama: 'Karpet Merah Aisle VIP', kategori: 'Karpet', p: 180, l: 600, t: 3, harga: 950000, deskripsi: 'Karpet merah elegan berpinggiran emas untuk jalur kirab pengantin dan tamu VIP.' },
  { file: 'karpet_krem_beludru.glb', builder: buildKarpetKrem, nama: 'Karpet Beludru Krem Pelaminan', kategori: 'Karpet', p: 300, l: 400, t: 3, harga: 850000, deskripsi: 'Karpet beludru krem lembut untuk alas area pelaminan atau akad nikah.' },
  { file: 'karpet_rumput_aisle.glb', builder: buildKarpetRumput, nama: 'Karpet Rumput Sintetis Garden', kategori: 'Karpet', p: 160, l: 500, t: 3, harga: 780000, deskripsi: 'Karpet rumput sintetis berhias bunga putih tepi untuk tema garden wedding.' },
  { file: 'buffet_stall_gubukan.glb', builder: buildStallGubukan, nama: 'Stall Gubukan Makanan Kayu', kategori: 'Meja Buffet', p: 180, l: 90, t: 220, harga: 900000, deskripsi: 'Gubukan katering kayu beratap kain krem untuk pondokan makanan resepsi.' },
  { file: 'buffet_dessert_table.glb', builder: buildDessertTable, nama: 'Dessert & Sweet Corner Table', kategori: 'Meja Buffet', p: 220, l: 80, t: 115, harga: 1200000, deskripsi: 'Meja sweet corner bernuansa blush lengkap dengan 3 stand kue tingkat emas.' },
  { file: 'meja_cocktail_standing.glb', builder: buildMejaCocktail, nama: 'Meja Cocktail Standing Party', kategori: 'Meja', p: 70, l: 70, t: 115, harga: 180000, deskripsi: 'Meja tinggi standing party bertaplak putih dengan pita burgundy dan bunga.' },
  { file: 'meja_vip_bundar_emas.glb', builder: buildMejaVipEmas, nama: 'Meja VIP Bundar Taplak Emas', kategori: 'Meja', p: 180, l: 180, t: 76, harga: 480000, deskripsi: 'Meja perjamuan keluarga VIP bertaplak emas champagne dan centerpiece floral.' },
  { file: 'kursi_crossback_rustic.glb', builder: buildKursiCrossback, nama: 'Kursi Crossback Kayu Rustic', kategori: 'Kursi', p: 46, l: 46, t: 90, harga: 35000, deskripsi: 'Kursi kayu sandaran silang (crossback) favorit untuk wedding rustic & outdoor.' },
  { file: 'kursi_futura_cover_putih.glb', builder: buildKursiFutura, nama: 'Kursi Futura Cover Pita Emas', kategori: 'Kursi', p: 45, l: 48, t: 88, harga: 18000, deskripsi: 'Kursi futura berbalut sarung kain putih ketat lengkap dengan pita emas.' },
  { file: 'pohon_sakura_dekorasi.glb', builder: buildPohonSakura, nama: 'Pohon Sakura Dekorasi Venue', kategori: 'Bunga', p: 180, l: 180, t: 260, harga: 1400000, deskripsi: 'Pohon sakura artifisial rimbun dalam pot putih untuk focal point area ballroom.' },
  { file: 'flower_wall_panel.glb', builder: buildFlowerWall, nama: 'Flower Wall Panel Mawar', kategori: 'Bunga', p: 240, l: 45, t: 240, harga: 2600000, deskripsi: 'Dinding penuh rangkaian bunga mawar pink-putih untuk backdrop mewah.' },
  { file: 'standing_lamp_pillar.glb', builder: buildStandingLampPillar, nama: 'Lampu Pilar Aisle Hangat', kategori: 'Lighting', p: 35, l: 35, t: 150, harga: 220000, deskripsi: 'Lampu pilar berdiri rangka emas dengan cahaya hangat untuk kanan-kiri lorong aisle.' },
  { file: 'string_light_canopy.glb', builder: buildStringLightCanopy, nama: 'String Light Canopy Outdoor', kategori: 'Lighting', p: 400, l: 400, t: 280, harga: 1800000, deskripsi: 'Rangka 4 tiang lampu string light gantung bersilang untuk resepsi malam outdoor.' },
  { file: 'podium_mc_wedding.glb', builder: buildPodiumMC, nama: 'Podium MC & Sambutan', kategori: 'Aksesoris', p: 65, l: 55, t: 125, harga: 350000, deskripsi: 'Podium pembawa acara & sambutan keluarga beraksen putih, kayu, dan list emas.' },
  { file: 'rak_souvenir_pernikahan.glb', builder: buildRakSouvenir, nama: 'Rak Display Souvenir Pernikahan', kategori: 'Aksesoris', p: 120, l: 45, t: 180, harga: 400000, deskripsi: 'Rak pajang besi emas 4 tingkat untuk menata souvenir pernikahan di area registrasi.' },
]

const exporter = new GLTFExporter()
await sequelize.authenticate()

for (const item of ITEMS) {
  const scene = new THREE.Scene()
  const model = item.builder()
  model.name = item.file.replace('.glb', '')
  scene.add(model)
  const buf = await new Promise((res, rej) => exporter.parse(scene, res, rej, { binary: true }))
  fs.writeFileSync(path.join(LIB_DIR, item.file), Buffer.from(buf))

  const filePath = `/uploads/library/${item.file}`
  const [lib] = await Model3DLibrary.findOrCreate({
    where: { file_path: filePath },
    defaults: {
      nama_model: item.nama,
      kategori: item.kategori,
      file_path: filePath,
      thumbnail_path: null,
      panjang: item.p,
      lebar: item.l,
      tinggi: item.t,
      sumber: 'WedSpace Wedding 3D Studio',
      license_name: 'CC-BY-4.0',
      license_url: 'https://creativecommons.org/licenses/by/4.0/',
      attribution_text: 'Aset 3D Dekorasi Venue Pernikahan WedSpace',
      is_active: true,
    },
  })

  const [dek] = await Decoration.findOrCreate({
    where: { nama_dekorasi: item.nama, created_by_user_id: null },
    defaults: {
      nama_dekorasi: item.nama,
      kategori: item.kategori,
      harga: item.harga,
      panjang: item.p,
      lebar: item.l,
      tinggi: item.t,
      deskripsi: item.deskripsi,
      visibility: 'public',
      is_active: true,
      model_3d_source: 'library',
      library_model_id: lib.id,
      model_3d: filePath,
      created_by_user_id: null,
    },
  })

  console.log(`[OK] [${item.kategori}] ${item.nama} (${(buf.byteLength / 1024).toFixed(1)} KB) -> dek#${dek.id}`)
}

const rows = await Decoration.findAll({ where: { created_by_user_id: null, is_active: true } })
const counts = {}
rows.forEach((r) => { counts[r.kategori] = (counts[r.kategori] || 0) + 1 })
console.log(`\nTotal aset publik aktif sekarang: ${rows.length}`)
console.log('Per kategori:', counts)
await sequelize.close()
