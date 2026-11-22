<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import EditorHeader from '../components/editor/EditorHeader.vue'
import EditorToolbar from '../components/editor/EditorToolbar.vue'
import DecorationPanel from '../components/editor/DecorationPanel.vue'
import LayoutCanvas from '../components/editor/LayoutCanvas.vue'
import PropertiesPanel from '../components/editor/PropertiesPanel.vue'
import ConfirmModal from '../components/ConfirmModal.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const API = 'http://localhost:3000/api'

// Data Proyek & Rancangan
const rancangan = ref(null)
const proyek = ref(null)
const items = ref([])
const selectedItemId = ref(null)

// Status Editor
const memuat = ref(true)
const menyimpan = ref(false)
const isDirty = ref(false)
const error = ref('')
const errorStatus = ref(null)
const pesanSukses = ref('')

// Pengaturan Kanvas
const zoom = ref(1.0)
const gridVisible = ref(true)
const snapToGrid = ref(true)
const canvasRef = ref(null)

// Tampilan Panel Responsif (Mobile / Drawer)
const sidebarKiriTerbuka = ref(false)
const sidebarKananTerbuka = ref(false)
const modalKeluar = ref(false)
const routeTujuanKeluar = ref(null)

// Dimensi Venue
const panjangVenue = computed(() => Number(proyek.value?.panjang_venue || 0))
const lebarVenue = computed(() => Number(proyek.value?.lebar_venue || 0))
const ukuranValid = computed(() => panjangVenue.value > 0 && lebarVenue.value > 0)

// Item yang Sedang Dipilih
const selectedItem = computed(() => {
  return items.value.find((i) => i.id === selectedItemId.value) || null
})

// Muat data rancangan dari backend
async function muatRancangan() {
  memuat.value = true
  error.value = ''
  errorStatus.value = null
  try {
    const res = await fetch(`${API}/rancangan/${route.params.id}`, {
      headers: auth.authHeader(),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      errorStatus.value = res.status
      if (res.status === 404) {
        throw new Error(data.pesan || 'Rancangan tidak ditemukan.')
      } else if (res.status === 403) {
        throw new Error(data.pesan || 'Kamu tidak memiliki akses ke rancangan ini.')
      } else {
        throw new Error(data.pesan || 'Gagal memuat rancangan layout.')
      }
    }

    rancangan.value = data.data
    proyek.value = data.data.proyek || data.data.Project || {}

    // Petakan items dari backend dengan ID unik untuk manipulasi client
    items.value = (data.data.DesignItems || []).map((di) => ({
      id: di.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      decoration_id: di.decoration_id,
      posisi_x: Number(di.posisi_x || 0),
      posisi_y: Number(di.posisi_y || 0),
      rotasi: Number(di.rotasi || 0),
      jumlah: Number(di.jumlah || 1),
      Decoration: di.Decoration || {},
    }))

    isDirty.value = false
  } catch (err) {
    error.value = err.message || 'Terjadi kesalahan saat memuat data.'
  } finally {
    memuat.value = false
  }
}

// Menambahkan dekorasi baru ke canvas
function onTambahItem(dekorasi, coords = null) {
  if (!dekorasi || !ukuranValid.value) return

  const itemW = Number(dekorasi.panjang || 100)
  const itemH = Number(dekorasi.lebar || 100)
  const venueMaxX = panjangVenue.value * 100 - itemW
  const venueMaxY = lebarVenue.value * 100 - itemH

  let initX = 0
  let initY = 0

  if (coords && coords.posisi_x !== undefined && coords.posisi_y !== undefined) {
    initX = coords.posisi_x
    initY = coords.posisi_y
  } else {
    // Letakkan di tengah area venue dengan sedikit offset jika sudah ada item
    const midX = Math.max(0, Math.round(venueMaxX / 2))
    const midY = Math.max(0, Math.round(venueMaxY / 2))
    const offset = (items.value.length % 5) * 20 // 20cm stagger
    initX = Math.min(venueMaxX, midX + offset)
    initY = Math.min(venueMaxY, midY + offset)
  }

  const newItem = {
    id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    decoration_id: dekorasi.id,
    posisi_x: Math.max(0, Math.round(initX)),
    posisi_y: Math.max(0, Math.round(initY)),
    rotasi: 0,
    jumlah: 1,
    Decoration: { ...dekorasi },
  }

  items.value.push(newItem)
  selectedItemId.value = newItem.id
  isDirty.value = true

  // Tutup panel kiri di mobile agar fokus ke canvas
  if (window.innerWidth < 1024) {
    sidebarKiriTerbuka.value = false
    sidebarKananTerbuka.value = true
  }
}

// Update properti item dari canvas atau properties panel
function onUpdateItem(payload) {
  const index = items.value.findIndex((i) => i.id === payload.id)
  if (index === -1) return

  items.value[index] = {
    ...items.value[index],
    ...payload,
  }
  isDirty.value = true
}

// Update specific single property dari PropertiesPanel
function onUpdateProp({ key, value }) {
  if (!selectedItemId.value) return
  const index = items.value.findIndex((i) => i.id === selectedItemId.value)
  if (index === -1) return

  items.value[index] = {
    ...items.value[index],
    [key]: value,
  }
  isDirty.value = true
}

// Hapus item dari layout canvas
function onHapusItem(itemTarget) {
  const target = itemTarget || selectedItem.value
  if (!target) return

  items.value = items.value.filter((i) => i.id !== target.id)
  if (selectedItemId.value === target.id) {
    selectedItemId.value = null
  }
  isDirty.value = true
}

// Simpan rancangan ke database
async function simpanRancangan() {
  if (!rancangan.value?.id) return
  menyimpan.value = true
  error.value = ''
  pesanSukses.value = ''

  try {
    const payload = {
      nama_rancangan: rancangan.value.nama_rancangan,
      item: items.value.map((i) => ({
        id: typeof i.id === 'number' ? i.id : undefined,
        decoration_id: i.decoration_id,
        posisi_x: Math.round(i.posisi_x),
        posisi_y: Math.round(i.posisi_y),
        rotasi: Math.round(i.rotasi || 0),
        jumlah: Math.max(1, parseInt(i.jumlah || 1, 10)),
      })),
    }

    const res = await fetch(`${API}/rancangan/${rancangan.value.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...auth.authHeader(),
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.pesan || 'Gagal menyimpan rancangan.')
    }

    // Catat indeks item yang sedang dipilih sebelum pemetaan ulang
    const prevSelectedIndex = items.value.findIndex((i) => i.id === selectedItemId.value)

    // Perbarui data rancangan dan proyek dari response segar
    rancangan.value = data.data
    if (data.data?.proyek || data.data?.Project) {
      proyek.value = data.data.proyek || data.data.Project
    }

    // Perbarui state items menggunakan ID asli dari database
    const freshDesignItems = data.data?.DesignItems || []
    items.value = freshDesignItems.map((di) => ({
      id: di.id,
      decoration_id: di.decoration_id,
      posisi_x: Number(di.posisi_x || 0),
      posisi_y: Number(di.posisi_y || 0),
      rotasi: Number(di.rotasi || 0),
      jumlah: Number(di.jumlah || 1),
      Decoration: di.Decoration || {},
    }))

    // Pertahankan seleksi item dengan ID database yang baru
    if (prevSelectedIndex !== -1 && items.value[prevSelectedIndex]) {
      selectedItemId.value = items.value[prevSelectedIndex].id
    } else if (items.value.length === 0) {
      selectedItemId.value = null
    }

    isDirty.value = false
    pesanSukses.value = 'Rancangan layout 2D berhasil disimpan!'
    setTimeout(() => {
      pesanSukses.value = ''
    }, 4000)
  } catch (err) {
    error.value = err.message || 'Gagal menyimpan rancangan layout.'
  } finally {
    menyimpan.value = false
  }
}

// Zoom Handlers
function onZoomIn() {
  zoom.value = Math.min(3.0, Number((zoom.value + 0.15).toFixed(2)))
}

function onZoomOut() {
  zoom.value = Math.max(0.3, Number((zoom.value - 0.15).toFixed(2)))
}

function onZoomReset() {
  zoom.value = 1.0
  if (canvasRef.value?.resetPan) {
    canvasRef.value.resetPan()
  }
}

function onZoomFit() {
  zoom.value = 1.0
  if (canvasRef.value?.resetPan) {
    canvasRef.value.resetPan()
  }
}

// Navigasi Kembali & Unsaved Guard
function handleKembali() {
  if (isDirty.value) {
    modalKeluar.value = true
    routeTujuanKeluar.value = `/proyek/${proyek.value?.id || ''}`
  } else {
    router.push(`/proyek/${proyek.value?.id || ''}`)
  }
}

function konfirmasiKeluar() {
  modalKeluar.value = false
  isDirty.value = false
  if (routeTujuanKeluar.value) {
    router.push(routeTujuanKeluar.value)
  } else {
    router.back()
  }
}

onBeforeRouteLeave((to, from, next) => {
  if (isDirty.value) {
    const yakin = window.confirm('Ada perubahan layout yang belum disimpan. Yakin ingin meninggalkan halaman?')
    if (yakin) next()
    else next(false)
  } else {
    next()
  }
})

// Window beforeunload
function onWindowBeforeUnload(e) {
  if (isDirty.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

onMounted(() => {
  muatRancangan()
  window.addEventListener('beforeunload', onWindowBeforeUnload)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', onWindowBeforeUnload)
})
</script>

<template>
  <section class="flex h-screen flex-col overflow-hidden bg-marshmallow text-licorice">
    <!-- Top Header -->
    <EditorHeader
      :proyek="proyek"
      :rancangan="rancangan"
      :is-dirty="isDirty"
      :is-saving="menyimpan"
      :sidebar-kiri-terbuka="sidebarKiriTerbuka"
      :sidebar-kanan-terbuka="sidebarKananTerbuka"
      @simpan="simpanRancangan"
      @kembali="handleKembali"
      @toggle-panel-kiri="sidebarKiriTerbuka = !sidebarKiriTerbuka; if (sidebarKiriTerbuka) sidebarKananTerbuka = false"
      @toggle-panel-kanan="sidebarKananTerbuka = !sidebarKananTerbuka; if (sidebarKananTerbuka) sidebarKiriTerbuka = false"
    />

    <!-- Notifications Banner (Success / Error saat editor aktif) -->
    <div v-if="pesanSukses" class="bg-apple px-4 py-2 text-center text-xs font-bold text-licorice border-b border-licorice flex items-center justify-center gap-2">
      <i class="fa-solid fa-circle-check"></i>
      <span>{{ pesanSukses }}</span>
    </div>

    <div v-if="error && rancangan" class="bg-strawberry px-4 py-2 text-center text-xs font-bold text-cherry border-b border-licorice flex items-center justify-center gap-2">
      <i class="fa-solid fa-circle-exclamation"></i>
      <span>{{ error }}</span>
    </div>

    <!-- Loading Screen -->
    <div v-if="memuat" class="flex flex-1 items-center justify-center p-8 text-center">
      <div>
        <i class="fa-solid fa-circle-notch fa-spin text-4xl text-cherry"></i>
        <p class="font-heading mt-4 text-xl font-bold text-licorice">Menyiapkan Ruang Kerja 2D…</p>
        <p class="mt-1 text-xs text-muted">Memuat denah venue dan posisi dekorasi tersimpan.</p>
      </div>
    </div>

    <!-- Error State: 404 / 403 / Gangguan Jaringan -->
    <div v-else-if="error" class="flex flex-1 items-center justify-center p-6 text-center">
      <div class="ws-paper-card max-w-md bg-paper p-8 text-center shadow-md">
        <i
          v-if="errorStatus === 404"
          class="fa-solid fa-compass-drafting text-4xl text-cherry"
        ></i>
        <i
          v-else-if="errorStatus === 403"
          class="fa-solid fa-shield-halved text-4xl text-cherry"
        ></i>
        <i
          v-else
          class="fa-solid fa-circle-exclamation text-4xl text-cherry"
        ></i>

        <h2 class="font-heading mt-4 text-2xl font-bold text-licorice">
          {{
            errorStatus === 404
              ? 'Rancangan Tidak Ditemukan'
              : errorStatus === 403
              ? 'Kamu Tidak Memiliki Akses ke Rancangan Ini'
              : 'Gagal Memuat Rancangan'
          }}
        </h2>

        <p class="mt-2 text-xs text-muted leading-relaxed">
          {{ error }}
        </p>

        <div class="mt-6 flex flex-wrap items-center justify-center gap-2">
          <RouterLink
            v-if="errorStatus === 404"
            to="/proyek"
            class="ws-btn-cherry inline-block px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
          >
            <i class="fa-solid fa-folder-open mr-1.5"></i>Lihat Daftar Proyek
          </RouterLink>
          <RouterLink
            v-else-if="errorStatus === 403"
            to="/dashboard"
            class="ws-btn-cherry inline-block px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
          >
            <i class="fa-solid fa-house mr-1.5"></i>Kembali ke Dashboard
          </RouterLink>
          <template v-else>
            <button
              type="button"
              class="ws-btn-cherry px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
              @click="muatRancangan"
            >
              <i class="fa-solid fa-rotate-right mr-1.5"></i>Coba Lagi
            </button>
            <RouterLink
              to="/proyek"
              class="ws-btn-paper px-4 py-2.5 text-xs font-bold"
            >
              Daftar Proyek
            </RouterLink>
          </template>
        </div>
      </div>
    </div>

    <!-- Error State: Venue Dimensions Invalid -->
    <div v-else-if="!ukuranValid" class="flex flex-1 items-center justify-center p-6 text-center">
      <div class="ws-paper-card max-w-md bg-paper p-8 text-center">
        <i class="fa-solid fa-ruler-combined text-4xl text-cherry"></i>
        <h2 class="font-heading mt-4 text-2xl font-bold text-licorice">Ukuran Venue Belum Lengkap</h2>
        <p class="mt-2 text-xs text-muted leading-relaxed">
          Proyek ini belum memiliki ukuran panjang dan lebar venue yang valid. Denah kanvas memerlukan ukuran fisik yang jelas agar proporsi dekorasi akurat.
        </p>
        <RouterLink
          v-if="proyek?.id"
          :to="`/proyek/${proyek.id}/edit`"
          class="ws-btn-cherry mt-6 inline-block px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
        >
          <i class="fa-solid fa-pen mr-1.5"></i>Lengkapi Ukuran Venue
        </RouterLink>
      </div>
    </div>

    <!-- Workspace Core Layout: 3 Columns (Palette, Canvas, Properties) -->
    <div v-else class="relative flex flex-1 overflow-hidden p-2 sm:p-3 gap-2.5">
      <!-- 1. Left Panel: Decoration Palette (Drawer in mobile, static in desktop) -->
      <div
        class="absolute inset-y-2 left-2 z-20 w-80 max-w-[85vw] lg:static lg:w-72 xl:w-80 lg:z-auto transition-transform duration-200"
        :class="sidebarKiriTerbuka ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
      >
        <DecorationPanel
          :terbuka="sidebarKiriTerbuka"
          @tambah-item="onTambahItem"
          @tutup="sidebarKiriTerbuka = false"
        />
      </div>

      <!-- Backdrop for mobile drawers -->
      <div
        v-if="sidebarKiriTerbuka || sidebarKananTerbuka"
        class="fixed inset-0 z-10 bg-licorice/40 backdrop-blur-[1px] lg:hidden"
        @click="sidebarKiriTerbuka = false; sidebarKananTerbuka = false"
      ></div>

      <!-- 2. Center Area: Canvas & Floating Toolbar -->
      <main class="relative flex flex-1 flex-col overflow-hidden rounded-xl border-2 border-licorice bg-paper shadow-sm">
        <!-- Canvas Interactive Viewport -->
        <div class="relative flex-1 overflow-hidden">
          <LayoutCanvas
            ref="canvasRef"
            :panjang-venue="panjangVenue"
            :lebar-venue="lebarVenue"
            :nama-venue="proyek?.nama_venue"
            :items="items"
            :selected-item-id="selectedItemId"
            :zoom="zoom"
            :grid-visible="gridVisible"
            :snap-to-grid="snapToGrid"
            @select-item="selectedItemId = $event ? $event.id : null"
            @update-item="onUpdateItem"
            @drop-decoration="onTambahItem($event.decoration, { posisi_x: $event.posisi_x, posisi_y: $event.posisi_y })"
            @delete-selected="onHapusItem()"
          />
        </div>

        <!-- Floating Bottom Toolbar -->
        <div class="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 max-w-[95%]">
          <EditorToolbar
            :zoom="zoom"
            :grid-visible="gridVisible"
            :snap-to-grid="snapToGrid"
            :item-count="items.length"
            @zoom-in="onZoomIn"
            @zoom-out="onZoomOut"
            @zoom-reset="onZoomReset"
            @zoom-fit="onZoomFit"
            @toggle-grid="gridVisible = !gridVisible"
            @toggle-snap="snapToGrid = !snapToGrid"
          />
        </div>
      </main>

      <!-- 3. Right Panel: Properties Panel (Drawer in mobile, static in desktop) -->
      <div
        class="absolute inset-y-2 right-2 z-20 w-80 max-w-[85vw] lg:static lg:w-72 xl:w-80 lg:z-auto transition-transform duration-200"
        :class="sidebarKananTerbuka ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'"
      >
        <PropertiesPanel
          :selected-item="selectedItem"
          :panjang-venue="panjangVenue"
          :lebar-venue="lebarVenue"
          :terbuka="sidebarKananTerbuka"
          @update-prop="onUpdateProp"
          @hapus-item="onHapusItem"
          @tutup="sidebarKananTerbuka = false"
        />
      </div>
    </div>

    <!-- Confirm Unsaved Changes Modal -->
    <ConfirmModal
      :tampil="modalKeluar"
      judul="Simpan Perubahan Layout?"
      pesan="Anda memiliki perubahan tata letak dekorasi yang belum disimpan. Jika keluar sekarang, perubahan lokal akan hilang."
      label-konfirmasi="Tinggalkan Halaman"
      @batal="modalKeluar = false"
      @konfirmasi="konfirmasiKeluar"
    />
  </section>
</template>
