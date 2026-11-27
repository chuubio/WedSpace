<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { renderAssetThumbnail } from '../../utils/workspace3d/AssetThumbnail'

const props = defineProps({
  activeTool: { type: String, default: 'select' },
  sceneSettings: { type: Object, required: true },
  hasCeiling: { type: Boolean, default: false },
})

const emit = defineEmits([
  'add-decoration',
  'set-tool',
  'add-primitive',
  'toggle-ceiling',
  'update-floor',
  'update-lighting',
  'set-quality',
  'tutup',
])

const auth = useAuthStore()
const API = 'http://localhost:3000/api'

const mainTab = ref('struktur') // 'struktur' | 'aset' | 'tampilan'
const selectedCategory = ref(null) // null = daftar folder kategori | '__saya__' | '<NamaKategori>'
const cari = ref('')
const daftarSaya = ref([])
const daftarKomunitas = ref([])
const sibuk = ref(false)
const gagalMuatGambar = ref({}) // { [id]: true }

// State Modal Unggah Aset 3D (GLB / glTF / OBJ / DAE hasil ekspor SketchUp)
const modalUnggah = ref(false)
const unggahSibuk = ref(false)
const unggahError = ref('')
const unggahNama = ref('')
const unggahKategori = ref('Aksesoris')
const unggahPanjang = ref(150)
const unggahLebar = ref(150)
const unggahTinggi = ref(150)
const unggahHarga = ref(0)
const unggahLangsungMasuk = ref(true)
const unggahFileModel = ref(null)
const unggahFileGambar = ref(null)
const isDraggingModel = ref(false)
const isDraggingCard = ref(false)
const inputModelRef = ref(null)

const kategoriOpsi = ['Pelaminan', 'Meja', 'Kursi', 'Bunga', 'Backdrop', 'Lighting', 'Photobooth', 'Aksesoris']

function bukaModalUnggah(initialFile = null) {
  unggahError.value = ''
  unggahNama.value = ''
  unggahKategori.value = 'Aksesoris'
  unggahPanjang.value = 150
  unggahLebar.value = 150
  unggahTinggi.value = 150
  unggahHarga.value = 0
  unggahLangsungMasuk.value = true
  unggahFileModel.value = null
  unggahFileGambar.value = null
  isDraggingModel.value = false
  modalUnggah.value = true
  if (initialFile) {
    terimaFileModel3D(initialFile)
  }
}

function formatUkuranFile(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function terimaFileModel3D(f) {
  unggahError.value = ''
  if (!f) return false
  const ext = f.name.split('.').pop().toLowerCase()
  if (!['glb', 'gltf', 'obj', 'dae'].includes(ext)) {
    unggahError.value =
      ext === 'skp'
        ? 'File .skp perlu diekspor dulu di SketchUp (File → Export → 3D Model) ke format .dae, .obj, atau .glb.'
        : 'Format tidak didukung. Gunakan file .glb, .gltf, .obj, atau .dae (ekspor SketchUp).'
    return false
  }
  unggahFileModel.value = f
  if (!unggahNama.value.trim()) {
    unggahNama.value = f.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim()
  }
  return true
}

function onPilihFileModel3D(e) {
  const f = e.target.files?.[0]
  if (!f) return
  if (!terimaFileModel3D(f)) {
    e.target.value = ''
  }
}

function onDropModel3D(e) {
  isDraggingModel.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) terimaFileModel3D(f)
}

function onDropQuickCard(e) {
  isDraggingCard.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) bukaModalUnggah(f)
}

function onPilihFileGambar(e) {
  const f = e.target.files?.[0]
  if (!f) return
  unggahFileGambar.value = f
}

async function kirimUnggahAset() {
  if (!unggahFileModel.value) {
    unggahError.value = 'Pilih file model 3D (.glb, .gltf, .obj, atau .dae) terlebih dahulu.'
    return
  }
  if (!unggahNama.value.trim()) {
    unggahError.value = 'Nama aset wajib diisi.'
    return
  }
  unggahSibuk.value = true
  unggahError.value = ''
  try {
    const fd = new FormData()
    fd.append('nama_dekorasi', unggahNama.value.trim())
    fd.append('kategori', unggahKategori.value)
    fd.append('harga', String(Math.max(0, Number(unggahHarga.value) || 0)))
    fd.append('panjang', String(Math.max(10, Number(unggahPanjang.value) || 150)))
    fd.append('lebar', String(Math.max(10, Number(unggahLebar.value) || 150)))
    fd.append('tinggi', String(Math.max(10, Number(unggahTinggi.value) || 150)))
    fd.append('visibility', 'private')
    fd.append('model_3d_source', 'upload')
    fd.append('model_3d', unggahFileModel.value)
    if (unggahFileGambar.value) {
      fd.append('gambar', unggahFileGambar.value)
    }

    const res = await fetch(`${API}/dekorasi`, {
      method: 'POST',
      headers: auth.authHeader(),
      body: fd,
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.pesan || 'Gagal mengunggah aset 3D.')

    const created = body.data
    await muatKatalog()
    selectedCategory.value = '__saya__'
    modalUnggah.value = false
    if (unggahLangsungMasuk.value && created) {
      emit('add-decoration', created)
    }
  } catch (err) {
    unggahError.value = err.message || 'Terjadi kesalahan saat mengunggah aset.'
  } finally {
    unggahSibuk.value = false
  }
}

async function muatKatalog() {
  sibuk.value = true
  try {
    const [resSaya, resKom] = await Promise.all([
      fetch(`${API}/dekorasi?scope=mine`, { headers: auth.authHeader() }),
      fetch(`${API}/dekorasi?scope=community`, { headers: auth.authHeader() }),
    ])
    const dataSaya = await resSaya.json().catch(() => ({}))
    const dataKom = await resKom.json().catch(() => ({}))
    if (resSaya.ok) daftarSaya.value = (dataSaya.data || []).filter((d) => d.is_active)
    if (resKom.ok) daftarKomunitas.value = (dataKom.data || []).filter((d) => d.is_active)
  } finally {
    sibuk.value = false
  }
}

const daftarKategori = computed(() => {
  const map = new Map()
  for (const d of daftarKomunitas.value) {
    const raw = String(d.kategori || 'Lainnya').trim() || 'Lainnya'
    if (!map.has(raw)) map.set(raw, [])
    map.get(raw).push(d)
  }
  const prioritas = ['Pelaminan', 'Backdrop', 'Kursi', 'Meja', 'Bunga', 'Lighting', 'Photobooth', 'Aksesoris']
  return Array.from(map.entries())
    .sort((a, b) => {
      const ia = prioritas.findIndex((p) => p.toLowerCase() === a[0].toLowerCase())
      const ib = prioritas.findIndex((p) => p.toLowerCase() === b[0].toLowerCase())
      if (ia !== -1 && ib !== -1) return ia - ib
      if (ia !== -1) return -1
      if (ib !== -1) return 1
      return a[0].localeCompare(b[0])
    })
    .map(([nama, items]) => ({ nama, count: items.length }))
})

const daftarFilter = computed(() => {
  const q = cari.value.trim().toLowerCase()
  let src = []
  if (selectedCategory.value === '__saya__') {
    src = daftarSaya.value
  } else if (selectedCategory.value) {
    src = daftarKomunitas.value.filter(
      (d) => (String(d.kategori || 'Lainnya').trim() || 'Lainnya') === selectedCategory.value
    )
  } else {
    // Jika sedang mencari dari tampilan root kategori, cari di seluruh katalog (Saya + Komunitas)
    src = [...daftarSaya.value, ...daftarKomunitas.value]
  }
  if (!q) return src
  return src.filter(
    (d) =>
      (d.nama_dekorasi || '').toLowerCase().includes(q) ||
      (d.kategori || '').toLowerCase().includes(q)
  )
})

const tampilkanGridAset = computed(() => Boolean(selectedCategory.value) || Boolean(cari.value.trim()))

function resolveThumbnail(d) {
  // 1. Gambar asli dekorasi yang diunggah (jika ada & tidak gagal dimuat)
  if (d?.gambar && !gagalMuatGambar.value[`img_${d.id}`]) {
    let url = d.gambar.startsWith('http') ? d.gambar : `http://localhost:3000${d.gambar}`
    if (d.visibility === 'private' && auth?.token) {
      url += `${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(auth.token)}`
    }
    return { src: url, isPhoto: true }
  }
  // 2. Thumbnail resmi dari Model3DLibrary (jika ada)
  if (d?.Model3DLibrary?.thumbnail_path && !gagalMuatGambar.value[`lib_${d.id}`]) {
    const tp = d.Model3DLibrary.thumbnail_path
    const url = tp.startsWith('http') ? tp : `http://localhost:3000${tp}`
    return { src: url, isPhoto: true }
  }
  // 3. Preview render 3D nyata dari objek prosedural yang sama persis dengan yang masuk ke workspace
  const preview3d = renderAssetThumbnail(d)
  if (preview3d) {
    return { src: preview3d, isPhoto: false }
  }
  return { src: '', isPhoto: false }
}

function onThumbError(d) {
  if (d?.gambar && !gagalMuatGambar.value[`img_${d.id}`]) {
    gagalMuatGambar.value = { ...gagalMuatGambar.value, [`img_${d.id}`]: true }
  } else if (d?.Model3DLibrary?.thumbnail_path && !gagalMuatGambar.value[`lib_${d.id}`]) {
    gagalMuatGambar.value = { ...gagalMuatGambar.value, [`lib_${d.id}`]: true }
  }
}

function ikonKategori(kategori) {
  const k = String(kategori || '').toLowerCase()
  if (k.includes('pelaminan') || k.includes('backdrop')) return 'fa-archway'
  if (k.includes('meja') || k.includes('buffet')) return 'fa-table'
  if (k.includes('kursi') || k.includes('sofa')) return 'fa-chair'
  if (k.includes('bunga') || k.includes('flower')) return 'fa-spa'
  if (k.includes('lampu') || k.includes('lighting')) return 'fa-lightbulb'
  if (k.includes('photobooth')) return 'fa-camera-retro'
  if (k.includes('karpet')) return 'fa-rug'
  return 'fa-cube'
}

const basicShapes = [
  { shape: 'box', label: 'Kotak / Panggung', icon: 'fa-cube', w: 2, h: 0.5, d: 2 },
  { shape: 'cylinder', label: 'Tiang / Pilar', icon: 'fa-database', w: 0.4, h: 3, d: 0.4 },
  { shape: 'sphere', label: 'Bola Dekoratif', icon: 'fa-circle', w: 0.8, h: 0.8, d: 0.8 },
  { shape: 'cone', label: 'Kerucut', icon: 'fa-play', w: 0.8, h: 1.2, d: 0.8 },
  { shape: 'plane', label: 'Alas / Karpet', icon: 'fa-square', w: 3, h: 0.04, d: 2 },
]

const texturePresets = [
  { id: 'none', label: 'Polos' },
  { id: 'wood', label: 'Kayu' },
  { id: 'marble', label: 'Marmer' },
  { id: 'carpet', label: 'Karpet' },
  { id: 'grass', label: 'Rumput' },
  { id: 'plaster', label: 'Plester' },
]

onMounted(muatKatalog)
</script>

<template>
  <aside class="flex h-full flex-col overflow-hidden rounded-2xl border border-white/80 bg-[#F7F7F8]/95 shadow-[0_8px_28px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80 backdrop-blur-md">
    <!-- Header Panel Kiri (bergaya referensi: ikon + judul + tombol tutup panah) -->
    <div class="border-b border-slate-200/80 px-3 pt-2.5 pb-2 space-y-2">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <i
            :class="[
              'fa-solid text-xs text-[#CF2C2F]',
              mainTab === 'struktur' ? 'fa-cubes' : mainTab === 'aset' ? 'fa-folder-open' : 'fa-palette',
            ]"
          ></i>
          <span class="truncate text-sm font-semibold text-slate-900">
            {{ mainTab === 'struktur' ? 'Struktur' : mainTab === 'aset' ? 'Aset' : 'Tampilan' }}
          </span>
        </div>
        <button
          type="button"
          class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-white hover:text-[#CF2C2F] transition"
          title="Tutup Panel Kiri"
          aria-label="Tutup Panel Kiri"
          @click="$emit('tutup')"
        >
          <i class="fa-solid fa-chevron-left text-xs"></i>
        </button>
      </div>

      <!-- Segmented Tab Kontrol -->
      <div class="grid grid-cols-3 gap-1 rounded-xl bg-slate-200/60 p-1 text-xs font-medium">
        <button
          type="button"
          class="rounded-lg py-1 transition"
          :class="mainTab === 'struktur' ? 'bg-white text-[#CF2C2F] font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'"
          @click="mainTab = 'struktur'"
        >
          Struktur
        </button>
        <button
          type="button"
          class="rounded-lg py-1 transition"
          :class="mainTab === 'aset' ? 'bg-white text-[#CF2C2F] font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'"
          @click="mainTab = 'aset'"
        >
          Aset
        </button>
        <button
          type="button"
          class="rounded-lg py-1 transition"
          :class="mainTab === 'tampilan' ? 'bg-white text-[#CF2C2F] font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'"
          @click="mainTab = 'tampilan'"
        >
          Tampilan
        </button>
      </div>
    </div>

    <!-- TAB 1: ALAT STRUKTUR & BENTUK DASAR -->
    <div v-show="mainTab === 'struktur'" class="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
      <div class="space-y-2">
        <p class="text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">Konstruksi Venue</p>

        <button
          type="button"
          class="flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition"
          :class="activeTool === 'wall' ? 'border-[#CF2C2F] bg-red-50 text-[#7F1125]' : 'border-slate-200 bg-white text-slate-700 hover:border-red-300'"
          @click="$emit('set-tool', activeTool === 'wall' ? 'select' : 'wall')"
        >
          <div class="flex items-center gap-2.5">
            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-[#CF2C2F]">
              <i class="fa-solid fa-pen-ruler"></i>
            </span>
            <div>
              <p class="font-semibold">Gambar Tembok</p>
              <p class="text-[0.6875rem] text-slate-500">Klik garis di lantai, Enter selesai</p>
            </div>
          </div>
          <span v-if="activeTool === 'wall'" class="rounded-full bg-[#CF2C2F] px-2 py-0.5 text-[0.625rem] font-semibold text-white">Aktif</span>
        </button>

        <button
          type="button"
          class="flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition"
          :class="activeTool === 'door' ? 'border-[#CF2C2F] bg-red-50 text-[#7F1125]' : 'border-slate-200 bg-white text-slate-700 hover:border-red-300'"
          @click="$emit('set-tool', activeTool === 'door' ? 'select' : 'door')"
        >
          <div class="flex items-center gap-2.5">
            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-[#CF2C2F]">
              <i class="fa-solid fa-door-open"></i>
            </span>
            <div>
              <p class="font-semibold">Pasang Pintu</p>
              <p class="text-[0.6875rem] text-slate-500">Klik tembok untuk bukaan pintu</p>
            </div>
          </div>
          <span v-if="activeTool === 'door'" class="rounded-full bg-[#CF2C2F] px-2 py-0.5 text-[0.625rem] font-semibold text-white">Aktif</span>
        </button>

        <button
          type="button"
          class="flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition"
          :class="activeTool === 'window' ? 'border-[#CF2C2F] bg-red-50 text-[#7F1125]' : 'border-slate-200 bg-white text-slate-700 hover:border-red-300'"
          @click="$emit('set-tool', activeTool === 'window' ? 'select' : 'window')"
        >
          <div class="flex items-center gap-2.5">
            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-[#CF2C2F]">
              <i class="fa-solid fa-window-maximize"></i>
            </span>
            <div>
              <p class="font-semibold">Pasang Jendela</p>
              <p class="text-[0.6875rem] text-slate-500">Klik tembok untuk bukaan jendela</p>
            </div>
          </div>
          <span v-if="activeTool === 'window'" class="rounded-full bg-[#CF2C2F] px-2 py-0.5 text-[0.625rem] font-semibold text-white">Aktif</span>
        </button>

        <button
          type="button"
          class="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-slate-700 hover:border-red-300 transition"
          @click="$emit('toggle-ceiling')"
        >
          <div class="flex items-center gap-2.5">
            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <i class="fa-solid fa-layer-group"></i>
            </span>
            <div>
              <p class="font-semibold">{{ hasCeiling ? 'Hapus Plafon' : 'Tambah Plafon' }}</p>
              <p class="text-[0.6875rem] text-slate-500">Opsional untuk venue indoor</p>
            </div>
          </div>
          <i :class="['fa-solid text-xs', hasCeiling ? 'fa-check text-emerald-600' : 'fa-plus text-[#CF2C2F]']"></i>
        </button>
      </div>

      <!-- Bentuk Dasar -->
      <div class="space-y-2 border-t border-slate-100 pt-3">
        <p class="text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">Bentuk Dasar</p>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="b in basicShapes"
            :key="b.shape"
            type="button"
            class="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center hover:border-[#CF2C2F] hover:bg-red-50/60 transition"
            @click="$emit('add-primitive', b)"
          >
            <i :class="['fa-solid text-base text-[#CF2C2F]', b.icon]"></i>
            <span class="text-[0.6875rem] font-semibold text-slate-700 leading-tight">{{ b.label }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- TAB 2: KATALOG ASET DEKORASI (GAMBAR ASLI / PREVIEW 3D NYATA + UNGGAH SKETCHUP/3D) -->
    <div v-show="mainTab === 'aset'" class="flex flex-1 flex-col overflow-hidden">
      <!-- Tombol Kartu Unggah Aset (klik atau drag-and-drop file 3D langsung ke sini) -->
      <div class="p-2.5 pb-1.5">
        <button
          type="button"
          class="group flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left shadow-2xs transition"
          :class="
            isDraggingCard
              ? 'border-[#CF2C2F] border-dashed bg-red-50/70 scale-[1.01]'
              : 'border-slate-200/90 bg-white hover:border-[#CF2C2F] hover:bg-red-50/40'
          "
          @click="bukaModalUnggah()"
          @dragenter.prevent="isDraggingCard = true"
          @dragover.prevent="isDraggingCard = true"
          @dragleave.prevent="isDraggingCard = false"
          @drop.prevent="onDropQuickCard"
        >
          <span class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#CF2C2F] text-white shadow-xs group-hover:bg-[#B82225] transition">
            <i class="fa-solid fa-arrow-up-from-bracket text-xs"></i>
          </span>
          <div class="min-w-0 leading-tight">
            <p class="text-xs font-semibold text-slate-900">
              {{ isDraggingCard ? 'Lepaskan File 3D di Sini' : 'Unggah Aset 3D' }}
            </p>
            <p class="mt-0.5 truncate text-[0.625rem] text-slate-500">Klik atau tarik GLB · OBJ · DAE</p>
          </div>
        </button>
      </div>

      <!-- Pencarian + Breadcrumb Kategori -->
      <div class="px-2.5 pb-2 space-y-1.5 border-b border-slate-100">
        <div v-if="selectedCategory" class="flex items-center justify-between gap-1.5">
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-white hover:text-[#CF2C2F] transition"
            @click="selectedCategory = null; cari = ''"
          >
            <i class="fa-solid fa-chevron-left text-[0.625rem]"></i>
            <span class="truncate">{{ selectedCategory === '__saya__' ? 'Aset Saya' : selectedCategory.toUpperCase() }}</span>
          </button>
          <span class="rounded-full bg-slate-200/70 px-2 py-0.5 text-[0.625rem] font-semibold text-slate-600">
            {{ daftarFilter.length }}
          </span>
        </div>

        <input
          v-model="cari"
          type="search"
          :placeholder="selectedCategory ? 'Cari di kategori ini…' : 'Cari semua aset…'"
          class="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-[#CF2C2F] focus:outline-none"
        />
      </div>

      <!-- Tampilan 1: Daftar Folder Kategori (seperti referensi asset section.png) -->
      <div v-if="!tampilkanGridAset" class="flex-1 overflow-y-auto p-2.5 space-y-2">
        <!-- Folder Aset Saya -->
        <button
          type="button"
          class="group flex w-full items-center justify-between gap-2.5 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-[#CF2C2F] hover:bg-red-50/40 transition"
          @click="selectedCategory = '__saya__'"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-red-50 text-[#CF2C2F]">
              <i class="fa-solid fa-user text-xs"></i>
            </span>
            <span class="truncate text-xs font-semibold text-slate-800">Aset Saya</span>
          </div>
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[0.625rem] font-semibold text-slate-500">
              {{ daftarSaya.length }}
            </span>
            <i class="fa-solid fa-chevron-right text-[0.625rem] text-slate-400 group-hover:text-[#CF2C2F] transition"></i>
          </div>
        </button>

        <!-- Folder Per Kategori Dekorasi -->
        <button
          v-for="kat in daftarKategori"
          :key="kat.nama"
          type="button"
          class="group flex w-full items-center justify-between gap-2.5 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-[#CF2C2F] hover:bg-red-50/40 transition"
          @click="selectedCategory = kat.nama"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-red-50 group-hover:text-[#CF2C2F] transition">
              <i class="fa-solid fa-folder text-xs"></i>
            </span>
            <span class="truncate text-xs font-bold uppercase tracking-wide text-slate-800">{{ kat.nama }}</span>
          </div>
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[0.625rem] font-semibold text-slate-500">
              {{ kat.count }}
            </span>
            <i class="fa-solid fa-chevron-right text-[0.625rem] text-slate-400 group-hover:text-[#CF2C2F] transition"></i>
          </div>
        </button>
      </div>

      <!-- Tampilan 2: Grid Aset di dalam Kategori / Hasil Pencarian -->
      <div v-else class="flex-1 overflow-y-auto p-2.5">
        <div v-if="sibuk && !daftarFilter.length" class="py-8 text-center text-xs text-slate-400">Memuat katalog…</div>
        <div v-else-if="!daftarFilter.length" class="py-8 text-center text-xs text-slate-400">Tidak ada dekorasi ditemukan.</div>
        <div v-else class="grid grid-cols-2 gap-2">
          <button
            v-for="d in daftarFilter"
            :key="d.id"
            type="button"
            class="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left hover:border-[#CF2C2F] hover:shadow-xs transition"
            @click="$emit('add-decoration', d)"
          >
            <div class="relative aspect-[4/3] w-full bg-slate-50 overflow-hidden">
              <img
                v-if="resolveThumbnail(d).src"
                :src="resolveThumbnail(d).src"
                :alt="d.nama_dekorasi"
                class="h-full w-full transition-transform duration-200 group-hover:scale-105"
                :class="resolveThumbnail(d).isPhoto ? 'object-cover' : 'object-contain p-1'"
                loading="lazy"
                @error="onThumbError(d)"
              />
              <div v-else class="flex h-full w-full flex-col items-center justify-center gap-1 bg-slate-100 text-slate-400">
                <i :class="['fa-solid text-lg', ikonKategori(d.kategori)]"></i>
                <span class="text-[0.625rem] font-medium">{{ d.kategori }}</span>
              </div>
              <span class="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/95 text-[#CF2C2F] shadow-2xs ring-1 ring-slate-200 group-hover:bg-[#CF2C2F] group-hover:text-white transition">
                <i class="fa-solid fa-plus text-[0.625rem]"></i>
              </span>
            </div>
            <div class="p-1.5">
              <p class="truncate text-[0.6875rem] font-semibold text-slate-800" :title="d.nama_dekorasi">{{ d.nama_dekorasi }}</p>
              <p class="text-[0.625rem] text-slate-400">{{ d.panjang }}×{{ d.lebar }}×{{ d.tinggi }} cm</p>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- TAB 3: TAMPILAN WORKSPACE (MATERIAL LANTAI, PENCAHAYAAN, KUALITAS) -->
    <div v-show="mainTab === 'tampilan'" class="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
      <!-- Material Lantai -->
      <div class="space-y-2.5">
        <p class="text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">Material Lantai</p>

        <div class="flex items-center justify-between">
          <span class="text-slate-600 font-medium">Warna Dasar</span>
          <input
            type="color"
            :value="sceneSettings.floor.color"
            class="h-7 w-10 cursor-pointer rounded border border-slate-200"
            @input="$emit('update-floor', { color: $event.target.value })"
          />
        </div>

        <div>
          <span class="block text-slate-600 font-medium mb-1">Tekstur Lantai</span>
          <div class="grid grid-cols-3 gap-1">
            <button
              v-for="t in texturePresets"
              :key="t.id"
              type="button"
              class="rounded-lg border py-1 text-[0.6875rem] font-medium transition"
              :class="sceneSettings.floor.texturePreset === t.id ? 'border-[#CF2C2F] bg-red-50 text-[#CF2C2F] font-semibold' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
              @click="$emit('update-floor', { texturePreset: t.id })"
            >
              {{ t.label }}
            </button>
          </div>
        </div>

        <label class="block">
          <div class="flex justify-between text-xs text-slate-600 mb-1">
            <span>Kekasaran Permukaan</span>
            <span class="font-mono">{{ Number(sceneSettings.floor.roughness).toFixed(2) }}</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            :value="sceneSettings.floor.roughness"
            class="w-full accent-[#CF2C2F]"
            @input="$emit('update-floor', { roughness: Number($event.target.value) })"
          />
        </label>

        <label class="block">
          <div class="flex justify-between text-xs text-slate-600 mb-1">
            <span>Skala Tekstur</span>
            <span class="font-mono">{{ sceneSettings.floor.textureScale }}×</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="4"
            step="0.5"
            :value="sceneSettings.floor.textureScale"
            class="w-full accent-[#CF2C2F]"
            @input="$emit('update-floor', { textureScale: Number($event.target.value) })"
          />
        </label>
      </div>

      <!-- Pencahayaan -->
      <div class="space-y-2.5 border-t border-slate-100 pt-3">
        <p class="text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">Pencahayaan</p>

        <div class="grid grid-cols-3 gap-1">
          <button
            v-for="p in [{ id: 'morning', label: 'Pagi' }, { id: 'day', label: 'Siang' }, { id: 'evening', label: 'Sore' }]"
            :key="p.id"
            type="button"
            class="rounded-lg border py-1.5 text-xs font-medium transition"
            :class="sceneSettings.lighting.preset === p.id ? 'border-[#CF2C2F] bg-red-50 text-[#CF2C2F] font-semibold' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
            @click="$emit('update-lighting', { preset: p.id })"
          >
            {{ p.label }}
          </button>
        </div>

        <label class="block">
          <div class="flex justify-between text-xs text-slate-600 mb-1">
            <span>Cahaya Sekitar</span>
            <span class="font-mono">{{ Number(sceneSettings.lighting.ambientIntensity).toFixed(2) }}</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="2"
            step="0.05"
            :value="sceneSettings.lighting.ambientIntensity"
            class="w-full accent-[#CF2C2F]"
            @input="$emit('update-lighting', { ambientIntensity: Number($event.target.value) })"
          />
        </label>

        <label class="block">
          <div class="flex justify-between text-xs text-slate-600 mb-1">
            <span>Cahaya Utama</span>
            <span class="font-mono">{{ Number(sceneSettings.lighting.directionalIntensity).toFixed(2) }}</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="2.5"
            step="0.05"
            :value="sceneSettings.lighting.directionalIntensity"
            class="w-full accent-[#CF2C2F]"
            @input="$emit('update-lighting', { directionalIntensity: Number($event.target.value) })"
          />
        </label>

        <label class="flex items-center justify-between rounded-lg border border-slate-200 px-2.5 py-1.5 cursor-pointer">
          <span class="text-slate-700 font-medium">Aktifkan Bayangan</span>
          <input
            type="checkbox"
            :checked="sceneSettings.lighting.shadowsEnabled"
            class="accent-[#CF2C2F]"
            @change="$emit('update-lighting', { shadowsEnabled: $event.target.checked })"
          />
        </label>
      </div>

      <!-- Kualitas Grafis -->
      <div class="space-y-2 border-t border-slate-100 pt-3">
        <p class="text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">Kualitas Grafis</p>
        <div class="grid grid-cols-3 gap-1">
          <button
            v-for="q in [{ id: 'low', label: 'Rendah' }, { id: 'medium', label: 'Sedang' }, { id: 'high', label: 'Tinggi' }]"
            :key="q.id"
            type="button"
            class="rounded-lg border py-1 text-xs font-medium transition"
            :class="sceneSettings.quality === q.id ? 'border-[#CF2C2F] bg-red-50 text-[#CF2C2F] font-semibold' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
            @click="$emit('set-quality', q.id)"
          >
            {{ q.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Unggah Aset 3D / Ekspor SketchUp -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="modalUnggah"
          role="dialog"
          aria-modal="true"
          class="fixed inset-0 z-[80] flex items-center justify-center bg-licorice/50 p-4 backdrop-blur-[3px]"
          @click.self="!unggahSibuk && (modalUnggah = false)"
        >
          <div class="ws-paper-card relative w-full max-w-[390px] overflow-hidden rounded-[20px] bg-marshmallow shadow-[5px_5px_0px_#7F1125]">
            <div class="bg-grid-subtle px-5 pt-5 pb-4">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <span class="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-licorice bg-marshmallow px-2.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.1em] text-licorice shadow-[2px_2px_0px_#7F1125]">
                    <span class="h-1.5 w-1.5 rounded-full bg-cherry"></span>
                    <span>Aset 3D / SketchUp</span>
                  </span>
                  <h2 class="font-heading mt-2 text-2xl leading-tight font-bold text-licorice">
                    Unggah Aset 3D
                  </h2>
                </div>
                <button
                  type="button"
                  :disabled="unggahSibuk"
                  class="flex h-7 w-7 items-center justify-center rounded-lg border border-licorice/40 bg-paper text-xs text-licorice hover:bg-strawberry transition"
                  title="Tutup"
                  @click="modalUnggah = false"
                >
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>

              <p v-if="unggahError" class="mt-3 rounded-lg border border-cherry bg-strawberry/80 px-2.5 py-1.5 text-[0.72rem] font-semibold text-cherry">
                {{ unggahError }}
              </p>

              <form class="mt-3.5 space-y-2.5 text-xs" @submit.prevent="kirimUnggahAset">
                <div>
                  <label class="block text-[0.6875rem] font-bold text-licorice mb-1">File Model 3D (.glb, .gltf, .obj, .dae)</label>
                  <input
                    ref="inputModelRef"
                    type="file"
                    accept=".glb,.gltf,.obj,.dae,.skp"
                    class="hidden"
                    @change="onPilihFileModel3D"
                  />
                  <div
                    role="button"
                    tabindex="0"
                    class="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-3 py-4 text-center cursor-pointer transition"
                    :class="
                      isDraggingModel
                        ? 'border-cherry bg-strawberry/45 scale-[1.01]'
                        : unggahFileModel
                          ? 'border-licorice/60 bg-paper'
                          : 'border-licorice/40 bg-paper hover:border-cherry hover:bg-strawberry/20'
                    "
                    @click="inputModelRef?.click()"
                    @keydown.enter.prevent="inputModelRef?.click()"
                    @dragenter.prevent="isDraggingModel = true"
                    @dragover.prevent="isDraggingModel = true"
                    @dragleave.prevent="isDraggingModel = false"
                    @drop.prevent="onDropModel3D"
                  >
                    <template v-if="unggahFileModel">
                      <div class="flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-licorice bg-strawberry/70 text-cherry">
                        <i class="fa-solid fa-cube text-sm"></i>
                      </div>
                      <p class="max-w-full truncate text-xs font-bold text-licorice">{{ unggahFileModel.name }}</p>
                      <p class="text-[0.65rem] text-muted">
                        {{ formatUkuranFile(unggahFileModel.size) }} • Klik atau tarik file lain untuk mengganti
                      </p>
                    </template>
                    <template v-else>
                      <div class="flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-licorice bg-marshmallow text-cherry shadow-[2px_2px_0px_#7F1125]">
                        <i class="fa-solid fa-cloud-arrow-up text-sm"></i>
                      </div>
                      <p class="text-xs font-bold text-licorice">
                        {{ isDraggingModel ? 'Lepaskan file 3D di sini' : 'Tarik & lepas file 3D ke sini' }}
                      </p>
                      <p class="text-[0.65rem] text-muted">atau klik untuk memilih file (.glb, .gltf, .obj, .dae)</p>
                    </template>
                  </div>
                  <p class="mt-1 text-[0.65rem] text-muted leading-snug">
                    Dari SketchUp: pilih <strong>File → Export → 3D Model</strong> lalu simpan sebagai <strong>.dae</strong>, <strong>.obj</strong>, atau <strong>.glb</strong>.
                  </p>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <label class="block">
                    <span class="text-[0.6875rem] font-bold text-licorice">Nama Aset</span>
                    <input v-model="unggahNama" type="text" placeholder="mis. Kursi Pelaminan" class="ws-input mt-0.5 py-1.5 text-xs" />
                  </label>
                  <label class="block">
                    <span class="text-[0.6875rem] font-bold text-licorice">Kategori</span>
                    <select v-model="unggahKategori" class="ws-input mt-0.5 py-1.5 text-xs">
                      <option v-for="k in kategoriOpsi" :key="k" :value="k">{{ k }}</option>
                    </select>
                  </label>
                </div>

                <div class="grid grid-cols-3 gap-1.5">
                  <label class="block">
                    <span class="text-[0.65rem] font-bold text-licorice">Panjang (cm)</span>
                    <input v-model.number="unggahPanjang" type="number" min="10" class="ws-input mt-0.5 py-1 text-xs" />
                  </label>
                  <label class="block">
                    <span class="text-[0.65rem] font-bold text-licorice">Lebar (cm)</span>
                    <input v-model.number="unggahLebar" type="number" min="10" class="ws-input mt-0.5 py-1 text-xs" />
                  </label>
                  <label class="block">
                    <span class="text-[0.65rem] font-bold text-licorice">Tinggi (cm)</span>
                    <input v-model.number="unggahTinggi" type="number" min="10" class="ws-input mt-0.5 py-1 text-xs" />
                  </label>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <label class="block">
                    <span class="text-[0.65rem] font-bold text-licorice">Harga Sewa (Rp)</span>
                    <input v-model.number="unggahHarga" type="number" min="0" step="10000" class="ws-input mt-0.5 py-1 text-xs" />
                  </label>
                  <label class="block">
                    <span class="text-[0.65rem] font-bold text-licorice">Gambar Preview (Opsional)</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      class="mt-0.5 w-full rounded-xl border-[1.5px] border-licorice bg-paper px-1.5 py-1 text-[0.65rem] text-licorice cursor-pointer"
                      @change="onPilihFileGambar"
                    />
                  </label>
                </div>

                <label class="flex items-center gap-2 pt-0.5 text-[0.72rem] font-semibold text-licorice cursor-pointer">
                  <input v-model="unggahLangsungMasuk" type="checkbox" class="accent-cherry" />
                  <span>Langsung tambahkan ke Workspace 3D setelah diunggah</span>
                </label>

                <div class="flex gap-2 pt-1">
                  <button
                    type="button"
                    :disabled="unggahSibuk"
                    class="ws-btn-paper flex-1 py-2 text-[0.72rem]"
                    @click="modalUnggah = false"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    :disabled="unggahSibuk"
                    class="ws-btn-cherry flex-1 gap-1.5 py-2 text-[0.72rem] disabled:opacity-60"
                  >
                    <i v-if="unggahSibuk" class="fa-solid fa-circle-notch fa-spin"></i>
                    <i v-else class="fa-solid fa-arrow-up-from-bracket"></i>
                    <span>{{ unggahSibuk ? 'Mengunggah…' : 'Unggah Aset' }}</span>
                  </button>
                </div>
              </form>
            </div>
            <div class="h-1.5 w-full bg-stripes-violet border-t-[1.5px] border-licorice/25"></div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </aside>
</template>
