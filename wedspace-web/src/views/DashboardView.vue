<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useSubscriptionStore } from '../stores/subscription'
import StatCard from '../components/StatCard.vue'

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
  <section v-if="adalahAdmin">
    <h1 class="font-heading text-4xl font-semibold md:text-5xl">Dashboard Admin</h1>
    <p class="mt-2 text-base text-muted">Ringkasan data dekorasi WedSpace.</p>

    <p v-if="error" class="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">{{ error }}</p>

    <div v-if="sibuk && !totalDekorasi" class="mt-6 text-muted">Memuat data…</div>

    <div v-else class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard judul="Total Dekorasi" :nilai="totalDekorasi" ikon="fa-box-archive" />
      <StatCard judul="Dekorasi Aktif" :nilai="dekorasiAktif" ikon="fa-circle-check" />
      <StatCard judul="Dekorasi Nonaktif" :nilai="dekorasiNonaktif" ikon="fa-circle-pause" />
    </div>

    <RouterLink
      to="/admin/dekorasi"
      class="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-line bg-white p-5 hover:border-primary"
    >
      <span class="flex items-center gap-4">
        <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-blush text-primary">
          <i class="fa-solid fa-box-archive"></i>
        </span>
        <span>
          <span class="block font-semibold">Kelola Data Dekorasi</span>
          <span class="block text-sm text-muted">
            Tambah, ubah, dan hapus data dekorasi beserta harga dan ukurannya.
            <template v-if="totalKategori"> Terdapat {{ totalKategori }} kategori.</template>
          </span>
        </span>
      </span>
      <i class="fa-solid fa-arrow-right text-muted"></i>
    </RouterLink>
  </section>

  <!-- Dashboard WO: ringkasan proyek & rancangan -->
  <section v-else>
    <h1 class="font-heading text-4xl font-semibold md:text-5xl">Halo, {{ auth.user?.nama || 'perencana' }}</h1>
    <p class="mt-2 text-base text-muted">Berikut ringkasan workspace-mu.</p>

    <p v-if="error" class="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">{{ error }}</p>

    <div v-if="sibuk && !ringkasan.total_proyek" class="mt-6 text-muted">Memuat data…</div>

    <div v-else class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard judul="Total Proyek" :nilai="ringkasan.total_proyek" ikon="fa-folder-open" />
      <StatCard judul="Rancangan Tersimpan" :nilai="ringkasan.rancangan_tersimpan" ikon="fa-pen-ruler" />
      <StatCard judul="Dekorasi Tersedia" :nilai="ringkasan.dekorasi_tersedia" ikon="fa-wand-magic-sparkles" />
    </div>

    <div class="mt-6 grid gap-4 sm:grid-cols-2">
      <RouterLink to="/proyek/baru" class="rounded-2xl border border-line bg-white p-5 hover:border-primary">
        <i class="fa-solid fa-plus text-primary"></i>
        <h2 class="mt-2 font-semibold">Buat Proyek Baru</h2>
        <p class="text-sm text-muted">Mulai rancangan venue pernikahan berikutnya.</p>
      </RouterLink>
      <RouterLink to="/katalog" class="rounded-2xl border border-line bg-white p-5 hover:border-primary">
        <i class="fa-solid fa-images text-primary"></i>
        <h2 class="mt-2 font-semibold">Jelajahi Katalog</h2>
        <p class="text-sm text-muted">Lihat dekorasi yang tersedia beserta harganya.</p>
      </RouterLink>
    </div>

    <!-- Status paket langganan WO -->
    <RouterLink
      to="/langganan"
      v-if="sub.ringkasan"
      class="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-white p-5 hover:border-primary"
    >
      <span class="flex items-center gap-4">
        <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-blush text-primary">
          <i class="fa-solid fa-crown"></i>
        </span>
        <span>
          <span class="block font-semibold">Paket {{ sub.namaPaket }}</span>
          <span class="block text-sm text-muted">{{ infoPaket }}</span>
        </span>
      </span>
      <span class="text-sm font-semibold text-primary">
        {{ sub.adalahPremium ? 'Lihat detail' : 'Upgrade ke Premium' }}
        <i class="fa-solid fa-arrow-right ml-1"></i>
      </span>
    </RouterLink>
  </section>
</template>
