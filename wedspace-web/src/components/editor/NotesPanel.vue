<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../../stores/auth'

const props = defineProps({
  designId: { type: [String, Number], required: true },
  notes: { type: Array, default: () => [] },
  panjangVenue: { type: Number, default: 15 },
  lebarVenue: { type: Number, default: 10 },
  darkMode: { type: Boolean, default: false },
})

const emit = defineEmits(['updated', 'tutup'])

const auth = useAuthStore()
const API = 'http://localhost:3000/api'

const judul = ref('')
const isi = ref('')
const warna = ref('#F7E3A8')
const pinDiCanvas = ref(false)
const posX = ref(Math.round((props.panjangVenue * 100) / 2))
const posY = ref(Math.round((props.lebarVenue * 100) / 2))
const sibuk = ref(false)
const error = ref('')

const warnaPilihan = [
  { hex: '#F7E3A8', label: 'Krem' },
  { hex: '#F5C6D6', label: 'Pink' },
  { hex: '#DDD0EE', label: 'Lavender' },
  { hex: '#CDE9C5', label: 'Mint' },
]

function resolveNoteStyle(hex) {
  return {
    card: { backgroundColor: hex || '#F7E3A8' },
    title: { color: '#2A111A' },
    body: { color: '#3F1D2B' },
    pin: { color: '#9F1239' },
  }
}

async function tambahCatatan() {
  if (!judul.value.trim()) {
    error.value = 'Judul catatan wajib diisi.'
    return
  }
  if (!isi.value.trim()) {
    error.value = 'Isi catatan wajib diisi.'
    return
  }
  sibuk.value = true
  error.value = ''
  try {
    const payload = {
      judul: judul.value.trim(),
      isi: isi.value.trim(),
      warna: warna.value,
      posisi_x: pinDiCanvas.value ? Number(posX.value || 0) : null,
      posisi_y: pinDiCanvas.value ? Number(posY.value || 0) : null,
      selesai: false,
    }
    const res = await fetch(`${API}/rancangan/${props.designId}/catatan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.authHeader() },
      body: JSON.stringify(payload),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.pesan || 'Gagal menyimpan catatan.')
    emit('updated', [body.data, ...props.notes])
    judul.value = ''
    isi.value = ''
    pinDiCanvas.value = false
  } catch (err) {
    error.value = err.message
  } finally {
    sibuk.value = false
  }
}

async function toggleSelesai(note) {
  try {
    const res = await fetch(`${API}/rancangan/${props.designId}/catatan/${note.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth.authHeader() },
      body: JSON.stringify({ selesai: !note.selesai }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.pesan || 'Gagal mengubah status catatan.')
    emit('updated', props.notes.map((n) => (n.id === note.id ? body.data : n)))
  } catch (err) {
    error.value = err.message
  }
}

async function hapusCatatan(note) {
  try {
    const res = await fetch(`${API}/rancangan/${props.designId}/catatan/${note.id}`, {
      method: 'DELETE',
      headers: auth.authHeader(),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.pesan || 'Gagal menghapus catatan.')
    }
    emit('updated', props.notes.filter((n) => n.id !== note.id))
  } catch (err) {
    error.value = err.message
  }
}
</script>

<template>
  <aside class="ws-paper-card flex h-full flex-col overflow-hidden border-2 border-licorice bg-paper shadow-md">
    <div class="bg-stripes-violet flex items-center justify-between border-b-2 border-licorice px-4 py-2.5">
      <div class="flex items-center gap-2">
        <i class="fa-solid fa-note-sticky text-cherry text-xs"></i>
        <span class="ws-eyebrow">Catatan WO</span>
      </div>
      <button
        type="button"
        class="flex h-6 w-6 items-center justify-center rounded-md border border-licorice/40 bg-marshmallow text-xs"
        title="Tutup Catatan"
        @click="$emit('tutup')"
      >
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
      <!-- Form Tambah Catatan -->
      <form class="rounded-xl border-2 border-licorice bg-marshmallow p-3 space-y-2.5 shadow-[2px_2px_0px_#7F1125]" @submit.prevent="tambahCatatan">
        <p class="text-xs font-bold uppercase tracking-wider text-licorice">Tambah Catatan Baru</p>
        <p v-if="error" class="rounded bg-strawberry/80 px-2 py-1 text-[0.6875rem] font-bold text-cherry">{{ error }}</p>

        <input
          v-model="judul"
          type="text"
          placeholder="Judul singkat (mis. Jalur Catering)"
          class="ws-input py-1.5 text-xs"
        />

        <textarea
          v-model="isi"
          rows="2"
          placeholder="Tulis catatan koordinasi vendor, listrik, jadwal loading..."
          class="ws-input py-1.5 text-xs"
        ></textarea>

        <!-- Pilih warna sticky note -->
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-1.5">
            <button
              v-for="w in warnaPilihan"
              :key="w.hex"
              type="button"
              class="h-5 w-5 rounded-full border-2 transition-transform"
              :class="
                warna === w.hex
                  ? (darkMode ? 'border-white scale-110 ring-2 ring-white/30' : 'border-licorice scale-110')
                  : (darkMode ? 'border-white/30' : 'border-licorice/30')
              "
              :style="{ backgroundColor: w.hex }"
              :title="w.label"
              @click="warna = w.hex"
            ></button>
          </div>

          <label class="flex items-center gap-1.5 text-xs font-semibold text-licorice cursor-pointer">
            <input v-model="pinDiCanvas" type="checkbox" class="accent-cherry" />
            <span>Pin di Canvas</span>
          </label>
        </div>

        <div v-if="pinDiCanvas" class="grid grid-cols-2 gap-1.5 text-[0.6875rem]">
          <label>
            <span class="text-muted font-semibold">Pin X (cm)</span>
            <input v-model.number="posX" type="number" step="10" min="0" :max="panjangVenue * 100" class="ws-input mt-0.5 py-1 text-xs" />
          </label>
          <label>
            <span class="text-muted font-semibold">Pin Y (cm)</span>
            <input v-model.number="posY" type="number" step="10" min="0" :max="lebarVenue * 100" class="ws-input mt-0.5 py-1 text-xs" />
          </label>
        </div>

        <button type="submit" :disabled="sibuk" class="ws-btn-cherry w-full py-2 text-xs font-bold disabled:opacity-50">
          <i class="fa-solid fa-plus mr-1.5"></i>{{ sibuk ? 'Menyimpan…' : 'Simpan Catatan' }}
        </button>
      </form>

      <!-- Daftar Catatan -->
      <div class="space-y-2.5">
        <p class="text-xs font-bold uppercase tracking-wider text-muted">
          Daftar Catatan ({{ notes.length }})
        </p>

        <div v-if="notes.length === 0" class="rounded-xl border border-dashed border-licorice/30 bg-marshmallow/50 p-4 text-center text-xs text-muted">
          Belum ada catatan untuk rancangan ini. Catatan tersinkron otomatis antara Workspace 2D & 3D.
        </div>

        <article
          v-for="n in notes"
          :key="n.id"
          class="ws-note-card rounded-xl border-2 border-licorice p-3 shadow-[2px_2px_0px_#7F1125] space-y-1.5 transition-opacity"
          :class="{ 'opacity-65': n.selesai }"
          :style="resolveNoteStyle(n.warna).card"
        >
          <div class="flex items-start justify-between gap-2">
            <label class="flex items-center gap-1.5 cursor-pointer min-w-0">
              <input
                type="checkbox"
                :checked="n.selesai"
                class="accent-cherry mt-0.5"
                @change="toggleSelesai(n)"
              />
              <h4
                class="ws-note-title font-heading font-bold text-sm leading-snug break-words"
                :class="{ 'line-through': n.selesai }"
                :style="resolveNoteStyle(n.warna).title"
              >
                {{ n.judul }}
              </h4>
            </label>
            <button
              type="button"
              class="ws-note-delete flex-shrink-0 text-[#9F1239] hover:scale-110 transition-transform"
              title="Hapus catatan"
              @click="hapusCatatan(n)"
            >
              <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
          </div>

          <p
            class="ws-note-body text-xs leading-relaxed whitespace-pre-line"
            :class="{ 'line-through': n.selesai }"
            :style="resolveNoteStyle(n.warna).body"
          >
            {{ n.isi }}
          </p>

          <div
            v-if="n.posisi_x !== null && n.posisi_y !== null"
            class="ws-note-pin flex items-center pt-1 text-[0.6875rem]"
            :style="resolveNoteStyle(n.warna).pin"
            title="Terpin di Canvas"
          >
            <i class="fa-solid fa-thumbtack"></i>
          </div>
        </article>
      </div>
    </div>
  </aside>
</template>
