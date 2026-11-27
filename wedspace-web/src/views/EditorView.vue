<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { clampPosisiItem, normalisasiRotasi } from '../utils/layoutBounds'
import EditorHeader from '../components/editor/EditorHeader.vue'
import EditorStatusBar from '../components/editor/EditorStatusBar.vue'
import DecorationPanel from '../components/editor/DecorationPanel.vue'
import LayoutCanvas from '../components/editor/LayoutCanvas.vue'
import PropertiesPanel from '../components/editor/PropertiesPanel.vue'
import NotesPanel from '../components/editor/NotesPanel.vue'
import AiWorkspacePanel from '../components/editor/AiWorkspacePanel.vue'
import UnsavedLeaveModal from '../components/UnsavedLeaveModal.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const API = 'http://localhost:3000/api'

// Data Proyek & Rancangan
const rancangan = ref(null)
const proyek = ref(null)
const items = ref([])
const notes = ref([])

// Seleksi, Layer Visibility & Lock
const selectedItemIds = ref([])
const hiddenItemIds = ref([])
const lockedItemIds = ref([])

// Undo / Redo History Stack
const historyPast = ref([])
const historyFuture = ref([])
const MAX_HISTORY = 50

// Status Editor
const memuat = ref(true)
const menyimpan = ref(false)
const updatingVenue = ref(false)
const isDirty = ref(false)
const error = ref('')        // Load error (blocking)
const errorSimpan = ref('')  // Save error (non-blocking banner)
const errorStatus = ref(null)
const pesanSukses = ref('')

// Tema Terang / Gelap (sinkron dengan preferensi Workspace 3D)
const THEME_PREF_KEY = 'wedspace_3d_theme'
const savedLocalTheme = typeof window !== 'undefined' ? localStorage.getItem(THEME_PREF_KEY) : null
const themeMode = ref(savedLocalTheme === 'dark' ? 'dark' : 'light')
const isDarkMode = computed(() => themeMode.value === 'dark')

function toggleThemeMode() {
  themeMode.value = themeMode.value === 'dark' ? 'light' : 'dark'
  try {
    localStorage.setItem(THEME_PREF_KEY, themeMode.value)
  } catch {}
}

// Pengaturan Kanvas & Tools
const zoom = ref(1.0)
const gridVisible = ref(true)
const snapToGrid = ref(true)
const activeToolPanel = ref(null) // null | 'notes' | 'ai'
const canvasRef = ref(null)

// Floating Panels State (default terbuka di desktop, seperti Workspace 3D)
const isDesktopInit = typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
const leftPanelOpen = ref(isDesktopInit)
const rightPanelOpen = ref(isDesktopInit)
const modalKeluar = ref(false)
const routeTujuanKeluar = ref(null)

function toggleLeftPanel() {
  leftPanelOpen.value = !leftPanelOpen.value
  if (leftPanelOpen.value && typeof window !== 'undefined' && window.innerWidth < 1024) {
    rightPanelOpen.value = false
    activeToolPanel.value = null
  }
}

function toggleRightPanel() {
  rightPanelOpen.value = !rightPanelOpen.value
  if (rightPanelOpen.value && typeof window !== 'undefined' && window.innerWidth < 1024) {
    leftPanelOpen.value = false
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
    proyek.value = { ...(proyek.value || {}), ...(body.data || { panjang_venue, lebar_venue }) }
    pesanSukses.value = `Ukuran venue diperbarui menjadi ${panjang_venue}m × ${lebar_venue}m & tersinkron ke Proyek Saya!`
    setTimeout(() => { pesanSukses.value = '' }, 3500)
  } catch (err) {
    errorSimpan.value = err.message || 'Gagal memperbarui ukuran venue.'
  } finally {
    updatingVenue.value = false
  }
}

// Dimensi Venue
const panjangVenue = computed(() => Number(proyek.value?.panjang_venue || 0))
const lebarVenue = computed(() => Number(proyek.value?.lebar_venue || 0))
const ukuranValid = computed(() => panjangVenue.value > 0 && lebarVenue.value > 0)

// Item tunggal yang sedang dipilih
const selectedItem = computed(() => {
  if (selectedItemIds.value.length !== 1) return null
  return items.value.find((i) => i.id === selectedItemIds.value[0]) || null
})

const canUndo = computed(() => historyPast.value.length > 0)
const canRedo = computed(() => historyFuture.value.length > 0)

function cloneItems(list) {
  return list.map((i) => ({
    ...i,
    Decoration: i.Decoration ? { ...i.Decoration } : {},
  }))
}

function pushHistory() {
  historyPast.value.push(cloneItems(items.value))
  if (historyPast.value.length > MAX_HISTORY) {
    historyPast.value.shift()
  }
  historyFuture.value = []
}

function undo() {
  if (!canUndo.value) return
  historyFuture.value.push(cloneItems(items.value))
  items.value = historyPast.value.pop()
  const existingIds = new Set(items.value.map((i) => i.id))
  selectedItemIds.value = selectedItemIds.value.filter((id) => existingIds.has(id))
  isDirty.value = true
}

function redo() {
  if (!canRedo.value) return
  historyPast.value.push(cloneItems(items.value))
  items.value = historyFuture.value.pop()
  const existingIds = new Set(items.value.map((i) => i.id))
  selectedItemIds.value = selectedItemIds.value.filter((id) => existingIds.has(id))
  isDirty.value = true
}

// Muat data rancangan dari backend
async function muatRancangan() {
  memuat.value = true
  error.value = ''
  errorSimpan.value = ''
  errorStatus.value = null
  try {
    const res = await fetch(`${API}/rancangan/${route.params.id}`, {
      headers: auth.authHeader(),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      errorStatus.value = res.status
      if (res.status === 404) throw new Error(data.pesan || 'Rancangan tidak ditemukan.')
      if (res.status === 403) throw new Error(data.pesan || 'Kamu tidak memiliki akses ke rancangan ini.')
      if (res.status === 401) throw new Error('Sesi berakhir, silakan login kembali.')
      throw new Error(data.pesan || 'Gagal memuat rancangan layout.')
    }

    rancangan.value = data.data
    proyek.value = data.data.proyek || data.data.Project || {}
    notes.value = data.data.DesignNotes || []

    items.value = (data.data.DesignItems || []).map((di) => ({
      id: di.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      decoration_id: di.decoration_id,
      posisi_x: Number(di.posisi_x || 0),
      posisi_y: Number(di.posisi_y || 0),
      rotasi: normalisasiRotasi(di.rotasi || 0),
      jumlah: Math.max(1, Number(di.jumlah || 1)),
      Decoration: di.Decoration || {},
    }))

    historyPast.value = []
    historyFuture.value = []
    isDirty.value = false
  } catch (err) {
    if (errorStatus.value === null && err instanceof TypeError) {
      error.value = 'Tidak dapat terhubung ke server. Periksa koneksi atau pastikan backend berjalan.'
    } else {
      error.value = err.message || 'Gagal memuat rancangan.'
    }
  } finally {
    memuat.value = false
  }
}

// Menambahkan dekorasi baru ke canvas
function onTambahItem(dekorasi, coords = null) {
  if (!dekorasi || !ukuranValid.value) return
  pushHistory()

  const itemW = Number(dekorasi.panjang || 100)
  const itemH = Number(dekorasi.lebar || 100)
  const venueW = panjangVenue.value * 100
  const venueH = lebarVenue.value * 100

  let initX = 0
  let initY = 0
  if (coords && coords.posisi_x !== undefined && coords.posisi_y !== undefined) {
    initX = coords.posisi_x
    initY = coords.posisi_y
  } else {
    const midX = Math.round((venueW - itemW) / 2)
    const midY = Math.round((venueH - itemH) / 2)
    const offset = (items.value.length % 5) * 20
    initX = midX + offset
    initY = midY + offset
  }

  const clamped = clampPosisiItem(initX, initY, itemW, itemH, 0, venueW, venueH)
  const newItem = {
    id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    decoration_id: dekorasi.id,
    posisi_x: clamped.posisi_x,
    posisi_y: clamped.posisi_y,
    rotasi: 0,
    jumlah: 1,
    Decoration: { ...dekorasi },
  }

  items.value.push(newItem)
  selectedItemIds.value = [newItem.id]
  isDirty.value = true

  if (window.innerWidth < 1024) {
    leftPanelOpen.value = false
  }
}

// Update satu atau beberapa item dari canvas (drag/rotate)
function onUpdateItems(updates) {
  if (!Array.isArray(updates) || updates.length === 0) return
  const map = new Map(updates.map((u) => [u.id, u]))
  items.value = items.value.map((item) => {
    const patch = map.get(item.id)
    return patch ? { ...item, ...patch } : item
  })
  isDirty.value = true
}

// Update single property dari PropertiesPanel
function onUpdateProp({ key, value }) {
  if (!selectedItem.value) return
  pushHistory()
  const idx = items.value.findIndex((i) => i.id === selectedItem.value.id)
  if (idx === -1) return

  const current = items.value[idx]
  const updated = { ...current, [key]: value }

  if (key === 'rotasi' && ukuranValid.value) {
    const itemW = Number(current.Decoration?.panjang || 100)
    const itemH = Number(current.Decoration?.lebar || 100)
    const clamped = clampPosisiItem(
      current.posisi_x,
      current.posisi_y,
      itemW,
      itemH,
      value,
      panjangVenue.value * 100,
      lebarVenue.value * 100
    )
    updated.posisi_x = clamped.posisi_x
    updated.posisi_y = clamped.posisi_y
  }

  items.value[idx] = updated
  isDirty.value = true
}

// Duplikasi satu atau beberapa item terpilih
function onDuplikasiItem(itemTarget = null) {
  const targets = itemTarget
    ? [itemTarget]
    : items.value.filter((i) => selectedItemIds.value.includes(i.id))
  if (targets.length === 0) return

  pushHistory()
  const venueW = panjangVenue.value * 100
  const venueH = lebarVenue.value * 100
  const newIds = []

  for (const t of targets) {
    const itemW = Number(t.Decoration?.panjang || 100)
    const itemH = Number(t.Decoration?.lebar || 100)
    const clamped = clampPosisiItem(
      t.posisi_x + 30,
      t.posisi_y + 30,
      itemW,
      itemH,
      t.rotasi || 0,
      venueW,
      venueH
    )
    const clone = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      decoration_id: t.decoration_id,
      posisi_x: clamped.posisi_x,
      posisi_y: clamped.posisi_y,
      rotasi: t.rotasi || 0,
      jumlah: t.jumlah || 1,
      Decoration: { ...t.Decoration },
    }
    items.value.push(clone)
    newIds.push(clone.id)
  }

  selectedItemIds.value = newIds
  isDirty.value = true
}

// Hapus satu atau beberapa item terpilih
function onHapusItem(itemTarget = null) {
  const idsToRemove = itemTarget ? [itemTarget.id] : [...selectedItemIds.value]
  if (idsToRemove.length === 0) return

  pushHistory()
  items.value = items.value.filter((i) => !idsToRemove.includes(i.id))
  selectedItemIds.value = selectedItemIds.value.filter((id) => !idsToRemove.includes(id))
  hiddenItemIds.value = hiddenItemIds.value.filter((id) => !idsToRemove.includes(id))
  lockedItemIds.value = lockedItemIds.value.filter((id) => !idsToRemove.includes(id))
  isDirty.value = true
}

// Layers Panel Handlers
function onLayerSelect({ item, multi }) {
  if (multi) {
    if (selectedItemIds.value.includes(item.id)) {
      selectedItemIds.value = selectedItemIds.value.filter((id) => id !== item.id)
    } else {
      selectedItemIds.value = [...selectedItemIds.value, item.id]
    }
  } else {
    selectedItemIds.value = [item.id]
  }
}

function onLayerToggleHide(id) {
  if (hiddenItemIds.value.includes(id)) {
    hiddenItemIds.value = hiddenItemIds.value.filter((x) => x !== id)
  } else {
    hiddenItemIds.value = [...hiddenItemIds.value, id]
  }
}

function onLayerToggleLock(id) {
  if (lockedItemIds.value.includes(id)) {
    lockedItemIds.value = lockedItemIds.value.filter((x) => x !== id)
  } else {
    lockedItemIds.value = [...lockedItemIds.value, id]
  }
}

function onLayerReorder({ index, direction }) {
  const targetIdx = index + direction
  if (targetIdx < 0 || targetIdx >= items.value.length) return
  pushHistory()
  const arr = [...items.value]
  const [moved] = arr.splice(index, 1)
  arr.splice(targetIdx, 0, moved)
  items.value = arr
  isDirty.value = true
}

// Simpan rancangan ke database (mempertahankan ID & snapshot harga)
async function simpanRancangan() {
  if (!rancangan.value?.id || menyimpan.value) return
  menyimpan.value = true
  errorSimpan.value = ''
  pesanSukses.value = ''

  try {
    const payload = {
      nama_rancangan: rancangan.value.nama_rancangan,
      item: items.value.map((i) => ({
        id: typeof i.id === 'number' ? i.id : undefined,
        decoration_id: i.decoration_id,
        posisi_x: Math.round(i.posisi_x),
        posisi_y: Math.round(i.posisi_y),
        rotasi: normalisasiRotasi(i.rotasi || 0),
        jumlah: Math.max(1, parseInt(i.jumlah || 1, 10)),
      })),
    }

    const res = await fetch(`${API}/rancangan/${rancangan.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth.authHeader() },
      body: JSON.stringify(payload),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      if (res.status === 401) throw new Error('Sesi berakhir, silakan login kembali.')
      throw new Error(data.pesan || 'Gagal menyimpan rancangan.')
    }

    const prevSelectedIndices = selectedItemIds.value
      .map((id) => items.value.findIndex((i) => i.id === id))
      .filter((idx) => idx !== -1)

    rancangan.value = data.data
    if (data.data?.proyek || data.data?.Project) {
      proyek.value = data.data.proyek || data.data.Project
    }
    notes.value = data.data?.DesignNotes || notes.value

    const freshDesignItems = data.data?.DesignItems || []
    items.value = freshDesignItems.map((di) => ({
      id: di.id,
      decoration_id: di.decoration_id,
      posisi_x: Number(di.posisi_x || 0),
      posisi_y: Number(di.posisi_y || 0),
      rotasi: normalisasiRotasi(di.rotasi || 0),
      jumlah: Math.max(1, Number(di.jumlah || 1)),
      Decoration: di.Decoration || {},
    }))

    selectedItemIds.value = prevSelectedIndices
      .map((idx) => items.value[idx]?.id)
      .filter(Boolean)

    isDirty.value = false
    pesanSukses.value = 'Rancangan layout 2D berhasil disimpan!'
    setTimeout(() => { pesanSukses.value = '' }, 3000)
  } catch (err) {
    errorSimpan.value =
      err instanceof TypeError
        ? 'Gagal menyimpan rancangan. Tidak dapat terhubung ke server.'
        : err.message || 'Gagal menyimpan rancangan layout.'
  } finally {
    menyimpan.value = false
  }
}

function toggleToolPanel(panel) {
  const next = activeToolPanel.value === panel ? null : panel
  activeToolPanel.value = next
  if (next && typeof window !== 'undefined' && window.innerWidth < 1024) {
    leftPanelOpen.value = false
  }
}

function onAiApplied(freshDesign) {
  if (!freshDesign) return
  pushHistory()
  rancangan.value = freshDesign
  if (freshDesign.proyek || freshDesign.Project) {
    proyek.value = freshDesign.proyek || freshDesign.Project
  }
  notes.value = freshDesign.DesignNotes || []
  items.value = (freshDesign.DesignItems || []).map((di) => ({
    id: di.id,
    decoration_id: di.decoration_id,
    posisi_x: Number(di.posisi_x || 0),
    posisi_y: Number(di.posisi_y || 0),
    rotasi: normalisasiRotasi(di.rotasi || 0),
    jumlah: Math.max(1, Number(di.jumlah || 1)),
    Decoration: di.Decoration || {},
  }))
  pesanSukses.value = 'Aksi AI Workspace berhasil diterapkan dan disimpan!'
  setTimeout(() => { pesanSukses.value = '' }, 3500)
}

// Zoom Handlers
function onZoomIn() {
  zoom.value = Math.min(3.0, Number((zoom.value + 0.15).toFixed(2)))
}
function onZoomOut() {
  zoom.value = Math.max(0.25, Number((zoom.value - 0.15).toFixed(2)))
}
function onWheelZoom(delta) {
  zoom.value = Math.max(0.25, Math.min(3.0, Number((zoom.value + delta).toFixed(2))))
}
function onZoomReset() {
  zoom.value = 1.0
  canvasRef.value?.resetPan?.()
}
function onZoomFit() {
  zoom.value = 1.0
  canvasRef.value?.resetPan?.()
}

// Global Keyboard Shortcuts
function onGlobalKeyDown(e) {
  const tag = e.target?.tagName?.toLowerCase()
  const isTyping = ['input', 'textarea', 'select'].includes(tag)

  // Ctrl+S / Cmd+S selalu simpan
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    simpanRancangan()
    return
  }

  if (isTyping) return

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault()
    if (e.shiftKey) redo()
    else undo()
    return
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
    e.preventDefault()
    redo()
    return
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
    e.preventDefault()
    onDuplikasiItem()
    return
  }
  if (e.key === 'Escape') {
    if (activeToolPanel.value) {
      activeToolPanel.value = null
    } else {
      selectedItemIds.value = []
    }
    return
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (selectedItemIds.value.length > 0) {
      e.preventDefault()
      onHapusItem()
    }
    return
  }

  // Arrow nudge untuk item terpilih yang tidak terkunci
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && selectedItemIds.value.length > 0) {
    e.preventDefault()
    const step = e.shiftKey ? 50 : 10
    const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
    const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
    const venueW = panjangVenue.value * 100
    const venueH = lebarVenue.value * 100
    pushHistory()
    const updates = items.value
      .filter((i) => selectedItemIds.value.includes(i.id) && !lockedItemIds.value.includes(i.id))
      .map((i) => {
        const clamped = clampPosisiItem(
          i.posisi_x + dx,
          i.posisi_y + dy,
          Number(i.Decoration?.panjang || 100),
          Number(i.Decoration?.lebar || 100),
          i.rotasi || 0,
          venueW,
          venueH
        )
        return { id: i.id, posisi_x: clamped.posisi_x, posisi_y: clamped.posisi_y }
      })
    onUpdateItems(updates)
  }
}

// Navigasi Kembali & Unsaved Guard (Modal bertema WedSpace)
const pesanModalKeluar = ref('')
const sedangSimpanKeluar = ref(false)
let resolveLeaveGuard = null

function handleKembali() {
  router.push(`/proyek/${proyek.value?.id || ''}`)
}

function batalKeluar() {
  modalKeluar.value = false
  if (resolveLeaveGuard) {
    resolveLeaveGuard(false)
    resolveLeaveGuard = null
  }
}

function konfirmasiKeluar() {
  modalKeluar.value = false
  isDirty.value = false
  if (resolveLeaveGuard) {
    resolveLeaveGuard(true)
    resolveLeaveGuard = null
  } else if (routeTujuanKeluar.value) {
    router.push(routeTujuanKeluar.value)
  } else {
    router.back()
  }
}

async function simpanDanKeluar() {
  sedangSimpanKeluar.value = true
  try {
    await simpanRancangan()
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

onBeforeRouteLeave((to) => {
  if (!isDirty.value) return true
  const menujuEstimasi = to.path.endsWith('/estimasi')
  pesanModalKeluar.value = menujuEstimasi
    ? 'Ada perubahan layout yang belum disimpan. Estimasi biaya hanya menghitung rancangan yang sudah tersimpan.'
    : 'Ada perubahan tata letak dekorasi yang belum disimpan. Jika keluar sekarang, perubahan tersebut akan hilang.'
  modalKeluar.value = true
  return new Promise((resolve) => {
    resolveLeaveGuard = resolve
  })
})

function onWindowBeforeUnload(e) {
  if (isDirty.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

onMounted(() => {
  muatRancangan()
  window.addEventListener('beforeunload', onWindowBeforeUnload)
  window.addEventListener('keydown', onGlobalKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', onWindowBeforeUnload)
  window.removeEventListener('keydown', onGlobalKeyDown)
})
</script>

<template>
  <section
    class="ws2d-root relative h-screen w-screen overflow-hidden transition-colors duration-200"
    :class="isDarkMode ? 'ws2d-dark bg-[#3E3E4A] text-slate-100' : 'bg-[#BABAB5] text-slate-800'"
  >
    <!-- Loading Screen -->
    <div v-if="memuat" class="flex h-full w-full items-center justify-center p-8 text-center">
      <div class="rounded-2xl border border-white/80 bg-[#F7F7F8]/95 px-8 py-6 shadow-[0_8px_28px_rgba(15,23,42,0.10)] backdrop-blur-md">
        <i class="fa-solid fa-circle-notch fa-spin text-3xl text-[#CF2C2F]"></i>
        <p class="mt-3 text-base font-semibold text-slate-800">Menyiapkan Workspace 2D…</p>
        <p class="mt-1 text-xs text-slate-500">Memuat denah venue dan tata letak dekorasi tersimpan.</p>
      </div>
    </div>

    <!-- Error State: 404 / 403 / 401 / 500 -->
    <div v-else-if="error" class="flex h-full w-full items-center justify-center p-6 text-center">
      <div class="max-w-md rounded-2xl border border-slate-200/80 bg-white/95 p-8 shadow-[0_8px_28px_rgba(15,23,42,0.09)] backdrop-blur-md">
        <i
          :class="[
            'fa-solid text-3xl text-[#CF2C2F]',
            errorStatus === 404 ? 'fa-compass-drafting' : errorStatus === 403 ? 'fa-shield-halved' : errorStatus === 401 ? 'fa-right-to-bracket' : 'fa-circle-exclamation',
          ]"
        ></i>
        <h2 class="mt-4 text-xl font-bold text-slate-900">
          {{
            errorStatus === 404
              ? 'Rancangan Tidak Ditemukan'
              : errorStatus === 403
              ? 'Kamu Tidak Memiliki Akses ke Rancangan Ini'
              : errorStatus === 401
              ? 'Sesi Berakhir'
              : 'Gagal Memuat Rancangan'
          }}
        </h2>
        <p class="mt-2 text-xs text-slate-500 leading-relaxed">{{ error }}</p>
        <div class="mt-6 flex flex-wrap items-center justify-center gap-2">
          <RouterLink v-if="errorStatus === 404" to="/proyek" class="rounded-xl bg-[#CF2C2F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B82225]">
            Lihat Daftar Proyek
          </RouterLink>
          <RouterLink v-else-if="errorStatus === 403" to="/dashboard" class="rounded-xl bg-[#CF2C2F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B82225]">
            Kembali ke Dashboard
          </RouterLink>
          <RouterLink v-else-if="errorStatus === 401" :to="{ path: '/login', query: { dari: route.fullPath } }" class="rounded-xl bg-[#CF2C2F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B82225]">
            Login Kembali
          </RouterLink>
          <template v-else>
            <button type="button" class="rounded-xl bg-[#CF2C2F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B82225]" @click="muatRancangan">
              Coba Lagi
            </button>
            <RouterLink to="/proyek" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700">
              Daftar Proyek
            </RouterLink>
          </template>
        </div>
      </div>
    </div>

    <!-- Error State: Venue Dimensions Invalid -->
    <div v-else-if="!ukuranValid" class="flex h-full w-full items-center justify-center p-6 text-center">
      <div class="max-w-md rounded-2xl border border-slate-200/80 bg-white/95 p-8 shadow-[0_8px_28px_rgba(15,23,42,0.09)] backdrop-blur-md">
        <i class="fa-solid fa-ruler-combined text-3xl text-[#CF2C2F]"></i>
        <h2 class="mt-4 text-xl font-bold text-slate-900">Ukuran Venue Belum Lengkap</h2>
        <p class="mt-2 text-xs text-slate-500 leading-relaxed">
          Proyek ini belum memiliki panjang dan lebar venue yang valid. Lengkapi ukuran venue agar proporsi denah 2D akurat.
        </p>
        <RouterLink v-if="proyek?.id" :to="`/proyek/${proyek.id}/edit`" class="mt-6 inline-block rounded-xl bg-[#CF2C2F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B82225]">
          Lengkapi Ukuran Venue
        </RouterLink>
      </div>
    </div>

    <!-- Full-Viewport 2D Canvas (identik dengan arsitektur Floating Workspace 3D) -->
    <main v-else class="absolute inset-0 z-0 flex h-full w-full flex-col overflow-hidden">
      <LayoutCanvas
        ref="canvasRef"
        :panjang-venue="panjangVenue"
        :lebar-venue="lebarVenue"
        :nama-venue="proyek?.nama_venue"
        :items="items"
        :notes="notes"
        :selected-item-ids="selectedItemIds"
        :hidden-item-ids="hiddenItemIds"
        :locked-item-ids="lockedItemIds"
        :zoom="zoom"
        :grid-visible="gridVisible"
        :snap-to-grid="snapToGrid"
        @select-items="selectedItemIds = $event"
        @update-items="onUpdateItems"
        @interaction-start="pushHistory"
        @drop-decoration="onTambahItem($event.decoration, { posisi_x: $event.posisi_x, posisi_y: $event.posisi_y })"
        @delete-selected="onHapusItem()"
        @wheel-zoom="onWheelZoom"
        @open-notes="activeToolPanel = 'notes'; rightPanelOpen = true"
      />
    </main>

    <!-- Floating Top Studio Toolbar + Floating Banners -->
    <div v-if="!memuat && !error && ukuranValid" class="pointer-events-none absolute inset-x-3.5 top-3.5 z-30 flex flex-col items-center gap-2">
      <EditorHeader
        :proyek="proyek"
        :rancangan="rancangan"
        :is-dirty="isDirty"
        :is-saving="menyimpan"
        :zoom="zoom"
        :grid-visible="gridVisible"
        :snap-to-grid="snapToGrid"
        :can-undo="canUndo"
        :can-redo="canRedo"
        :active-tool-panel="activeToolPanel"
        :note-count="notes.length"
        :theme-mode="themeMode"
        @simpan="simpanRancangan"
        @kembali="handleKembali"
        @undo="undo"
        @redo="redo"
        @zoom-in="onZoomIn"
        @zoom-out="onZoomOut"
        @zoom-reset="onZoomReset"
        @zoom-fit="onZoomFit"
        @toggle-grid="gridVisible = !gridVisible"
        @toggle-snap="snapToGrid = !snapToGrid"
        @toggle-tool-panel="toggleToolPanel"
        @toggle-theme="toggleThemeMode"
      />

      <!-- Floating Banners -->
      <div
        v-if="pesanSukses"
        class="pointer-events-auto flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/95 px-4 py-1.5 text-xs font-medium text-emerald-700 shadow-[0_6px_20px_rgba(15,23,42,0.08)] backdrop-blur-md"
      >
        <i class="fa-solid fa-circle-check"></i><span>{{ pesanSukses }}</span>
      </div>

      <div
        v-if="errorSimpan && rancangan"
        class="pointer-events-auto flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50/95 px-4 py-1.5 text-xs font-medium text-rose-700 shadow-[0_6px_20px_rgba(15,23,42,0.08)] backdrop-blur-md"
      >
        <i class="fa-solid fa-circle-exclamation"></i><span>{{ errorSimpan }}</span>
        <button type="button" class="ml-1 rounded-full border border-rose-300 bg-white px-2 py-0.5 text-[0.6875rem] hover:bg-rose-50 transition" @click="errorSimpan = ''">
          Tutup
        </button>
      </div>
    </div>

    <!-- Floating Toggle Button: Buka Panel Kiri (ikon panah saja) -->
    <button
      v-if="!memuat && !error && ukuranValid"
      v-show="!leftPanelOpen"
      type="button"
      class="absolute left-3.5 top-[4.625rem] z-20 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/80 bg-[#F7F7F8]/95 text-slate-600 shadow-[0_6px_20px_rgba(15,23,42,0.09)] ring-1 ring-slate-200/80 backdrop-blur-md hover:bg-white hover:text-[#CF2C2F] active:scale-95 transition"
      title="Buka Panel Kiri (Aset Dekorasi)"
      aria-label="Buka Panel Kiri"
      @click="toggleLeftPanel"
    >
      <i class="fa-solid fa-chevron-right text-xs"></i>
    </button>

    <!-- Floating Left Panel: Aset Per Kategori -->
    <div
      v-if="!memuat && !error && ukuranValid"
      class="absolute top-[4.625rem] bottom-[3.25rem] left-3.5 z-20 w-[16.5rem] max-w-[calc(100vw-1.75rem)] xl:w-[17.5rem] transition-[transform,opacity] duration-200 ease-out will-change-transform"
      :class="leftPanelOpen ? 'translate-x-0 opacity-100 pointer-events-auto' : '-translate-x-[calc(100%+1.5rem)] opacity-0 pointer-events-none'"
    >
      <DecorationPanel
        :terbuka="leftPanelOpen"
        @tambah-item="onTambahItem"
        @tutup="leftPanelOpen = false"
      />
    </div>

    <!-- Floating Toggle Button: Buka Panel Kanan (ikon panah saja) -->
    <button
      v-if="!memuat && !error && ukuranValid"
      v-show="!rightPanelOpen && !activeToolPanel"
      type="button"
      class="absolute right-3.5 top-[4.625rem] z-20 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/80 bg-[#F7F7F8]/95 text-slate-600 shadow-[0_6px_20px_rgba(15,23,42,0.09)] ring-1 ring-slate-200/80 backdrop-blur-md hover:bg-white hover:text-[#CF2C2F] active:scale-95 transition"
      title="Buka Panel Kanan (Properti & Lapisan)"
      aria-label="Buka Panel Kanan"
      @click="toggleRightPanel"
    >
      <i class="fa-solid fa-chevron-left text-xs"></i>
    </button>

    <!-- Floating Right Panel: Properti & Lapisan OR Catatan / AI Drawer -->
    <div
      v-if="!memuat && !error && ukuranValid"
      class="absolute top-[4.625rem] bottom-[3.25rem] right-3.5 z-20 w-[16.5rem] max-w-[calc(100vw-1.75rem)] xl:w-[17.5rem] transition-[transform,opacity] duration-200 ease-out will-change-transform"
      :class="(rightPanelOpen || activeToolPanel) ? 'translate-x-0 opacity-100 pointer-events-auto' : 'translate-x-[calc(100%+1.5rem)] opacity-0 pointer-events-none'"
    >
      <div
        v-if="activeToolPanel === 'notes' && rancangan?.id"
        class="ws2d-drawer-themed h-full overflow-hidden rounded-2xl border border-white/80 bg-[#F7F7F8]/95 shadow-[0_8px_28px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80 backdrop-blur-md"
      >
        <NotesPanel
          :design-id="rancangan.id"
          :notes="notes"
          :panjang-venue="panjangVenue"
          :lebar-venue="lebarVenue"
          :dark-mode="isDarkMode"
          @updated="notes = $event"
          @tutup="activeToolPanel = null"
        />
      </div>
      <div
        v-else-if="activeToolPanel === 'ai' && rancangan?.id"
        class="ws2d-drawer-themed h-full overflow-hidden rounded-2xl border border-white/80 bg-[#F7F7F8]/95 shadow-[0_8px_28px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80 backdrop-blur-md"
      >
        <AiWorkspacePanel
          :design-id="rancangan.id"
          mode="2d"
          @applied="onAiApplied"
          @tutup="activeToolPanel = null"
        />
      </div>
      <PropertiesPanel
        v-else
        :items="items"
        :selected-ids="selectedItemIds"
        :hidden-ids="hiddenItemIds"
        :locked-ids="lockedItemIds"
        :selected-item="selectedItem"
        :selected-count="selectedItemIds.length"
        :proyek="proyek"
        :panjang-venue="panjangVenue"
        :lebar-venue="lebarVenue"
        :updating-venue="updatingVenue"
        :grid-visible="gridVisible"
        :snap-to-grid="snapToGrid"
        :item-count="items.length"
        @select-layer="onLayerSelect"
        @toggle-hide-layer="onLayerToggleHide"
        @toggle-lock-layer="onLayerToggleLock"
        @reorder-layer="onLayerReorder"
        @update-prop="onUpdateProp"
        @update-venue-size="onUpdateVenueSize"
        @duplikasi-item="onDuplikasiItem"
        @hapus-item="onHapusItem"
        @toggle-grid="gridVisible = !gridVisible"
        @toggle-snap="snapToGrid = !snapToGrid"
        @tutup="rightPanelOpen = false"
      />
    </div>

    <!-- Floating Bottom Status Bar -->
    <EditorStatusBar
      v-if="!memuat && !error && ukuranValid"
      :panjang-venue="panjangVenue"
      :lebar-venue="lebarVenue"
      :zoom="zoom"
      :grid-visible="gridVisible"
      :snap-to-grid="snapToGrid"
      :selected-item="selectedItem"
      :selected-count="selectedItemIds.length"
      :item-count="items.length"
      :is-dirty="isDirty"
      :is-saving="menyimpan"
    />

    <!-- Modal Peringatan Keluar Workspace (Tema WedSpace) -->
    <UnsavedLeaveModal
      :tampil="modalKeluar"
      judul="Simpan Perubahan Layout?"
      :pesan="pesanModalKeluar || 'Anda memiliki perubahan tata letak dekorasi yang belum disimpan. Jika keluar sekarang, perubahan tersebut akan hilang.'"
      label-workspace="Workspace 2D"
      :menyimpan="sedangSimpanKeluar || menyimpan"
      @batal="batalKeluar"
      @keluar="konfirmasiKeluar"
      @simpan-keluar="simpanDanKeluar"
    />
  </section>
</template>

<style>
/* Dark Mode menyeluruh untuk Workspace 2D (selaras 100% dengan Workspace 3D) */
.ws2d-dark header > button,
.ws2d-dark header > div,
.ws2d-dark aside,
.ws2d-dark footer > div,
.ws2d-dark button[aria-label="Buka Panel Kiri"],
.ws2d-dark button[aria-label="Buka Panel Kanan"] {
  background-color: rgba(34, 35, 45, 0.94) !important;
  border-color: rgba(82, 85, 108, 0.7) !important;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.36) !important;
  --tw-ring-color: rgba(82, 85, 108, 0.65) !important;
}

.ws2d-dark .bg-white,
.ws2d-dark .bg-white\/95,
.ws2d-dark .bg-white\/90 {
  background-color: #2B2D3A !important;
}

/* Pertahankan lantai kanvas 2D tetap terang & kontras di atas latar studio gelap #3E3E4A */
.ws2d-dark .ws2d-canvas-area .bg-white {
  background-color: #FAF8F5 !important;
}

.ws2d-dark .ws2d-ruler-bar {
  border-color: rgba(203, 213, 225, 0.35) !important;
}

.ws2d-dark .ws2d-ruler-tick {
  color: #CBD5E1 !important;
}

.ws2d-dark .bg-slate-50,
.ws2d-dark .bg-slate-50\/80,
.ws2d-dark .bg-slate-50\/40,
.ws2d-dark .bg-slate-100 {
  background-color: #232531 !important;
}

.ws2d-dark .bg-slate-200\/70,
.ws2d-dark .bg-slate-200\/60 {
  background-color: #1B1C25 !important;
}

.ws2d-dark .bg-slate-300\/80 {
  background-color: rgba(100, 104, 130, 0.55) !important;
}

.ws2d-dark .bg-red-50,
.ws2d-dark .bg-red-50\/60 {
  background-color: rgba(207, 44, 47, 0.18) !important;
}

.ws2d-dark .border-slate-200,
.ws2d-dark .border-slate-200\/80,
.ws2d-dark .border-slate-100,
.ws2d-dark .border-white\/80 {
  border-color: rgba(82, 85, 108, 0.6) !important;
}

.ws2d-dark .border-red-200 {
  border-color: rgba(207, 44, 47, 0.5) !important;
}

.ws2d-dark .text-slate-900,
.ws2d-dark .text-slate-800 {
  color: #F1F5F9 !important;
}

.ws2d-dark .text-slate-700,
.ws2d-dark .text-slate-600 {
  color: #CBD5E1 !important;
}

.ws2d-dark .text-slate-500,
.ws2d-dark .text-slate-400 {
  color: #94A3B8 !important;
}

.ws2d-dark .text-slate-300 {
  color: #64748B !important;
}

.ws2d-dark .text-\[\#7F1125\] {
  color: #FDA4AF !important;
}

.ws2d-dark .text-emerald-700 {
  color: #6EE7B7 !important;
}

.ws2d-dark header button:not(.bg-\[\#CF2C2F\]):not(.ws2d-theme-switch):hover,
.ws2d-dark header a:not(.bg-\[\#CF2C2F\]):hover {
  background-color: #343647 !important;
  color: #F8FAFC !important;
}

.ws2d-dark aside button:not(.bg-\[\#CF2C2F\]):hover {
  background-color: #343647 !important;
}

.ws2d-dark input[type="text"],
.ws2d-dark input[type="number"],
.ws2d-dark input[type="search"],
.ws2d-dark textarea {
  background-color: #1B1C25 !important;
  border-color: rgba(92, 96, 122, 0.7) !important;
  color: #F1F5F9 !important;
}

.ws2d-dark .ws2d-theme-switch .bg-white {
  background-color: #FFFFFF !important;
}

.ws2d-dark .bg-\[\#CF2C2F\] {
  background-color: #CF2C2F !important;
  color: #FFFFFF !important;
}

/* Tema Dark Mode Catatan WO & Asisten AI Workspace 2D (identik dengan Workspace 3D) */
.ws2d-dark .ws2d-drawer-themed {
  background-color: #170D11 !important;
  border-color: #7F1125 !important;
  --tw-ring-color: rgba(127, 17, 37, 0.7) !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5) !important;
}

.ws2d-dark .ws2d-drawer-themed aside {
  background-color: #170D11 !important;
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.ws2d-dark .ws2d-drawer-themed .bg-stripes-violet,
.ws2d-dark .ws2d-drawer-themed .bg-stripes-pink {
  background: repeating-linear-gradient(90deg, #170D11 0px, #170D11 20px, #1D1226 20px, #1D1226 40px) !important;
  border-bottom: 1.5px solid rgba(127, 17, 37, 0.75) !important;
}

.ws2d-dark .ws2d-drawer-themed .ws-eyebrow {
  color: #FFFFFF !important;
}

.ws2d-dark .ws2d-drawer-themed .bg-stripes-violet button,
.ws2d-dark .ws2d-drawer-themed .bg-stripes-pink button {
  background-color: #1D1226 !important;
  border-color: rgba(127, 17, 37, 0.85) !important;
  color: #F8FAFC !important;
}

.ws2d-dark .ws2d-drawer-themed form.bg-marshmallow,
.ws2d-dark .ws2d-drawer-themed .bg-violet\/20,
.ws2d-dark .ws2d-drawer-themed div.bg-marshmallow {
  background-color: #20121A !important;
  border: 1.5px solid #7F1125 !important;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.45) !important;
  color: #E8D5DC !important;
}

.ws2d-dark .ws2d-drawer-themed .ws-input,
.ws2d-dark .ws2d-drawer-themed input[type="text"],
.ws2d-dark .ws2d-drawer-themed input[type="number"],
.ws2d-dark .ws2d-drawer-themed textarea {
  background-color: #2A1821 !important;
  border: 1.5px solid #592033 !important;
  color: #F8FAFC !important;
  box-shadow: none !important;
}

.ws2d-dark .ws2d-drawer-themed :not(.ws-note-card) > .text-licorice,
.ws2d-dark .ws2d-drawer-themed form .text-licorice,
.ws2d-dark .ws2d-drawer-themed > aside > div > .text-licorice {
  color: #F8FAFC !important;
}

.ws2d-dark .ws2d-drawer-themed .text-muted {
  color: #F47280 !important;
}

.ws2d-dark .ws2d-drawer-themed .border-dashed {
  background-color: #1C0F15 !important;
  border-color: rgba(127, 17, 37, 0.65) !important;
  color: #C7B0B9 !important;
}

.ws2d-dark .ws2d-drawer-themed .ws-btn-cherry {
  background-color: #E03B4B !important;
  border-color: #9E1F32 !important;
  color: #FFFFFF !important;
  box-shadow: 0 3px 0 #8A182A !important;
}

.ws2d-dark .ws2d-drawer-themed button.bg-marshmallow {
  background-color: #2A1821 !important;
  border-color: rgba(127, 17, 37, 0.75) !important;
  color: #F1DCE4 !important;
}

.ws2d-dark .ws2d-drawer-themed .ws-note-card .ws-note-title {
  color: #2A111A !important;
}

.ws2d-dark .ws2d-drawer-themed .ws-note-card .ws-note-body {
  color: #3F1D2B !important;
}

.ws2d-dark .ws2d-drawer-themed .ws-note-card .ws-note-pin,
.ws2d-dark .ws2d-drawer-themed .ws-note-card .ws-note-delete,
.ws2d-dark .ws2d-drawer-themed .ws-note-card .ws-note-delete:hover {
  color: #9F1239 !important;
  background-color: transparent !important;
}

/* Custom slim pill-only scrollbar (tanpa panah atas/bawah/kiri/kanan) untuk panel kiri, kanan, & bar atas */
.ws2d-root *::-webkit-scrollbar {
  width: 5px;
  height: 4px;
}

.ws2d-root header *::-webkit-scrollbar {
  height: 3px;
}

.ws2d-root *::-webkit-scrollbar-button,
.ws2d-root *::-webkit-scrollbar-button:single-button,
.ws2d-root *::-webkit-scrollbar-button:start:decrement,
.ws2d-root *::-webkit-scrollbar-button:end:increment {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}

.ws2d-root *::-webkit-scrollbar-track {
  background: transparent;
  margin: 6px 0;
}

.ws2d-root header *::-webkit-scrollbar-track {
  margin: 0 14px;
}

.ws2d-root *::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.45);
  border-radius: 9999px;
}

.ws2d-root *::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.72);
}

.ws2d-root *::-webkit-scrollbar-corner {
  background: transparent;
}

.ws2d-dark *::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.30);
}

.ws2d-dark *::-webkit-scrollbar-thumb:hover {
  background: rgba(203, 213, 225, 0.56);
}

.ws2d-dark .ws2d-drawer-themed *::-webkit-scrollbar-thumb {
  background: rgba(244, 114, 128, 0.35);
}

.ws2d-dark .ws2d-drawer-themed *::-webkit-scrollbar-thumb:hover {
  background: rgba(244, 114, 128, 0.62);
}

@supports not selector(::-webkit-scrollbar) {
  .ws2d-root * {
    scrollbar-width: thin;
    scrollbar-color: rgba(148, 163, 184, 0.45) transparent;
  }
  .ws2d-dark * {
    scrollbar-color: rgba(148, 163, 184, 0.30) transparent;
  }
}
</style>
