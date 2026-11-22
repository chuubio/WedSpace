<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { useAuthStore } from '../stores/auth'
import VintageOrnament from '../components/VintageOrnament.vue'
import { generateProceduralAsset } from '../utils/proceduralAssets'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const API = 'http://localhost:3000/api'
const API_BASE = 'http://localhost:3000'

// State
const memuat = ref(true)
const statusMuat = ref('Mengambil data rancangan...')
const error = ref('')
const errorStatus = ref(null)
const dataRancangan = ref(null)

// 3D Scene Refs
const canvasContainer = ref(null)
const selectedItemId = ref(null)
const isAutoRotating = ref(false)
const showGrid = ref(true)
const activeViewPreset = ref('perspective') // 'perspective' | 'top'
const assetFallbackCount = ref(0)
const totalAssetCount = ref(0)
const loadedAssetCount = ref(0)

// Three.js internal objects (non-reactive to avoid Vue proxy overhead)
let renderer = null
let scene = null
let camera = null
let controls = null
let animationFrameId = null
let floorMesh = null
let gridHelper = null
let venueBorder = null
let highlightHelper = null
let raycaster = null
let pointerDownPos = { x: 0, y: 0 }
const interactiveMeshes = [] // { mesh, item, group }
const gltfCache = new Map() // url -> cloned template

const rancangan = computed(() => dataRancangan.value || {})
const proyek = computed(() => dataRancangan.value?.proyek || {})
const designItems = computed(() => dataRancangan.value?.DesignItems || [])
const venuePanjangCm = computed(() => Number(proyek.value?.panjang_venue || 1500))
const venueLebarCm = computed(() => Number(proyek.value?.lebar_venue || 1000))
const venuePanjangM = computed(() => (venuePanjangCm.value / 100).toFixed(1))
const venueLebarM = computed(() => (venueLebarCm.value / 100).toFixed(1))

const selectedItem = computed(() => {
  if (!selectedItemId.value) return null
  return designItems.value.find((i) => i.id === selectedItemId.value) || null
})

/**
 * Mengambil data rancangan dan proyek dari API backend
 */
async function muatDataRancangan() {
  memuat.value = true
  error.value = ''
  errorStatus.value = null
  statusMuat.value = 'Mengambil data rancangan dari database...'

  try {
    const res = await fetch(`${API}/rancangan/${route.params.id}`, {
      headers: auth.authHeader(),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      errorStatus.value = res.status
      if (res.status === 404) throw new Error(body.pesan || 'Rancangan tidak ditemukan.')
      if (res.status === 403) throw new Error(body.pesan || 'Kamu tidak memiliki akses ke rancangan ini.')
      throw new Error(body.pesan || 'Gagal memuat rancangan.')
    }
    dataRancangan.value = body.data

    await nextTick()
    initThreeScene()
    await buildVenue3D()
  } catch (err) {
    error.value = err.message || 'Terjadi kesalahan saat memuat rancangan.'
  } finally {
    memuat.value = false
  }
}

/**
 * Inisialisasi Scene Three.js, Camera, Renderer, dan OrbitControls
 */
function initThreeScene() {
  if (!canvasContainer.value) return
  cleanupThreeScene()

  const container = canvasContainer.value
  const width = container.clientWidth || 800
  const height = container.clientHeight || 500

  // 1. Scene
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf6f0e8) // Marshmallow warm background
  scene.fog = new THREE.FogExp2(0xf6f0e8, 0.012)

  // 2. Camera
  const aspect = width / height
  camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000)

  // 3. Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  container.appendChild(renderer.domElement)

  // 4. OrbitControls
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.maxPolarAngle = Math.PI / 2 - 0.01 // Cegah kamera menembus lantai
  controls.minDistance = 2
  controls.maxDistance = 200

  // 5. Lighting
  const ambientLight = new THREE.AmbientLight(0xfff8ee, 0.85)
  scene.add(ambientLight)

  const hemisphereLight = new THREE.HemisphereLight(0xfffaed, 0xbfb6ab, 0.6)
  hemisphereLight.position.set(0, 50, 0)
  scene.add(hemisphereLight)

  const dirLight = new THREE.DirectionalLight(0xfffaea, 1.2)
  dirLight.position.set(25, 40, 20)
  dirLight.castShadow = true
  dirLight.shadow.mapSize.width = 2048
  dirLight.shadow.mapSize.height = 2048
  dirLight.shadow.camera.near = 1
  dirLight.shadow.camera.far = 120
  dirLight.shadow.camera.left = -30
  dirLight.shadow.camera.right = 30
  dirLight.shadow.camera.top = 30
  dirLight.shadow.camera.bottom = -30
  dirLight.shadow.bias = -0.0005
  scene.add(dirLight)

  // 6. Raycaster & Interaksi
  raycaster = new THREE.Raycaster()
  renderer.domElement.addEventListener('pointerdown', onPointerDown)
  renderer.domElement.addEventListener('pointerup', onPointerUp)
  window.addEventListener('resize', onWindowResize)

  // 7. Render Loop
  animate()
}

/**
 * Loop Animasi Three.js
 */
function animate() {
  animationFrameId = requestAnimationFrame(animate)
  if (controls) {
    if (isAutoRotating.value) {
      controls.autoRotate = true
      controls.autoRotateSpeed = 1.0
    } else {
      controls.autoRotate = false
    }
    controls.update()
  }
  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

/**
 * Membangun ruang venue fisik (lantai, batas dinding, grid, dan seluruh item 3D)
 */
async function buildVenue3D() {
  if (!scene) return

  // Bersihkan elemen interaktif sebelumnya
  interactiveMeshes.length = 0
  if (highlightHelper) {
    scene.remove(highlightHelper)
    highlightHelper.dispose?.()
    highlightHelper = null
  }

  // Ukuran venue dalam meter
  const venueW = Math.max(2, venuePanjangCm.value / 100)
  const venueD = Math.max(2, venueLebarCm.value / 100)

  // 1. Lantai Venue (Floor Plane)
  const floorGeo = new THREE.PlaneGeometry(venueW, venueD)
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xede4d8,
    roughness: 0.6,
    metalness: 0.05,
  })
  floorMesh = new THREE.Mesh(floorGeo, floorMat)
  floorMesh.rotation.x = -Math.PI / 2
  floorMesh.receiveShadow = true
  scene.add(floorMesh)

  // Sub-lantai alas pembeda sekitar venue
  const outerFloorGeo = new THREE.PlaneGeometry(venueW + 30, venueD + 30)
  const outerFloorMat = new THREE.MeshStandardMaterial({ color: 0xdfd6cb, roughness: 0.9 })
  const outerFloorMesh = new THREE.Mesh(outerFloorGeo, outerFloorMat)
  outerFloorMesh.rotation.x = -Math.PI / 2
  outerFloorMesh.position.y = -0.01
  outerFloorMesh.receiveShadow = true
  scene.add(outerFloorMesh)

  // 2. Grid Helper Venue
  const gridDivisions = Math.max(venueW, venueD)
  gridHelper = new THREE.GridHelper(Math.max(venueW, venueD), Math.round(gridDivisions), 0x7f1125, 0xb8aba0)
  gridHelper.position.y = 0.005
  gridHelper.visible = showGrid.value
  scene.add(gridHelper)

  // 3. Dinding Transparan & Garis Batas Venue (Perimeter Bounds)
  const wallHeight = 2.5
  const borderGeo = new THREE.BoxGeometry(venueW, wallHeight, venueD)
  const borderEdges = new THREE.EdgesGeometry(borderGeo)
  venueBorder = new THREE.LineSegments(borderEdges, new THREE.LineBasicMaterial({ color: 0x7f1125, linewidth: 2 }))
  venueBorder.position.y = wallHeight / 2
  scene.add(venueBorder)

  // 4. Set Initial Camera Position
  resetCameraPosition()

  // 5. Muat Seluruh Item Dekorasi
  const items = designItems.value
  totalAssetCount.value = items.length
  loadedAssetCount.value = 0
  assetFallbackCount.value = 0

  if (items.length === 0) {
    statusMuat.value = 'Rancangan belum memiliki dekorasi.'
    return
  }

  statusMuat.value = `Menyusun ${items.length} dekorasi ke ruang 3D...`
  const gltfLoader = new GLTFLoader()

  for (let index = 0; index < items.length; index++) {
    const item = items[index]
    const dekorasi = item.Decoration || {}
    const jumlah = Math.max(1, Number(item.jumlah || 1))

    // Dimensi dekorasi dalam meter
    const dimW = Math.max(0.1, Number(dekorasi.panjang || 100) / 100)
    const dimD = Math.max(0.1, Number(dekorasi.lebar || 100) / 100)
    const dimH = Math.max(0.1, Number(dekorasi.tinggi || 100) / 100)

    // Formula Pemetaan Koordinat Fisik Centimeter -> Tiga Dimensi Meter
    // (0,0) di 2D adalah pojok kiri-atas denah venue
    // (0,0,0) di 3D adalah titik pusat lantai venue
    const posX = -venueW / 2 + (Number(item.posisi_x || 0) / 100) + dimW / 2
    const posZ = -venueD / 2 + (Number(item.posisi_y || 0) / 100) + dimD / 2
    const posY = 0 // Lantai
    const rotY = -(Number(item.rotasi || 0) * Math.PI) / 180

    let assetGroup = null
    let usedFallback = false

    // Cascade 1: Platform 3D Library
    if (dekorasi.model_3d_source === 'library' && (dekorasi.Model3DLibrary?.file_path || dekorasi.model_3d)) {
      const fileUrl = dekorasi.Model3DLibrary?.file_path || dekorasi.model_3d
      const fullUrl = fileUrl.startsWith('http') ? fileUrl : `${API_BASE}${fileUrl}`
      try {
        assetGroup = await loadGltfModel(gltfLoader, fullUrl, dimW, dimH, dimD)
      } catch (e) {
        console.warn(`[WedSpace 3D] Gagal memuat library model: ${fullUrl}. Menggunakan procedural fallback.`, e)
        usedFallback = true
      }
    }

    // Cascade 2: WO Custom Uploaded Model
    else if (dekorasi.model_3d_source === 'upload' && dekorasi.model_3d) {
      let fileUrl = dekorasi.model_3d
      if (!fileUrl.startsWith('http')) fileUrl = `${API_BASE}${fileUrl}`
      // Sertakan token auth untuk proteksi file privat
      if (auth.token && !fileUrl.includes('token=')) {
        fileUrl += (fileUrl.includes('?') ? '&' : '?') + `token=${encodeURIComponent(auth.token)}`
      }
      try {
        assetGroup = await loadGltfModel(gltfLoader, fileUrl, dimW, dimH, dimD)
      } catch (e) {
        console.warn(`[WedSpace 3D] Gagal memuat uploaded model: ${fileUrl}. Menggunakan procedural fallback.`, e)
        usedFallback = true
      }
    }

    // Cascade 3: Procedural Generator (atau fallback kegagalan GLTF)
    if (!assetGroup || usedFallback) {
      assetGroup = generateProceduralAsset(dekorasi.kategori, dekorasi.panjang, dekorasi.lebar, dekorasi.tinggi)
      if (usedFallback) assetFallbackCount.value++
    }

    // Tambahkan properti metadata ke objek
    assetGroup.userData = {
      itemId: item.id,
      itemData: item,
      isFallback: usedFallback,
    }

    // Posisikan dan putar objek utama
    assetGroup.position.set(posX, posY, posZ)
    assetGroup.rotation.y = rotY
    scene.add(assetGroup)

    // Daftarkan semua mesh anak ke daftar raycaster interaktif
    registerInteractiveMeshes(assetGroup, item)

    // Jika jumlah > 1, buat penataan visual instance tambahan yang rapi
    if (jumlah > 1) {
      const extraCluster = createMultiCountVisual(assetGroup, jumlah, dimW, dimD)
      if (extraCluster) {
        extraCluster.position.set(posX, posY, posZ)
        extraCluster.rotation.y = rotY
        scene.add(extraCluster)
        registerInteractiveMeshes(extraCluster, item)
      }
    }

    loadedAssetCount.value++
  }
}

/**
 * Memuat dan menormalisasi ukuran model GLB/glTF ke dimensi fisik
 */
function loadGltfModel(loader, url, targetW, targetH, targetD) {
  return new Promise((resolve, reject) => {
    // Cek cache model template
    if (gltfCache.has(url)) {
      const cached = gltfCache.get(url)
      return resolve(cached.clone(true))
    }

    loader.load(
      url,
      (gltf) => {
        const root = gltf.scene || gltf.scenes[0]
        root.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true
            node.receiveShadow = true
          }
        })

        // Hitung bounding box awal model GLTF
        const box = new THREE.Box3().setFromObject(root)
        const size = new THREE.Vector3()
        box.getSize(size)
        const center = new THREE.Vector3()
        box.getCenter(center)

        // Wrapper Group untuk normalisasi posisi dan skala
        const wrapper = new THREE.Group()

        // Posisikan pivot model agar berada di titik tengah horizontal dan dasar di Y = 0
        root.position.x = -center.x
        root.position.y = -box.min.y
        root.position.z = -center.z
        wrapper.add(root)

        // Skala model sesuai dimensi fisik (targetW, targetH, targetD)
        const sx = size.x > 0 ? targetW / size.x : 1
        const sy = size.y > 0 ? targetH / size.y : 1
        const sz = size.z > 0 ? targetD / size.z : 1
        wrapper.scale.set(sx, sy, sz)

        // Simpan ke cache
        gltfCache.set(url, wrapper)
        resolve(wrapper.clone(true))
      },
      undefined,
      (err) => reject(err),
    )
  })
}

/**
 * Membuat visualisasi penggandaan jika item memiliki jumlah > 1
 */
function createMultiCountVisual(templateGroup, jumlah, w, d) {
  const cluster = new THREE.Group()
  const offsetDistance = Math.min(0.2, Math.min(w, d) * 0.3)
  const maxVisualInstances = Math.min(jumlah - 1, 5) // Batasi visual instance ekstra maksimal 5

  for (let i = 1; i <= maxVisualInstances; i++) {
    const clone = templateGroup.clone(true)
    const angle = (i / maxVisualInstances) * Math.PI * 2
    clone.position.x += Math.cos(angle) * offsetDistance * i
    clone.position.z += Math.sin(angle) * offsetDistance * i
    clone.traverse((child) => {
      if (child.isMesh && child.material) {
        // Berikan sentuhan opacity tipis untuk instance duplikasi sekunder
        if (!Array.isArray(child.material)) {
          child.material = child.material.clone()
          child.material.transparent = true
          child.material.opacity = 0.92
        }
      }
    })
    cluster.add(clone)
  }

  return cluster
}

/**
 * Mendaftarkan mesh ke daftar interaksi raycaster klik
 */
function registerInteractiveMeshes(group, item) {
  group.traverse((child) => {
    if (child.isMesh) {
      child.userData = {
        itemId: item.id,
        itemData: item,
        rootGroup: group,
      }
      interactiveMeshes.push(child)
    }
  })
}

/**
 * Event pointer down untuk membedakan klik dengan drag orbit kamera
 */
function onPointerDown(e) {
  pointerDownPos = { x: e.clientX, y: e.clientY }
}

/**
 * Event pointer up: mengeksekusi seleksi item melalui Raycaster jika tidak terjadi drag
 */
function onPointerUp(e) {
  const deltaX = Math.abs(e.clientX - pointerDownPos.x)
  const deltaY = Math.abs(e.clientY - pointerDownPos.y)
  if (deltaX > 5 || deltaY > 5) {
    // Pengguna melakukan rotasi atau pan orbit kamera, bukan klik tunggal
    return
  }

  if (!canvasContainer.value || !camera || !scene) return
  const rect = renderer.domElement.getBoundingClientRect()
  const mouse = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1,
  )

  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(interactiveMeshes, false)

  if (intersects.length > 0) {
    const hit = intersects[0]
    const clickedItemId = hit.object.userData?.itemId
    if (clickedItemId) {
      pilihItem(clickedItemId)
      return
    }
  }

  // Jika mengklik lantai kosong, hapus seleksi
  deseleksiItem()
}

/**
 * Memilih item dan menampilkan highlight kotak pembatas di 3D
 */
function pilihItem(itemId) {
  selectedItemId.value = itemId
  const targetMesh = interactiveMeshes.find((m) => m.userData?.itemId === itemId)
  if (!targetMesh) return

  const targetGroup = targetMesh.userData?.rootGroup || targetMesh

  if (highlightHelper) {
    scene.remove(highlightHelper)
    highlightHelper.dispose?.()
    highlightHelper = null
  }

  // Buat highlight box penanda objek yang sedang aktif
  highlightHelper = new THREE.BoxHelper(targetGroup, 0x7f1125)
  highlightHelper.material.linewidth = 2
  highlightHelper.material.depthTest = false
  scene.add(highlightHelper)
}

/**
 * Menghapus seleksi item
 */
function deseleksiItem() {
  selectedItemId.value = null
  if (highlightHelper) {
    scene.remove(highlightHelper)
    highlightHelper.dispose?.()
    highlightHelper = null
  }
}

/**
 * Fokuskan kamera langsung ke objek yang sedang dipilih
 */
function fokusKeItemTerpilih() {
  if (!selectedItem.value || !controls || !camera) return
  const item = selectedItem.value
  const dimW = Number(item.Decoration?.panjang || 100) / 100
  const dimD = Number(item.Decoration?.lebar || 100) / 100
  const venueW = venuePanjangCm.value / 100
  const venueD = venueLebarCm.value / 100

  const posX = -venueW / 2 + (Number(item.posisi_x || 0) / 100) + dimW / 2
  const posZ = -venueD / 2 + (Number(item.posisi_y || 0) / 100) + dimD / 2

  controls.target.set(posX, 0.5, posZ)
  camera.position.set(posX + 4, 3.5, posZ + 4)
  controls.update()
}

/**
 * Preset Kamera: Perspektif Diagonal (Default)
 */
function setPresetPerspektif() {
  activeViewPreset.value = 'perspective'
  resetCameraPosition()
}

/**
 * Preset Kamera: Tampak Atas (Top-down 2D-to-3D View)
 */
function setPresetTampakAtas() {
  if (!controls || !camera) return
  activeViewPreset.value = 'top'
  const maxDim = Math.max(venuePanjangCm.value, venueLebarCm.value) / 100
  controls.target.set(0, 0, 0)
  camera.position.set(0, maxDim * 1.5, 0.001) // Offset sangat kecil pada Z agar orientasi UP tetap stabil
  camera.up.set(0, 0, -1)
  controls.update()
}

/**
 * Reset posisi kamera ke sudut pandang diagonal optimal
 */
function resetCameraPosition() {
  if (!controls || !camera) return
  const venueW = venuePanjangCm.value / 100
  const venueD = venueLebarCm.value / 100
  const dist = Math.max(venueW, venueD) * 1.15

  controls.target.set(0, 0.5, 0)
  camera.up.set(0, 1, 0)
  camera.position.set(-venueW * 0.75, dist * 0.7, venueD * 0.85)
  controls.update()
}

/**
 * Toggle Grid Helper
 */
function toggleGrid() {
  showGrid.value = !showGrid.value
  if (gridHelper) gridHelper.visible = showGrid.value
}

/**
 * Toggle Rotasi Otomatis
 */
function toggleAutoRotate() {
  isAutoRotating.value = !isAutoRotating.value
}

/**
 * Resize Listener
 */
function onWindowResize() {
  if (!canvasContainer.value || !camera || !renderer) return
  const width = canvasContainer.value.clientWidth
  const height = canvasContainer.value.clientHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

/**
 * Membersihkan seluruh resource WebGL dan event listener saat unmount
 */
function cleanupThreeScene() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }

  window.removeEventListener('resize', onWindowResize)

  if (renderer && renderer.domElement) {
    renderer.domElement.removeEventListener('pointerdown', onPointerDown)
    renderer.domElement.removeEventListener('pointerup', onPointerUp)
  }

  if (controls) {
    controls.dispose()
    controls = null
  }

  if (scene) {
    scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose()
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((mat) => mat.dispose())
        } else {
          object.material.dispose()
        }
      }
    })
  }

  if (renderer) {
    renderer.dispose()
    renderer.forceContextLoss()
    if (renderer.domElement && renderer.domElement.parentElement) {
      renderer.domElement.parentElement.removeChild(renderer.domElement)
    }
    renderer = null
  }

  interactiveMeshes.length = 0
  gltfCache.clear()
}

onMounted(() => {
  muatDataRancangan()
})

onUnmounted(() => {
  cleanupThreeScene()
})
</script>

<template>
  <section class="flex min-h-screen flex-col bg-marshmallow text-licorice">
    <!-- Vintage-Modern 3D Header & Toolbar -->
    <header class="scallop-bottom-pink relative z-20 border-b-2 border-licorice bg-strawberry px-4 py-3 md:px-8">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="ws-btn-paper px-3.5 py-2 text-xs"
            @click="router.back()"
          >
            <i class="fa-solid fa-arrow-left mr-1.5"></i>Kembali
          </button>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="font-heading text-2xl font-bold leading-none text-licorice md:text-3xl">
                Visualisasi 3D
              </h1>
              <span class="ws-badge-sticker bg-violet text-licorice">3D Stage</span>
            </div>
            <p class="mt-0.5 text-[11px] font-medium text-licorice/75">
              {{ rancangan.nama_rancangan || 'Rancangan Venue' }} •
              Proyek {{ proyek.nama_proyek || `#${route.params.id}` }}
              ({{ venuePanjangM }} × {{ venueLebarM }} m)
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <RouterLink
            v-if="route.params.id"
            :to="`/rancangan/${route.params.id}/editor`"
            class="ws-btn-paper px-3.5 py-2 text-xs"
          >
            <i class="fa-solid fa-vector-square mr-1.5 text-cherry"></i>Editor 2D
          </RouterLink>
          <RouterLink
            v-if="route.params.id"
            :to="`/rancangan/${route.params.id}/estimasi`"
            class="ws-btn-cherry px-3.5 py-2 text-xs"
          >
            <i class="fa-solid fa-receipt mr-1.5"></i>Estimasi Biaya
          </RouterLink>
        </div>
      </div>
    </header>

    <!-- Error State Container -->
    <div v-if="error" class="m-6 mx-auto max-w-xl">
      <div class="rounded-2xl border-2 border-licorice bg-paper p-6 text-center shadow-[4px_4px_0px_#7F1125]">
        <VintageOrnament variant="ticket-stamp" label="Error Stage" />
        <p class="font-heading mt-3 text-xl font-bold text-cherry">Gagal Menampilkan 3D</p>
        <p class="mt-1 text-xs text-muted">{{ error }}</p>
        <div class="mt-4 flex justify-center gap-2">
          <button type="button" class="ws-btn-paper px-4 py-2 text-xs" @click="muatDataRancangan">
            <i class="fa-solid fa-rotate-right mr-1.5"></i>Coba Lagi
          </button>
          <RouterLink to="/proyek" class="ws-btn-cherry px-4 py-2 text-xs">
            Ke Daftar Proyek
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- 3D Viewport & Side Information Panel -->
    <div v-else class="grid flex-1 gap-4 p-4 pt-6 lg:grid-cols-12">
      <!-- 3D Viewport Container -->
      <main class="ws-paper-card relative flex min-h-[500px] flex-col overflow-hidden bg-paper lg:col-span-9">
        <!-- Viewport Top Toolbar -->
        <div class="flex flex-wrap items-center justify-between border-b-2 border-licorice bg-marshmallow px-4 py-2 text-xs font-semibold text-licorice">
          <div class="flex items-center gap-2">
            <span><i class="fa-solid fa-cube mr-1.5 text-cherry"></i>Viewport Visualisasi 3D</span>
            <span
              v-if="assetFallbackCount > 0"
              class="rounded-full border border-cherry/40 bg-cherry/10 px-2 py-0.5 text-[10px] font-bold text-cherry"
              title="Aset menggunakan procedural fallback karena model file tidak ditemukan"
            >
              {{ assetFallbackCount }} Fallback
            </span>
          </div>

          <!-- Camera & View Mode Action Buttons -->
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              class="rounded border border-licorice px-2 py-1 text-[11px] font-medium transition"
              :class="activeViewPreset === 'perspective' ? 'bg-licorice text-paper' : 'bg-paper text-licorice hover:bg-strawberry'"
              title="Sudut pandang perspektif isometrik"
              @click="setPresetPerspektif"
            >
              <i class="fa-solid fa-shapes mr-1"></i>Perspektif
            </button>
            <button
              type="button"
              class="rounded border border-licorice px-2 py-1 text-[11px] font-medium transition"
              :class="activeViewPreset === 'top' ? 'bg-licorice text-paper' : 'bg-paper text-licorice hover:bg-strawberry'"
              title="Tampak atas (Plan View 2D ke 3D)"
              @click="setPresetTampakAtas"
            >
              <i class="fa-solid fa-arrows-to-dot mr-1"></i>Tampak Atas
            </button>
            <button
              type="button"
              class="rounded border border-licorice bg-paper px-2 py-1 text-[11px] font-medium text-licorice transition hover:bg-strawberry"
              title="Reset sudut kamera"
              @click="resetCameraPosition"
            >
              <i class="fa-solid fa-arrows-rotate mr-1"></i>Reset
            </button>
            <button
              type="button"
              class="rounded border border-licorice px-2 py-1 text-[11px] font-medium transition"
              :class="showGrid ? 'bg-violet/30 text-licorice' : 'bg-paper text-licorice/60'"
              title="Tampilkan / Sembunyikan Grid"
              @click="toggleGrid"
            >
              <i class="fa-solid fa-border-all mr-1"></i>Grid
            </button>
            <button
              type="button"
              class="rounded border border-licorice px-2 py-1 text-[11px] font-medium transition"
              :class="isAutoRotating ? 'bg-cherry text-paper' : 'bg-paper text-licorice hover:bg-strawberry'"
              title="Putar otomatis venue"
              @click="toggleAutoRotate"
            >
              <i class="fa-solid fa-arrows-spin mr-1"></i>Putar
            </button>
          </div>
        </div>

        <!-- Canvas Mount Container -->
        <div ref="canvasContainer" class="relative flex-1 cursor-grab active:cursor-grabbing">
          <!-- Loading Overlay -->
          <div
            v-if="memuat"
            class="absolute inset-0 z-30 flex flex-col items-center justify-center bg-marshmallow/85 backdrop-blur-sm"
          >
            <div class="h-10 w-10 animate-spin rounded-full border-4 border-cherry border-t-transparent"></div>
            <p class="font-heading mt-3 text-base font-bold text-licorice">{{ statusMuat }}</p>
            <p class="mt-1 text-xs text-muted">Membangun geometri dan tekstur ruang venue...</p>
          </div>

          <!-- Empty Design State Overlay -->
          <div
            v-else-if="designItems.length === 0"
            class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-6 text-center"
          >
            <div class="pointer-events-auto max-w-sm rounded-2xl border-2 border-licorice bg-marshmallow p-6 shadow-[4px_4px_0px_#7F1125]">
              <VintageOrnament variant="ticket-stamp" label="Venue Kosong" />
              <p class="font-heading mt-3 text-xl font-bold text-licorice">Belum Ada Dekorasi</p>
              <p class="mt-1 text-xs leading-relaxed text-muted">
                Denah venue fisik {{ venuePanjangM }} × {{ venueLebarM }} meter sudah siap. Buka Editor 2D untuk menaruh meja, kursi, dan pelaminan.
              </p>
              <div class="mt-4">
                <RouterLink
                  :to="`/rancangan/${route.params.id}/editor`"
                  class="ws-btn-cherry inline-block px-4 py-2 text-xs"
                >
                  <i class="fa-solid fa-vector-square mr-1.5"></i>Buka Editor 2D
                </RouterLink>
              </div>
            </div>
          </div>

          <!-- Navigation Help Floating Badge -->
          <div class="pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg border border-licorice/30 bg-paper/90 px-3 py-1.5 text-[11px] text-licorice/80 shadow">
            <span><i class="fa-solid fa-computer-mouse mr-1 text-cherry"></i>Klik Kiri: Putar Kamera • Klik Kanan / Dua Jari: Geser (Pan) • Scroll: Zoom</span>
          </div>
        </div>
      </main>

      <!-- Side Information & Item Inspector Panel -->
      <aside class="ws-paper-card flex flex-col overflow-hidden bg-paper lg:col-span-3">
        <div class="bg-stripes-pink flex items-center justify-between border-b-2 border-licorice px-4 py-2.5">
          <span class="ws-eyebrow">Panel Inspeksi 3D</span>
          <VintageOrnament variant="flower" warna="cherry" class="h-6 w-6" />
        </div>

        <div class="flex-1 space-y-4 overflow-y-auto p-4 text-xs">
          <!-- Detail Item Terpilih -->
          <div v-if="selectedItem" class="rounded-xl border-2 border-licorice bg-marshmallow p-3.5 shadow-[2px_2px_0px_#7F1125]">
            <div class="flex items-center justify-between">
              <span class="ws-badge-sticker bg-cherry text-paper">Item Aktif</span>
              <button
                type="button"
                class="text-[11px] text-muted hover:text-cherry"
                @click="deseleksiItem"
              >
                <i class="fa-solid fa-xmark mr-1"></i>Lepas
              </button>
            </div>

            <h3 class="font-heading mt-2 text-base font-bold text-licorice">
              {{ selectedItem.Decoration?.nama_dekorasi || 'Dekorasi' }}
            </h3>
            <p class="text-[11px] text-muted">{{ selectedItem.Decoration?.kategori || '-' }}</p>

            <div class="mt-3 space-y-1.5 rounded-lg border border-licorice/20 bg-paper p-2.5 text-[11px]">
              <div class="flex justify-between">
                <span class="text-muted">Dimensi Fisik:</span>
                <span class="font-semibold text-licorice">
                  {{ selectedItem.Decoration?.panjang }} × {{ selectedItem.Decoration?.lebar }} × {{ selectedItem.Decoration?.tinggi }} cm
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted">Posisi 2D:</span>
                <span class="font-mono text-licorice">X: {{ selectedItem.posisi_x }} cm, Y: {{ selectedItem.posisi_y }} cm</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted">Rotasi:</span>
                <span class="font-mono text-licorice">{{ selectedItem.rotasi }}°</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted">Jumlah:</span>
                <span class="font-bold text-cherry">{{ selectedItem.jumlah }} unit</span>
              </div>
              <div class="flex justify-between border-t border-licorice/10 pt-1.5">
                <span class="text-muted">Sumber Aset 3D:</span>
                <span
                  class="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                  :class="selectedItem.Decoration?.model_3d_source === 'library' ? 'bg-violet/30 text-licorice' : selectedItem.Decoration?.model_3d_source === 'upload' ? 'bg-strawberry text-licorice' : 'bg-paper border border-licorice/40'"
                >
                  {{ selectedItem.Decoration?.model_3d_source || 'Procedural' }}
                </span>
              </div>
            </div>

            <div class="mt-3 flex gap-2">
              <button
                type="button"
                class="ws-btn-paper flex-1 py-1.5 text-center text-xs"
                @click="fokusKeItemTerpilih"
              >
                <i class="fa-solid fa-crosshairs mr-1 text-cherry"></i>Fokus Kamera
              </button>
            </div>
          </div>

          <!-- Placeholder Info Saat Tidak Ada Item Terpilih -->
          <div v-else class="rounded-xl border border-dashed border-licorice/40 bg-marshmallow/50 p-4 text-center">
            <i class="fa-solid fa-hand-pointer mb-2 text-2xl text-cherry/60"></i>
            <p class="font-semibold text-licorice">Pilih Dekorasi di 3D</p>
            <p class="mt-1 text-[11px] text-muted">
              Klik salah satu dekorasi di viewport untuk melihat detail dimensi, posisi koordinat, dan fokus kamera.
            </p>
          </div>

          <!-- Ringkasan Ruang Venue -->
          <div class="rounded-xl border border-licorice/30 bg-marshmallow p-3.5">
            <p class="ws-eyebrow text-licorice">Informasi Venue</p>
            <div class="mt-2 space-y-1 text-[11px]">
              <div class="flex justify-between">
                <span class="text-muted">Ukuran Lantai:</span>
                <span class="font-medium text-licorice">{{ venuePanjangM }} × {{ venueLebarM }} meter</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted">Luas Area:</span>
                <span class="font-medium text-licorice">{{ ((venuePanjangCm * venueLebarCm) / 10000).toFixed(1) }} m²</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted">Total Item Dekorasi:</span>
                <span class="font-bold text-licorice">{{ designItems.length }} item</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted">Total Unit:</span>
                <span class="font-bold text-cherry">
                  {{ designItems.reduce((acc, i) => acc + Number(i.jumlah || 1), 0) }} unit
                </span>
              </div>
            </div>
          </div>

          <!-- Hybrid 3D System Legend -->
          <div class="rounded-xl border border-licorice/20 bg-paper p-3 text-[11px]">
            <p class="ws-eyebrow text-licorice">Hybrid 3D System</p>
            <ul class="mt-1.5 space-y-1 text-muted">
              <li class="flex items-center gap-1.5">
                <span class="inline-block h-2 w-2 rounded-full bg-violet"></span>
                <span><strong>Platform Library:</strong> Model 3D standar bawaan</span>
              </li>
              <li class="flex items-center gap-1.5">
                <span class="inline-block h-2 w-2 rounded-full bg-cherry"></span>
                <span><strong>WO Upload:</strong> File GLB/GLTF unggahan WO</span>
              </li>
              <li class="flex items-center gap-1.5">
                <span class="inline-block h-2 w-2 rounded-full bg-marshmallow border border-licorice"></span>
                <span><strong>Procedural:</strong> Generasi geometri Three.js otomatis</span>
              </li>
            </ul>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>
