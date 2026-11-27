<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { useAuthStore } from '../stores/auth'
import TopToolbar3D from '../components/workspace3d/TopToolbar3D.vue'
import LeftPanel3D from '../components/workspace3d/LeftPanel3D.vue'
import RightPanel3D from '../components/workspace3d/RightPanel3D.vue'
import NotesPanel from '../components/editor/NotesPanel.vue'
import AiWorkspacePanel from '../components/editor/AiWorkspacePanel.vue'
import UnsavedLeaveModal from '../components/UnsavedLeaveModal.vue'
import { generateProceduralAsset, createNotePin3D } from '../utils/proceduralAssets'
import {
  buildWallGroup,
  buildCeilingGroup,
  buildPrimitiveGroup,
  buildStandardMaterial,
} from '../utils/workspace3d/WallGeometry'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const API = 'http://localhost:3000/api'
const API_BASE = 'http://localhost:3000'

// Data State
const memuat = ref(true)
const menyimpan = ref(false)
const updatingVenue = ref(false)
const isDirty = ref(false)
const error = ref('')
const errorSimpan = ref('')
const pesanSukses = ref('')

const dataRancangan = ref(null)
const items = ref([])
const elements = ref([]) // Design3DElements: walls, doors, windows, ceiling, primitives
const notes = ref([])

const THEME_PREF_KEY = 'wedspace_3d_theme'
const THEME_BG_LIGHT = '#BABAB5'
const THEME_BG_DARK = '#3E3E4A'
const savedLocalTheme = typeof window !== 'undefined' ? localStorage.getItem(THEME_PREF_KEY) : null
const themeMode = ref(savedLocalTheme === 'dark' ? 'dark' : 'light')
const isDarkMode = computed(() => themeMode.value === 'dark')

const sceneSettings = ref({
  themeMode: themeMode.value,
  backgroundColor: themeMode.value === 'dark' ? THEME_BG_DARK : THEME_BG_LIGHT,
  floor: { color: '#EDE4D8', roughness: 0.45, texturePreset: 'marble', textureScale: 1.5, textureRotation: 0 },
  lighting: { preset: 'day', ambientIntensity: 0.75, directionalIntensity: 1.3, shadowsEnabled: true },
  quality: 'high',
})

// UI & Tools State
const canvasContainer = ref(null)
const activeTool = ref('select') // 'select'|'hand'|'translate'|'rotate'|'scale'|'wall'|'door'|'window'
const activeViewPreset = ref('perspective')
const showGrid = ref(true)
const selectedRef = ref(null) // { kind: 'item'|'element', id }
const selectedNote = ref(null)
const isDesktopInit = typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
const leftPanelOpen = ref(isDesktopInit)
const rightPanelOpen = ref(isDesktopInit)
const activeRightDrawer = ref(null) // null | 'notes' | 'ai'

function toggleLeftPanel() {
  leftPanelOpen.value = !leftPanelOpen.value
  if (leftPanelOpen.value && typeof window !== 'undefined' && window.innerWidth < 1024) {
    rightPanelOpen.value = false
    activeRightDrawer.value = null
  }
}

function toggleRightPanel() {
  rightPanelOpen.value = !rightPanelOpen.value
  if (rightPanelOpen.value && typeof window !== 'undefined' && window.innerWidth < 1024) {
    leftPanelOpen.value = false
  }
}

function toggleRightDrawer(drawer) {
  activeRightDrawer.value = activeRightDrawer.value === drawer ? null : drawer
  if (activeRightDrawer.value) {
    rightPanelOpen.value = true
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      leftPanelOpen.value = false
    }
  }
}

// Wall Drawing Live Preview State
const wallChainPoints = ref([]) // [{ x, z }] in meters
const wallHoverPoint = ref(null) // { x, z } in meters

// Undo / Redo History
const historyPast = ref([])
const historyFuture = ref([])
const MAX_HISTORY = 40

const rancangan = computed(() => dataRancangan.value || {})
const proyek = computed(() => dataRancangan.value?.proyek || dataRancangan.value?.Project || {})
const venueW = computed(() => Math.max(2, Number(proyek.value?.panjang_venue || 15)))
const venueD = computed(() => Math.max(2, Number(proyek.value?.lebar_venue || 10)))
const hasCeiling = computed(() => elements.value.some((e) => e.element_type === 'ceiling'))
const canUndo = computed(() => historyPast.value.length > 0)
const canRedo = computed(() => historyFuture.value.length > 0)

const wallDraftLengthM = computed(() => {
  if (!wallChainPoints.value.length || !wallHoverPoint.value) return '0.00'
  const last = wallChainPoints.value[wallChainPoints.value.length - 1]
  return Math.hypot(wallHoverPoint.value.x - last.x, wallHoverPoint.value.z - last.z).toFixed(2)
})

// Three.js internals (non-reactive for performance)
let renderer = null
let scene = null
let camera = null
let controls = null
let transformControls = null
let animationFrameId = null
let ambientLight = null
let dirLight = null
let envRenderTarget = null
let floorMesh = null
let borderLine = null
let gridHelper = null
let dynamicGroup = null
let wallPreviewLine = null
let highlightHelper = null
let raycaster = null
let resizeObserver = null
let lastCanvasWidth = 0
let lastCanvasHeight = 0
let pointerDownPos = { x: 0, y: 0 }
const interactiveMeshes = []
const objectGroupMap = new Map() // "item:<id>" or "element:<id>" -> THREE.Object3D
const gltfCache = new Map()
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

function snapshotState() {
  return {
    items: JSON.parse(JSON.stringify(items.value)),
    elements: JSON.parse(JSON.stringify(elements.value)),
    sceneSettings: JSON.parse(JSON.stringify(sceneSettings.value)),
  }
}

function pushHistory() {
  historyPast.value.push(snapshotState())
  if (historyPast.value.length > MAX_HISTORY) historyPast.value.shift()
  historyFuture.value = []
}

async function undo() {
  if (!canUndo.value) return
  historyFuture.value.push(snapshotState())
  const prev = historyPast.value.pop()
  items.value = prev.items
  elements.value = prev.elements
  sceneSettings.value = prev.sceneSettings
  selectedRef.value = null
  isDirty.value = true
  applySceneSettings()
  await rebuildDynamicObjects()
}

async function redo() {
  if (!canRedo.value) return
  historyPast.value.push(snapshotState())
  const next = historyFuture.value.pop()
  items.value = next.items
  elements.value = next.elements
  sceneSettings.value = next.sceneSettings
  selectedRef.value = null
  isDirty.value = true
  applySceneSettings()
  await rebuildDynamicObjects()
}

// Load scene from backend
async function muatScene3D() {
  memuat.value = true
  error.value = ''
  try {
    const res = await fetch(`${API}/rancangan/${route.params.id}/scene3d`, {
      headers: auth.authHeader(),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(body.pesan || 'Gagal memuat Workspace 3D.')
    }
    const d = body.data
    dataRancangan.value = d
    items.value = (d.DesignItems || []).map((di) => ({
      id: di.id,
      decoration_id: di.decoration_id,
      posisi_x: Number(di.posisi_x || 0),
      posisi_y: Number(di.posisi_y || 0),
      rotasi: Number(di.rotasi || 0),
      jumlah: Math.max(1, Number(di.jumlah || 1)),
      transform_3d: di.transform_3d || { elevationY: 0, rotX: 0, rotZ: 0, scaleX: 1, scaleY: 1, scaleZ: 1, isVisible: true, isLocked: false },
      Decoration: di.Decoration || {},
    }))
    elements.value = (d.Design3DElements || []).map((el) => ({ ...el }))
    notes.value = d.DesignNotes || []

    if (d.scene_3d_settings) {
      const resolvedTheme =
        d.scene_3d_settings.themeMode === 'dark' || d.scene_3d_settings.themeMode === 'light'
          ? d.scene_3d_settings.themeMode
          : themeMode.value
      themeMode.value = resolvedTheme
      sceneSettings.value = {
        themeMode: resolvedTheme,
        backgroundColor: resolvedTheme === 'dark' ? THEME_BG_DARK : THEME_BG_LIGHT,
        floor: { ...sceneSettings.value.floor, ...(d.scene_3d_settings.floor || {}) },
        lighting: { ...sceneSettings.value.lighting, ...(d.scene_3d_settings.lighting || {}) },
        quality: d.scene_3d_settings.quality || 'high',
      }
    }

    isDirty.value = false
    historyPast.value = []
    historyFuture.value = []

    await nextTick()
    initThreeScene()
    await rebuildDynamicObjects()
  } catch (err) {
    error.value = err.message || 'Terjadi kesalahan saat memuat Workspace 3D.'
  } finally {
    memuat.value = false
  }
}

function initThreeScene() {
  if (!canvasContainer.value) return
  cleanupThreeScene()

  const container = canvasContainer.value
  const w = container.clientWidth || 800
  const h = container.clientHeight || 500
  lastCanvasWidth = w
  lastCanvasHeight = h

  scene = new THREE.Scene()
  scene.background = new THREE.Color(isDarkMode.value ? THEME_BG_DARK : THEME_BG_LIGHT)

  camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 300)
  camera.up.set(0, 1, 0)
  renderer = new THREE.WebGLRenderer({ antialias: sceneSettings.value.quality !== 'low', powerPreference: 'high-performance' })
  renderer.setSize(w, h)
  renderer.setPixelRatio(sceneSettings.value.quality === 'high' ? Math.min(window.devicePixelRatio, 2) : 1)
  renderer.shadowMap.enabled = Boolean(sceneSettings.value.lighting.shadowsEnabled)
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  container.appendChild(renderer.domElement)

  // Environment IBL (RoomEnvironment) agar pantulan PBR pada lantai marmer, kayu, kaca & emas realistis
  const pmrem = new THREE.PMREMGenerator(renderer)
  envRenderTarget = pmrem.fromScene(new RoomEnvironment(), 0.04)
  scene.environment = envRenderTarget.texture
  pmrem.dispose()

  // Fill light lembut dari sisi berlawanan agar bayangan lebih natural
  const fillLight = new THREE.DirectionalLight(0xf6eef5, 0.35)
  fillLight.position.set(-18, 16, -14)
  scene.add(fillLight)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.18 // Responsif langsung mengikuti mouse tanpa delay karet
  controls.rotateSpeed = 0.45   // Orbit stabil dan terkendali, tidak terlalu sensitif
  controls.panSpeed = 1.6       // Pan cepat dan responsif mengikuti kursor
  controls.zoomSpeed = 2.2      // Scroll zoom responsif namun tetap terkontrol
  controls.zoomToCursor = true  // Zoom mengarah ke titik kursor
  controls.screenSpacePanning = false // Pan sejajar bidang lantai venue
  controls.minPolarAngle = 0.05 // Cegah kamera terbalik di puncak vertikal
  controls.maxPolarAngle = Math.PI / 2 - 0.04 // Cegah kamera menembus lantai
  controls.minDistance = 2.0
  controls.maxDistance = Math.max(45, Math.max(venueW.value, venueD.value) * 3.5)
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.PAN,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.ROTATE,
  }

  // TransformControls Gizmo (Move / Rotate / Scale)
  transformControls = new TransformControls(camera, renderer.domElement)
  transformControls.addEventListener('dragging-changed', (event) => {
    if (controls) controls.enabled = !event.value
    if (event.value) {
      pushHistory()
    } else {
      syncGizmoBackToState()
    }
  })
  scene.add(transformControls.getHelper ? transformControls.getHelper() : transformControls)

  // Lighting
  ambientLight = new THREE.AmbientLight(0xfffaf3, sceneSettings.value.lighting.ambientIntensity)
  scene.add(ambientLight)

  const hemi = new THREE.HemisphereLight(0xffffff, 0xc8c0b8, 0.45)
  hemi.position.set(0, 40, 0)
  scene.add(hemi)

  dirLight = new THREE.DirectionalLight(0xfffaf0, sceneSettings.value.lighting.directionalIntensity)
  dirLight.position.set(18, 32, 16)
  dirLight.castShadow = true
  dirLight.shadow.mapSize.set(2048, 2048)
  dirLight.shadow.camera.left = -28
  dirLight.shadow.camera.right = 28
  dirLight.shadow.camera.top = 28
  dirLight.shadow.camera.bottom = -28
  dirLight.shadow.bias = -0.0005
  scene.add(dirLight)

  // Lantai Venue — ukuran persis sesuai dimensi venue yang ditentukan (tanpa lantai ekstra di luar venue)
  const floorThickness = 0.08
  floorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(venueW.value, floorThickness, venueD.value),
    buildStandardMaterial(sceneSettings.value.floor, venueW.value / 2, venueD.value / 2)
  )
  floorMesh.position.y = -floorThickness / 2
  floorMesh.receiveShadow = true
  scene.add(floorMesh)

  // Perimeter subtle line (Merah WedSpace)
  const borderEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(venueW.value, 0.02, venueD.value))
  borderLine = new THREE.LineSegments(borderEdges, new THREE.LineBasicMaterial({ color: 0xcf2c2f }))
  borderLine.position.y = 0.01
  scene.add(borderLine)

  // Grid Persegi Panjang — ukuran persis sesuai lantai venue (venueW × venueD, jarak 1 meter)
  gridHelper = createRectangularGrid(venueW.value, venueD.value, 1, 0xcf2c2f, 0xcbd5e1)
  gridHelper.position.y = 0.005
  gridHelper.visible = showGrid.value
  scene.add(gridHelper)

  applySceneSettings()
  resetCameraPosition()

  raycaster = new THREE.Raycaster()
  renderer.domElement.addEventListener('pointerdown', onViewportPointerDown)
  renderer.domElement.addEventListener('pointermove', onViewportPointerMove)
  renderer.domElement.addEventListener('pointerup', onViewportPointerUp)
  renderer.domElement.addEventListener('dblclick', onViewportDblClick)

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(onWindowResize)
    resizeObserver.observe(container)
  }
  window.addEventListener('resize', onWindowResize)

  animate()
}

function createRectangularGrid(width, depth, step = 1, centerColorHex = 0xcf2c2f, lineColorHex = 0xcbd5e1) {
  const halfW = width / 2
  const halfD = depth / 2
  const vertices = []
  const colors = []
  const centerColor = new THREE.Color(centerColorHex)
  const lineColor = new THREE.Color(lineColorHex)

  const pushLine = (x1, z1, x2, z2, isCenter) => {
    vertices.push(x1, 0, z1, x2, 0, z2)
    const c = isCenter ? centerColor : lineColor
    colors.push(c.r, c.g, c.b, c.r, c.g, c.b)
  }

  // Garis vertikal (sejajar sumbu Z) dari -halfW sampai +halfW tiap `step` meter
  const countX = Math.floor(width / step)
  for (let i = 0; i <= countX; i++) {
    const x = -halfW + i * step
    if (x > halfW + 1e-4) break
    pushLine(x, -halfD, x, halfD, Math.abs(x) < 1e-3)
  }
  if (Math.abs(-halfW + countX * step - halfW) > 1e-3) {
    pushLine(halfW, -halfD, halfW, halfD, false)
  }

  // Garis horizontal (sejajar sumbu X) dari -halfD sampai +halfD tiap `step` meter
  const countZ = Math.floor(depth / step)
  for (let j = 0; j <= countZ; j++) {
    const z = -halfD + j * step
    if (z > halfD + 1e-4) break
    pushLine(-halfW, z, halfW, z, Math.abs(z) < 1e-3)
  }
  if (Math.abs(-halfD + countZ * step - halfD) > 1e-3) {
    pushLine(-halfW, halfD, halfW, halfD, false)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  const mat = new THREE.LineBasicMaterial({ vertexColors: true })
  return new THREE.LineSegments(geo, mat)
}

function animate() {
  animationFrameId = requestAnimationFrame(animate)
  controls?.update()
  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

function applySceneSettings() {
  if (!scene || !renderer) return

  // Warna latar belakang area kerja 3D mengikuti tema (Terang: #BABAB5, Gelap: #3E3E4A)
  scene.background = new THREE.Color(isDarkMode.value ? THEME_BG_DARK : THEME_BG_LIGHT)

  const f = sceneSettings.value.floor
  if (floorMesh) {
    floorMesh.material?.dispose?.()
    floorMesh.material = buildStandardMaterial(f, venueW.value / 2, venueD.value / 2)
  }

  const l = sceneSettings.value.lighting
  if (ambientLight) ambientLight.intensity = Number(l.ambientIntensity ?? 0.75)
  if (dirLight) {
    dirLight.intensity = Number(l.directionalIntensity ?? 1.3)
    dirLight.castShadow = Boolean(l.shadowsEnabled)
    if (l.preset === 'morning') {
      dirLight.position.set(-22, 22, 16)
      dirLight.color.setHex(0xfff1d6)
    } else if (l.preset === 'evening') {
      dirLight.position.set(24, 14, -18)
      dirLight.color.setHex(0xffd2a6)
    } else {
      dirLight.position.set(18, 32, 16)
      dirLight.color.setHex(0xfffaf0)
    }
  }

  renderer.shadowMap.enabled = Boolean(l.shadowsEnabled)
  renderer.setPixelRatio(sceneSettings.value.quality === 'high' ? Math.min(window.devicePixelRatio, 2) : 1)
}

async function rebuildDynamicObjects() {
  if (!scene) return
  detachGizmo()
  if (dynamicGroup) {
    scene.remove(dynamicGroup)
    dynamicGroup = null
  }
  if (highlightHelper) {
    scene.remove(highlightHelper)
    highlightHelper.dispose?.()
    highlightHelper = null
  }
  interactiveMeshes.length = 0
  objectGroupMap.clear()

  dynamicGroup = new THREE.Group()
  scene.add(dynamicGroup)

  // 1. Build Walls (with hosted Door & Window openings!)
  const wallEls = elements.value.filter((e) => e.element_type === 'wall')
  for (const w of wallEls) {
    const hosted = elements.value.filter(
      (e) => ['door', 'window'].includes(e.element_type) && String(e.parent_id) === String(w.id)
    )
    const wallGroup = buildWallGroup(w, hosted)
    dynamicGroup.add(wallGroup)
    objectGroupMap.set(`element:${w.id}`, wallGroup)
    wallGroup.traverse((c) => {
      if (c.isMesh) {
        c.userData.rootGroup = wallGroup
        c.userData.kind = 'element'
        interactiveMeshes.push(c)
      }
    })
  }

  // 2. Build Ceiling & Basic Shapes
  for (const el of elements.value.filter((e) => ['ceiling', 'primitive'].includes(e.element_type))) {
    const g = el.element_type === 'ceiling' ? buildCeilingGroup(el) : buildPrimitiveGroup(el)
    dynamicGroup.add(g)
    objectGroupMap.set(`element:${el.id}`, g)
    g.traverse((c) => {
      if (c.isMesh) {
        c.userData.rootGroup = g
        c.userData.kind = 'element'
        c.userData.elementId = el.id
        interactiveMeshes.push(c)
      }
    })
  }

  // 3. Build Note Pins 3D
  for (const note of notes.value) {
    if (note.posisi_x === null || note.posisi_x === undefined || note.posisi_y === null || note.posisi_y === undefined) continue
    const pin = createNotePin3D(note.warna)
    pin.position.set(-venueW.value / 2 + Number(note.posisi_x) / 100, 0, -venueD.value / 2 + Number(note.posisi_y) / 100)
    dynamicGroup.add(pin)
    pin.traverse((c) => {
      if (c.isMesh) {
        c.userData = { noteData: note, rootGroup: pin }
        interactiveMeshes.push(c)
      }
    })
  }

  // 4. Build Decorations (shared DesignItems with 2D!)
  const gltfLoader = new GLTFLoader()
  for (const item of items.value) {
    const t3 = item.transform_3d || {}
    if (t3.isVisible === false) continue

    const dek = item.Decoration || {}
    const dimW = Math.max(0.1, Number(dek.panjang || 100) / 100)
    const dimD = Math.max(0.1, Number(dek.lebar || 100) / 100)
    const dimH = Math.max(0.03, Number(dek.tinggi || 100) / 100)

    const posX = -venueW.value / 2 + Number(item.posisi_x || 0) / 100 + dimW / 2
    const posZ = -venueD.value / 2 + Number(item.posisi_y || 0) / 100 + dimD / 2
    const posY = Number(t3.elevationY || 0)
    const rotY = -(Number(item.rotasi || 0) * Math.PI) / 180

    let assetGroup = null
    if (dek.model_3d_source === 'library' && (dek.Model3DLibrary?.file_path || dek.model_3d)) {
      const u = dek.Model3DLibrary?.file_path || dek.model_3d
      try {
        assetGroup = await load3DModel(gltfLoader, u.startsWith('http') ? u : `${API_BASE}${u}`, dimW, dimH, dimD)
      } catch {}
    } else if (dek.model_3d_source === 'upload' && dek.model_3d) {
      let u = dek.model_3d.startsWith('http') ? dek.model_3d : `${API_BASE}${dek.model_3d}`
      if (auth.token && !u.includes('token=')) u += `${u.includes('?') ? '&' : '?'}token=${encodeURIComponent(auth.token)}`
      try {
        assetGroup = await load3DModel(gltfLoader, u, dimW, dimH, dimD)
      } catch {}
    }

    if (!assetGroup) {
      assetGroup = generateProceduralAsset(dek.kategori, dek.panjang, dek.lebar, dek.tinggi)
    }

    const sx = Number(t3.scaleX || 1) * (t3.mirrorX ? -1 : 1)
    const sy = Number(t3.scaleY || 1)
    const sz = Number(t3.scaleZ || 1) * (t3.mirrorZ ? -1 : 1)

    assetGroup.position.set(posX, posY, posZ)
    assetGroup.rotation.set((Number(t3.rotX || 0) * Math.PI) / 180, rotY, (Number(t3.rotZ || 0) * Math.PI) / 180)
    assetGroup.scale.set(sx, sy, sz)
    assetGroup.userData = { kind: 'item', itemId: item.id }

    dynamicGroup.add(assetGroup)
    objectGroupMap.set(`item:${item.id}`, assetGroup)
    assetGroup.traverse((c) => {
      if (c.isMesh) {
        c.userData = { kind: 'item', itemId: item.id, rootGroup: assetGroup }
        interactiveMeshes.push(c)
      }
    })
  }

  // Re-attach highlight & gizmo if selection exists
  if (selectedRef.value) {
    applySelectionVisual(selectedRef.value)
  }
}

function normalizeLoadedModel(root, targetW, targetH, targetD) {
  root.traverse((n) => {
    if (n.isMesh) {
      n.castShadow = true
      n.receiveShadow = true
      if (!n.material) {
        n.material = new THREE.MeshStandardMaterial({ color: 0xe9dfd5, roughness: 0.65 })
      }
    }
  })
  const box = new THREE.Box3().setFromObject(root)
  const size = new THREE.Vector3()
  const center = new THREE.Vector3()
  box.getSize(size)
  box.getCenter(center)
  const wrapper = new THREE.Group()
  root.position.set(-center.x, -box.min.y, -center.z)
  wrapper.add(root)
  wrapper.scale.set(
    size.x > 0.0001 ? targetW / size.x : 1,
    size.y > 0.0001 ? targetH / size.y : 1,
    size.z > 0.0001 ? targetD / size.z : 1
  )
  return wrapper
}

function load3DModel(gltfLoader, url, targetW, targetH, targetD) {
  return new Promise((resolve, reject) => {
    const cacheKey = `${url}|${targetW}|${targetH}|${targetD}`
    if (gltfCache.has(cacheKey)) return resolve(gltfCache.get(cacheKey).clone(true))

    const cleanUrl = url.split('?')[0].toLowerCase()
    const onSuccess = (root) => {
      if (!root) return reject(new Error('Model 3D kosong'))
      const wrapper = normalizeLoadedModel(root, targetW, targetH, targetD)
      gltfCache.set(cacheKey, wrapper)
      resolve(wrapper.clone(true))
    }

    if (cleanUrl.endsWith('.obj')) {
      const objLoader = new OBJLoader()
      objLoader.load(url, (obj) => onSuccess(obj), undefined, reject)
    } else if (cleanUrl.endsWith('.dae')) {
      const daeLoader = new ColladaLoader()
      daeLoader.load(url, (collada) => onSuccess(collada.scene), undefined, reject)
    } else {
      gltfLoader.load(url, (gltf) => onSuccess(gltf.scene || gltf.scenes[0]), undefined, reject)
    }
  })
}

function detachGizmo() {
  if (transformControls) transformControls.detach()
}

function applySelectionVisual(sel) {
  if (!scene) return
  if (highlightHelper) {
    scene.remove(highlightHelper)
    highlightHelper.dispose?.()
    highlightHelper = null
  }
  detachGizmo()
  if (!sel) return

  const obj = objectGroupMap.get(`${sel.kind}:${sel.id}`)
  if (!obj) return

  highlightHelper = new THREE.BoxHelper(obj, 0xcf2c2f)
  scene.add(highlightHelper)

  // Attach TransformControls gizmo untuk item dekorasi & primitive yang tidak terkunci
  const isTransformMode = ['translate', 'rotate', 'scale'].includes(activeTool.value)
  if (!isTransformMode) return

  if (sel.kind === 'item') {
    const it = items.value.find((i) => String(i.id) === String(sel.id))
    if (it && !it.transform_3d?.isLocked) {
      transformControls.setMode(activeTool.value)
      transformControls.attach(obj)
    }
  } else if (sel.kind === 'element') {
    const el = elements.value.find((e) => String(e.id) === String(sel.id))
    if (el && el.element_type === 'primitive' && !el.is_locked) {
      transformControls.setMode(activeTool.value)
      transformControls.attach(obj)
    }
  }
}

function syncGizmoBackToState() {
  if (!selectedRef.value) return
  const obj = objectGroupMap.get(`${selectedRef.value.kind}:${selectedRef.value.id}`)
  if (!obj) return

  if (selectedRef.value.kind === 'item') {
    const idx = items.value.findIndex((i) => String(i.id) === String(selectedRef.value.id))
    if (idx === -1) return
    const item = items.value[idx]
    const dimW = Math.max(0.1, Number(item.Decoration?.panjang || 100) / 100)
    const dimD = Math.max(0.1, Number(item.Decoration?.lebar || 100) / 100)
    const newPosX = Math.round((obj.position.x + venueW.value / 2 - dimW / 2) * 100)
    const newPosY = Math.round((obj.position.z + venueD.value / 2 - dimD / 2) * 100)
    const newRot = (((-Math.round((obj.rotation.y * 180) / Math.PI)) % 360) + 360) % 360

    items.value[idx] = {
      ...item,
      posisi_x: newPosX,
      posisi_y: newPosY,
      rotasi: newRot,
      transform_3d: {
        ...(item.transform_3d || {}),
        elevationY: Number(obj.position.y.toFixed(2)),
        scaleX: Number(Math.abs(obj.scale.x).toFixed(2)),
        scaleY: Number(Math.abs(obj.scale.y).toFixed(2)),
        scaleZ: Number(Math.abs(obj.scale.z).toFixed(2)),
      },
    }
    isDirty.value = true
  } else if (selectedRef.value.kind === 'element') {
    const idx = elements.value.findIndex((e) => String(e.id) === String(selectedRef.value.id))
    if (idx === -1) return
    elements.value[idx] = {
      ...elements.value[idx],
      position_data: { x: Number(obj.position.x.toFixed(2)), y: Number(obj.position.y.toFixed(2)), z: Number(obj.position.z.toFixed(2)) },
      rotation_data: {
        x: Math.round((obj.rotation.x * 180) / Math.PI),
        y: Math.round((obj.rotation.y * 180) / Math.PI),
        z: Math.round((obj.rotation.z * 180) / Math.PI),
      },
      scale_data: { x: Number(obj.scale.x.toFixed(2)), y: Number(obj.scale.y.toFixed(2)), z: Number(obj.scale.z.toFixed(2)) },
    }
    isDirty.value = true
  }
}

// Raycast helper ke lantai y = 0 (meter, snapped ke 0.25m)
function raycastFloor(e) {
  if (!renderer || !camera) return null
  const rect = renderer.domElement.getBoundingClientRect()
  const ndc = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  )
  raycaster.setFromCamera(ndc, camera)
  const hit = new THREE.Vector3()
  if (raycaster.ray.intersectPlane(floorPlane, hit)) {
    const snapM = (v) => Math.round(v * 4) / 4 // 25cm snap
    return {
      x: Math.max(-venueW.value / 2, Math.min(venueW.value / 2, snapM(hit.x))),
      z: Math.max(-venueD.value / 2, Math.min(venueD.value / 2, snapM(hit.z))),
    }
  }
  return null
}

function updateWallPreviewLine() {
  if (!scene) return
  if (wallPreviewLine) {
    scene.remove(wallPreviewLine)
    wallPreviewLine.geometry?.dispose?.()
    wallPreviewLine = null
  }
  if (!wallChainPoints.value.length || !wallHoverPoint.value) return
  const last = wallChainPoints.value[wallChainPoints.value.length - 1]
  const pts = [new THREE.Vector3(last.x, 0.08, last.z), new THREE.Vector3(wallHoverPoint.value.x, 0.08, wallHoverPoint.value.z)]
  const geo = new THREE.BufferGeometry().setFromPoints(pts)
  wallPreviewLine = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xcf2c2f, linewidth: 2 }))
  scene.add(wallPreviewLine)
}

function finishWallChain() {
  wallChainPoints.value = []
  wallHoverPoint.value = null
  updateWallPreviewLine()
}

function setTool(tool) {
  activeTool.value = tool
  finishWallChain()
  if (tool === 'wall') {
    detachGizmo()
  } else if (['translate', 'rotate', 'scale'].includes(tool) && selectedRef.value) {
    applySelectionVisual(selectedRef.value)
  } else {
    detachGizmo()
  }
}

function onViewportPointerDown(e) {
  pointerDownPos = { x: e.clientX, y: e.clientY }
}

function onViewportPointerMove(e) {
  if (activeTool.value === 'wall' && wallChainPoints.value.length > 0) {
    wallHoverPoint.value = raycastFloor(e)
    updateWallPreviewLine()
  }
}

async function onViewportPointerUp(e) {
  if (Math.abs(e.clientX - pointerDownPos.x) > 5 || Math.abs(e.clientY - pointerDownPos.y) > 5) return
  if (activeTool.value === 'hand') return

  // 1. Wall Drawing Mode: klik titik A -> B -> C
  if (activeTool.value === 'wall') {
    const pt = raycastFloor(e)
    if (!pt) return
    if (wallChainPoints.value.length === 0) {
      wallChainPoints.value = [pt]
      wallHoverPoint.value = pt
      updateWallPreviewLine()
    } else {
      const prev = wallChainPoints.value[wallChainPoints.value.length - 1]
      const len = Math.hypot(pt.x - prev.x, pt.z - prev.z)
      if (len >= 0.3) {
        pushHistory()
        const wallCount = elements.value.filter((el) => el.element_type === 'wall').length + 1
        const newWall = {
          id: `temp_wall_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          temp_id: `temp_wall_${Date.now()}`,
          element_type: 'wall',
          name: `Tembok ${wallCount}`,
          geometry_data: { startX: prev.x, startZ: prev.z, endX: pt.x, endZ: pt.z, length: Number(len.toFixed(2)), height: 3.0, thickness: 0.15 },
          material_data: { color: '#F3EFEA', roughness: 0.72, texturePreset: 'plaster' },
          is_visible: true,
          is_locked: false,
        }
        elements.value.push(newWall)
        isDirty.value = true
        wallChainPoints.value.push(pt)
        selectedRef.value = { kind: 'element', id: newWall.id }
        await rebuildDynamicObjects()
      }
    }
    return
  }

  // 2. Raycast selection or Door/Window placement on Wall
  const rect = renderer.domElement.getBoundingClientRect()
  const ndc = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  )
  raycaster.setFromCamera(ndc, camera)
  const hits = raycaster.intersectObjects(interactiveMeshes, false)

  if (hits.length > 0) {
    const hit = hits[0]
    const ud = hit.object.userData || {}

    // Door / Window Tool: klik tembok untuk memotong bukaan nyata
    if (['door', 'window'].includes(activeTool.value) && ud.elementType === 'wall') {
      const hostWall = elements.value.find((el) => String(el.id) === String(ud.elementId))
      if (hostWall) {
        pushHistory()
        const g = hostWall.geometry_data || {}
        const dx = (g.endX ?? 0) - (g.startX ?? 0)
        const dz = (g.endZ ?? 0) - (g.startZ ?? 0)
        const lenSq = Math.max(0.01, dx * dx + dz * dz)
        const ratio = Math.max(0.15, Math.min(0.85, ((hit.point.x - g.startX) * dx + (hit.point.z - g.startZ) * dz) / lenSq))
        const isDoor = activeTool.value === 'door'
        const newOp = {
          id: `temp_${activeTool.value}_${Date.now()}`,
          parent_id: hostWall.id,
          element_type: activeTool.value,
          name: isDoor ? `Pintu ${elements.value.filter((x) => x.element_type === 'door').length + 1}` : `Jendela ${elements.value.filter((x) => x.element_type === 'window').length + 1}`,
          geometry_data: isDoor
            ? { width: 1.1, height: 2.15, offsetRatio: Number(ratio.toFixed(2)), openDirection: 'in' }
            : { width: 1.4, height: 1.2, sillHeight: 0.9, offsetRatio: Number(ratio.toFixed(2)) },
          material_data: { color: isDoor ? '#7F1125' : '#BFDBFE' },
          is_visible: true,
          is_locked: false,
        }
        elements.value.push(newOp)
        selectedRef.value = { kind: 'element', id: newOp.id }
        activeTool.value = 'select'
        isDirty.value = true
        await rebuildDynamicObjects()
      }
      return
    }

    if (ud.noteData) {
      selectedNote.value = ud.noteData
      selectedRef.value = null
      applySelectionVisual(null)
      return
    }

    if (ud.kind === 'item' && ud.itemId) {
      selectedNote.value = null
      selectedRef.value = { kind: 'item', id: ud.itemId }
      applySelectionVisual(selectedRef.value)
      return
    }

    if (ud.kind === 'element' && ud.elementId) {
      selectedNote.value = null
      selectedRef.value = { kind: 'element', id: ud.elementId }
      applySelectionVisual(selectedRef.value)
      return
    }
  }

  selectedNote.value = null
  selectedRef.value = null
  applySelectionVisual(null)
}

function onViewportDblClick() {
  if (activeTool.value === 'wall') {
    finishWallChain()
    activeTool.value = 'select'
  }
}

// Actions from Left & Right Panels
async function onAddDecoration(dek) {
  pushHistory()
  const newItem = {
    id: `temp_item_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    decoration_id: dek.id,
    posisi_x: Math.round((venueW.value * 100 - Number(dek.panjang || 100)) / 2),
    posisi_y: Math.round((venueD.value * 100 - Number(dek.lebar || 100)) / 2),
    rotasi: 0,
    jumlah: 1,
    transform_3d: { elevationY: 0, rotX: 0, rotZ: 0, scaleX: 1, scaleY: 1, scaleZ: 1, isVisible: true, isLocked: false },
    Decoration: { ...dek },
  }
  items.value.push(newItem)
  selectedRef.value = { kind: 'item', id: newItem.id }
  isDirty.value = true
  await rebuildDynamicObjects()
}

async function onAddPrimitive(b) {
  pushHistory()
  const el = {
    id: `temp_prim_${Date.now()}`,
    element_type: 'primitive',
    name: `${b.label} ${elements.value.filter((x) => x.element_type === 'primitive').length + 1}`,
    geometry_data: { shape: b.shape, width: b.w, height: b.h, depth: b.d },
    position_data: { x: 0, y: 0, z: 0 },
    rotation_data: { x: 0, y: 0, z: 0 },
    scale_data: { x: 1, y: 1, z: 1 },
    material_data: { color: '#E9D8C8', roughness: 0.6 },
    is_visible: true,
    is_locked: false,
  }
  elements.value.push(el)
  selectedRef.value = { kind: 'element', id: el.id }
  isDirty.value = true
  await rebuildDynamicObjects()
}

async function onToggleCeiling() {
  pushHistory()
  if (hasCeiling.value) {
    elements.value = elements.value.filter((e) => e.element_type !== 'ceiling')
  } else {
    elements.value.push({
      id: `temp_ceil_${Date.now()}`,
      element_type: 'ceiling',
      name: 'Plafon Venue',
      geometry_data: { width: venueW.value, depth: venueD.value, height: 3.2, thickness: 0.12 },
      position_data: { x: 0, y: 0, z: 0 },
      material_data: { color: '#FAF8F5', roughness: 0.85 },
      is_visible: true,
      is_locked: false,
    })
  }
  isDirty.value = true
  await rebuildDynamicObjects()
}

async function onUpdateItem(patch) {
  pushHistory()
  items.value = items.value.map((i) => (String(i.id) === String(patch.id) ? { ...i, ...patch } : i))
  isDirty.value = true
  await rebuildDynamicObjects()
}

async function onUpdateElement(patch) {
  pushHistory()
  elements.value = elements.value.map((e) => (String(e.id) === String(patch.id) ? { ...e, ...patch } : e))
  isDirty.value = true
  await rebuildDynamicObjects()
}

async function onApplyAllWalls(sourceWall) {
  pushHistory()
  const h = sourceWall.geometry_data?.height || 3
  const t = sourceWall.geometry_data?.thickness || 0.15
  const mat = { ...(sourceWall.material_data || {}) }
  elements.value = elements.value.map((e) =>
    e.element_type === 'wall'
      ? { ...e, geometry_data: { ...(e.geometry_data || {}), height: h, thickness: t }, material_data: { ...mat } }
      : e
  )
  isDirty.value = true
  await rebuildDynamicObjects()
}

async function onSnapFloor() {
  if (selectedRef.value?.kind !== 'item') return
  const it = items.value.find((i) => String(i.id) === String(selectedRef.value.id))
  if (!it) return
  await onUpdateItem({ id: it.id, transform_3d: { ...(it.transform_3d || {}), elevationY: 0 } })
}

async function onMirrorItem(axis) {
  if (selectedRef.value?.kind !== 'item') return
  const it = items.value.find((i) => String(i.id) === String(selectedRef.value.id))
  if (!it) return
  const cur = it.transform_3d || {}
  await onUpdateItem({
    id: it.id,
    transform_3d: { ...cur, [axis === 'x' ? 'mirrorX' : 'mirrorZ']: !cur[axis === 'x' ? 'mirrorX' : 'mirrorZ'] },
  })
}

async function onDuplicateSelected() {
  if (!selectedRef.value) return
  pushHistory()
  if (selectedRef.value.kind === 'item') {
    const it = items.value.find((i) => String(i.id) === String(selectedRef.value.id))
    if (!it) return
    const clone = {
      ...JSON.parse(JSON.stringify(it)),
      id: `temp_item_${Date.now()}`,
      posisi_x: it.posisi_x + 40,
      posisi_y: it.posisi_y + 40,
    }
    items.value.push(clone)
    selectedRef.value = { kind: 'item', id: clone.id }
  } else {
    const el = elements.value.find((e) => String(e.id) === String(selectedRef.value.id))
    if (!el || el.element_type !== 'primitive') return
    const clone = {
      ...JSON.parse(JSON.stringify(el)),
      id: `temp_prim_${Date.now()}`,
      name: `${el.name} (Salinan)`,
      position_data: { x: Number(el.position_data?.x || 0) + 0.5, y: Number(el.position_data?.y || 0), z: Number(el.position_data?.z || 0) + 0.5 },
    }
    elements.value.push(clone)
    selectedRef.value = { kind: 'element', id: clone.id }
  }
  isDirty.value = true
  await rebuildDynamicObjects()
}

async function onDeleteSelected() {
  if (!selectedRef.value) return
  pushHistory()
  if (selectedRef.value.kind === 'item') {
    items.value = items.value.filter((i) => String(i.id) !== String(selectedRef.value.id))
  } else {
    const delId = String(selectedRef.value.id)
    // Hapus elemen sekaligus pintu/jendela yang menempel pada tembok ini
    elements.value = elements.value.filter((e) => String(e.id) !== delId && String(e.parent_id) !== delId)
  }
  selectedRef.value = null
  isDirty.value = true
  await rebuildDynamicObjects()
}

async function onToggleVisibility({ kind, id }) {
  pushHistory()
  if (kind === 'item') {
    items.value = items.value.map((i) =>
      String(i.id) === String(id) ? { ...i, transform_3d: { ...(i.transform_3d || {}), isVisible: i.transform_3d?.isVisible === false } } : i
    )
  } else {
    elements.value = elements.value.map((e) => (String(e.id) === String(id) ? { ...e, is_visible: e.is_visible === false } : e))
  }
  isDirty.value = true
  await rebuildDynamicObjects()
}

function onToggleLock({ kind, id }) {
  if (kind === 'item') {
    items.value = items.value.map((i) =>
      String(i.id) === String(id) ? { ...i, transform_3d: { ...(i.transform_3d || {}), isLocked: !i.transform_3d?.isLocked } } : i
    )
  } else {
    elements.value = elements.value.map((e) => (String(e.id) === String(id) ? { ...e, is_locked: !e.is_locked } : e))
  }
  isDirty.value = true
  if (selectedRef.value) applySelectionVisual(selectedRef.value)
}

function getSelectedNotePopoverStyle(note) {
  return {
    card: { backgroundColor: note?.warna || '#F7E3A8' },
    title: { color: '#2A111A' },
    body: { color: '#3F1D2B' },
  }
}

function toggleThemeMode() {
  themeMode.value = themeMode.value === 'dark' ? 'light' : 'dark'
  const bgHex = themeMode.value === 'dark' ? THEME_BG_DARK : THEME_BG_LIGHT
  sceneSettings.value.themeMode = themeMode.value
  sceneSettings.value.backgroundColor = bgHex
  try {
    localStorage.setItem(THEME_PREF_KEY, themeMode.value)
  } catch {}
  applySceneSettings()
}

function onUpdateFloor(patch) {
  sceneSettings.value.floor = { ...sceneSettings.value.floor, ...patch }
  isDirty.value = true
  applySceneSettings()
}

function onUpdateLighting(patch) {
  sceneSettings.value.lighting = { ...sceneSettings.value.lighting, ...patch }
  isDirty.value = true
  applySceneSettings()
}

function rebuildVenueFloorGeometry() {
  if (!scene) return
  const floorThickness = 0.08
  if (floorMesh) {
    floorMesh.geometry?.dispose?.()
    floorMesh.material?.dispose?.()
    floorMesh.geometry = new THREE.BoxGeometry(venueW.value, floorThickness, venueD.value)
    floorMesh.material = buildStandardMaterial(sceneSettings.value.floor, venueW.value / 2, venueD.value / 2)
    floorMesh.position.y = -floorThickness / 2
  }
  if (borderLine) {
    borderLine.geometry?.dispose?.()
    borderLine.geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(venueW.value, 0.02, venueD.value))
  }
  if (gridHelper) {
    scene.remove(gridHelper)
    gridHelper.geometry?.dispose?.()
    gridHelper.material?.dispose?.()
    gridHelper = createRectangularGrid(venueW.value, venueD.value, 1, 0xcf2c2f, 0xcbd5e1)
    gridHelper.position.y = 0.005
    gridHelper.visible = showGrid.value
    scene.add(gridHelper)
  }
  if (controls) {
    controls.maxDistance = Math.max(45, Math.max(venueW.value, venueD.value) * 3.5)
  }
}

async function onUpdateVenueSize({ panjang_venue, lebar_venue }) {
  const proyekId = proyek.value?.id
  if (!proyekId || updatingVenue.value) return
  updatingVenue.value = true
  errorSimpan.value = ''
  try {
    const res = await fetch(`${API}/proyek/${proyekId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth.authHeader() },
      body: JSON.stringify({ panjang_venue, lebar_venue }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.pesan || 'Gagal memperbarui ukuran venue.')

    const updated = body.data || { ...proyek.value, panjang_venue, lebar_venue }
    if (dataRancangan.value) {
      if (dataRancangan.value.proyek) dataRancangan.value.proyek = { ...dataRancangan.value.proyek, ...updated }
      if (dataRancangan.value.Project) dataRancangan.value.Project = { ...dataRancangan.value.Project, ...updated }
      if (!dataRancangan.value.proyek && !dataRancangan.value.Project) dataRancangan.value.proyek = updated
    }
    rebuildVenueFloorGeometry()
    await rebuildDynamicObjects()
    pesanSukses.value = `Ukuran venue diperbarui menjadi ${panjang_venue}m × ${lebar_venue}m & tersinkron ke Proyek Saya!`
    setTimeout(() => { pesanSukses.value = '' }, 3500)
  } catch (err) {
    errorSimpan.value = err.message || 'Gagal memperbarui ukuran venue.'
  } finally {
    updatingVenue.value = false
  }
}

function onSetQuality(q) {
  sceneSettings.value.quality = q
  isDirty.value = true
  applySceneSettings()
}

// Save entire 3D Scene (atomic transaction + ID sync)
async function simpanScene3D() {
  if (!rancangan.value?.id || menyimpan.value) return
  menyimpan.value = true
  errorSimpan.value = ''
  pesanSukses.value = ''
  try {
    const payload = {
      scene_3d_settings: sceneSettings.value,
      items: items.value.map((i) => ({
        id: typeof i.id === 'number' ? i.id : undefined,
        decoration_id: i.decoration_id,
        posisi_x: Math.round(i.posisi_x),
        posisi_y: Math.round(i.posisi_y),
        rotasi: Math.round(i.rotasi || 0),
        jumlah: Math.max(1, parseInt(i.jumlah || 1, 10)),
        transform_3d: i.transform_3d || null,
      })),
      elements: elements.value.map((e, idx) => ({
        id: typeof e.id === 'number' ? e.id : undefined,
        temp_id: String(e.id),
        parent_id: e.parent_id !== undefined ? e.parent_id : null,
        element_type: e.element_type,
        name: e.name,
        geometry_data: e.geometry_data || null,
        position_data: e.position_data || null,
        rotation_data: e.rotation_data || null,
        scale_data: e.scale_data || null,
        material_data: e.material_data || null,
        is_visible: e.is_visible !== false,
        is_locked: Boolean(e.is_locked),
        sort_order: idx,
      })),
    }

    const res = await fetch(`${API}/rancangan/${rancangan.value.id}/scene3d`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth.authHeader() },
      body: JSON.stringify(payload),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.pesan || 'Gagal menyimpan scene 3D.')

    const d = body.data
    dataRancangan.value = d
    items.value = (d.DesignItems || []).map((di) => ({
      id: di.id,
      decoration_id: di.decoration_id,
      posisi_x: Number(di.posisi_x || 0),
      posisi_y: Number(di.posisi_y || 0),
      rotasi: Number(di.rotasi || 0),
      jumlah: Math.max(1, Number(di.jumlah || 1)),
      transform_3d: di.transform_3d || { elevationY: 0, rotX: 0, rotZ: 0, scaleX: 1, scaleY: 1, scaleZ: 1, isVisible: true, isLocked: false },
      Decoration: di.Decoration || {},
    }))
    elements.value = (d.Design3DElements || []).map((el) => ({ ...el }))
    selectedRef.value = null
    isDirty.value = false
    await rebuildDynamicObjects()
    pesanSukses.value = 'Scene 3D berhasil disimpan & disinkronkan dengan Workspace 2D!'
    setTimeout(() => { pesanSukses.value = '' }, 3500)
  } catch (err) {
    errorSimpan.value = err.message || 'Gagal menyimpan scene 3D.'
  } finally {
    menyimpan.value = false
  }
}

async function onAiApplied3D(fresh) {
  if (!fresh) return
  dataRancangan.value = fresh
  items.value = (fresh.DesignItems || []).map((di) => ({
    id: di.id,
    decoration_id: di.decoration_id,
    posisi_x: Number(di.posisi_x || 0),
    posisi_y: Number(di.posisi_y || 0),
    rotasi: Number(di.rotasi || 0),
    jumlah: Math.max(1, Number(di.jumlah || 1)),
    transform_3d: di.transform_3d || { elevationY: 0, rotX: 0, rotZ: 0, scaleX: 1, scaleY: 1, scaleZ: 1, isVisible: true, isLocked: false },
    Decoration: di.Decoration || {},
  }))
  await rebuildDynamicObjects()
  pesanSukses.value = 'Aksi AI Workspace 3D diterapkan!'
  setTimeout(() => { pesanSukses.value = '' }, 3000)
}

// Camera Presets
function resetCameraPosition() {
  if (!controls || !camera) return
  activeViewPreset.value = 'perspective'
  const maxDim = Math.max(venueW.value, venueD.value)
  controls.target.set(0, 0, 0)
  camera.up.set(0, 1, 0)
  camera.position.set(0, maxDim * 1.05, maxDim * 1.25)
  controls.update()
}
function setPresetPerspektif() { resetCameraPosition() }
function setPresetTampakAtas() {
  if (!controls || !camera) return
  activeViewPreset.value = 'top'
  const maxDim = Math.max(venueW.value, venueD.value)
  controls.target.set(0, 0, 0)
  camera.up.set(0, 1, 0) // Pertahankan orientasi Y-up agar orbit tidak pernah miring/roll
  camera.position.set(0, maxDim * 1.45, 0.35)
  controls.update()
}
function toggleTopView() {
  if (activeViewPreset.value === 'top') {
    resetCameraPosition()
  } else {
    setPresetTampakAtas()
  }
}
function toggleGrid() {
  showGrid.value = !showGrid.value
  if (gridHelper) gridHelper.visible = showGrid.value
}
function onWindowResize() {
  if (!canvasContainer.value || !camera || !renderer) return
  const w = canvasContainer.value.clientWidth
  const h = canvasContainer.value.clientHeight
  if (w <= 0 || h <= 0) return
  if (w === lastCanvasWidth && h === lastCanvasHeight) return
  lastCanvasWidth = w
  lastCanvasHeight = h
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
  // Render sinkron segera setelah setSize agar WebGL drawing buffer tidak pernah kosong (cegah flicker)
  if (scene) {
    renderer.render(scene, camera)
  }
}

// Keyboard Shortcuts
function onKeyDown(e) {
  const tag = e.target?.tagName?.toLowerCase()
  const isTyping = ['input', 'textarea', 'select'].includes(tag)
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    simpanScene3D()
    return
  }
  if (isTyping) return
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); onDuplicateSelected(); return }
  if (e.key === 'Enter' && activeTool.value === 'wall') { finishWallChain(); activeTool.value = 'select'; return }
  if (e.key === 'Escape') { finishWallChain(); activeTool.value = 'select'; selectedRef.value = null; applySelectionVisual(null); return }
  if (e.key === 'Delete' || e.key === 'Backspace') { if (selectedRef.value) { e.preventDefault(); onDeleteSelected() } return }
  if (e.key.toLowerCase() === 'w') setTool('translate')
  if (e.key.toLowerCase() === 'e') setTool('rotate')
  if (e.key.toLowerCase() === 'r') setTool('scale')
  if (e.key.toLowerCase() === 's') onSnapFloor()
}

function handleKembali() {
  router.push(`/proyek/${proyek.value?.id || ''}`)
}

// Modal Peringatan Keluar Workspace (bertema WedSpace, menggantikan window.confirm)
const modalKeluar = ref(false)
const pesanModalKeluar = ref('')
const sedangSimpanKeluar = ref(false)
let resolveLeaveGuard = null

onBeforeRouteLeave((to) => {
  if (!isDirty.value) return true
  const menujuEstimasi = to.path.endsWith('/estimasi')
  pesanModalKeluar.value = menujuEstimasi
    ? 'Ada perubahan Workspace 3D yang belum disimpan. Estimasi biaya hanya menghitung rancangan yang sudah tersimpan.'
    : 'Ada perubahan pada rancangan Workspace 3D yang belum disimpan. Jika keluar sekarang, perubahan tersebut akan hilang.'
  modalKeluar.value = true
  return new Promise((resolve) => {
    resolveLeaveGuard = resolve
  })
})

function batalKeluar() {
  modalKeluar.value = false
  if (resolveLeaveGuard) {
    resolveLeaveGuard(false)
    resolveLeaveGuard = null
  }
}

function konfirmasiKeluarTanpaSimpan() {
  modalKeluar.value = false
  isDirty.value = false
  if (resolveLeaveGuard) {
    resolveLeaveGuard(true)
    resolveLeaveGuard = null
  }
}

async function simpanDanKeluar() {
  sedangSimpanKeluar.value = true
  try {
    await simpanScene3D()
    if (!isDirty.value) {
      modalKeluar.value = false
      if (resolveLeaveGuard) {
        resolveLeaveGuard(true)
        resolveLeaveGuard = null
      }
    }
  } finally {
    sedangSimpanKeluar.value = false
  }
}

function onBeforeUnload(e) {
  if (isDirty.value) { e.preventDefault(); e.returnValue = '' }
}

function cleanupThreeScene() {
  if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null }
  if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null }
  window.removeEventListener('resize', onWindowResize)
  if (renderer?.domElement) {
    renderer.domElement.removeEventListener('pointerdown', onViewportPointerDown)
    renderer.domElement.removeEventListener('pointermove', onViewportPointerMove)
    renderer.domElement.removeEventListener('pointerup', onViewportPointerUp)
    renderer.domElement.removeEventListener('dblclick', onViewportDblClick)
  }
  transformControls?.dispose?.()
  controls?.dispose?.()
  if (envRenderTarget) {
    envRenderTarget.dispose()
    envRenderTarget = null
  }
  if (scene) {
    scene.traverse((o) => {
      o.geometry?.dispose?.()
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose())
        else o.material.dispose()
      }
    })
  }
  if (renderer) {
    renderer.dispose()
    renderer.forceContextLoss()
    renderer.domElement?.parentElement?.removeChild(renderer.domElement)
    renderer = null
  }
  interactiveMeshes.length = 0
  objectGroupMap.clear()
  gltfCache.clear()
}

onMounted(() => {
  muatScene3D()
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('beforeunload', onBeforeUnload)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('beforeunload', onBeforeUnload)
  cleanupThreeScene()
})
</script>

<template>
  <section
    class="ws3d-root relative h-screen w-screen overflow-hidden transition-colors duration-200"
    :class="isDarkMode ? 'ws3d-dark bg-[#3E3E4A] text-slate-100' : 'bg-[#BABAB5] text-slate-800'"
  >
    <!-- Error Loading -->
    <div v-if="error" class="flex h-full w-full items-center justify-center p-6 text-center">
      <div class="max-w-md rounded-2xl border border-slate-200/80 bg-white/95 p-8 shadow-[0_8px_28px_rgba(15,23,42,0.09)] backdrop-blur-md">
        <i class="fa-solid fa-circle-exclamation text-3xl text-[#CF2C2F]"></i>
        <h2 class="mt-3 text-lg font-bold text-slate-900">Gagal Memuat Workspace 3D</h2>
        <p class="mt-1 text-xs text-slate-500">{{ error }}</p>
        <button type="button" class="mt-5 rounded-xl bg-[#CF2C2F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B82225] transition" @click="muatScene3D">Coba Lagi</button>
      </div>
    </div>

    <!-- Full-Viewport 3D WebGL Canvas (stabil, tidak berubah ukuran saat panel dibuka/ditutup) -->
    <main
      v-else
      class="absolute inset-0 z-0 h-full w-full overflow-hidden"
      :class="isDarkMode ? 'bg-[#3E3E4A]' : 'bg-[#BABAB5]'"
    >
      <div ref="canvasContainer" class="h-full w-full" :class="activeTool === 'wall' ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'"></div>

      <!-- Loading Overlay -->
      <div
        v-if="memuat"
        class="absolute inset-0 z-40 flex flex-col items-center justify-center backdrop-blur-xs"
        :class="isDarkMode ? 'bg-[#23242E]/90' : 'bg-white/85'"
      >
        <i class="fa-solid fa-circle-notch fa-spin text-3xl text-[#CF2C2F]"></i>
        <p class="mt-3 text-sm font-semibold" :class="isDarkMode ? 'text-slate-100' : 'text-slate-800'">Menyiapkan Workspace 3D…</p>
      </div>
    </main>

    <!-- Floating Top Studio Toolbar + Floating Banners & Drawing HUD -->
    <div class="pointer-events-none absolute inset-x-3.5 top-3.5 z-30 flex flex-col items-center gap-2">
      <TopToolbar3D
        :proyek="proyek"
        :rancangan="rancangan"
        :active-tool="activeTool"
        :can-undo="canUndo"
        :can-redo="canRedo"
        :is-dirty="isDirty"
        :is-saving="menyimpan"
        :show-grid="showGrid"
        :active-view-preset="activeViewPreset"
        :note-count="notes.length"
        :active-right-drawer="activeRightDrawer"
        :left-open="leftPanelOpen"
        :theme-mode="themeMode"
        @kembali="handleKembali"
        @simpan="simpanScene3D"
        @undo="undo"
        @redo="redo"
        @set-tool="setTool"
        @toggle-top-view="toggleTopView"
        @reset-camera="resetCameraPosition"
        @toggle-grid="toggleGrid"
        @toggle-left="toggleLeftPanel"
        @toggle-right="toggleRightPanel"
        @toggle-drawer="toggleRightDrawer"
        @toggle-theme="toggleThemeMode"
      />

      <!-- Floating Status Banners -->
      <div
        v-if="pesanSukses"
        class="pointer-events-auto flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/95 px-4 py-1.5 text-xs font-medium text-emerald-700 shadow-[0_6px_20px_rgba(15,23,42,0.08)] backdrop-blur-md"
      >
        <i class="fa-solid fa-circle-check"></i><span>{{ pesanSukses }}</span>
      </div>
      <div
        v-if="errorSimpan"
        class="pointer-events-auto flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50/95 px-4 py-1.5 text-xs font-medium text-rose-700 shadow-[0_6px_20px_rgba(15,23,42,0.08)] backdrop-blur-md"
      >
        <i class="fa-solid fa-circle-exclamation"></i><span>{{ errorSimpan }}</span>
        <button type="button" class="ml-1 rounded-full border border-rose-300 bg-white px-2 py-0.5 text-[0.6875rem] hover:bg-rose-50 transition" @click="errorSimpan = ''">Tutup</button>
      </div>

      <!-- Active Wall Drawing HUD -->
      <div
        v-if="!error && activeTool === 'wall'"
        class="pointer-events-none flex items-center gap-2 rounded-full border border-red-200 bg-white/95 px-4 py-1.5 text-xs font-semibold text-[#7F1125] shadow-[0_6px_20px_rgba(15,23,42,0.08)] backdrop-blur-md"
      >
        <i class="fa-solid fa-pen-ruler text-[#CF2C2F]"></i>
        <span v-if="wallChainPoints.length === 0">Klik titik awal pada lantai untuk mulai menggambar tembok</span>
        <span v-else>Panjang ruas: <strong class="font-mono">{{ wallDraftLengthM }} m</strong> • Klik lanjut • Enter / Klik Ganda selesai</span>
      </div>

      <!-- Active Door / Window HUD -->
      <div
        v-else-if="!error && (activeTool === 'door' || activeTool === 'window')"
        class="pointer-events-none flex items-center gap-2 rounded-full border border-red-200 bg-white/95 px-4 py-1.5 text-xs font-semibold text-[#7F1125] shadow-[0_6px_20px_rgba(15,23,42,0.08)] backdrop-blur-md"
      >
        <i :class="['fa-solid text-[#CF2C2F]', activeTool === 'door' ? 'fa-door-open' : 'fa-window-maximize']"></i>
        <span>Klik pada salah satu tembok 3D untuk memasang {{ activeTool === 'door' ? 'pintu' : 'jendela' }}</span>
      </div>
    </div>

    <!-- Floating Toggle Button: Buka Panel Kiri (ikon panah saja, tanpa teks "Panel") -->
    <button
      v-if="!error"
      v-show="!leftPanelOpen"
      type="button"
      class="absolute left-3.5 top-[4.625rem] z-20 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/80 bg-[#F7F7F8]/95 text-slate-600 shadow-[0_6px_20px_rgba(15,23,42,0.09)] ring-1 ring-slate-200/80 backdrop-blur-md hover:bg-white hover:text-[#CF2C2F] active:scale-95 transition"
      title="Buka Panel Kiri (Struktur, Aset & Tampilan)"
      aria-label="Buka Panel Kiri"
      @click="toggleLeftPanel"
    >
      <i class="fa-solid fa-chevron-right text-xs"></i>
    </button>

    <!-- Floating Left Panel: Struktur, Aset & Tampilan (tetap mounted agar tidak fetch ulang / merusak state) -->
    <div
      v-if="!error"
      class="absolute top-[4.625rem] bottom-[3.25rem] left-3.5 z-20 w-[16.5rem] max-w-[calc(100vw-1.75rem)] xl:w-[17.5rem] transition-[transform,opacity] duration-200 ease-out will-change-transform"
      :class="leftPanelOpen ? 'translate-x-0 opacity-100 pointer-events-auto' : '-translate-x-[calc(100%+1.5rem)] opacity-0 pointer-events-none'"
    >
      <LeftPanel3D
        :active-tool="activeTool"
        :scene-settings="sceneSettings"
        :has-ceiling="hasCeiling"
        @add-decoration="onAddDecoration"
        @set-tool="setTool"
        @add-primitive="onAddPrimitive"
        @toggle-ceiling="onToggleCeiling"
        @update-floor="onUpdateFloor"
        @update-lighting="onUpdateLighting"
        @set-quality="onSetQuality"
        @tutup="leftPanelOpen = false"
      />
    </div>

    <!-- Floating Toggle Button: Buka Panel Kanan (ikon panah saja, tanpa teks "Panel") -->
    <button
      v-if="!error"
      v-show="!rightPanelOpen && !activeRightDrawer"
      type="button"
      class="absolute right-3.5 top-[4.625rem] z-20 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/80 bg-[#F7F7F8]/95 text-slate-600 shadow-[0_6px_20px_rgba(15,23,42,0.09)] ring-1 ring-slate-200/80 backdrop-blur-md hover:bg-white hover:text-[#CF2C2F] active:scale-95 transition"
      title="Buka Panel Kanan (Properti & Lapisan)"
      aria-label="Buka Panel Kanan"
      @click="toggleRightPanel"
    >
      <i class="fa-solid fa-chevron-left text-xs"></i>
    </button>

    <!-- Floating Right Panel: Daftar Objek & Properti OR Catatan / AI Drawer -->
    <div
      v-if="!error"
      class="absolute top-[4.625rem] bottom-[3.25rem] right-3.5 z-20 w-[16.5rem] max-w-[calc(100vw-1.75rem)] xl:w-[17.5rem] transition-[transform,opacity] duration-200 ease-out will-change-transform"
      :class="(rightPanelOpen || activeRightDrawer) ? 'translate-x-0 opacity-100 pointer-events-auto' : 'translate-x-[calc(100%+1.5rem)] opacity-0 pointer-events-none'"
    >
      <div
        v-if="activeRightDrawer === 'notes' && rancangan?.id"
        class="ws3d-drawer-themed h-full overflow-hidden rounded-2xl border border-white/80 bg-[#F7F7F8]/95 shadow-[0_8px_28px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80 backdrop-blur-md"
      >
        <NotesPanel
          :design-id="rancangan.id"
          :notes="notes"
          :panjang-venue="venueW"
          :lebar-venue="venueD"
          :dark-mode="isDarkMode"
          @updated="notes = $event; rebuildDynamicObjects()"
          @tutup="activeRightDrawer = null"
        />
      </div>
      <div
        v-else-if="activeRightDrawer === 'ai' && rancangan?.id"
        class="ws3d-drawer-themed h-full overflow-hidden rounded-2xl border border-white/80 bg-[#F7F7F8]/95 shadow-[0_8px_28px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80 backdrop-blur-md"
      >
        <AiWorkspacePanel
          :design-id="rancangan.id"
          mode="3d"
          @applied="onAiApplied3D"
          @tutup="activeRightDrawer = null"
        />
      </div>
      <RightPanel3D
        v-else
        :items="items"
        :elements="elements"
        :selected-ref="selectedRef"
        :proyek="proyek"
        :venue-w="venueW"
        :venue-d="venueD"
        :updating-venue="updatingVenue"
        @select="selectedRef = $event; applySelectionVisual($event)"
        @update-item="onUpdateItem"
        @update-element="onUpdateElement"
        @update-venue-size="onUpdateVenueSize"
        @apply-all-walls="onApplyAllWalls"
        @snap-floor="onSnapFloor"
        @mirror-item="onMirrorItem"
        @duplicate-selected="onDuplicateSelected"
        @delete-selected="onDeleteSelected"
        @toggle-visibility="onToggleVisibility"
        @toggle-lock="onToggleLock"
        @tutup="rightPanelOpen = false"
      />
    </div>

    <!-- Selected Note Popover (Floating di atas status bar) -->
    <div
      v-if="!error && selectedNote"
      class="absolute bottom-14 left-1/2 -translate-x-1/2 z-20 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-300/80 p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.12)] backdrop-blur-md text-xs"
      :style="getSelectedNotePopoverStyle(selectedNote).card"
    >
      <div class="flex items-center justify-between gap-2">
        <strong class="text-slate-900" :style="getSelectedNotePopoverStyle(selectedNote).title">{{ selectedNote.judul }}</strong>
        <button
          type="button"
          class="text-[#4A192C] hover:text-[#2A111A] transition"
          title="Tutup"
          @click="selectedNote = null"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <p class="mt-1 text-xs text-slate-700" :style="getSelectedNotePopoverStyle(selectedNote).body">{{ selectedNote.isi }}</p>
    </div>

    <!-- Floating Bottom Status Bar (Minimalis & Tidak Menempel Tepi) -->
    <footer v-if="!error" class="pointer-events-none absolute inset-x-3.5 bottom-3 z-20 flex justify-center">
      <div class="pointer-events-auto flex max-w-full items-center gap-2.5 sm:gap-3 rounded-full border border-slate-200/80 bg-white/90 px-3.5 py-1.5 text-[0.6875rem] text-slate-600 shadow-[0_4px_16px_rgba(15,23,42,0.07)] backdrop-blur-md select-none">
        <span class="font-semibold text-slate-700 whitespace-nowrap">Venue {{ venueW }}m × {{ venueD }}m</span>
        <span class="hidden sm:inline text-slate-300">•</span>
        <span class="hidden sm:inline whitespace-nowrap">{{ elements.filter((e) => e.element_type === 'wall').length }} tembok, {{ items.length }} dekorasi</span>
        <span class="hidden lg:inline text-slate-300">•</span>
        <span class="hidden lg:inline text-slate-400 whitespace-nowrap">
          Pan: Klik Kiri • Orbit: Klik Kanan • Zoom: Scroll • Gizmo: W/E/R
        </span>
        <span class="hidden sm:inline text-slate-300">•</span>
        <span class="hidden sm:inline font-semibold text-slate-500 whitespace-nowrap">
          {{ sceneSettings.quality === 'high' ? 'Tinggi' : sceneSettings.quality === 'medium' ? 'Sedang' : 'Rendah' }}
        </span>
      </div>
    </footer>

    <!-- Modal Peringatan Keluar Workspace (Tema WedSpace: Stripe Pink + Scallop Border) -->
    <UnsavedLeaveModal
      :tampil="modalKeluar"
      judul="Simpan Perubahan Dulu?"
      :pesan="pesanModalKeluar"
      label-workspace="Workspace 3D"
      :menyimpan="sedangSimpanKeluar || menyimpan"
      @batal="batalKeluar"
      @keluar="konfirmasiKeluarTanpaSimpan"
      @simpan-keluar="simpanDanKeluar"
    />
  </section>
</template>

<style>
/* Dark Mode menyeluruh untuk seluruh halaman Workspace 3D */
.ws3d-dark header > button,
.ws3d-dark header > div,
.ws3d-dark aside,
.ws3d-dark footer > div,
.ws3d-dark button[aria-label="Buka Panel Kiri"],
.ws3d-dark button[aria-label="Buka Panel Kanan"] {
  background-color: rgba(34, 35, 45, 0.94) !important;
  border-color: rgba(82, 85, 108, 0.7) !important;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.36) !important;
  --tw-ring-color: rgba(82, 85, 108, 0.65) !important;
}

.ws3d-dark .bg-white,
.ws3d-dark .bg-white\/95,
.ws3d-dark .bg-white\/90 {
  background-color: #2B2D3A !important;
}

.ws3d-dark .bg-slate-50,
.ws3d-dark .bg-slate-50\/80,
.ws3d-dark .bg-slate-50\/40,
.ws3d-dark .bg-slate-100 {
  background-color: #232531 !important;
}

.ws3d-dark .bg-slate-200\/60 {
  background-color: #1B1C25 !important;
}

.ws3d-dark .bg-slate-300\/80 {
  background-color: rgba(100, 104, 130, 0.55) !important;
}

.ws3d-dark .bg-red-50,
.ws3d-dark .bg-red-50\/60 {
  background-color: rgba(207, 44, 47, 0.18) !important;
}

.ws3d-dark .border-slate-200,
.ws3d-dark .border-slate-200\/80,
.ws3d-dark .border-slate-100,
.ws3d-dark .border-white\/80 {
  border-color: rgba(82, 85, 108, 0.6) !important;
}

.ws3d-dark .border-red-200 {
  border-color: rgba(207, 44, 47, 0.5) !important;
}

.ws3d-dark .text-slate-900,
.ws3d-dark .text-slate-800 {
  color: #F1F5F9 !important;
}

.ws3d-dark .text-slate-700,
.ws3d-dark .text-slate-600 {
  color: #CBD5E1 !important;
}

.ws3d-dark .text-slate-500,
.ws3d-dark .text-slate-400 {
  color: #94A3B8 !important;
}

.ws3d-dark .text-slate-300 {
  color: #64748B !important;
}

.ws3d-dark .text-\[\#7F1125\] {
  color: #FDA4AF !important;
}

.ws3d-dark .text-emerald-700 {
  color: #6EE7B7 !important;
}

.ws3d-dark header button:not(.bg-\[\#CF2C2F\]):not(.ws3d-theme-switch):hover,
.ws3d-dark header a:not(.bg-\[\#CF2C2F\]):hover {
  background-color: #343647 !important;
  color: #F8FAFC !important;
}

.ws3d-dark aside button:not(.bg-\[\#CF2C2F\]):hover {
  background-color: #343647 !important;
}

.ws3d-dark input[type="text"],
.ws3d-dark input[type="number"],
.ws3d-dark input[type="search"],
.ws3d-dark textarea {
  background-color: #1B1C25 !important;
  border-color: rgba(92, 96, 122, 0.7) !important;
  color: #F1F5F9 !important;
}

.ws3d-dark input::placeholder,
.ws3d-dark textarea::placeholder {
  color: #64748B !important;
}

/* Pertahankan knob putih pada switch tema & tombol merah utama WedSpace */
.ws3d-dark .ws3d-theme-switch .bg-white {
  background-color: #FFFFFF !important;
}

.ws3d-dark .bg-\[\#CF2C2F\] {
  background-color: #CF2C2F !important;
  color: #FFFFFF !important;
}

/* Tema Dark Mode Khusus Catatan WO & Asisten AI Workspace (mengikuti referensi dark wine-plum WedSpace) */
.ws3d-dark .ws3d-drawer-themed {
  background-color: #170D11 !important;
  border-color: #7F1125 !important;
  --tw-ring-color: rgba(127, 17, 37, 0.7) !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5) !important;
}

.ws3d-dark .ws3d-drawer-themed aside {
  background-color: #170D11 !important;
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.ws3d-dark .ws3d-drawer-themed .bg-stripes-violet,
.ws3d-dark .ws3d-drawer-themed .bg-stripes-pink {
  background: repeating-linear-gradient(
    90deg,
    #170D11 0px,
    #170D11 20px,
    #1D1226 20px,
    #1D1226 40px
  ) !important;
  border-bottom: 1.5px solid rgba(127, 17, 37, 0.75) !important;
}

.ws3d-dark .ws3d-drawer-themed .ws-eyebrow {
  color: #FFFFFF !important;
}

.ws3d-dark .ws3d-drawer-themed .bg-stripes-violet button,
.ws3d-dark .ws3d-drawer-themed .bg-stripes-pink button {
  background-color: #1D1226 !important;
  border-color: rgba(127, 17, 37, 0.85) !important;
  color: #F8FAFC !important;
}

.ws3d-dark .ws3d-drawer-themed .bg-stripes-violet button:hover,
.ws3d-dark .ws3d-drawer-themed .bg-stripes-pink button:hover {
  background-color: #2C1835 !important;
}

.ws3d-dark .ws3d-drawer-themed form.bg-marshmallow,
.ws3d-dark .ws3d-drawer-themed .bg-violet\/20,
.ws3d-dark .ws3d-drawer-themed div.bg-marshmallow {
  background-color: #20121A !important;
  border: 1.5px solid #7F1125 !important;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.45) !important;
  color: #E8D5DC !important;
}

.ws3d-dark .ws3d-drawer-themed .ws-input,
.ws3d-dark .ws3d-drawer-themed input[type="text"],
.ws3d-dark .ws3d-drawer-themed input[type="number"],
.ws3d-dark .ws3d-drawer-themed textarea {
  background-color: #2A1821 !important;
  border: 1.5px solid #592033 !important;
  color: #F8FAFC !important;
  box-shadow: none !important;
}

.ws3d-dark .ws3d-drawer-themed .ws-input:focus,
.ws3d-dark .ws3d-drawer-themed textarea:focus {
  background-color: #321C27 !important;
  border-color: #E03B4B !important;
  box-shadow: 0 0 0 2px rgba(224, 59, 75, 0.25) !important;
}

.ws3d-dark .ws3d-drawer-themed .ws-input::placeholder,
.ws3d-dark .ws3d-drawer-themed textarea::placeholder {
  color: #9A7885 !important;
}

.ws3d-dark .ws3d-drawer-themed :not(.ws-note-card) > .text-licorice,
.ws3d-dark .ws3d-drawer-themed form .text-licorice,
.ws3d-dark .ws3d-drawer-themed > aside > div > .text-licorice {
  color: #F8FAFC !important;
}

.ws3d-dark .ws3d-drawer-themed .text-muted {
  color: #F47280 !important;
}

.ws3d-dark .ws3d-drawer-themed :not(.ws-note-card) > .text-cherry,
.ws3d-dark .ws3d-drawer-themed form .text-cherry {
  color: #F04B5A !important;
}

.ws3d-dark .ws3d-drawer-themed .border-dashed {
  background-color: #1C0F15 !important;
  border-color: rgba(127, 17, 37, 0.65) !important;
  color: #C7B0B9 !important;
}

.ws3d-dark .ws3d-drawer-themed .ws-btn-cherry {
  background-color: #E03B4B !important;
  border-color: #9E1F32 !important;
  color: #FFFFFF !important;
  box-shadow: 0 3px 0 #8A182A !important;
}

.ws3d-dark .ws3d-drawer-themed .ws-btn-cherry:hover:not(:disabled) {
  background-color: #EB4959 !important;
}

.ws3d-dark .ws3d-drawer-themed button.bg-marshmallow {
  background-color: #2A1821 !important;
  border-color: rgba(127, 17, 37, 0.75) !important;
  color: #F1DCE4 !important;
}

.ws3d-dark .ws3d-drawer-themed button.bg-marshmallow:hover:not(:disabled) {
  background-color: #381F2C !important;
  border-color: #E03B4B !important;
}

/* Pastikan teks pada kartu catatan pastel selalu gelap & kontras tinggi di dark mode */
.ws3d-dark .ws3d-drawer-themed .ws-note-card .ws-note-title {
  color: #2A111A !important;
}

.ws3d-dark .ws3d-drawer-themed .ws-note-card .ws-note-body {
  color: #3F1D2B !important;
}

.ws3d-dark .ws3d-drawer-themed .ws-note-card .ws-note-pin,
.ws3d-dark .ws3d-drawer-themed .ws-note-card .ws-note-delete,
.ws3d-dark .ws3d-drawer-themed .ws-note-card .ws-note-delete:hover {
  color: #9F1239 !important;
  background-color: transparent !important;
}

.ws3d-dark .ws3d-drawer-themed .bg-paper {
  background-color: #2A1821 !important;
  border-color: rgba(127, 17, 37, 0.6) !important;
}

/* Custom slim pill-only scrollbar (tanpa panah atas/bawah/kiri/kanan) untuk panel kiri, kanan, & bar atas */
.ws3d-root *::-webkit-scrollbar {
  width: 5px;
  height: 4px;
}

.ws3d-root header *::-webkit-scrollbar {
  height: 3px;
}

.ws3d-root *::-webkit-scrollbar-button,
.ws3d-root *::-webkit-scrollbar-button:single-button,
.ws3d-root *::-webkit-scrollbar-button:start:decrement,
.ws3d-root *::-webkit-scrollbar-button:end:increment {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}

.ws3d-root *::-webkit-scrollbar-track {
  background: transparent;
  margin: 6px 0;
}

.ws3d-root header *::-webkit-scrollbar-track {
  margin: 0 14px;
}

.ws3d-root *::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.45);
  border-radius: 9999px;
}

.ws3d-root *::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.72);
}

.ws3d-root *::-webkit-scrollbar-corner {
  background: transparent;
}

.ws3d-dark *::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.30);
}

.ws3d-dark *::-webkit-scrollbar-thumb:hover {
  background: rgba(203, 213, 225, 0.56);
}

.ws3d-dark .ws3d-drawer-themed *::-webkit-scrollbar-thumb {
  background: rgba(244, 114, 128, 0.35);
}

.ws3d-dark .ws3d-drawer-themed *::-webkit-scrollbar-thumb:hover {
  background: rgba(244, 114, 128, 0.62);
}

@supports not selector(::-webkit-scrollbar) {
  .ws3d-root * {
    scrollbar-width: thin;
    scrollbar-color: rgba(148, 163, 184, 0.45) transparent;
  }
  .ws3d-dark * {
    scrollbar-color: rgba(148, 163, 184, 0.30) transparent;
  }
}
</style>
