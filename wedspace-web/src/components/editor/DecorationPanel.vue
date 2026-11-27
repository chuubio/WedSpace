<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import {
  hasGlbModel,
  renderAsset2DFrontThumbnail,
  loadAsset2DFrontThumbnail,
} from '../../utils/workspace3d/AssetThumbnail'

defineProps({
  terbuka: { type: Boolean, default: false },
})

const emit = defineEmits(['tambah-item', 'tutup'])

const auth = useAuthStore()
const API = 'http://localhost:3000/api'

const selectedCategory = ref(null) // null = daftar folder | '__saya__' | '<NamaKategori>'
const cari = ref('')
const daftarSaya = ref([])
const daftarKomunitas = ref([])
const sibuk = ref(false)
const error = ref('')
const gagalMuatGambar = ref({})

// State Modal Unggah Aset 2D (PNG / JPG / WebP)
const modalUnggah = ref(false)
const unggahSibuk = ref(false)
const unggahError = ref('')
const unggahNama = ref('')
const unggahKategori = ref('Aksesoris')
const unggahPanjang = ref(150)
const unggahLebar = ref(150)
const unggahHarga = ref(0)
const unggahLangsungMasuk = ref(true)
const unggahFileGambar = ref(null)
const unggahPreviewUrl = ref('')
const isDraggingGambar = ref(false)
const isDraggingCard = ref(false)
const inputGambarRef = ref(null)

const kategoriOpsi = [
  'Pelaminan',
  'Backdrop',
  'Kursi',
  'Meja',
  'Bunga',
  'Lighting',
  'Photobooth',
  'Welcome Sign',
  'Meja Buffet',
  'Karpet',
  'Aksesoris',
]

function bersihkanPreviewUrl() {
  if (unggahPreviewUrl.value) {
    URL.revokeObjectURL(unggahPreviewUrl.value)
    unggahPreviewUrl.value = ''
  }
}

function bukaModalUnggah(initialFile = null) {
  bersihkanPreviewUrl()
  unggahError.value = ''
  unggahNama.value = ''
  unggahKategori.value = selectedCategory.value && selectedCategory.value !== '__saya__'
    ? selectedCategory.value
    : 'Aksesoris'
  unggahPanjang.value = 150
  unggahLebar.value = 150
  unggahHarga.value = 0
  unggahLangsungMasuk.value = true
  unggahFileGambar.value = null
  isDraggingGambar.value = false
  modalUnggah.value = true
  if (initialFile) {
    terimaFileGambar2D(initialFile)
  }
}

function tutupModalUnggah() {
  if (unggahSibuk.value) return
  modalUnggah.value = false
  bersihkanPreviewUrl()
}

function formatUkuranFile(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function terimaFileGambar2D(f) {
  unggahError.value = ''
  if (!f) return false
  const ext = (f.name.split('.').pop() || '').toLowerCase()
  const tipeValid = /^image\/(png|jpe?g|webp)$/i.test(f.type) || ['png', 'jpg', 'jpeg', 'webp'].includes(ext)
  if (!tipeValid) {
    unggahError.value = 'Format tidak didukung. Gunakan gambar PNG, JPG, atau WebP.'
    return false
  }
  bersihkanPreviewUrl()
  unggahFileGambar.value = f
  unggahPreviewUrl.value = URL.createObjectURL(f)
  if (!unggahNama.value.trim()) {
    unggahNama.value = f.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim()
  }
  return true
}

function onPilihFileGambar2D(e) {
  const f = e.target.files?.[0]
  if (!f) return
  if (!terimaFileGambar2D(f)) {
    e.target.value = ''
  }
}

function onDropGambar2D(e) {
  isDraggingGambar.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) terimaFileGambar2D(f)
}

function onDropQuickCard(e) {
  isDraggingCard.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) bukaModalUnggah(f)
}

async function kirimUnggahAset2D() {
  if (!unggahFileGambar.value) {
    unggahError.value = 'Pilih file gambar 2D (PNG, JPG, atau WebP) terlebih dahulu.'
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
    fd.append('harga', String(Math.max(0, Math.round(Number(unggahHarga.value) || 0))))
    fd.append('panjang', String(Math.max(10, Number(unggahPanjang.value) || 150)))
    fd.append('lebar', String(Math.max(10, Number(unggahLebar.value) || 150)))
    fd.append('tinggi', '100')
    fd.append('visibility', 'private')
    fd.append('model_3d_source', 'placeholder')
    fd.append('gambar', unggahFileGambar.value)

    const res = await fetch(`${API}/dekorasi`, {
      method: 'POST',
      headers: auth.authHeader(),
      body: fd,
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.pesan || 'Gagal mengunggah aset 2D.')

    const created = body.data
    await muatSemua()
    selectedCategory.value = '__saya__'
    modalUnggah.value = false
    bersihkanPreviewUrl()
    if (unggahLangsungMasuk.value && created) {
      emit('tambah-item', created)
    }
  } catch (err) {
    unggahError.value = err.message || 'Terjadi kesalahan saat mengunggah aset 2D.'
  } finally {
    unggahSibuk.value = false
  }
}

async function muatKatalogSaya() {
  const res = await fetch(`${API}/dekorasi?scope=mine`, { headers: auth.authHeader() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.pesan || 'Gagal memuat Katalog Saya.')
  daftarSaya.value = (data.data || []).filter((d) => d.is_active)
}

async function muatKatalogKomunitas() {
  const res = await fetch(`${API}/dekorasi?scope=community`, { headers: auth.authHeader() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.pesan || 'Gagal memuat Katalog Komunitas.')
  daftarKomunitas.value = (data.data || []).filter((d) => d.is_active)
}

async function muatSemua() {
  sibuk.value = true
  error.value = ''
  try {
    await Promise.all([muatKatalogSaya(), muatKatalogKomunitas()])
  } catch (err) {
    error.value = err instanceof TypeError
      ? 'Tidak dapat terhubung ke server untuk memuat katalog.'
      : err.message || 'Gagal memuat katalog dekorasi.'
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
  const prioritas = ['Pelaminan', 'Backdrop', 'Kursi', 'Meja', 'Bunga', 'Lighting', 'Photobooth', 'Welcome Sign', 'Meja Buffet', 'Karpet', 'Aksesoris']
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
const front2DThumbs = ref({})

function muatFront2DUntukDaftar(list) {
  for (const d of list || []) {
    if (!d?.id || front2DThumbs.value[d.id] || !hasGlbModel(d)) continue
    loadAsset2DFrontThumbnail(d, auth.token).then((url) => {
      if (url) {
        front2DThumbs.value = { ...front2DThumbs.value, [d.id]: url }
      }
    })
  }
}

watch(
  [tampilkanGridAset, daftarFilter],
  ([show, list]) => {
    if (show && list.length) {
      muatFront2DUntukDaftar(list)
    }
  },
  { immediate: true }
)

function resolveThumbnail(d) {
  if (!d) return { src: '', isPhoto: false }
  // 1. Jika aset khusus unggahan 2D (punya gambar dan bukan model GLB), tampilkan gambar aslinya
  if (d.gambar && !hasGlbModel(d) && !gagalMuatGambar.value[`img_${d.id}`]) {
    let url = d.gambar.startsWith('http') ? d.gambar : `http://localhost:3000${d.gambar}`
    if (d.visibility === 'private' && auth?.token) {
      url += `${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(auth.token)}`
    }
    return { src: url, isPhoto: false }
  }
  // 2. Render tampak depan lurus (ortografis, latar transparan) khusus katalog 2D
  if (front2DThumbs.value[d.id]) {
    return { src: front2DThumbs.value[d.id], isPhoto: false }
  }
  const preview = renderAsset2DFrontThumbnail(d)
  if (preview) return { src: preview, isPhoto: false }
  return { src: '', isPhoto: false }
}

function onThumbError(d) {
  if (d?.gambar && !gagalMuatGambar.value[`img_${d.id}`]) {
    gagalMuatGambar.value = { ...gagalMuatGambar.value, [`img_${d.id}`]: true }
  }
}

function onDragStart(e, d) {
  e.dataTransfer.effectAllowed = 'copy'
  e.dataTransfer.setData('application/json', JSON.stringify(d))
}

function tambahKeCanvas(d) {
  emit('tambah-item', d)
}

defineExpose({ muatSemua })

onMounted(muatSemua)
onUnmounted(bersihkanPreviewUrl)
</script>

<template>
  <aside class="flex h-full flex-col overflow-hidden rounded-2xl border border-white/80 bg-[#F7F7F8]/95 shadow-[0_8px_28px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80 backdrop-blur-md">
    <!-- Header Panel Kiri (identik dengan Workspace 3D) -->
    <div class="flex items-center justify-between border-b border-slate-200/80 px-3.5 py-2.5">
      <div class="flex items-center gap-2 min-w-0">
        <i class="fa-solid fa-folder-open text-xs text-[#CF2C2F]"></i>
        <span class="truncate text-sm font-semibold text-slate-900">Aset</span>
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

    <!-- Tombol Kartu Unggah Aset 2D (klik atau drag-and-drop gambar langsung ke sini) -->
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
            {{ isDraggingCard ? 'Lepaskan Gambar 2D di Sini' : 'Unggah Aset 2D' }}
          </p>
          <p class="mt-0.5 truncate text-[0.625rem] text-slate-500">Klik atau tarik PNG · JPG · WebP</p>
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

    <!-- Loading / Error -->
    <div v-if="sibuk && !daftarSaya.length && !daftarKomunitas.length" class="flex-1 py-10 text-center text-xs text-slate-400">
      <i class="fa-solid fa-circle-notch fa-spin text-base text-[#CF2C2F]"></i>
      <p class="mt-2">Memuat katalog…</p>
    </div>
    <div v-else-if="error && !daftarSaya.length && !daftarKomunitas.length" class="flex-1 py-8 px-3 text-center text-xs">
      <i class="fa-solid fa-circle-exclamation text-xl text-[#CF2C2F] mb-2"></i>
      <p class="font-semibold text-slate-800">Gagal Memuat Aset</p>
      <p class="mt-1 text-slate-500">{{ error }}</p>
      <button type="button" class="mt-3 rounded-lg bg-[#CF2C2F] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#B82225]" @click="muatSemua">
        Coba Lagi
      </button>
    </div>

    <!-- Tampilan 1: Daftar Folder Kategori (identik dengan Workspace 3D) -->
    <div v-else-if="!tampilkanGridAset" class="flex-1 overflow-y-auto p-2.5 space-y-2">
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

    <!-- Tampilan 2: Grid Aset 2 Kolom (klik atau seret ke kanvas 2D) -->
    <div v-else class="flex-1 overflow-y-auto p-2.5">
      <div v-if="!daftarFilter.length" class="py-8 text-center text-xs text-slate-400">
        Tidak ada dekorasi ditemukan.
      </div>
      <div v-else class="grid grid-cols-2 gap-2">
        <div
          v-for="d in daftarFilter"
          :key="d.id"
          draggable="true"
          class="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left cursor-grab hover:border-[#CF2C2F] hover:shadow-xs active:cursor-grabbing transition"
          @dragstart="onDragStart($event, d)"
          @click="tambahKeCanvas(d)"
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
            <div v-else class="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
              <i class="fa-solid fa-cube text-lg"></i>
            </div>
            <span class="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/95 text-[#CF2C2F] shadow-2xs ring-1 ring-slate-200 group-hover:bg-[#CF2C2F] group-hover:text-white transition">
              <i class="fa-solid fa-plus text-[0.625rem]"></i>
            </span>
          </div>
          <div class="p-1.5">
            <p class="truncate text-[0.6875rem] font-semibold text-slate-800" :title="d.nama_dekorasi">{{ d.nama_dekorasi }}</p>
            <p class="text-[0.625rem] text-slate-400">{{ d.panjang }}×{{ d.lebar }} cm</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Unggah Aset 2D (PNG / JPG / WebP dengan drag-and-drop & preview) -->
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
          @click.self="tutupModalUnggah"
        >
          <div class="ws-paper-card relative w-full max-w-[390px] overflow-hidden rounded-[20px] bg-marshmallow shadow-[5px_5px_0px_#7F1125]">
            <div class="bg-grid-subtle px-5 pt-5 pb-4">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <span class="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-licorice bg-marshmallow px-2.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.1em] text-licorice shadow-[2px_2px_0px_#7F1125]">
                    <span class="h-1.5 w-1.5 rounded-full bg-cherry"></span>
                    <span>Aset Gambar 2D</span>
                  </span>
                  <h2 class="font-heading mt-2 text-2xl leading-tight font-bold text-licorice">
                    Unggah Aset 2D
                  </h2>
                </div>
                <button
                  type="button"
                  :disabled="unggahSibuk"
                  class="flex h-7 w-7 items-center justify-center rounded-lg border border-licorice/40 bg-paper text-xs text-licorice hover:bg-strawberry transition"
                  title="Tutup"
                  @click="tutupModalUnggah"
                >
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>

              <p v-if="unggahError" class="mt-3 rounded-lg border border-cherry bg-strawberry/80 px-2.5 py-1.5 text-[0.72rem] font-semibold text-cherry">
                {{ unggahError }}
              </p>

              <form class="mt-3.5 space-y-2.5 text-xs" @submit.prevent="kirimUnggahAset2D">
                <div>
                  <label class="block text-[0.6875rem] font-bold text-licorice mb-1">Gambar Aset 2D (.png, .jpg, .webp)</label>
                  <input
                    ref="inputGambarRef"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    class="hidden"
                    @change="onPilihFileGambar2D"
                  />
                  <div
                    role="button"
                    tabindex="0"
                    class="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-3 py-4 text-center cursor-pointer transition"
                    :class="
                      isDraggingGambar
                        ? 'border-cherry bg-strawberry/45 scale-[1.01]'
                        : unggahFileGambar
                          ? 'border-licorice/60 bg-paper'
                          : 'border-licorice/40 bg-paper hover:border-cherry hover:bg-strawberry/20'
                    "
                    @click="inputGambarRef?.click()"
                    @keydown.enter.prevent="inputGambarRef?.click()"
                    @dragenter.prevent="isDraggingGambar = true"
                    @dragover.prevent="isDraggingGambar = true"
                    @dragleave.prevent="isDraggingGambar = false"
                    @drop.prevent="onDropGambar2D"
                  >
                    <template v-if="unggahFileGambar">
                      <img
                        v-if="unggahPreviewUrl"
                        :src="unggahPreviewUrl"
                        alt="Preview aset 2D"
                        class="h-16 w-24 rounded-lg border border-licorice/20 bg-white object-contain p-1 shadow-2xs"
                      />
                      <p class="max-w-full truncate text-xs font-bold text-licorice">{{ unggahFileGambar.name }}</p>
                      <p class="text-[0.65rem] text-muted">
                        {{ formatUkuranFile(unggahFileGambar.size) }} • Klik atau tarik file lain untuk mengganti
                      </p>
                    </template>
                    <template v-else>
                      <div class="flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-licorice bg-marshmallow text-cherry shadow-[2px_2px_0px_#7F1125]">
                        <i class="fa-solid fa-image text-sm"></i>
                      </div>
                      <p class="text-xs font-bold text-licorice">
                        {{ isDraggingGambar ? 'Lepaskan gambar di sini' : 'Tarik & lepas gambar 2D ke sini' }}
                      </p>
                      <p class="text-[0.65rem] text-muted">atau klik untuk memilih file (PNG transparan disarankan)</p>
                    </template>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <label class="block">
                    <span class="text-[0.6875rem] font-bold text-licorice">Nama Aset</span>
                    <input v-model="unggahNama" type="text" placeholder="mis. Meja VIP Bulat" class="ws-input mt-0.5 py-1.5 text-xs" />
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
                    <span class="text-[0.65rem] font-bold text-licorice">Harga (Rp)</span>
                    <input v-model.number="unggahHarga" type="number" min="0" step="10000" class="ws-input mt-0.5 py-1 text-xs" />
                  </label>
                </div>

                <label class="flex items-center gap-2 pt-0.5 text-[0.72rem] font-semibold text-licorice cursor-pointer">
                  <input v-model="unggahLangsungMasuk" type="checkbox" class="accent-cherry" />
                  <span>Langsung tambahkan ke kanvas 2D setelah diunggah</span>
                </label>

                <div class="flex gap-2 pt-1">
                  <button
                    type="button"
                    :disabled="unggahSibuk"
                    class="ws-btn-paper flex-1 py-2 text-[0.72rem]"
                    @click="tutupModalUnggah"
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
