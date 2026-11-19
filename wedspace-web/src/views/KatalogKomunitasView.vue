<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import DecorationCard from '../components/DecorationCard.vue'
import DecorationDetailModal from '../components/DecorationDetailModal.vue'
import VintageOrnament from '../components/VintageOrnament.vue'

const auth = useAuthStore()
const API = 'http://localhost:3000/api'

const daftar = ref([])
const sibuk = ref(false)
const error = ref('')
const terpilihDetail = ref(null)

// Filter & Pencarian
const cari = ref('')
const filterKategori = ref('')
const filterSumber = ref('') // '' (Semua) | 'platform' | 'komunitas'

let debouncePewaktu = null

const kategoriList = computed(() => {
  return [...new Set(daftar.value.map((d) => d.kategori).filter(Boolean))].sort()
})

const totalSemua = computed(() => daftar.value.length)
const totalPlatform = computed(() => daftar.value.filter((d) => !d.created_by_user_id).length)
const totalKomunitas = computed(() => daftar.value.filter((d) => !!d.created_by_user_id).length)

const tampil = computed(() => {
  const k = cari.value.trim().toLowerCase()
  return daftar.value.filter((d) => {
    const cocokCari = !k || (d.nama_dekorasi || '').toLowerCase().includes(k)
    const cocokKat = !filterKategori.value || d.kategori === filterKategori.value

    let cocokSumber = true
    if (filterSumber.value === 'platform') {
      cocokSumber = !d.created_by_user_id
    } else if (filterSumber.value === 'komunitas') {
      cocokSumber = !!d.created_by_user_id
    }

    return cocokCari && cocokKat && cocokSumber
  })
})

async function muat() {
  sibuk.value = true
  error.value = ''
  try {
    const params = new URLSearchParams()
    params.set('scope', 'community')
    if (cari.value) params.set('q', cari.value.trim())
    if (filterKategori.value) params.set('kategori', filterKategori.value)

    const res = await fetch(`${API}/dekorasi?${params}`, {
      headers: auth.authHeader(),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.pesan || 'Gagal memuat katalog komunitas.')
    }
    daftar.value = data.data || []
  } catch (err) {
    error.value = err.message || 'Terjadi kesalahan saat memuat katalog komunitas.'
  } finally {
    sibuk.value = false
  }
}

watch(cari, () => {
  clearTimeout(debouncePewaktu)
  debouncePewaktu = setTimeout(muat, 300)
})

watch(filterKategori, () => {
  muat()
})

onMounted(muat)
</script>

<template>
  <section class="space-y-6">
    <!-- Header Banner & Tab Navigation -->
    <div class="ws-paper-card bg-grid-paper overflow-hidden">
      <!-- Ribbon Header -->
      <div class="bg-stripes-pink flex flex-wrap items-center justify-between gap-2 border-b-2 border-licorice px-6 py-2.5">
        <span class="ws-eyebrow">KATALOG DEKORASI PUBLIK &amp; KOMUNITAS</span>
        <div class="flex items-center gap-1.5 text-xs font-bold text-cherry">
          <i class="fa-solid fa-globe"></i>
          <span>Akses Terbuka Seluruh WO</span>
        </div>
      </div>

      <!-- Main Header Banner -->
      <div class="flex flex-wrap items-center justify-between gap-4 p-6 md:p-8">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="font-heading text-4xl font-bold text-licorice md:text-5xl">Katalog Komunitas</h1>
            <VintageOrnament variant="oval-sticker" label="Public" warna="strawberry" class="-rotate-2" />
          </div>
          <p class="mt-2 text-sm text-muted max-w-2xl leading-relaxed">
            Jelajahi dekorasi yang dibagikan oleh para Wedding Organizer dan katalog bawaan WedSpace. 
            Semua item di katalog ini bersifat <strong>Public</strong> dan dapat digunakan sebagai referensi perancangan layout venue pernikahan.
          </p>
        </div>

        <!-- Quick Switcher to Katalog Saya -->
        <RouterLink
          to="/katalog/saya"
          class="ws-btn-paper px-5 py-3 text-xs font-bold uppercase tracking-wider shadow-sm hover:scale-[1.02] transition-transform"
        >
          <i class="fa-solid fa-box-open mr-2 text-cherry"></i>Kelola Dekorasi Saya
        </RouterLink>
      </div>

      <!-- Tab Switcher Bar -->
      <div class="flex items-center gap-2 border-t-2 border-licorice bg-marshmallow px-6 py-2">
        <span class="text-xs font-bold uppercase tracking-wider text-muted mr-2">Tampilan:</span>
        <RouterLink
          to="/katalog/saya"
          class="rounded-lg border border-licorice/40 bg-marshmallow px-4 py-1.5 text-xs font-bold text-licorice hover:bg-paper transition-colors"
        >
          <i class="fa-solid fa-box-open mr-1.5 text-cherry"></i>Katalog Saya
        </RouterLink>
        <RouterLink
          to="/katalog/komunitas"
          class="rounded-lg border-2 border-licorice bg-paper px-4 py-1.5 text-xs font-bold text-cherry shadow-[2px_2px_0px_#7F1125]"
        >
          <i class="fa-solid fa-users-viewfinder mr-1.5"></i>Katalog Komunitas &amp; Platform ({{ totalSemua }})
        </RouterLink>
      </div>
    </div>

    <!-- Informative Non-Marketplace Disclaimer Banner -->
    <div class="rounded-xl border-2 border-licorice bg-paper p-4 shadow-sm flex items-start gap-3.5">
      <div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-licorice bg-strawberry text-cherry shadow-sm">
        <i class="fa-solid fa-circle-info text-sm"></i>
      </div>
      <div class="text-xs text-licorice/85 leading-relaxed">
        <strong class="font-bold text-licorice">Informasi Perancangan Venue:</strong>
        Harga yang tercantum merupakan <em>harga referensi estimasi</em> dari penyedia/kontributor untuk keperluan kalkulasi anggaran rancangan venue. 
        WedSpace adalah aplikasi perancangan tata letak venue pernikahan, bukan platform e-commerce marketplace jual-beli.
      </div>
    </div>

    <!-- Error Alert -->
    <div
      v-if="error"
      class="flex items-center justify-between rounded-xl border-2 border-licorice bg-strawberry/80 px-5 py-3 text-sm font-bold text-cherry shadow-sm"
    >
      <div class="flex items-center gap-2">
        <i class="fa-solid fa-circle-exclamation text-base"></i>
        <span>{{ error }}</span>
      </div>
      <button type="button" class="text-cherry/60 hover:text-cherry" @click="error = ''">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>

    <!-- Stats Summary Tickets -->
    <div class="grid grid-cols-3 gap-3 sm:gap-4">
      <div class="ws-ticket bg-paper p-4 text-center">
        <p class="font-heading text-3xl font-bold text-licorice">{{ totalSemua }}</p>
        <p class="ws-eyebrow mt-1 text-muted">Total Publik</p>
      </div>

      <div class="ws-ticket bg-strawberry/35 p-4 text-center">
        <p class="font-heading text-3xl font-bold text-cherry">{{ totalPlatform }}</p>
        <p class="ws-eyebrow mt-1 text-cherry font-bold">
          <i class="fa-solid fa-certificate text-[10px] mr-1"></i>Aset WedSpace
        </p>
      </div>

      <div class="ws-ticket bg-violet/30 p-4 text-center">
        <p class="font-heading text-3xl font-bold text-licorice">{{ totalKomunitas }}</p>
        <p class="ws-eyebrow mt-1 text-licorice font-bold">
          <i class="fa-solid fa-user-pen text-[10px] mr-1 text-cherry"></i>Dari Komunitas
        </p>
      </div>
    </div>

    <!-- Search & Filter Bar -->
    <div class="ws-paper-card flex flex-col gap-3 bg-paper p-4 sm:flex-row sm:items-center">
      <!-- Search Input -->
      <div class="relative flex-1">
        <i class="fa-solid fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"></i>
        <input
          v-model="cari"
          type="search"
          placeholder="Cari nama dekorasi komunitas…"
          class="ws-input pl-11"
        />
      </div>

      <!-- Source Filter -->
      <select v-model="filterSumber" class="ws-input sm:w-52 text-xs font-bold">
        <option value="">Semua Sumber Aset</option>
        <option value="platform">🏛️ Bawaan WedSpace</option>
        <option value="komunitas">👥 Kontributor Komunitas</option>
      </select>

      <!-- Category Filter -->
      <select v-model="filterKategori" class="ws-input sm:w-56 text-xs font-bold">
        <option value="">Semua Kategori</option>
        <option v-for="kat in kategoriList" :key="kat" :value="kat">{{ kat }}</option>
      </select>
    </div>

    <!-- Loading State -->
    <div v-if="sibuk && !daftar.length" class="ws-paper-card p-12 text-center text-muted">
      <i class="fa-solid fa-circle-notch fa-spin text-3xl text-cherry"></i>
      <p class="mt-3 font-semibold text-licorice">Memuat Katalog Komunitas…</p>
    </div>

    <!-- Community Cards Grid -->
    <div v-else-if="tampil.length" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <DecorationCard
        v-for="d in tampil"
        :key="d.id"
        :dekorasi="d"
        mode="komunitas"
        @detail="terpilihDetail = $event"
      />
    </div>

    <!-- Empty State -->
    <div v-else class="ws-paper-card bg-grid-paper p-12 text-center">
      <VintageOrnament variant="flower" warna="cherry" class="mx-auto h-12 w-12" />
      <h3 class="font-heading mt-3 text-2xl font-bold text-licorice sm:text-3xl">
        Tidak Ada Dekorasi Ditemukan
      </h3>
      <p class="mx-auto mt-2 max-w-md text-sm text-muted">
        Tidak ada dekorasi komunitas yang cocok dengan kata kunci pencarian atau filter yang dipilih.
      </p>
      <button
        type="button"
        class="ws-btn-paper mt-5 px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
        @click="cari = ''; filterKategori = ''; filterSumber = ''"
      >
        Reset Filter Pencarian
      </button>
    </div>

    <!-- Detail Modal -->
    <DecorationDetailModal
      :tampil="!!terpilihDetail"
      :dekorasi="terpilihDetail"
      @tutup="terpilihDetail = null"
    />
  </section>
</template>
