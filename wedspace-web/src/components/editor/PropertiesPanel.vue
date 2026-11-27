<script setup>
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { hitungBatasPosisi, normalisasiRotasi } from '../../utils/layoutBounds'
import LayersPanel from './LayersPanel.vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  selectedIds: { type: Array, default: () => [] },
  hiddenIds: { type: Array, default: () => [] },
  lockedIds: { type: Array, default: () => [] },
  selectedItem: { type: Object, default: null },
  selectedCount: { type: Number, default: 0 },
  proyek: { type: Object, default: () => ({}) },
  panjangVenue: { type: Number, required: true }, // meter
  lebarVenue: { type: Number, required: true },   // meter
  updatingVenue: { type: Boolean, default: false },
  gridVisible: { type: Boolean, default: true },
  snapToGrid: { type: Boolean, default: true },
  itemCount: { type: Number, default: 0 },
})

const emit = defineEmits([
  'select-layer',
  'toggle-hide-layer',
  'toggle-lock-layer',
  'reorder-layer',
  'update-prop',
  'update-venue-size',
  'duplikasi-item',
  'hapus-item',
  'toggle-grid',
  'toggle-snap',
  'tutup',
])

const auth = useAuthStore()

const openSections = ref({
  venue: false,
  layers: true,
  properties: true,
  shortcuts: false,
})

const editVenueW = ref(props.panjangVenue)
const editVenueD = ref(props.lebarVenue)

watch(() => props.panjangVenue, (v) => { editVenueW.value = v })
watch(() => props.lebarVenue, (v) => { editVenueD.value = v })

function submitVenueSize() {
  const w = Math.max(2, Math.min(200, Number(editVenueW.value) || props.panjangVenue))
  const d = Math.max(2, Math.min(200, Number(editVenueD.value) || props.lebarVenue))
  editVenueW.value = w
  editVenueD.value = d
  emit('update-venue-size', { panjang_venue: w, lebar_venue: d })
}

const batasPosisi = computed(() => {
  const itemW = Number(props.selectedItem?.Decoration?.panjang || 100)
  const itemH = Number(props.selectedItem?.Decoration?.lebar || 100)
  const rotasi = Number(props.selectedItem?.rotasi || 0)
  return hitungBatasPosisi(
    itemW,
    itemH,
    rotasi,
    (props.panjangVenue || 1) * 100,
    (props.lebarVenue || 1) * 100
  )
})

const minPosisiX = computed(() => batasPosisi.value.minX)
const maxPosisiX = computed(() => batasPosisi.value.maxX)
const minPosisiY = computed(() => batasPosisi.value.minY)
const maxPosisiY = computed(() => batasPosisi.value.maxY)
const melebihiVenue = computed(() => batasPosisi.value.melebihiVenue)

function rupiah(n) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(n || 0))
}

function urlGambar(d) {
  if (!d?.gambar) return ''
  let url = d.gambar.startsWith('http') ? d.gambar : `http://localhost:3000${d.gambar}`
  if (d.visibility === 'private' && auth?.token) {
    url += `${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(auth.token)}`
  }
  return url
}

function onUbahX(e) {
  let val = Number(e.target.value)
  if (!Number.isFinite(val)) val = minPosisiX.value
  val = Math.round(Math.max(minPosisiX.value, Math.min(val, maxPosisiX.value)))
  e.target.value = String(val)
  emit('update-prop', { key: 'posisi_x', value: val })
}

function onUbahY(e) {
  let val = Number(e.target.value)
  if (!Number.isFinite(val)) val = minPosisiY.value
  val = Math.round(Math.max(minPosisiY.value, Math.min(val, maxPosisiY.value)))
  e.target.value = String(val)
  emit('update-prop', { key: 'posisi_y', value: val })
}

function onUbahRotasi(e) {
  const val = normalisasiRotasi(e.target.value)
  e.target.value = String(val)
  emit('update-prop', { key: 'rotasi', value: val })
}

function putarCepat(derajat) {
  if (!props.selectedItem) return
  const current = Number(props.selectedItem.rotasi || 0)
  emit('update-prop', { key: 'rotasi', value: normalisasiRotasi(current + derajat) })
}

function onUbahJumlah(delta) {
  if (!props.selectedItem) return
  const next = Math.max(1, Number(props.selectedItem.jumlah || 1) + delta)
  emit('update-prop', { key: 'jumlah', value: next })
}

function onInputJumlah(e) {
  let val = parseInt(e.target.value, 10)
  if (!Number.isFinite(val) || val < 1) val = 1
  e.target.value = String(val)
  emit('update-prop', { key: 'jumlah', value: val })
}
</script>

<template>
  <aside class="flex h-full flex-col overflow-hidden rounded-2xl border border-white/80 bg-[#F7F7F8]/95 shadow-[0_8px_28px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80 backdrop-blur-md">
    <!-- Header Panel Kanan (identik dengan Workspace 3D) -->
    <div class="flex items-center justify-between border-b border-slate-200/80 px-3.5 py-2.5">
      <div class="flex items-center gap-2 min-w-0">
        <i class="fa-solid fa-sliders text-xs text-[#CF2C2F]"></i>
        <span class="text-sm font-semibold text-slate-900">Properti</span>
        <span class="rounded-full bg-white px-2 py-0.5 text-[0.6875rem] font-semibold text-slate-600 ring-1 ring-slate-200/80">
          {{ itemCount }}
        </span>
      </div>
      <button
        type="button"
        class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-white hover:text-[#CF2C2F] transition"
        title="Tutup Panel Kanan"
        aria-label="Tutup Panel Kanan"
        @click="$emit('tutup')"
      >
        <i class="fa-solid fa-chevron-right text-xs"></i>
      </button>
    </div>

    <!-- Accordion Section Cards (identik dengan Workspace 3D) -->
    <div class="flex-1 overflow-y-auto p-2.5 space-y-2.5 text-xs">
      <!-- 1. DIMENSI VENUE -->
      <div class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <button
          type="button"
          class="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-slate-50/70 transition"
          @click="openSections.venue = !openSections.venue"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <i class="fa-regular fa-map text-xs"></i>
            </span>
            <span class="truncate text-[0.6875rem] font-bold uppercase tracking-wider text-slate-700">Dimensi Venue</span>
          </div>
          <i :class="['fa-solid text-[0.625rem] text-slate-400 transition-transform', openSections.venue ? 'fa-chevron-down' : 'fa-chevron-right']"></i>
        </button>

        <div v-show="openSections.venue" class="border-t border-slate-100 px-3 py-2.5 space-y-2.5 bg-slate-50/40">
          <div>
            <p class="font-semibold text-slate-800">{{ proyek?.nama_venue || 'Venue 2D' }}</p>
            <p class="text-[0.6875rem] text-slate-500">Saat ini: <strong class="text-slate-700">{{ panjangVenue }}m × {{ lebarVenue }}m</strong> ({{ (panjangVenue * lebarVenue).toFixed(1) }} m²)</p>
          </div>
          <form class="space-y-2" @submit.prevent="submitVenueSize">
            <div class="grid grid-cols-2 gap-1.5">
              <label class="block">
                <span class="text-[0.625rem] font-medium text-slate-500">Panjang (m)</span>
                <input
                  v-model.number="editVenueW"
                  type="number"
                  min="2"
                  max="200"
                  step="0.5"
                  class="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold"
                />
              </label>
              <label class="block">
                <span class="text-[0.625rem] font-medium text-slate-500">Lebar (m)</span>
                <input
                  v-model.number="editVenueD"
                  type="number"
                  min="2"
                  max="200"
                  step="0.5"
                  class="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold"
                />
              </label>
            </div>
            <button
              type="submit"
              :disabled="updatingVenue"
              class="w-full rounded-lg bg-[#CF2C2F] py-1.5 text-[0.6875rem] font-semibold text-white hover:bg-[#B82225] transition disabled:opacity-60"
            >
              {{ updatingVenue ? 'Menyimpan…' : 'Terapkan Ukuran Venue' }}
            </button>
          </form>
        </div>
      </div>

      <!-- 2. LAPISAN (LAYERS) -->
      <div class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <button
          type="button"
          class="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-slate-50/70 transition"
          @click="openSections.layers = !openSections.layers"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-red-50 text-[#CF2C2F]">
              <i class="fa-solid fa-layer-group text-xs"></i>
            </span>
            <span class="truncate text-[0.6875rem] font-bold uppercase tracking-wider text-slate-700">Lapisan ({{ itemCount }})</span>
          </div>
          <i :class="['fa-solid text-[0.625rem] text-slate-400 transition-transform', openSections.layers ? 'fa-chevron-down' : 'fa-chevron-right']"></i>
        </button>

        <div v-show="openSections.layers" class="border-t border-slate-100">
          <LayersPanel
            :items="items"
            :selected-ids="selectedIds"
            :hidden-ids="hiddenIds"
            :locked-ids="lockedIds"
            @select="$emit('select-layer', $event)"
            @toggle-hide="$emit('toggle-hide-layer', $event)"
            @toggle-lock="$emit('toggle-lock-layer', $event)"
            @reorder="$emit('reorder-layer', $event)"
          />
        </div>
      </div>

      <!-- 3. PROPERTI OBJEK -->
      <div class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <button
          type="button"
          class="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-slate-50/70 transition"
          @click="openSections.properties = !openSections.properties"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <i class="fa-solid fa-cube text-xs"></i>
            </span>
            <span class="truncate text-[0.6875rem] font-bold uppercase tracking-wider text-slate-700">
              {{ selectedCount > 1 ? `Multi Seleksi (${selectedCount})` : 'Properti Objek' }}
            </span>
          </div>
          <i :class="['fa-solid text-[0.625rem] text-slate-400 transition-transform', openSections.properties ? 'fa-chevron-down' : 'fa-chevron-right']"></i>
        </button>

        <div v-show="openSections.properties" class="border-t border-slate-100 p-3 space-y-3 text-xs">
          <!-- Multi Selection -->
          <template v-if="selectedCount > 1">
            <div class="rounded-xl border border-red-200 bg-red-50 p-3 text-center">
              <p class="font-semibold text-[#7F1125]">{{ selectedCount }} Objek Dipilih</p>
              <p class="mt-1 text-[0.6875rem] text-slate-600">
                Geser salah satu objek di kanvas untuk memindahkan bersamaan.
              </p>
            </div>
            <div class="grid grid-cols-2 gap-1.5">
              <button type="button" class="rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition" @click="$emit('duplikasi-item')">
                <i class="fa-regular fa-copy mr-1 text-[#CF2C2F]"></i>Duplikasi
              </button>
              <button type="button" class="rounded-lg border border-red-200 bg-red-50 py-1.5 text-xs font-semibold text-[#CF2C2F] hover:bg-red-100 transition" @click="$emit('hapus-item')">
                <i class="fa-solid fa-trash-can mr-1"></i>Hapus Semua
              </button>
            </div>
          </template>

          <!-- Single Object Selected -->
          <template v-else-if="selectedItem">
            <div>
              <p class="text-xs font-semibold text-slate-900">{{ selectedItem.Decoration?.nama_dekorasi }}</p>
              <p class="text-[0.6875rem] text-slate-500">
                {{ selectedItem.Decoration?.kategori || 'Dekorasi' }} • {{ selectedItem.Decoration?.panjang || 100 }}×{{ selectedItem.Decoration?.lebar || 100 }} cm • {{ rupiah(selectedItem.Decoration?.harga) }}
              </p>
            </div>

            <!-- Posisi X & Y + tombol ikon putar kiri -->
            <div class="space-y-1.5 border-t border-slate-100 pt-2.5">
              <div class="flex items-center justify-between gap-1.5">
                <p class="text-[0.6875rem] font-semibold uppercase text-slate-400">Posisi (cm)</p>
                <div class="flex items-center gap-1">
                  <button
                    type="button"
                    class="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-[0.6875rem] text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-[#CF2C2F] transition"
                    title="Putar ke Kiri (-90°)"
                    aria-label="Putar ke Kiri"
                    @click="putarCepat(-90)"
                  >
                    <i class="fa-solid fa-rotate-left"></i>
                  </button>
                  <button
                    type="button"
                    class="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-[0.6875rem] text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-[#CF2C2F] transition"
                    title="Putar ke Kanan (+90°)"
                    aria-label="Putar ke Kanan"
                    @click="putarCepat(90)"
                  >
                    <i class="fa-solid fa-rotate-right"></i>
                  </button>
                </div>
              </div>

              <div v-if="melebihiVenue" class="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[0.6875rem] text-rose-700">
                <i class="fa-solid fa-triangle-exclamation mr-1"></i>
                Ukuran objek melebihi luas venue.
              </div>

              <div class="grid grid-cols-2 gap-1.5">
                <label class="block">
                  <span class="text-[0.625rem] text-slate-500">X ({{ minPosisiX }}–{{ maxPosisiX }})</span>
                  <input
                    id="input-posisi-x"
                    type="number"
                    :min="minPosisiX"
                    :max="maxPosisiX"
                    step="10"
                    :value="selectedItem.posisi_x"
                    class="mt-0.5 w-full rounded border border-slate-200 px-1.5 py-1 text-xs font-semibold"
                    @change="onUbahX"
                  />
                </label>
                <label class="block">
                  <span class="text-[0.625rem] text-slate-500">Y ({{ minPosisiY }}–{{ maxPosisiY }})</span>
                  <input
                    id="input-posisi-y"
                    type="number"
                    :min="minPosisiY"
                    :max="maxPosisiY"
                    step="10"
                    :value="selectedItem.posisi_y"
                    class="mt-0.5 w-full rounded border border-slate-200 px-1.5 py-1 text-xs font-semibold"
                    @change="onUbahY"
                  />
                </label>
              </div>
            </div>

            <!-- Rotasi & Jumlah Unit -->
            <div class="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2.5">
              <label class="block">
                <span class="text-[0.6875rem] text-slate-500">Rotasi (°)</span>
                <input
                  type="number"
                  min="0"
                  max="359"
                  step="5"
                  :value="selectedItem.rotasi || 0"
                  class="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-xs font-semibold"
                  @change="onUbahRotasi"
                />
              </label>
              <label class="block">
                <span class="text-[0.6875rem] text-slate-500">Jumlah Unit</span>
                <div class="mt-0.5 flex items-center gap-1">
                  <button type="button" :disabled="selectedItem.jumlah <= 1" class="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-slate-50 text-[0.625rem] disabled:opacity-40" @click="onUbahJumlah(-1)">
                    <i class="fa-solid fa-minus"></i>
                  </button>
                  <input type="number" min="1" :value="selectedItem.jumlah || 1" class="w-full rounded border border-slate-200 px-1 py-0.5 text-center text-xs font-semibold" @change="onInputJumlah" />
                  <button type="button" class="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-slate-50 text-[0.625rem]" @click="onUbahJumlah(1)">
                    <i class="fa-solid fa-plus"></i>
                  </button>
                </div>
              </label>
            </div>

            <!-- Aksi: Duplikasi & Hapus -->
            <div class="grid grid-cols-2 gap-1.5 border-t border-slate-100 pt-2.5">
              <button type="button" class="rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition" title="Duplikasi (Ctrl+D)" @click="$emit('duplikasi-item', selectedItem)">
                <i class="fa-regular fa-copy mr-1 text-[#CF2C2F]"></i>Duplikasi
              </button>
              <button type="button" class="rounded-lg border border-red-200 bg-red-50 py-1.5 text-xs font-semibold text-[#CF2C2F] hover:bg-red-100 transition" title="Hapus (Delete)" @click="$emit('hapus-item', selectedItem)">
                <i class="fa-solid fa-trash-can mr-1"></i>Hapus
              </button>
            </div>
          </template>

          <!-- No Selection -->
          <template v-else>
            <p class="py-2 text-center text-xs text-slate-400">
              Klik objek di kanvas 2D atau daftar lapisan untuk mengubah propertinya.
            </p>
          </template>
        </div>
      </div>

      <!-- 4. PENGATURAN KANVAS & PINTASAN -->
      <div class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <button
          type="button"
          class="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-slate-50/70 transition"
          @click="openSections.shortcuts = !openSections.shortcuts"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <i class="fa-regular fa-keyboard text-xs"></i>
            </span>
            <span class="truncate text-[0.6875rem] font-bold uppercase tracking-wider text-slate-700">Kanvas & Pintasan</span>
          </div>
          <i :class="['fa-solid text-[0.625rem] text-slate-400 transition-transform', openSections.shortcuts ? 'fa-chevron-down' : 'fa-chevron-right']"></i>
        </button>

        <div v-show="openSections.shortcuts" class="border-t border-slate-100 px-3 py-2.5 space-y-2.5 bg-slate-50/40 text-[0.6875rem]">
          <label class="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 cursor-pointer">
            <span class="font-medium text-slate-700">Tampilkan Grid (1m / 50cm)</span>
            <input type="checkbox" :checked="gridVisible" class="accent-[#CF2C2F]" @change="$emit('toggle-grid')" />
          </label>
          <label class="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 cursor-pointer">
            <span class="font-medium text-slate-700">Snap to Grid (10 cm)</span>
            <input type="checkbox" :checked="snapToGrid" class="accent-[#CF2C2F]" @change="$emit('toggle-snap')" />
          </label>
          <div class="space-y-1 pt-1 text-slate-500">
            <div class="flex justify-between"><span>Urungkan / Ulangi</span><span class="font-mono text-slate-700">Ctrl+Z / Ctrl+Y</span></div>
            <div class="flex justify-between"><span>Duplikasi / Simpan</span><span class="font-mono text-slate-700">Ctrl+D / Ctrl+S</span></div>
            <div class="flex justify-between"><span>Hapus Objek</span><span class="font-mono text-slate-700">Delete</span></div>
            <div class="flex justify-between"><span>Multi-pilih</span><span class="font-mono text-slate-700">Shift + Klik</span></div>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>
