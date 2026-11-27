<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useSubscriptionStore } from '../stores/subscription'
import StatCard from '../components/StatCard.vue'
import VintageOrnament from '../components/VintageOrnament.vue'

const auth = useAuthStore()
const sub = useSubscriptionStore()
const API = 'http://localhost:3000/api'

const adalahAdmin = computed(() => auth.adalahAdmin)

const infoPaket = computed(() => {
  if (sub.adalahAdmin) return 'Tanpa batasan paket Free/Premium.'
  if (sub.maksProyek === null) {
    return `Proyek tanpa batas paket | AI ${sub.batas.kuota_rekomendasi_per_minggu ?? '-'}/minggu/proyek`
  }
  return `${sub.proyekAktif}/${sub.maksProyek} proyek aktif | AI ${sub.batas.kuota_rekomendasi_per_minggu}/minggu/proyek`
})

const ringkasan = ref({ total_proyek: 0, rancangan_tersimpan: 0, dekorasi_tersedia: 0 })
const dataDekorasi = ref([])
const sibuk = ref(false)
const error = ref('')

const totalDekorasi = computed(() => dataDekorasi.value.length)
const dekorasiAktif = computed(() => dataDekorasi.value.filter((d) => d.is_active).length)
const dekorasiNonaktif = computed(() => totalDekorasi.value - dekorasiAktif.value)
const totalKategori = computed(() => new Set(dataDekorasi.value.map((d) => d.kategori)).size)

async function muat() {
  sibuk.value = true
  error.value = ''
  try {
    if (adalahAdmin.value) {
      // Dashboard admin hanya berisi ringkasan data dekorasi
      const res = await fetch(`${API}/dekorasi`, { headers: auth.authHeader() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.pesan || 'Gagal memuat data dekorasi.')
      dataDekorasi.value = data.data
    } else {
      const res = await fetch(`${API}/dashboard`, { headers: auth.authHeader() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.pesan || 'Gagal memuat dashboard.')
      ringkasan.value = data.data
    }
  } catch (err) {
    error.value = err.message
  } finally {
    sibuk.value = false
  }
}

onMounted(() => {
  muat()
  // Informasi paket langganan (tidak memblokir dashboard bila gagal)
  sub.muat().catch(() => {})
})
</script>

<template>
  <!-- Dashboard admin: khusus pengelolaan data dekorasi, tanpa proyek & katalog WO -->
  <section v-if="adalahAdmin" class="space-y-6">
    <div class="ws-paper-card bg-grid-paper relative overflow-hidden">
      <div class="bg-stripes-pink flex items-center justify-between border-b-2 border-licorice px-6 py-2.5">
        <span class="ws-eyebrow">CURATOR DESK • ADMINISTRATOR</span>
        <VintageOrnament variant="ticket-stamp" label="Admin Edition" />
      </div>
      <div class="flex flex-wrap items-center justify-between gap-4 p-6 md:p-8">
        <div>
          <h1 class="font-heading text-4xl font-bold text-licorice md:text-5xl">Dashboard Admin</h1>
          <p class="mt-1.5 text-sm font-medium text-muted">Ringkasan data dekorasi WedSpace.</p>
        </div>
        <VintageOrnament variant="oval-sticker" label="catalog master" warna="peach" class="-rotate-3" />
      </div>
    </div>

    <p v-if="error" class="rounded-xl border-2 border-licorice bg-strawberry/75 px-4 py-3 text-sm font-semibold text-cherry">
      <i class="fa-solid fa-circle-exclamation mr-1.5"></i>{{ error }}
    </p>

    <div v-if="sibuk && !totalDekorasi" class="ws-paper-card p-8 text-center text-muted">Memuat data…</div>

    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard judul="Total Dekorasi" :nilai="totalDekorasi" ikon="fa-box-archive" />
      <StatCard judul="Dekorasi Aktif" :nilai="dekorasiAktif" ikon="fa-circle-check" />
      <StatCard judul="Dekorasi Nonaktif" :nilai="dekorasiNonaktif" ikon="fa-circle-pause" />
    </div>

    <div class="checkerboard-trim rounded-full border border-licorice"></div>

    <RouterLink
      to="/admin/dekorasi"
      class="ws-paper-card ws-paper-card-hover flex items-center justify-between gap-4 bg-paper p-6"
    >
      <span class="flex items-center gap-4">
        <span class="flex h-13 w-13 flex-none items-center justify-center rounded-2xl border-2 border-licorice bg-strawberry text-xl text-cherry shadow-[2px_2px_0px_#7F1125]">
          <i class="fa-solid fa-box-archive"></i>
        </span>
        <span>
          <span class="ws-badge-sticker mb-1.5 bg-peach text-licorice">Manajemen Katalog</span>
          <span class="font-heading block text-2xl font-bold text-licorice">Kelola Data Dekorasi</span>
          <span class="block text-sm text-muted">
            Tambah, ubah, dan hapus data dekorasi beserta harga dan ukurannya.
            <template v-if="totalKategori"> Terdapat {{ totalKategori }} kategori.</template>
          </span>
        </span>
      </span>
      <span class="ws-btn-cherry px-4 py-2.5">
        Buka <i class="fa-solid fa-arrow-right ml-1.5"></i>
      </span>
    </RouterLink>
  </section>

  <!-- Dashboard WO: ringkasan proyek & rancangan -->
  <section v-else class="space-y-6">
    <!-- Welcome Banner with Grid Paper & Scrapbook Ornaments -->
    <div class="ws-paper-card bg-grid-paper relative overflow-hidden">
      <div class="bg-stripes-pink flex flex-wrap items-center justify-between gap-2 border-b-2 border-licorice px-6 py-2.5">
        <span class="ws-eyebrow">(WEDDING ORGANIZER WORKSPACE)</span>
        <span class="rounded-full border border-licorice bg-marshmallow px-3 py-0.5 text-[0.6875rem] font-bold uppercase tracking-widest text-cherry">
          Studio Planner
        </span>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-6 p-6 md:p-8">
        <div>
          <h1 class="font-heading text-4xl font-bold text-licorice md:text-5xl">
            Halo, {{ auth.user?.nama || 'perencana' }}
          </h1>
          <p class="mt-1.5 text-sm font-medium text-muted">Berikut ringkasan workspace-mu.</p>
        </div>

        <div class="flex items-center gap-3">
          <VintageOrnament variant="rings" class="hidden h-11 w-14 sm:inline-block" />
          <VintageOrnament variant="oval-sticker" label="ready to plan!" warna="peach" class="-rotate-3" />
        </div>
      </div>
    </div>

    <p v-if="error" class="rounded-xl border-2 border-licorice bg-strawberry/75 px-4 py-3 text-sm font-semibold text-cherry">
      <i class="fa-solid fa-circle-exclamation mr-1.5"></i>{{ error }}
    </p>

    <div v-if="sibuk && !ringkasan.total_proyek" class="ws-paper-card p-8 text-center text-muted">Memuat data…</div>

    <!-- Ticket-shaped Statistics -->
    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard judul="Total Proyek" :nilai="ringkasan.total_proyek" ikon="fa-folder-open" />
      <StatCard judul="Rancangan Tersimpan" :nilai="ringkasan.rancangan_tersimpan" ikon="fa-pen-ruler" />
      <StatCard judul="Dekorasi Tersedia" :nilai="ringkasan.dekorasi_tersedia" ikon="fa-wand-magic-sparkles" />
    </div>

    <!-- Decorative Striped Divider -->
    <div class="bg-stripes-pink h-3.5 rounded-full border-2 border-licorice"></div>

    <!-- Scrapbook Quick Action Cards -->
    <div class="grid gap-5 sm:grid-cols-2">
      <RouterLink
        to="/proyek/baru"
        class="ws-paper-card ws-paper-card-hover group relative overflow-hidden bg-paper p-6"
      >
        <div class="flex items-start justify-between">
          <span class="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-licorice bg-strawberry text-lg text-cherry shadow-[2px_2px_0px_#7F1125]">
            <i class="fa-solid fa-plus"></i>
          </span>
          <span class="ws-badge-sticker bg-peach text-licorice">Langkah 01</span>
        </div>
        <h2 class="font-heading mt-4 text-3xl font-bold text-licorice group-hover:text-cherry">Buat Proyek Baru</h2>
        <p class="mt-1 text-sm text-muted">Mulai rancangan venue pernikahan berikutnya.</p>
      </RouterLink>

      <RouterLink
        to="/katalog"
        class="ws-paper-card ws-paper-card-hover group relative overflow-hidden bg-paper p-6"
      >
        <div class="flex items-start justify-between">
          <span class="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-licorice bg-violet text-lg text-licorice shadow-[2px_2px_0px_#7F1125]">
            <i class="fa-solid fa-images"></i>
          </span>
          <span class="ws-badge-sticker bg-strawberry text-licorice">Koleksi Item</span>
        </div>
        <h2 class="font-heading mt-4 text-3xl font-bold text-licorice group-hover:text-cherry">Jelajahi Katalog</h2>
        <p class="mt-1 text-sm text-muted">Lihat dekorasi yang tersedia beserta harganya.</p>
      </RouterLink>
    </div>

    <!-- Status paket langganan WO (Ticket Banner) -->
    <RouterLink
      to="/langganan"
      v-if="sub.ringkasan"
      class="ws-ticket flex flex-wrap items-center justify-between gap-4 bg-violet/45 p-5 transition-transform hover:-translate-y-0.5"
    >
      <span class="flex items-center gap-4">
        <span class="flex h-12 w-12 flex-none items-center justify-center rounded-2xl border-2 border-licorice bg-marshmallow text-lg text-cherry shadow-[2px_2px_0px_#7F1125]">
          <i class="fa-solid fa-crown"></i>
        </span>
        <span>
          <span class="ws-badge-sticker bg-strawberry text-licorice">Status Langganan</span>
          <span class="font-heading mt-1 block text-2xl font-bold text-licorice">Paket {{ sub.namaPaket }}</span>
          <span class="block text-xs font-medium text-muted">{{ infoPaket }}</span>
        </span>
      </span>
      <span class="ws-btn-cherry px-4 py-2.5">
        {{ sub.adalahPremium ? 'Lihat detail' : 'Upgrade ke Premium' }}
        <i class="fa-solid fa-arrow-right ml-1.5"></i>
      </span>
    </RouterLink>
  </section>
</template>
