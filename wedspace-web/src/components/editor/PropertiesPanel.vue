<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth'
import VintageOrnament from '../VintageOrnament.vue'

const props = defineProps({
  selectedItem: { type: Object, default: null },
  panjangVenue: { type: Number, required: true }, // meter
  lebarVenue: { type: Number, required: true },   // meter
  terbuka: { type: Boolean, default: false },
})

const emit = defineEmits(['update-prop', 'hapus-item', 'tutup'])

const auth = useAuthStore()

const maxPosisiX = computed(() => {
  const itemW = props.selectedItem?.Decoration?.panjang || 100
  return Math.max(0, Math.round(props.panjangVenue * 100 - itemW))
})

const maxPosisiY = computed(() => {
  const itemH = props.selectedItem?.Decoration?.lebar || 100
  return Math.max(0, Math.round(props.lebarVenue * 100 - itemH))
})

function rupiah(n) {
  return 'Rp' + Number(n || 0).toLocaleString('id-ID')
}

function urlGambar(d) {
  if (!d?.gambar) return ''
  let url = d.gambar.startsWith('http') ? d.gambar : `http://localhost:3000${d.gambar}`
  if (d.visibility === 'private' && auth?.token) {
    url += `${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(auth.token)}`
  }
  return url
}

// Handlers for properties
function onUbahX(e) {
  let val = Number(e.target.value)
  if (isNaN(val)) val = 0
  val = Math.max(0, Math.min(val, maxPosisiX.value))
  emit('update-prop', { key: 'posisi_x', value: Math.round(val) })
}

function onUbahY(e) {
  let val = Number(e.target.value)
  if (isNaN(val)) val = 0
  val = Math.max(0, Math.min(val, maxPosisiY.value))
  emit('update-prop', { key: 'posisi_y', value: Math.round(val) })
}

function onUbahRotasi(e) {
  let val = Number(e.target.value)
  if (isNaN(val)) val = 0
  val = ((Math.round(val) % 360) + 360) % 360
  emit('update-prop', { key: 'rotasi', value: val })
}

function putarCepat(derajat) {
  if (!props.selectedItem) return
  let current = Number(props.selectedItem.rotasi || 0)
  let next = ((current + derajat) % 360 + 360) % 360
  emit('update-prop', { key: 'rotasi', value: next })
}

function onUbahJumlah(delta) {
  if (!props.selectedItem) return
  const current = Number(props.selectedItem.jumlah || 1)
  const next = Math.max(1, current + delta)
  emit('update-prop', { key: 'jumlah', value: next })
}

function onInputJumlah(e) {
  let val = parseInt(e.target.value, 10)
  if (isNaN(val) || val < 1) val = 1
  emit('update-prop', { key: 'jumlah', value: val })
}
</script>

<template>
  <aside
    class="ws-paper-card flex h-full flex-col overflow-hidden bg-paper border-2 border-licorice shadow-sm transition-transform"
  >
    <!-- Header Ribbon -->
    <div class="bg-stripes-violet flex items-center justify-between border-b-2 border-licorice px-4 py-2.5">
      <div class="flex items-center gap-2">
        <i class="fa-solid fa-sliders text-cherry text-xs"></i>
        <span class="ws-eyebrow">Properti Dekorasi</span>
      </div>
      <!-- Close Button for Mobile -->
      <button
        type="button"
        class="flex h-6 w-6 items-center justify-center rounded-md border border-licorice/40 bg-marshmallow text-xs lg:hidden"
        title="Tutup Panel Properti"
        @click="$emit('tutup')"
      >
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>

    <!-- Active Selection Form Content -->
    <div v-if="selectedItem" class="flex-1 overflow-y-auto p-4 space-y-4">
      <!-- Item Card Header (Summary) -->
      <div class="rounded-xl border-2 border-licorice bg-marshmallow p-3 shadow-[2px_2px_0px_#7F1125]">
        <div class="flex items-center gap-3">
          <!-- Thumbnail -->
          <div class="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-licorice bg-paper">
            <img
              v-if="urlGambar(selectedItem.Decoration)"
              :src="urlGambar(selectedItem.Decoration)"
              :alt="selectedItem.Decoration?.nama_dekorasi"
              class="h-full w-full object-cover"
            />
            <div v-else class="bg-stripes-pink flex h-full w-full items-center justify-center font-heading font-bold text-cherry text-lg">
              {{ (selectedItem.Decoration?.nama_dekorasi || '?').charAt(0).toUpperCase() }}
            </div>
          </div>

          <!-- Name & Category -->
          <div class="min-w-0 flex-1">
            <span class="rounded bg-strawberry/60 px-1.5 py-0.2 text-[9px] font-bold text-licorice border border-licorice/30 uppercase">
              {{ selectedItem.Decoration?.kategori || 'Dekorasi' }}
            </span>
            <h3 class="mt-0.5 font-heading text-sm font-bold text-licorice truncate" :title="selectedItem.Decoration?.nama_dekorasi">
              {{ selectedItem.Decoration?.nama_dekorasi }}
            </h3>
            <p class="text-[10px] text-muted">
              {{ selectedItem.Decoration?.panjang }} × {{ selectedItem.Decoration?.lebar }} × {{ selectedItem.Decoration?.tinggi }} cm
            </p>
          </div>
        </div>

        <!-- Price & Contributor -->
        <div class="mt-2.5 flex items-center justify-between border-t border-dashed border-licorice/30 pt-2 text-[11px]">
          <span class="text-muted">Harga Estimasi:</span>
          <span class="font-bold text-cherry">{{ rupiah(selectedItem.Decoration?.harga) }}</span>
        </div>
      </div>

      <!-- Controls: Position X & Y -->
      <div class="space-y-3 rounded-xl border border-licorice/30 bg-marshmallow/50 p-3.5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-licorice">
            <i class="fa-solid fa-location-crosshairs mr-1 text-cherry"></i>Koordinat Posisi
          </span>
          <span class="text-[10px] text-muted font-bold">Relatif terhadap denah (cm)</span>
        </div>

        <!-- Posisi X -->
        <div>
          <div class="flex items-center justify-between text-[11px] font-bold text-licorice mb-1">
            <label for="input-posisi-x">Posisi X (Horizontal):</label>
            <span class="text-cherry">{{ (selectedItem.posisi_x / 100).toFixed(2) }} m</span>
          </div>
          <div class="relative flex items-center">
            <input
              id="input-posisi-x"
              type="number"
              min="0"
              :max="maxPosisiX"
              step="10"
              :value="selectedItem.posisi_x"
              class="ws-input pr-10 text-xs font-bold"
              @change="onUbahX"
            />
            <span class="absolute right-3 text-xs font-bold text-muted pointer-events-none">cm</span>
          </div>
        </div>

        <!-- Posisi Y -->
        <div>
          <div class="flex items-center justify-between text-[11px] font-bold text-licorice mb-1">
            <label for="input-posisi-y">Posisi Y (Vertikal):</label>
            <span class="text-cherry">{{ (selectedItem.posisi_y / 100).toFixed(2) }} m</span>
          </div>
          <div class="relative flex items-center">
            <input
              id="input-posisi-y"
              type="number"
              min="0"
              :max="maxPosisiY"
              step="10"
              :value="selectedItem.posisi_y"
              class="ws-input pr-10 text-xs font-bold"
              @change="onUbahY"
            />
            <span class="absolute right-3 text-xs font-bold text-muted pointer-events-none">cm</span>
          </div>
        </div>
      </div>

      <!-- Controls: Rotation -->
      <div class="space-y-3 rounded-xl border border-licorice/30 bg-marshmallow/50 p-3.5">
        <div class="flex items-center justify-between text-xs font-bold text-licorice">
          <span><i class="fa-solid fa-rotate mr-1 text-cherry"></i>Sudut Rotasi</span>
          <span class="text-cherry font-heading text-sm">{{ selectedItem.rotasi || 0 }}°</span>
        </div>

        <div class="flex items-center gap-2">
          <input
            type="number"
            min="0"
            max="359"
            step="5"
            :value="selectedItem.rotasi || 0"
            class="ws-input flex-1 text-xs font-bold text-center"
            @change="onUbahRotasi"
          />
          <button
            type="button"
            class="ws-btn-paper px-2.5 py-1.5 text-[11px] font-bold"
            title="Reset ke 0°"
            @click="emit('update-prop', { key: 'rotasi', value: 0 })"
          >
            0°
          </button>
        </div>

        <!-- Quick Rotate Buttons -->
        <div class="grid grid-cols-4 gap-1.5 text-xs font-bold">
          <button
            type="button"
            class="ws-btn-paper py-1 text-[10px]"
            title="Putar -90°"
            @click="putarCepat(-90)"
          >
            -90°
          </button>
          <button
            type="button"
            class="ws-btn-paper py-1 text-[10px]"
            title="Putar -45°"
            @click="putarCepat(-45)"
          >
            -45°
          </button>
          <button
            type="button"
            class="ws-btn-paper py-1 text-[10px]"
            title="Putar +45°"
            @click="putarCepat(45)"
          >
            +45°
          </button>
          <button
            type="button"
            class="ws-btn-paper py-1 text-[10px]"
            title="Putar +90°"
            @click="putarCepat(90)"
          >
            +90°
          </button>
        </div>
      </div>

      <!-- Controls: Quantity (Jumlah Unit) -->
      <div class="space-y-2 rounded-xl border border-licorice/30 bg-marshmallow/50 p-3.5">
        <div class="flex items-center justify-between text-xs font-bold text-licorice">
          <span><i class="fa-solid fa-layer-group mr-1 text-cherry"></i>Jumlah Unit</span>
          <span class="text-[10px] text-muted">Minimal 1</span>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-lg border border-licorice bg-paper font-bold text-licorice hover:bg-strawberry active:scale-95 transition-all shadow-[1px_1px_0px_#7F1125] disabled:opacity-40"
            :disabled="selectedItem.jumlah <= 1"
            @click="onUbahJumlah(-1)"
          >
            <i class="fa-solid fa-minus text-xs"></i>
          </button>

          <input
            type="number"
            min="1"
            :value="selectedItem.jumlah || 1"
            class="ws-input flex-1 py-1 text-center font-heading text-sm font-bold"
            @change="onInputJumlah"
          />

          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-lg border border-licorice bg-paper font-bold text-licorice hover:bg-strawberry active:scale-95 transition-all shadow-[1px_1px_0px_#7F1125]"
            @click="onUbahJumlah(1)"
          >
            <i class="fa-solid fa-plus text-xs"></i>
          </button>
        </div>
        <p class="text-[10px] text-muted leading-tight">
          Menentukan alokasi kuantitas item untuk kalkulasi estimasi kebutuhan dekorasi.
        </p>
      </div>

      <!-- Action: Remove Item from Canvas -->
      <div class="border-t border-dashed border-licorice/30 pt-3">
        <button
          type="button"
          class="ws-btn-paper !border-cherry !text-cherry hover:!bg-strawberry w-full py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm"
          @click="$emit('hapus-item', selectedItem)"
        >
          <i class="fa-solid fa-trash-can"></i>
          <span>Hapus dari Denah</span>
        </button>
        <p class="mt-1.5 text-center text-[10px] text-muted">
          Hanya menghapus dari rancangan layout (item tetap ada di katalog).
        </p>
      </div>
    </div>

    <!-- Empty Selection State -->
    <div v-else class="flex flex-1 flex-col items-center justify-center p-6 text-center text-muted">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-licorice/40 bg-marshmallow/80">
        <i class="fa-solid fa-arrow-pointer text-2xl text-cherry/50"></i>
      </div>
      <h4 class="mt-4 font-heading text-lg font-bold text-licorice">Pilih Dekorasi di Denah</h4>
      <p class="mt-1 max-w-[200px] text-xs leading-relaxed text-muted">
        Klik salah satu elemen dekorasi pada denah venue untuk mengubah posisi, orientasi rotasi, atau jumlah unit.
      </p>
    </div>
  </aside>
</template>
