import * as THREE from 'three'

const pbrCache = new Map()

// Deterministic pseudo-random generator agar tekstur konsisten & tidak berkedip
function seededRandom(seed) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function hexToRgb(hex) {
  const clean = String(hex || '#EDE4D8').replace('#', '')
  const num = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

function shiftColor(rgb, delta) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)))
  return `rgb(${clamp(rgb.r + delta)}, ${clamp(rgb.g + delta)}, ${clamp(rgb.b + delta)})`
}

function configureTexture(canvas, repeatX, repeatY, rotationDeg, isColor = true) {
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(Math.max(0.5, repeatX), Math.max(0.5, repeatY))
  tex.center.set(0.5, 0.5)
  tex.rotation = ((Number(rotationDeg) || 0) * Math.PI) / 180
  tex.anisotropy = 8
  if (isColor) tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/**
 * Menghasilkan set tekstur PBR prosedural 512x512 (albedo map + bumpMap + roughnessMap)
 * untuk tampilan lantai dan tembok yang jauh lebih realistis.
 */
export function buildProceduralPBR(preset = 'none', baseColor = '#EDE4D8', repeatX = 4, repeatY = 4, rotationDeg = 0) {
  if (!preset || preset === 'none') return null

  const key = `${preset}_${baseColor}_${repeatX.toFixed(1)}_${repeatY.toFixed(1)}_${rotationDeg}`
  if (pbrCache.has(key)) return pbrCache.get(key)

  const size = 512
  const colorCanvas = document.createElement('canvas')
  const bumpCanvas = document.createElement('canvas')
  const roughCanvas = document.createElement('canvas')
  colorCanvas.width = bumpCanvas.width = roughCanvas.width = size
  colorCanvas.height = bumpCanvas.height = roughCanvas.height = size

  const cCtx = colorCanvas.getContext('2d')
  const bCtx = bumpCanvas.getContext('2d')
  const rCtx = roughCanvas.getContext('2d')

  const rgb = hexToRgb(baseColor)
  const rand = seededRandom(preset.length * 997 + rgb.r * 31 + rgb.g * 17 + rgb.b)

  // Base fills
  cCtx.fillStyle = baseColor || '#EDE4D8'
  cCtx.fillRect(0, 0, size, size)
  bCtx.fillStyle = '#808080'
  bCtx.fillRect(0, 0, size, size)
  rCtx.fillStyle = '#B8B8B8'
  rCtx.fillRect(0, 0, size, size)

  if (preset === 'wood') {
    const plankCount = 8
    const plankH = size / plankCount
    rCtx.fillStyle = '#707070' // Satin polished wood
    rCtx.fillRect(0, 0, size, size)

    for (let row = 0; row < plankCount; row++) {
      const y = row * plankH
      const shade = (rand() - 0.5) * 26
      cCtx.fillStyle = shiftColor(rgb, shade)
      cCtx.fillRect(0, y, size, plankH)

      // Serat kayu organik (curved grain lines)
      for (let g = 0; g < 18; g++) {
        const gy = y + rand() * plankH
        cCtx.strokeStyle = rand() > 0.5 ? 'rgba(55, 32, 16, 0.14)' : 'rgba(255, 240, 220, 0.08)'
        cCtx.lineWidth = 0.8 + rand() * 1.8
        cCtx.beginPath()
        cCtx.moveTo(0, gy)
        cCtx.bezierCurveTo(size * 0.33, gy + (rand() - 0.5) * 6, size * 0.66, gy + (rand() - 0.5) * 6, size, gy)
        cCtx.stroke()

        bCtx.strokeStyle = 'rgba(105, 105, 105, 0.25)'
        bCtx.lineWidth = 1
        bCtx.beginPath()
        bCtx.moveTo(0, gy)
        bCtx.lineTo(size, gy)
        bCtx.stroke()
      }

      // Garis sambungan papan horizontal (recessed groove)
      cCtx.fillStyle = 'rgba(35, 20, 10, 0.38)'
      cCtx.fillRect(0, y, size, 2)
      bCtx.fillStyle = '#202020'
      bCtx.fillRect(0, y, size, 3)
      rCtx.fillStyle = '#E0E0E0'
      rCtx.fillRect(0, y, size, 3)

      // Sambungan vertikal staggered antar papan
      const jointX = Math.floor(((row * 193 + 80) % (size - 80)) + 40)
      cCtx.fillRect(jointX, y, 2, plankH)
      bCtx.fillRect(jointX, y, 3, plankH)
      rCtx.fillRect(jointX, y, 3, plankH)
    }
  } else if (preset === 'marble') {
    rCtx.fillStyle = '#383838' // Glossy marble
    rCtx.fillRect(0, 0, size, size)

    // Soft cloudy patches
    for (let i = 0; i < 24; i++) {
      const gx = rand() * size
      const gy = rand() * size
      const rad = 40 + rand() * 90
      const grad = cCtx.createRadialGradient(gx, gy, 4, gx, gy, rad)
      grad.addColorStop(0, `rgba(${Math.max(0, rgb.r - 18)}, ${Math.max(0, rgb.g - 18)}, ${Math.max(0, rgb.b - 15)}, 0.14)`)
      grad.addColorStop(1, 'rgba(255,255,255,0)')
      cCtx.fillStyle = grad
      cCtx.fillRect(0, 0, size, size)
    }

    // Urat marmer utama & halus
    for (let v = 0; v < 14; v++) {
      let vx = rand() * size
      let vy = rand() * size
      const isPrimary = v < 5
      cCtx.strokeStyle = isPrimary ? 'rgba(95, 88, 84, 0.28)' : 'rgba(130, 122, 118, 0.14)'
      cCtx.lineWidth = isPrimary ? 2.2 : 0.9
      rCtx.strokeStyle = 'rgba(140, 140, 140, 0.35)'
      rCtx.lineWidth = isPrimary ? 2.5 : 1

      cCtx.beginPath()
      rCtx.beginPath()
      cCtx.moveTo(vx, vy)
      rCtx.moveTo(vx, vy)
      for (let step = 0; step < 8; step++) {
        vx += 50 + rand() * 35
        vy += (rand() - 0.45) * 48
        cCtx.lineTo(vx % size, vy % size)
        rCtx.lineTo(vx % size, vy % size)
      }
      cCtx.stroke()
      rCtx.stroke()
    }

    // Garis nat ubin marmer 2x2 halus
    cCtx.strokeStyle = 'rgba(110, 102, 95, 0.25)'
    cCtx.lineWidth = 2
    bCtx.strokeStyle = '#303030'
    bCtx.lineWidth = 3
    for (const p of [0, size / 2]) {
      cCtx.beginPath(); cCtx.moveTo(p, 0); cCtx.lineTo(p, size); cCtx.stroke()
      cCtx.beginPath(); cCtx.moveTo(0, p); cCtx.lineTo(size, p); cCtx.stroke()
      bCtx.beginPath(); bCtx.moveTo(p, 0); bCtx.lineTo(p, size); bCtx.stroke()
      bCtx.beginPath(); bCtx.moveTo(0, p); bCtx.lineTo(size, p); bCtx.stroke()
    }
  } else if (preset === 'brick') {
    const rows = 12
    const cols = 6
    const rowH = size / rows
    const brickW = size / cols

    // Mortar background
    cCtx.fillStyle = shiftColor(rgb, -32)
    cCtx.fillRect(0, 0, size, size)
    bCtx.fillStyle = '#252525'
    bCtx.fillRect(0, 0, size, size)
    rCtx.fillStyle = '#ECECEC'
    rCtx.fillRect(0, 0, size, size)

    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (brickW / 2)
      for (let c = -1; c <= cols; c++) {
        const bx = c * brickW + offset + 3
        const by = r * rowH + 3
        const bw = brickW - 6
        const bh = rowH - 6
        const shade = (rand() - 0.5) * 28
        cCtx.fillStyle = shiftColor(rgb, shade)
        cCtx.fillRect(bx, by, bw, bh)
        bCtx.fillStyle = shiftColor({ r: 190, g: 190, b: 190 }, (rand() - 0.5) * 35)
        bCtx.fillRect(bx, by, bw, bh)
        rCtx.fillStyle = '#C8C8C8'
        rCtx.fillRect(bx, by, bw, bh)
      }
    }
    // Granular surface noise
    for (let i = 0; i < 1600; i++) {
      const nx = rand() * size
      const ny = rand() * size
      cCtx.fillStyle = rand() > 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'
      cCtx.fillRect(nx, ny, 2, 2)
    }
  } else if (preset === 'carpet') {
    rCtx.fillStyle = '#F0F0F0' // Very matte fabric
    rCtx.fillRect(0, 0, size, size)
    for (let y = 0; y < size; y += 4) {
      for (let x = 0; x < size; x += 4) {
        const n = (rand() - 0.5) * 22
        cCtx.fillStyle = shiftColor(rgb, n)
        cCtx.fillRect(x, y, 4, 4)
        const bn = 110 + Math.round((rand() - 0.5) * 70)
        bCtx.fillStyle = `rgb(${bn},${bn},${bn})`
        bCtx.fillRect(x, y, 3, 3)
      }
    }
  } else if (preset === 'grass') {
    rCtx.fillStyle = '#DCDCDC'
    rCtx.fillRect(0, 0, size, size)
    for (let i = 0; i < 3200; i++) {
      const gx = rand() * size
      const gy = rand() * size
      const len = 5 + rand() * 10
      const shade = (rand() - 0.5) * 45
      cCtx.strokeStyle = shiftColor(rgb, shade)
      cCtx.lineWidth = 1.2
      cCtx.beginPath()
      cCtx.moveTo(gx, gy)
      cCtx.lineTo(gx + (rand() - 0.5) * 5, gy - len)
      cCtx.stroke()

      const bv = 100 + Math.round(rand() * 120)
      bCtx.fillStyle = `rgb(${bv},${bv},${bv})`
      bCtx.fillRect(gx, gy, 2, 4)
    }
  } else if (preset === 'plaster') {
    rCtx.fillStyle = '#D4D4D4'
    rCtx.fillRect(0, 0, size, size)
    // Soft trowel clouds
    for (let i = 0; i < 35; i++) {
      const px = rand() * size
      const py = rand() * size
      const rad = 28 + rand() * 65
      const grad = cCtx.createRadialGradient(px, py, 2, px, py, rad)
      grad.addColorStop(0, rand() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(60,50,45,0.05)')
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      cCtx.fillStyle = grad
      cCtx.fillRect(0, 0, size, size)
    }
    // Fine stucco grain
    for (let i = 0; i < 2400; i++) {
      const nx = rand() * size
      const ny = rand() * size
      const bv = 115 + Math.round((rand() - 0.5) * 50)
      bCtx.fillStyle = `rgb(${bv},${bv},${bv})`
      bCtx.fillRect(nx, ny, 2, 2)
      cCtx.fillStyle = rand() > 0.5 ? 'rgba(0,0,0,0.025)' : 'rgba(255,255,255,0.03)'
      cCtx.fillRect(nx, ny, 2, 2)
    }
  }

  const bumpScaleMap = {
    wood: 0.025,
    marble: 0.012,
    brick: 0.055,
    carpet: 0.035,
    grass: 0.045,
    plaster: 0.018,
  }

  const result = {
    map: configureTexture(colorCanvas, repeatX, repeatY, rotationDeg, true),
    bumpMap: configureTexture(bumpCanvas, repeatX, repeatY, rotationDeg, false),
    roughnessMap: configureTexture(roughCanvas, repeatX, repeatY, rotationDeg, false),
    bumpScale: bumpScaleMap[preset] ?? 0.02,
  }

  pbrCache.set(key, result)
  return result
}

export function buildProceduralTexture(preset = 'none', baseColor = '#EDE4D8', repeatX = 4, repeatY = 4, rotationDeg = 0) {
  return buildProceduralPBR(preset, baseColor, repeatX, repeatY, rotationDeg)?.map || null
}

/**
 * Membangun material PBR tembok / lantai / primitive dari material_data
 */
export function buildStandardMaterial(materialData = {}, repeatX = 2, repeatY = 2) {
  const color = materialData.color || '#F3EFEA'
  const roughness = materialData.roughness !== undefined ? Number(materialData.roughness) : 0.72
  const metalness = materialData.metalness !== undefined ? Number(materialData.metalness) : 0.05
  const preset = materialData.texturePreset || 'none'
  const scale = Number(materialData.textureScale || 1)
  const rot = Number(materialData.textureRotation || 0)

  const pbr = buildProceduralPBR(preset, color, repeatX * scale, repeatY * scale, rot)
  return new THREE.MeshStandardMaterial({
    color: pbr ? 0xffffff : new THREE.Color(color),
    map: pbr?.map || null,
    bumpMap: pbr?.bumpMap || null,
    bumpScale: pbr?.bumpScale || 0,
    roughnessMap: pbr?.roughnessMap || null,
    roughness: Math.max(0.08, Math.min(1, roughness)),
    metalness: Math.max(0, Math.min(1, metalness)),
    envMapIntensity: preset === 'marble' ? 0.9 : preset === 'wood' ? 0.55 : 0.35,
  })
}

/**
 * Membangun mesh Tembok 3D dari ruas garis (startX, startZ) -> (endX, endZ)
 * dengan:
 * - Opening NYATA untuk pintu (door) dan jendela (window) yang menempel pada tembok ini
 * - Pilar sambungan sudut (corner cap) di ujung ruas agar pertemuan sudut 90° maupun bebas tidak bercelah
 */
export function buildWallGroup(wallElement, hostedOpenings = []) {
  const group = new THREE.Group()
  const geo = wallElement.geometry_data || {}
  const startX = Number(geo.startX || 0)
  const startZ = Number(geo.startZ || 0)
  const endX = Number(geo.endX ?? startX + Number(geo.length || 3))
  const endZ = Number(geo.endZ ?? startZ)

  const dx = endX - startX
  const dz = endZ - startZ
  const length = Math.max(0.2, Math.hypot(dx, dz))
  const height = Math.max(0.5, Number(geo.height || 3.0))
  const thickness = Math.max(0.05, Number(geo.thickness || 0.15))

  const wallMat = buildStandardMaterial(wallElement.material_data || { color: '#F3EFEA' }, Math.max(1, length / 2), Math.max(1, height / 2))
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.55 })
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.65, roughness: 0.25 })

  // Urutkan bukaan (door/window) sepanjang ruas tembok (0 .. length)
  const openings = hostedOpenings
    .filter((op) => op.is_visible !== false)
    .map((op) => {
      const og = op.geometry_data || {}
      const ow = Math.min(length - 0.2, Math.max(0.4, Number(og.width || (op.element_type === 'door' ? 1.1 : 1.4))))
      const oh = Math.min(height - 0.15, Math.max(0.5, Number(og.height || (op.element_type === 'door' ? 2.15 : 1.2))))
      const sill = op.element_type === 'window' ? Math.max(0.3, Math.min(height - oh - 0.1, Number(og.sillHeight || 0.9))) : 0
      const ratio = Math.max(0.1, Math.min(0.9, Number(og.offsetRatio ?? 0.5)))
      const center = ratio * length
      const start = Math.max(0.08, center - ow / 2)
      const end = Math.min(length - 0.08, start + ow)
      return {
        element: op,
        type: op.element_type,
        start,
        end,
        width: end - start,
        height: oh,
        sill,
        color: op.material_data?.color || (op.element_type === 'door' ? '#7F1125' : '#BFDBFE'),
      }
    })
    .filter((o) => o.width >= 0.3)
    .sort((a, b) => a.start - b.start)

  // Bangun segmen tembok di sekitar bukaan sehingga bukaan benar-benar berlubang
  let cursor = 0
  for (const op of openings) {
    if (op.start > cursor + 0.02) {
      const segW = op.start - cursor
      const segMesh = new THREE.Mesh(new THREE.BoxGeometry(segW, height, thickness), wallMat)
      segMesh.position.set(cursor + segW / 2 - length / 2, height / 2, 0)
      segMesh.castShadow = true
      segMesh.receiveShadow = true
      segMesh.userData = { elementId: wallElement.id, elementType: 'wall' }
      group.add(segMesh)
    }

    // Lintel / balok atas di atas pintu atau jendela
    const topStart = op.sill + op.height
    if (height - topStart > 0.02) {
      const lintelH = height - topStart
      const lintelMesh = new THREE.Mesh(new THREE.BoxGeometry(op.width, lintelH, thickness), wallMat)
      lintelMesh.position.set(op.start + op.width / 2 - length / 2, topStart + lintelH / 2, 0)
      lintelMesh.castShadow = true
      lintelMesh.receiveShadow = true
      lintelMesh.userData = { elementId: wallElement.id, elementType: 'wall' }
      group.add(lintelMesh)
    }

    // Dinding bawah (sill) khusus jendela
    if (op.sill > 0.02) {
      const sillMesh = new THREE.Mesh(new THREE.BoxGeometry(op.width, op.sill, thickness), wallMat)
      sillMesh.position.set(op.start + op.width / 2 - length / 2, op.sill / 2, 0)
      sillMesh.castShadow = true
      sillMesh.receiveShadow = true
      sillMesh.userData = { elementId: wallElement.id, elementType: 'wall' }
      group.add(sillMesh)
    }

    // Konstruksi kusen & daun pintu / kaca jendela di dalam opening
    const opGroup = new THREE.Group()
    const frameT = 0.06
    const centerX = op.start + op.width / 2 - length / 2

    const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(frameT, op.height, thickness + 0.03), trimMat)
    leftFrame.position.set(-op.width / 2 + frameT / 2, op.sill + op.height / 2, 0)
    opGroup.add(leftFrame)

    const rightFrame = new THREE.Mesh(new THREE.BoxGeometry(frameT, op.height, thickness + 0.03), trimMat)
    rightFrame.position.set(op.width / 2 - frameT / 2, op.sill + op.height / 2, 0)
    opGroup.add(rightFrame)

    const topFrame = new THREE.Mesh(new THREE.BoxGeometry(op.width, frameT, thickness + 0.03), trimMat)
    topFrame.position.set(0, op.sill + op.height - frameT / 2, 0)
    opGroup.add(topFrame)

    if (op.type === 'door') {
      // Daun pintu sedikit terbuka 25° agar bukaan terlihat jelas di 3D
      const leafW = Math.max(0.25, op.width - frameT * 2)
      const leafH = Math.max(0.5, op.height - frameT)
      const doorMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(op.color), roughness: 0.45 })
      const leafPivot = new THREE.Group()
      leafPivot.position.set(-op.width / 2 + frameT, op.sill, 0)
      leafPivot.rotation.y = 0.42 // Sedikit terbuka agar opening terlihat nyata

      const leafMesh = new THREE.Mesh(new THREE.BoxGeometry(leafW, leafH, 0.045), doorMat)
      leafMesh.position.set(leafW / 2, leafH / 2, 0)
      leafMesh.castShadow = true
      leafPivot.add(leafMesh)

      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 10), goldMat)
      knob.position.set(leafW - 0.1, leafH * 0.48, 0.045)
      leafPivot.add(knob)

      opGroup.add(leafPivot)
    } else {
      // Kaca jendela transparan + sill bawah
      const botFrame = new THREE.Mesh(new THREE.BoxGeometry(op.width + 0.04, frameT, thickness + 0.05), trimMat)
      botFrame.position.set(0, op.sill + frameT / 2, 0)
      opGroup.add(botFrame)

      const glassMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(op.color),
        transparent: true,
        opacity: 0.4,
        roughness: 0.1,
        metalness: 0.25,
      })
      const glass = new THREE.Mesh(new THREE.BoxGeometry(op.width - frameT * 2, op.height - frameT * 2, 0.025), glassMat)
      glass.position.set(0, op.sill + op.height / 2, 0)
      opGroup.add(glass)
    }

    opGroup.position.x = centerX
    opGroup.traverse((c) => {
      if (c.isMesh) {
        c.userData = { elementId: op.element.id, elementType: op.type }
      }
    })
    group.add(opGroup)

    cursor = op.end
  }

  // Segmen sisa setelah bukaan terakhir (atau seluruh tembok jika tanpa bukaan)
  if (length - cursor > 0.02) {
    const segW = length - cursor
    const segMesh = new THREE.Mesh(new THREE.BoxGeometry(segW, height, thickness), wallMat)
    segMesh.position.set(cursor + segW / 2 - length / 2, height / 2, 0)
    segMesh.castShadow = true
    segMesh.receiveShadow = true
    segMesh.userData = { elementId: wallElement.id, elementType: 'wall' }
    group.add(segMesh)
  }

  // Corner Joint Caps di kedua ujung tembok agar sambungan sudut 90° & bebas rapat tanpa celah
  const jointGeo = new THREE.CylinderGeometry(thickness / 2, thickness / 2, height, 12)
  const startCap = new THREE.Mesh(jointGeo, wallMat)
  startCap.position.set(-length / 2, height / 2, 0)
  startCap.castShadow = true
  startCap.receiveShadow = true
  startCap.userData = { elementId: wallElement.id, elementType: 'wall' }
  group.add(startCap)

  const endCap = new THREE.Mesh(jointGeo, wallMat)
  endCap.position.set(length / 2, height / 2, 0)
  endCap.castShadow = true
  endCap.receiveShadow = true
  endCap.userData = { elementId: wallElement.id, elementType: 'wall' }
  group.add(endCap)

  // Posisikan di titik tengah ruas & putar sesuai vektor (dx, dz)
  group.position.set((startX + endX) / 2, 0, (startZ + endZ) / 2)
  group.rotation.y = -Math.atan2(dz, dx)
  group.visible = wallElement.is_visible !== false
  group.userData = { elementId: wallElement.id, elementType: 'wall' }

  return group
}

/**
 * Membangun Plafon (Ceiling) 3D
 */
export function buildCeilingGroup(el) {
  const group = new THREE.Group()
  const g = el.geometry_data || {}
  const w = Math.max(1, Number(g.width || 10))
  const d = Math.max(1, Number(g.depth || 10))
  const h = Math.max(2, Number(g.height || 3.2))
  const t = Math.max(0.05, Number(g.thickness || 0.12))

  const mat = buildStandardMaterial(el.material_data || { color: '#FAF8F5', roughness: 0.85 }, Math.max(1, w / 3), Math.max(1, d / 3))
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, t, d), mat)
  mesh.position.y = h + t / 2
  mesh.receiveShadow = true
  mesh.userData = { elementId: el.id, elementType: 'ceiling' }
  group.add(mesh)

  const pos = el.position_data || { x: 0, y: 0, z: 0 }
  group.position.set(Number(pos.x || 0), Number(pos.y || 0), Number(pos.z || 0))
  group.visible = el.is_visible !== false
  group.userData = { elementId: el.id, elementType: 'ceiling' }
  return group
}

/**
 * Membangun Basic Shapes (box, cylinder, sphere, cone, plane)
 */
export function buildPrimitiveGroup(el) {
  const group = new THREE.Group()
  const g = el.geometry_data || {}
  const shape = g.shape || 'box'
  const w = Math.max(0.1, Number(g.width || 1))
  const h = Math.max(0.05, Number(g.height || 1))
  const d = Math.max(0.1, Number(g.depth || 1))

  let geometry
  if (shape === 'cylinder') {
    geometry = new THREE.CylinderGeometry(w / 2, w / 2, h, 24)
  } else if (shape === 'sphere') {
    geometry = new THREE.SphereGeometry(Math.max(w, h, d) / 2, 24, 24)
  } else if (shape === 'cone') {
    geometry = new THREE.ConeGeometry(w / 2, h, 24)
  } else if (shape === 'plane') {
    geometry = new THREE.BoxGeometry(w, 0.04, d)
  } else {
    geometry = new THREE.BoxGeometry(w, h, d)
  }

  const mat = buildStandardMaterial(el.material_data || { color: '#E9D8C8', roughness: 0.6 }, 2, 2)
  const mesh = new THREE.Mesh(geometry, mat)
  mesh.position.y = shape === 'plane' ? 0.02 : (shape === 'sphere' ? Math.max(w, h, d) / 2 : h / 2)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.userData = { elementId: el.id, elementType: 'primitive' }
  group.add(mesh)

  const pos = el.position_data || { x: 0, y: 0, z: 0 }
  const rot = el.rotation_data || { x: 0, y: 0, z: 0 }
  const sc = el.scale_data || { x: 1, y: 1, z: 1 }

  group.position.set(Number(pos.x || 0), Number(pos.y || 0), Number(pos.z || 0))
  group.rotation.set(
    (Number(rot.x || 0) * Math.PI) / 180,
    (Number(rot.y || 0) * Math.PI) / 180,
    (Number(rot.z || 0) * Math.PI) / 180
  )
  group.scale.set(Number(sc.x || 1), Number(sc.y || 1), Number(sc.z || 1))
  group.visible = el.is_visible !== false
  group.userData = { elementId: el.id, elementType: 'primitive' }
  return group
}
