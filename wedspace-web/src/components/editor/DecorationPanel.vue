<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '../../stores/auth'

defineProps({
  terbuka: { type: Boolean, default: false },
})

const emit = defineEmits(['tambah-item', 'tutup'])

const auth = useAuthStore()
const API = 'http://localhost:3000/api'

const tabAktif = ref('saya') // 'saya' | 'komunitas'
const cari = ref('')
const filterKategori = ref('')
const daftarSaya = ref([])
const daftarKomunitas = ref([])
const sibuk = ref(false)
const error = ref('')

async function muatKatalogSaya() {
  try {
    const res = await fetch(`${API}/dekorasi?scope=mine`, { headers: auth.authHeader() })
    const data = await res.json()
    if (res.ok) {
      daftarSaya.value = (data.data || []).filter((d) => d.is_active)
    }
  } catch (e) {
    // silently catch or show error
  }
}

async function muatKatalogKomunitas() {
  try {
    const res = await fetch(`${API}/dekorasi?scope=community`, { headers: auth.authHeader() })
    const data = await res.json()
    if (res.ok) {
      daftarKomunitas.value = (data.data || []).filter((d) => d.is_active)
    }
  } catch (e) {
    // silently catch
  }
}

async function muatSemua() {
  sibuk.value = true
  error.value = ''
  try {
    await Promise.all([muatKatalogSaya(), muatKatalogKomunitas()])
  } catch (err) {
    error.value = 'Gagal memuat katalog dekorasi.'
  } finally {
    sibuk.value = false
  }
}

const daftarAktif = computed(() => {
  return tabAktif.value === 'saya' ? daftarSaya.value : daftarKomunitas.value
})

const kategoriList = computed(() => {
  return [...new Set(daftarAktif.value.map((d) => d.kategori).filter(Boolean))].sort()
})

const daftarFilter = computed(() => {
  const q = cari.value.trim().toLowerCase()
  return daftarAktif.value.filter((d) => {
    const cocokCari = !q || (d.nama_dekorasi || '').toLowerCase().includes(q)
    const cocokKat = !filterKategori.value || d.kategori === filterKategori.value
    return cocokCari && cocokKat
  })
})

function inisial(nama) {
  return (nama || '?').trim().charAt(0).toUpperCase()
}

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

// Drag start handler for dragging to canvas
function onDragStart(e, d) {
  e.dataTransfer.effectAllowed = 'copy'
  e.dataTransfer.setData('application/json', JSON.stringify(d))
}

function tambahKeCanvas(d) {
  emit('tambah-item', d)
}

onMounted(muatSemua)
</script>

<template>
  <aside
    class="ws-paper-card flex h-full flex-col overflow-hidden bg-paper border-2 border-licorice shadow-sm transition-transform"
  >
    <!-- Panel Header Ribbon -->
    <div class="bg-stripes-pink flex items-center justify-between border-b-2 border-licorice px-4 py-2.5">
      <div class="flex items-center gap-2">
        <i class="fa-solid fa-boxes-stacked text-cherry text-xs"></i>
        <span class="ws-eyebrow">Palet Dekorasi</span>
      </div>
      <!-- Close Button for Mobile -->
      <button
        type="button"
        class="flex h-6 w-6 items-center justify-center rounded-md border border-licorice/40 bg-marshmallow text-xs lg:hidden"
        title="Tutup Palet"
        @click="$emit('tutup')"
      >
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>

    <!-- Tab Switcher: Katalog Saya vs Komunitas -->
    <div class="grid grid-cols-2 border-b-2 border-licorice bg-marshmallow text-xs font-bold text-center">
      <button
        type="button"
        class="py-2.5 transition-colors border-r-2 border-licorice flex items-center justify-center gap-1.5"
        :class="tabAktif === 'saya'
          ? 'bg-paper text-cherry font-bold shadow-inner'
          : 'text-licorice/70 hover:bg-paper/60'"
        @click="tabAktif = 'saya'; filterKategori = ''"
      >
        <i class="fa-solid fa-box-open text-[11px]"></i>
        <span>Katalog Saya ({{ daftarSaya.length }})</span>
      </button>

      <button
        type="button"
        class="py-2.5 transition-colors flex items-center justify-center gap-1.5"
        :class="tabAktif === 'komunitas'
          ? 'bg-paper text-cherry font-bold shadow-inner'
          : 'text-licorice/70 hover:bg-paper/60'"
        @click="tabAktif = 'komunitas'; filterKategori = ''"
      >
        <i class="fa-solid fa-users-viewfinder text-[11px]"></i>
        <span>Komunitas ({{ daftarKomunitas.length }})</span>
      </button>
    </div>

    <!-- Search & Filter Controls -->
    <div class="border-b border-licorice/30 bg-marshmallow/50 p-2.5 space-y-2">
      <!-- Search -->
      <div class="relative">
        <i class="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs"></i>
        <input
          v-model="cari"
          type="search"
          placeholder="Cari dekorasi…"
          class="ws-input py-1.5 pl-8 text-xs"
        />
      </div>

      <!-- Category Filter -->
      <select v-model="filterKategori" class="ws-input py-1.5 text-xs font-semibold">
        <option value="">Semua Kategori ({{ kategoriList.length }})</option>
        <option v-for="kat in kategoriList" :key="kat" :value="kat">{{ kat }}</option>
      </select>
    </div>

    <!-- Instructions Tip -->
    <div class="bg-violet/15 px-3 py-1.5 text-[10px] text-licorice/80 border-b border-licorice/20 flex items-center gap-1.5">
      <i class="fa-solid fa-hand-pointer text-cherry text-xs"></i>
      <span>Drag ke denah atau tekan <strong>+ Tambah</strong>.</span>
    </div>

    <!-- Scrollable Items List -->
    <div class="flex-1 overflow-y-auto p-3 space-y-2.5">
      <!-- Loading State -->
      <div v-if="sibuk && !daftarAktif.length" class="p-8 text-center text-muted text-xs">
        <i class="fa-solid fa-circle-notch fa-spin text-xl text-cherry"></i>
        <p class="mt-2 font-medium">Memuat palet dekorasi…</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="!daftarFilter.length" class="p-6 text-center text-muted text-xs">
        <i class="fa-solid fa-box-open text-2xl text-cherry/60 mb-2"></i>
        <p class="font-bold text-licorice">Tidak ada dekorasi</p>
        <p class="mt-1 text-[11px]">
          {{ tabAktif === 'saya' ? 'Belum ada dekorasi pribadi aktif di Katalog Saya.' : 'Tidak ada dekorasi komunitas yang cocok.' }}
        </p>
      </div>

      <!-- Item Palette Cards -->
      <div
        v-for="d in daftarFilter"
        :key="d.id"
        draggable="true"
        class="group relative flex cursor-grab items-center gap-2.5 rounded-xl border-2 border-licorice bg-marshmallow p-2 shadow-[2px_2px_0px_#7F1125] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#7F1125] transition-all active:cursor-grabbing"
        @dragstart="onDragStart($event, d)"
      >
        <!-- Thumbnail / Initial -->
        <div class="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-licorice bg-paper">
          <img
            v-if="urlGambar(d)"
            :src="urlGambar(d)"
            :alt="d.nama_dekorasi"
            class="h-full w-full object-cover"
          />
          <div v-else class="bg-stripes-pink flex h-full w-full items-center justify-center font-heading font-bold text-cherry text-lg">
            {{ inisial(d.nama_dekorasi) }}
          </div>
        </div>

        <!-- Info -->
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1">
            <span class="rounded bg-strawberry/60 px-1.5 py-0.2 text-[9px] font-bold text-licorice border border-licorice/30 uppercase">
              {{ d.kategori }}
            </span>
            <span
              v-if="d.visibility === 'public' && tabAktif === 'komunitas'"
              class="text-[9px] font-semibold text-cherry truncate"
            >
              • {{ d.kontributor || 'WedSpace' }}
            </span>
          </div>

          <h4 class="mt-0.5 font-heading text-sm font-bold text-licorice truncate" :title="d.nama_dekorasi">
            {{ d.nama_dekorasi }}
          </h4>

          <div class="mt-0.5 flex items-center justify-between text-[10px] text-muted">
            <span>{{ d.panjang }}×{{ d.lebar }} cm</span>
            <span class="font-bold text-licorice">{{ rupiah(d.harga) }}</span>
          </div>
        </div>

        <!-- Add Button -->
        <button
          type="button"
          class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-licorice bg-apple/70 text-licorice font-bold shadow-sm hover:bg-apple active:scale-95 transition-all"
          title="Tambahkan ke Canvas"
          @click.stop="tambahKeCanvas(d)"
        >
          <i class="fa-solid fa-plus text-xs"></i>
        </button>
      </div>
    </div>
  </aside>
</template>
