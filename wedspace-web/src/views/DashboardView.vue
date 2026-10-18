<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import StatCard from '../components/StatCard.vue'

const auth = useAuthStore()
const API = 'http://localhost:3000/api'

const ringkasan = ref({ total_proyek: 0, rancangan_tersimpan: 0, dekorasi_tersedia: 0 })
const sibuk = ref(false)
const error = ref('')

async function muat() {
  sibuk.value = true
  error.value = ''
  try {
    const res = await fetch(`${API}/dashboard`, { headers: auth.authHeader() })
    const data = await res.json()
    if (!res.ok) throw new Error(data.pesan || 'Gagal memuat dashboard.')
    ringkasan.value = data.data
  } catch (err) {
    error.value = err.message
  } finally {
    sibuk.value = false
  }
}

onMounted(muat)
</script>

<template>
  <section>
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
  </section>
</template>
