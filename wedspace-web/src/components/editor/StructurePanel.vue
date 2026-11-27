<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../../stores/auth'

const props = defineProps({
  designId: { type: [String, Number], required: true },
  structures: { type: Array, default: () => [] },
  panjangVenue: { type: Number, default: 15 }, // meter
  lebarVenue: { type: Number, default: 10 },   // meter
})

const emit = defineEmits(['updated', 'tutup'])

const auth = useAuthStore()
const API = 'http://localhost:3000/api'

const sibuk = ref(false)
const error = ref('')

const presets = [
  { tipe: 'wall', label: 'Tembok (3m)', panjang: 300, tebal: 15, tinggi: 300, warna: '#EFE7DD', icon: 'fa-border-none' },
  { tipe: 'wall', label: 'Tembok Panjang (5m)', panjang: 500, tebal: 15, tinggi: 300, warna: '#EFE7DD', icon: 'fa-grip-lines' },
  { tipe: 'door', label: 'Pintu Masuk (1.2m)', panjang: 120, tebal: 18, tinggi: 220, warna: '#7F1125', icon: 'fa-door-open' },
  { tipe: 'door', label: 'Pintu Ganda (2m)', panjang: 200, tebal: 18, tinggi: 240, warna: '#7F1125', icon: 'fa-dungeon' },
  { tipe: 'window', label: 'Jendela (1.8m)', panjang: 180, tebal: 15, tinggi: 160, warna: '#D4E4F7', icon: 'fa-window-maximize' },
]

async function tambahStruktur(preset) {
  sibuk.value = true
  error.value = ''
  try {
    const venueW = Math.max(200, props.panjangVenue * 100)
    const venueH = Math.max(200, props.lebarVenue * 100)
    const offset = (props.structures.length % 5) * 30
    const payload = {
      tipe: preset.tipe,
      label: preset.label,
      panjang: Math.min(preset.panjang, venueW),
      tebal: preset.tebal,
      tinggi: preset.tinggi,
      warna: preset.warna,
      posisi_x: Math.max(0, Math.round((venueW - Math.min(preset.panjang, venueW)) / 2)),
      posisi_y: preset.tipe === 'door' ? 0 : Math.min(Math.max(0, venueH - 40), Math.round(venueH * 0.25) + offset),
      rotasi: 0,
    }

    const res = await fetch(`${API}/rancangan/${props.designId}/struktur`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.authHeader() },
      body: JSON.stringify(payload),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.pesan || 'Gagal menambahkan struktur.')
    emit('updated', [...props.structures, body.data])
  } catch (err) {
    error.value = err.message
  } finally {
    sibuk.value = false
  }
}

async function ubahStruktur(item, patch) {
  error.value = ''
  try {
    const res = await fetch(`${API}/rancangan/${props.designId}/struktur/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth.authHeader() },
      body: JSON.stringify(patch),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.pesan || 'Gagal memperbarui struktur.')
    emit(
      'updated',
      props.structures.map((s) => (s.id === item.id ? body.data : s))
    )
  } catch (err) {
    error.value = err.message
  }
}

async function hapusStruktur(item) {
  error.value = ''
  try {
    const res = await fetch(`${API}/rancangan/${props.designId}/struktur/${item.id}`, {
      method: 'DELETE',
      headers: auth.authHeader(),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.pesan || 'Gagal menghapus struktur.')
    }
    emit('updated', props.structures.filter((s) => s.id !== item.id))
  } catch (err) {
    error.value = err.message
  }
}

function labelTipe(tipe) {
  if (tipe === 'door') return 'Pintu'
  if (tipe === 'window') return 'Jendela'
  return 'Tembok'
}
</script>

<template>
  <aside class="ws-paper-card flex h-full flex-col overflow-hidden border-2 border-licorice bg-paper shadow-md">
    <div class="bg-stripes-pink flex items-center justify-between border-b-2 border-licorice px-4 py-2.5">
      <div class="flex items-center gap-2">
        <i class="fa-solid fa-trowel-bricks text-cherry text-xs"></i>
        <span class="ws-eyebrow">Tembok & Pintu</span>
      </div>
      <button
        type="button"
        class="flex h-6 w-6 items-center justify-center rounded-md border border-licorice/40 bg-marshmallow text-xs"
        title="Tutup Panel"
        @click="$emit('tutup')"
      >
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
      <p v-if="error" class="rounded-lg border border-cherry bg-strawberry/70 px-3 py-2 text-[11px] font-semibold text-cherry">
        {{ error }}
      </p>

      <!-- Tambah Cepat -->
      <div class="space-y-2">
        <p class="text-[11px] font-bold uppercase tracking-wider text-muted">Tambah Elemen Ruangan</p>
        <div class="grid grid-cols-1 gap-1.5">
          <button
            v-for="p in presets"
            :key="p.label"
            type="button"
            :disabled="sibuk"
            class="ws-btn-paper flex items-center justify-between px-3 py-2 text-left text-xs font-bold disabled:opacity-50"
            @click="tambahStruktur(p)"
          >
            <span class="flex items-center gap-2">
              <i :class="['fa-solid text-cherry', p.icon]"></i>
              <span>{{ p.label }}</span>
            </span>
            <i class="fa-solid fa-plus text-[10px] text-cherry"></i>
          </button>
        </div>
      </div>

      <!-- Daftar Struktur Terpasang -->
      <div class="space-y-2.5 border-t border-dashed border-licorice/30 pt-3">
        <div class="flex items-center justify-between">
          <p class="text-[11px] font-bold uppercase tracking-wider text-muted">
            Struktur di Venue ({{ structures.length }})
          </p>
        </div>

        <div v-if="structures.length === 0" class="rounded-xl border border-dashed border-licorice/30 bg-marshmallow/60 p-4 text-center text-[11px] text-muted">
          Belum ada tembok atau pintu tambahan. Pilih preset di atas untuk membentuk ruangan venue.
        </div>

        <div
          v-for="s in structures"
          :key="s.id"
          class="rounded-xl border-2 border-licorice bg-marshmallow p-3 shadow-[2px_2px_0px_#7F1125] space-y-2"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="rounded bg-strawberry/70 px-1.5 py-0.5 text-[9px] font-bold uppercase border border-licorice/30">
                {{ labelTipe(s.tipe) }}
              </span>
              <span class="font-heading font-bold text-licorice truncate">{{ s.label }}</span>
            </div>
            <button
              type="button"
              class="text-cherry hover:scale-110 transition-transform"
              title="Hapus struktur"
              @click="hapusStruktur(s)"
            >
              <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
          </div>

          <div class="grid grid-cols-2 gap-1.5 text-[10px]">
            <label class="block">
              <span class="text-muted font-semibold">X (cm)</span>
              <input
                type="number"
                step="10"
                :value="Math.round(s.posisi_x)"
                class="ws-input mt-0.5 py-1 text-[11px] font-bold"
                @change="ubahStruktur(s, { posisi_x: Number($event.target.value) })"
              />
            </label>
            <label class="block">
              <span class="text-muted font-semibold">Y (cm)</span>
              <input
                type="number"
                step="10"
                :value="Math.round(s.posisi_y)"
                class="ws-input mt-0.5 py-1 text-[11px] font-bold"
                @change="ubahStruktur(s, { posisi_y: Number($event.target.value) })"
              />
            </label>
            <label class="block">
              <span class="text-muted font-semibold">Panjang (cm)</span>
              <input
                type="number"
                min="40"
                step="10"
                :value="Math.round(s.panjang)"
                class="ws-input mt-0.5 py-1 text-[11px] font-bold"
                @change="ubahStruktur(s, { panjang: Math.max(40, Number($event.target.value)) })"
              />
            </label>
            <label class="block">
              <span class="text-muted font-semibold">Tinggi (cm)</span>
              <input
                type="number"
                min="50"
                step="10"
                :value="Math.round(s.tinggi)"
                class="ws-input mt-0.5 py-1 text-[11px] font-bold"
                @change="ubahStruktur(s, { tinggi: Math.max(50, Number($event.target.value)) })"
              />
            </label>
          </div>

          <div class="flex items-center justify-between gap-2 pt-1">
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="ws-btn-paper px-2 py-0.5 text-[10px] font-bold"
                @click="ubahStruktur(s, { rotasi: (Number(s.rotasi || 0) + 90) % 360 })"
              >
                <i class="fa-solid fa-rotate-right mr-1 text-cherry"></i>{{ Math.round(s.rotasi || 0) }}°
              </button>
            </div>
            <label class="flex items-center gap-1 text-[10px] text-muted font-semibold">
              <span>Warna</span>
              <input
                type="color"
                :value="s.warna || '#EFE7DD'"
                class="h-6 w-7 cursor-pointer rounded border border-licorice bg-paper"
                @change="ubahStruktur(s, { warna: $event.target.value })"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>
