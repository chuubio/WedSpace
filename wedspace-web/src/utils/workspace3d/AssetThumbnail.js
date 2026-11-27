import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { generateProceduralAsset } from '../proceduralAssets'

const thumbCache = new Map()
const front2DCache = new Map()
const front2DInFlight = new Map()
let sharedRenderer = null
let shared2DRenderer = null
let gltfLoader = null

function getSharedRenderer() {
  if (sharedRenderer) return sharedRenderer
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 192
    canvas.height = 144
    sharedRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true })
    sharedRenderer.setSize(192, 144, false)
    sharedRenderer.toneMapping = THREE.ACESFilmicToneMapping
    sharedRenderer.toneMappingExposure = 1.08
    return sharedRenderer
  } catch {
    return null
  }
}

function getShared2DRenderer() {
  if (shared2DRenderer) return shared2DRenderer
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    shared2DRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true })
    shared2DRenderer.setSize(256, 256, false)
    shared2DRenderer.setClearColor(0x000000, 0)
    shared2DRenderer.toneMapping = THREE.ACESFilmicToneMapping
    shared2DRenderer.toneMappingExposure = 1.12
    return shared2DRenderer
  } catch {
    return null
  }
}

function renderObjectFront2D(object3D) {
  const renderer = getShared2DRenderer()
  if (!renderer) return ''

  const scene = new THREE.Scene()
  scene.background = null

  const ambient = new THREE.AmbientLight(0xffffff, 1.2)
  scene.add(ambient)

  const frontLight = new THREE.DirectionalLight(0xfffaf2, 1.15)
  frontLight.position.set(1.5, 3, 6)
  scene.add(frontLight)

  const fillLight = new THREE.DirectionalLight(0xeef2f7, 0.5)
  fillLight.position.set(-2, 2, -4)
  scene.add(fillLight)

  scene.add(object3D)

  const box = new THREE.Box3().setFromObject(object3D)
  if (box.isEmpty()) return ''

  const size = new THREE.Vector3()
  const center = new THREE.Vector3()
  box.getSize(size)
  box.getCenter(center)

  // Kamera ortografis lurus menghadap depan (+Z -> center), tanpa kemiringan/perspektif 3D
  const pad = 1.14
  const span = Math.max(size.x, size.y, 0.25) * pad
  const half = span / 2
  const near = 0.05
  const far = Math.max(size.z * 6 + 20, 50)
  const camera = new THREE.OrthographicCamera(-half, half, half, -half, near, far)
  camera.position.set(center.x, center.y, center.z + Math.max(size.z, 1) * 2 + 2)
  camera.lookAt(center.x, center.y, center.z)
  camera.updateProjectionMatrix()

  renderer.setClearColor(0x000000, 0)
  renderer.clear()
  renderer.render(scene, camera)
  return renderer.domElement.toDataURL('image/png')
}

function resolveGlbUrl(dekorasi, token = '') {
  const raw = dekorasi?.Model3DLibrary?.file_path || dekorasi?.model_3d || ''
  if (!raw || !/\.(glb|gltf)(\?.*)?$/i.test(raw)) return ''
  let url = raw.startsWith('http') ? raw : `http://localhost:3000${raw}`
  if (dekorasi?.visibility === 'private' && token) {
    url += `${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
  }
  return url
}

/**
 * Apakah dekorasi memiliki file model 3D (.glb/.gltf) yang bisa dirender tampak depan 2D.
 */
export function hasGlbModel(dekorasi) {
  return Boolean(resolveGlbUrl(dekorasi))
}

/**
 * Menghasilkan preview 2D menghadap lurus ke depan (ortografis, latar transparan)
 * khusus untuk Katalog 2D & Kanvas 2D.
 */
export function renderAsset2DFrontThumbnail(dekorasi) {
  if (!dekorasi) return ''
  const glbUrl = resolveGlbUrl(dekorasi)
  if (glbUrl && front2DCache.has(`glb:${glbUrl}`)) {
    return front2DCache.get(`glb:${glbUrl}`)
  }

  const kat = String(dekorasi.kategori || 'Aksesoris')
  const p = Number(dekorasi.panjang || 100)
  const l = Number(dekorasi.lebar || 100)
  const t = Number(dekorasi.tinggi || 100)
  const procKey = `proc:${kat.toLowerCase()}_${p}_${l}_${t}`

  if (front2DCache.has(procKey)) return front2DCache.get(procKey)

  try {
    const meshGroup = generateProceduralAsset(kat, p, l, t)
    const dataUrl = renderObjectFront2D(meshGroup)
    meshGroup.traverse((o) => {
      if (o.geometry) o.geometry.dispose()
    })
    if (dataUrl) front2DCache.set(procKey, dataUrl)
    return dataUrl
  } catch {
    return ''
  }
}

// Antrean berurutan ringan agar render GLB ke WebGL tidak membebani GPU sekaligus
let glbRenderQueue = Promise.resolve()

/**
 * Memuat model .glb asli dan merendernya menghadap lurus ke depan (ortografis, transparan)
 * khusus untuk Workspace 2D.
 */
export function loadAsset2DFrontThumbnail(dekorasi, token = '') {
  const glbUrl = resolveGlbUrl(dekorasi, token)
  if (!glbUrl) return Promise.resolve('')

  const cacheKey = `glb:${glbUrl}`
  if (front2DCache.has(cacheKey)) {
    return Promise.resolve(front2DCache.get(cacheKey))
  }
  if (front2DInFlight.has(cacheKey)) {
    return front2DInFlight.get(cacheKey)
  }

  if (!gltfLoader) gltfLoader = new GLTFLoader()

  const promise = new Promise((resolve) => {
    glbRenderQueue = glbRenderQueue.then(async () => {
      try {
        const gltf = await gltfLoader.loadAsync(glbUrl)
        const root = gltf.scene || gltf.scenes?.[0]
        if (!root) {
          resolve('')
          return
        }
        const dataUrl = renderObjectFront2D(root)
        root.traverse((o) => {
          if (o.geometry) o.geometry.dispose()
          if (o.material) {
            const mats = Array.isArray(o.material) ? o.material : [o.material]
            for (const m of mats) {
              if (m.map) m.map.dispose()
              m.dispose?.()
            }
          }
        })
        if (dataUrl) front2DCache.set(cacheKey, dataUrl)
        resolve(dataUrl || '')
      } catch {
        resolve('')
      } finally {
        front2DInFlight.delete(cacheKey)
      }
    })
  })

  front2DInFlight.set(cacheKey, promise)
  return promise
}

/**
 * Menghasilkan thumbnail preview 3D asli dari model prosedural yang sama persis
 * dengan objek yang akan dimasukkan ke dalam Workspace 3D.
 */
export function renderAssetThumbnail(dekorasi) {
  if (!dekorasi) return ''
  const kat = String(dekorasi.kategori || 'Aksesoris')
  const p = Number(dekorasi.panjang || 100)
  const l = Number(dekorasi.lebar || 100)
  const t = Number(dekorasi.tinggi || 100)
  const key = `${kat.toLowerCase()}_${p}_${l}_${t}`

  if (thumbCache.has(key)) return thumbCache.get(key)

  const renderer = getSharedRenderer()
  if (!renderer) return ''

  try {
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf8f9fa)

    const ambient = new THREE.AmbientLight(0xffffff, 0.95)
    scene.add(ambient)

    const keyLight = new THREE.DirectionalLight(0xfffaf2, 1.35)
    keyLight.position.set(4, 7, 5)
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0xeef2f7, 0.45)
    fillLight.position.set(-4, 3, -3)
    scene.add(fillLight)

    const meshGroup = generateProceduralAsset(kat, p, l, t)
    scene.add(meshGroup)

    // Hitung bounding box agar kamera otomatis membingkai objek dengan pas
    const box = new THREE.Box3().setFromObject(meshGroup)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)

    const maxDim = Math.max(size.x, size.y, size.z, 0.3)
    const camera = new THREE.PerspectiveCamera(36, 192 / 144, 0.05, 100)
    const dist = maxDim * 1.95
    camera.position.set(center.x + dist * 0.72, center.y + dist * 0.58, center.z + dist * 0.82)
    camera.lookAt(center)

    renderer.render(scene, camera)
    const dataUrl = renderer.domElement.toDataURL('image/png')

    // Bebaskan geometri sementara
    meshGroup.traverse((o) => {
      if (o.geometry) o.geometry.dispose()
    })

    thumbCache.set(key, dataUrl)
    return dataUrl
  } catch {
    return ''
  }
}
