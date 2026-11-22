import * as THREE from 'three'

/**
 * Palette warna elegan untuk procedural wedding assets
 */
const PALETTE = {
  wood: 0x8d6e63,
  woodDark: 0x5d4037,
  gold: 0xd4af37,
  ivory: 0xfdfbf7,
  linen: 0xf2ece4,
  burgundy: 0x7f1125,
  rose: 0xe6839a,
  sageGreen: 0x8a9a86,
  darkCharcoal: 0x2b2b2b,
  brass: 0xb59458,
  glowYellow: 0xfffae0,
}

// Reusable standard materials (cache to conserve WebGL memory)
const materials = {
  tableCloth: new THREE.MeshStandardMaterial({ color: PALETTE.linen, roughness: 0.7 }),
  woodLeg: new THREE.MeshStandardMaterial({ color: PALETTE.woodDark, roughness: 0.5 }),
  goldMetal: new THREE.MeshStandardMaterial({ color: PALETTE.gold, metalness: 0.6, roughness: 0.3 }),
  chairCushion: new THREE.MeshStandardMaterial({ color: PALETTE.ivory, roughness: 0.8 }),
  stageTop: new THREE.MeshStandardMaterial({ color: PALETTE.burgundy, roughness: 0.6 }),
  stageSkirt: new THREE.MeshStandardMaterial({ color: PALETTE.darkCharcoal, roughness: 0.8 }),
  backdropPanel: new THREE.MeshStandardMaterial({ color: PALETTE.ivory, roughness: 0.6 }),
  flowerPetals: new THREE.MeshStandardMaterial({ color: PALETTE.rose, roughness: 0.6 }),
  foliage: new THREE.MeshStandardMaterial({ color: PALETTE.sageGreen, roughness: 0.8 }),
  brassTrim: new THREE.MeshStandardMaterial({ color: PALETTE.brass, metalness: 0.5, roughness: 0.4 }),
  lightBulb: new THREE.MeshStandardMaterial({ color: PALETTE.glowYellow, emissive: PALETTE.glowYellow, emissiveIntensity: 0.8 }),
  defaultBox: new THREE.MeshStandardMaterial({ color: 0xba9a86, roughness: 0.5 }),
}

/**
 * Generator Meja (Table)
 * Mendukung Meja Bundar jika w ≈ d, atau Meja Persegi Panjang
 */
export function createTable(w, h, d) {
  const group = new THREE.Group()
  const isRound = Math.abs(w - d) < 0.15 * Math.max(w, d)
  const topThickness = Math.min(0.05, h * 0.1)

  if (isRound) {
    const radius = Math.min(w, d) / 2
    // Daun Meja Bundar
    const topGeo = new THREE.CylinderGeometry(radius, radius, topThickness, 32)
    const topMesh = new THREE.Mesh(topGeo, materials.tableCloth)
    topMesh.position.y = h - topThickness / 2
    topMesh.castShadow = true
    topMesh.receiveShadow = true
    group.add(topMesh)

    // Taplak gantung dekoratif tipis
    const skirtHeight = Math.min(0.15, h * 0.3)
    const skirtGeo = new THREE.CylinderGeometry(radius + 0.005, radius + 0.01, skirtHeight, 32, 1, true)
    const skirtMesh = new THREE.Mesh(skirtGeo, materials.tableCloth)
    skirtMesh.position.y = h - topThickness - skirtHeight / 2
    group.add(skirtMesh)

    // Tiang penyangga tengah dan kaki bintang
    const poleRadius = Math.max(0.03, radius * 0.1)
    const poleGeo = new THREE.CylinderGeometry(poleRadius, poleRadius, h - topThickness, 16)
    const poleMesh = new THREE.Mesh(poleGeo, materials.woodLeg)
    poleMesh.position.y = (h - topThickness) / 2
    group.add(poleMesh)

    const baseRadius = radius * 0.65
    const baseGeo = new THREE.CylinderGeometry(baseRadius, baseRadius, 0.03, 24)
    const baseMesh = new THREE.Mesh(baseGeo, materials.woodLeg)
    baseMesh.position.y = 0.015
    group.add(baseMesh)
  } else {
    // Meja Persegi / Persegi Panjang
    const topGeo = new THREE.BoxGeometry(w, topThickness, d)
    const topMesh = new THREE.Mesh(topGeo, materials.tableCloth)
    topMesh.position.y = h - topThickness / 2
    topMesh.castShadow = true
    topMesh.receiveShadow = true
    group.add(topMesh)

    // 4 Kaki Meja
    const legW = Math.min(0.05, Math.min(w, d) * 0.08)
    const legH = h - topThickness
    const legGeo = new THREE.BoxGeometry(legW, legH, legW)
    const offsetX = w / 2 - legW
    const offsetZ = d / 2 - legW

    const legPositions = [
      [-offsetX, legH / 2, -offsetZ],
      [offsetX, legH / 2, -offsetZ],
      [-offsetX, legH / 2, offsetZ],
      [offsetX, legH / 2, offsetZ],
    ]

    legPositions.forEach(([x, y, z]) => {
      const legMesh = new THREE.Mesh(legGeo, materials.woodLeg)
      legMesh.position.set(x, y, z)
      group.add(legMesh)
    })
  }

  return group
}

/**
 * Generator Kursi (Tiffany / Banquet Chair)
 */
export function createChair(w, h, d) {
  const group = new THREE.Group()
  const seatH = h * 0.46
  const seatThick = 0.04
  const legW = Math.min(0.03, w * 0.08)

  // Dudukan Kursi
  const seatGeo = new THREE.BoxGeometry(w * 0.9, seatThick, d * 0.9)
  const seatMesh = new THREE.Mesh(seatGeo, materials.chairCushion)
  seatMesh.position.y = seatH - seatThick / 2
  seatMesh.castShadow = true
  group.add(seatMesh)

  // 4 Kaki Kursi
  const legGeo = new THREE.CylinderGeometry(legW / 2, legW / 2, seatH - seatThick, 8)
  const offsetX = (w * 0.9) / 2 - legW
  const offsetZ = (d * 0.9) / 2 - legW
  const legY = (seatH - seatThick) / 2

  const positions = [
    [-offsetX, legY, -offsetZ],
    [offsetX, legY, -offsetZ],
    [-offsetX, legY, offsetZ],
    [offsetX, legY, offsetZ],
  ]

  positions.forEach(([x, y, z]) => {
    const legMesh = new THREE.Mesh(legGeo, materials.goldMetal)
    legMesh.position.set(x, y, z)
    group.add(legMesh)
  })

  // Sandaran Punggung (Tiffany style slats)
  const backH = h - seatH
  const backGeo = new THREE.BoxGeometry(w * 0.85, backH, 0.02)
  const backMesh = new THREE.Mesh(backGeo, materials.goldMetal)
  backMesh.position.set(0, seatH + backH / 2, -offsetZ)
  group.add(backMesh)

  // Aksen garis-garis sandaran
  const slatGeo = new THREE.CylinderGeometry(0.006, 0.006, backH * 0.8, 8)
  for (let i = -2; i <= 2; i++) {
    const slat = new THREE.Mesh(slatGeo, materials.goldMetal)
    slat.position.set((i * w * 0.15), seatH + backH / 2, -offsetZ)
    group.add(slat)
  }

  return group
}

/**
 * Generator Panggung (Stage Platform)
 */
export function createStage(w, h, d) {
  const group = new THREE.Group()

  // Platform Utama
  const stageGeo = new THREE.BoxGeometry(w, h, d)
  const stageMesh = new THREE.Mesh(stageGeo, materials.stageTop)
  stageMesh.position.y = h / 2
  stageMesh.receiveShadow = true
  stageMesh.castShadow = true
  group.add(stageMesh)

  // Skirting pinggiran
  const skirtThick = 0.02
  const skirtGeo = new THREE.BoxGeometry(w + skirtThick, h * 0.98, d + skirtThick)
  const skirtMesh = new THREE.Mesh(skirtGeo, materials.stageSkirt)
  skirtMesh.position.y = (h * 0.98) / 2
  group.add(skirtMesh)

  // Lis emas / brass di tepian atas panggung
  const trimGeo = new THREE.BoxGeometry(w + 0.04, 0.03, d + 0.04)
  const trimMesh = new THREE.Mesh(trimGeo, materials.brassTrim)
  trimMesh.position.y = h
  group.add(trimMesh)

  return group
}

/**
 * Generator Pelaminan / Backdrop Utama
 */
export function createPelaminan(w, h, d) {
  const group = new THREE.Group()

  // Panel Dinding Belakang
  const panelThick = Math.min(0.1, d * 0.2)
  const panelGeo = new THREE.BoxGeometry(w * 0.95, h, panelThick)
  const panelMesh = new THREE.Mesh(panelGeo, materials.backdropPanel)
  panelMesh.position.set(0, h / 2, -d / 2 + panelThick / 2)
  panelMesh.castShadow = true
  group.add(panelMesh)

  // Aksen Arch / Frame Emas di Tengah
  const archW = w * 0.5
  const archH = h * 0.9
  const frameGeo = new THREE.BoxGeometry(archW, archH, 0.04)
  const frameMesh = new THREE.Mesh(frameGeo, materials.brassTrim)
  frameMesh.position.set(0, archH / 2, -d / 2 + panelThick + 0.02)
  group.add(frameMesh)

  // Dais / Pijakan Karpet Pelaminan di Depan
  const daisH = Math.min(0.2, h * 0.15)
  const daisD = d * 0.7
  const daisGeo = new THREE.BoxGeometry(w, daisH, daisD)
  const daisMesh = new THREE.Mesh(daisGeo, materials.stageTop)
  daisMesh.position.set(0, daisH / 2, 0)
  group.add(daisMesh)

  // Hiasan Bunga di Bagian Atas Backdrop
  const garlandGeo = new THREE.CylinderGeometry(0.12, 0.12, w * 0.8, 12)
  const garlandMesh = new THREE.Mesh(garlandGeo, materials.foliage)
  garlandMesh.rotation.z = Math.PI / 2
  garlandMesh.position.set(0, h - 0.15, -d / 2 + panelThick + 0.05)
  group.add(garlandMesh)

  // Sentuhan bunga mawar di garland
  for (let i = -3; i <= 3; i++) {
    const flowerGeo = new THREE.SphereGeometry(0.08, 8, 8)
    const flower = new THREE.Mesh(flowerGeo, materials.flowerPetals)
    flower.position.set((i * w * 0.11), h - 0.15, -d / 2 + panelThick + 0.12)
    group.add(flower)
  }

  return group
}

/**
 * Generator Arch Bunga (Floral Wedding Arch)
 */
export function createArch(w, h, d) {
  const group = new THREE.Group()
  const pillarRadius = Math.min(0.06, Math.min(w, d) * 0.1)

  // Pilar Kiri & Kanan
  const pillarH = h - pillarRadius
  const pillarGeo = new THREE.CylinderGeometry(pillarRadius, pillarRadius, pillarH, 16)

  const leftPillar = new THREE.Mesh(pillarGeo, materials.goldMetal)
  leftPillar.position.set(-w / 2 + pillarRadius, pillarH / 2, 0)
  group.add(leftPillar)

  const rightPillar = new THREE.Mesh(pillarGeo, materials.goldMetal)
  rightPillar.position.set(w / 2 - pillarRadius, pillarH / 2, 0)
  group.add(rightPillar)

  // Balok Atas / Curve
  const beamGeo = new THREE.CylinderGeometry(pillarRadius, pillarRadius, w, 16)
  const beamMesh = new THREE.Mesh(beamGeo, materials.goldMetal)
  beamMesh.rotation.z = Math.PI / 2
  beamMesh.position.set(0, h - pillarRadius, 0)
  group.add(beamMesh)

  // Bunga & Daun Menjalar di Tiang dan Balok
  const clusterCount = 7
  for (let i = 0; i < clusterCount; i++) {
    const posX = -w / 2 + (i / (clusterCount - 1)) * w
    const leafGeo = new THREE.SphereGeometry(0.12, 8, 8)
    const leaf = new THREE.Mesh(leafGeo, materials.foliage)
    leaf.scale.set(1.4, 0.8, 1.2)
    leaf.position.set(posX, h - pillarRadius, 0.02)
    group.add(leaf)

    const roseGeo = new THREE.SphereGeometry(0.07, 8, 8)
    const rose = new THREE.Mesh(roseGeo, materials.flowerPetals)
    rose.position.set(posX + (Math.random() - 0.5) * 0.08, h - pillarRadius + 0.02, 0.08)
    group.add(rose)
  }

  return group
}

/**
 * Generator Rangkaian Bunga / Vas (Standing Flower / Vase)
 */
export function createFlowerVase(w, h, d) {
  const group = new THREE.Group()
  const vaseH = h * 0.6
  const vaseRadius = Math.min(w, d) * 0.35

  // Guci / Standing Urn Logam Emas
  const vaseGeo = new THREE.CylinderGeometry(vaseRadius * 0.8, vaseRadius * 0.5, vaseH, 16)
  const vaseMesh = new THREE.Mesh(vaseGeo, materials.goldMetal)
  vaseMesh.position.y = vaseH / 2
  vaseMesh.castShadow = true
  group.add(vaseMesh)

  // Kubah Rangkaian Bunga Bulat Mewah di Atas
  const bouquetRadius = Math.min(w, d) * 0.5
  const bouquetGeo = new THREE.SphereGeometry(bouquetRadius, 16, 16)
  const bouquetMesh = new THREE.Mesh(bouquetGeo, materials.flowerPetals)
  bouquetMesh.position.y = vaseH + bouquetRadius * 0.65
  bouquetMesh.scale.set(1, 0.85, 1)
  bouquetMesh.castShadow = true
  group.add(bouquetMesh)

  // Daun-daun gantung / greenery di sekeliling bawah bouquet
  const leafRingGeo = new THREE.TorusGeometry(bouquetRadius * 0.75, 0.06, 8, 24)
  const leafRing = new THREE.Mesh(leafRingGeo, materials.foliage)
  leafRing.rotation.x = Math.PI / 2
  leafRing.position.y = vaseH + 0.05
  group.add(leafRing)

  return group
}

/**
 * Generator Sofa Pelaminan (Bridal Sofa)
 */
export function createSofa(w, h, d) {
  const group = new THREE.Group()
  const seatH = h * 0.42
  const cushionThick = 0.12

  // Kaki Sofa
  const legW = 0.04
  const legH = seatH - cushionThick
  const legGeo = new THREE.CylinderGeometry(legW / 2, legW / 3, legH, 8)
  const offX = w / 2 - legW * 1.5
  const offZ = d / 2 - legW * 1.5
  const legY = legH / 2

  ;[[-offX, legY, -offZ], [offX, legY, -offZ], [-offX, legY, offZ], [offX, legY, offZ]].forEach(([x, y, z]) => {
    const leg = new THREE.Mesh(legGeo, materials.goldMetal)
    leg.position.set(x, y, z)
    group.add(leg)
  })

  // Bantalan Dudukan Empuk
  const seatGeo = new THREE.BoxGeometry(w * 0.95, cushionThick, d * 0.85)
  const seat = new THREE.Mesh(seatGeo, materials.chairCushion)
  seat.position.y = seatH - cushionThick / 2
  group.add(seat)

  // Sandaran Punggung Berlengkung
  const backH = h - seatH
  const backGeo = new THREE.BoxGeometry(w * 0.95, backH, 0.1)
  const back = new THREE.Mesh(backGeo, materials.chairCushion)
  back.position.set(0, seatH + backH / 2, -d * 0.35)
  group.add(back)

  // Sandaran Tangan Kiri & Kanan
  const armH = backH * 0.55
  const armGeo = new THREE.BoxGeometry(0.1, armH, d * 0.7)
  const leftArm = new THREE.Mesh(armGeo, materials.chairCushion)
  leftArm.position.set(-w / 2 + 0.06, seatH + armH / 2, 0)
  group.add(leftArm)

  const rightArm = new THREE.Mesh(armGeo, materials.chairCushion)
  rightArm.position.set(w / 2 - 0.06, seatH + armH / 2, 0)
  group.add(rightArm)

  return group
}

/**
 * Generator Lampu / Standing Lighting
 */
export function createLighting(w, h, d) {
  const group = new THREE.Group()

  // Base piringan pemberat
  const baseR = Math.min(w, d) * 0.4
  const baseGeo = new THREE.CylinderGeometry(baseR, baseR, 0.03, 16)
  const base = new THREE.Mesh(baseGeo, materials.darkCharcoal)
  base.position.y = 0.015
  group.add(base)

  // Tiang Lampu
  const poleGeo = new THREE.CylinderGeometry(0.02, 0.02, h - 0.25, 8)
  const pole = new THREE.Mesh(poleGeo, materials.goldMetal)
  pole.position.y = (h - 0.25) / 2
  group.add(pole)

  // Kap Lampu Spotlight / Lamp Head
  const headGeo = new THREE.ConeGeometry(0.15, 0.22, 16)
  const head = new THREE.Mesh(headGeo, materials.darkCharcoal)
  head.rotation.x = Math.PI
  head.position.y = h - 0.12
  group.add(head)

  // Bola Bohlam Menyala
  const bulbGeo = new THREE.SphereGeometry(0.07, 16, 16)
  const bulb = new THREE.Mesh(bulbGeo, materials.lightBulb)
  bulb.position.y = h - 0.2
  group.add(bulb)

  return group
}

/**
 * Generator Kotak Default / Aksesoris
 */
export function createDefaultBox(w, h, d, label = '') {
  const group = new THREE.Group()

  const boxGeo = new THREE.BoxGeometry(w, h, d)
  const boxMesh = new THREE.Mesh(boxGeo, materials.defaultBox)
  boxMesh.position.y = h / 2
  boxMesh.castShadow = true
  boxMesh.receiveShadow = true
  group.add(boxMesh)

  // Garis wireframe / tepi aksen
  const edges = new THREE.EdgesGeometry(boxGeo)
  const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: PALETTE.woodDark }))
  line.position.y = h / 2
  group.add(line)

  return group
}

/**
 * Dispatcher: menghasilkan procedural model 3D berdasarkan kategori dekorasi
 * @param {string} kategori - Kategori item dekorasi
 * @param {number} panjangCm - Panjang fisik (cm)
 * @param {number} lebarCm - Lebar fisik (cm)
 * @param {number} tinggiCm - Tinggi fisik (cm)
 * @returns {THREE.Group} Three.js Group object
 */
export function generateProceduralAsset(kategori = '', panjangCm = 100, lebarCm = 100, tinggiCm = 100) {
  // Konversi cm ke meter untuk ruang 3D
  const w = Math.max(0.1, Number(panjangCm) / 100)
  const d = Math.max(0.1, Number(lebarCm) / 100)
  const h = Math.max(0.1, Number(tinggiCm) / 100)

  const kat = (kategori || '').toLowerCase().trim()

  if (kat.includes('meja') || kat.includes('table')) {
    return createTable(w, h, d)
  }
  if (kat.includes('kursi') || kat.includes('chair')) {
    return createChair(w, h, d)
  }
  if (kat.includes('panggung') || kat.includes('stage')) {
    return createStage(w, h, d)
  }
  if (kat.includes('pelaminan') || kat.includes('backdrop')) {
    return createPelaminan(w, h, d)
  }
  if (kat.includes('arch') || kat.includes('gate') || kat.includes('gapura')) {
    return createArch(w, h, d)
  }
  if (kat.includes('bunga') || kat.includes('flower') || kat.includes('vas') || kat.includes('tanaman')) {
    return createFlowerVase(w, h, d)
  }
  if (kat.includes('sofa')) {
    return createSofa(w, h, d)
  }
  if (kat.includes('lampu') || kat.includes('lighting') || kat.includes('sorot')) {
    return createLighting(w, h, d)
  }

  return createDefaultBox(w, h, d, kategori)
}
