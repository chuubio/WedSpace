<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import DecorationCard from '../components/DecorationCard.vue'
import DecorationDetailModal from '../components/DecorationDetailModal.vue'
import VintageOrnament from '../components/VintageOrnament.vue'

const auth = useAuthStore()
const API = 'http://localhost:3000/api'

const daftar = ref([])
const sibuk = ref(false)
const error = ref('')
const cari = ref('')
const filterKategori = ref('')
const terpilih = ref(null)
let pewaktu = null

const kategoriList = computed(() => [...new Set(daftar.value.map((d) => d.kategori))].sort())

const tampil = computed(() => {
  const k = cari.value.toLowerCase()
  return daftar.value.filter((d) => {
    const cocokCari = !k || (d.nama_dekorasi || '').toLowerCase().includes(k)
    const cocokKategori = !filterKategori.value || d.kategori === filterKategori.value
    return cocokCari && cocokKategori
  })
})

async function muat() {
  sibuk.value = true
  error.value = ''
  try {
    const params = new URLSearchParams()
    if (cari.value) params.set('q', cari.value)
    const res = await fetch(`${API}/dekorasi?${params}`, { headers: auth.authHeader() })
    const data = await res.json()
    if (!res.ok) throw new Error(data.pesan || 'Gagal memuat katalog.')
    daftar.value = data.data
  } catch (err) {
    error.value = err.message
  } finally {
    sibuk.value = false
  }
}

watch(cari, () => {
  clearTimeout(pewaktu)
  pewaktu = setTimeout(muat, 350)
})

onMounted(muat)
</script>

<template>
  <section class="space-y-6">
    <!-- Curated Catalog Header Banner -->
    <div class="ws-paper-card bg-grid-paper overflow-hidden">
      <div class="bg-stripes-pink flex flex-wrap items-center justify-between gap-2 border-b-2 border-licorice px-6 py-2.5">
        <span class="ws-eyebrow">KOLEKSI DEKORASI KURASI</span>
        <VintageOrnament variant="ticket-stamp" label="Lookbook 2026" />
      </div>
      <div class="flex flex-wrap items-center justify-between gap-4 p-6 md:p-8">
        <div>
          <h1 class="font-heading text-4xl font-bold text-licorice md:text-5xl">Katalog Dekorasi</h1>
          <p class="mt-1 text-sm text-muted">Jelajahi dekorasi yang tersedia beserta harga dan ukurannya.</p>
        </div>
        <VintageOrnament variant="oval-sticker" label="curated pieces!" warna="strawberry" class="-rotate-3" />
      </div>
    </div>

    <p v-if="error" class="rounded-xl border-2 border-licorice bg-strawberry/75 px-4 py-3 text-sm font-semibold text-cherry">
      <i class="fa-solid fa-circle-exclamation mr-1.5"></i>{{ error }}
    </p>

    <!-- Search & Category Filter Paper Bar -->
    <div class="ws-paper-card flex flex-col gap-3 bg-paper p-4 sm:flex-row">
      <div class="relative flex-1">
        <i class="fa-solid fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"></i>
        <input
          v-model="cari"
          type="search"
          placeholder="Cari dekorasi…"
          class="ws-input pl-11"
        />
      </div>
      <select
        v-model="filterKategori"
        class="ws-input sm:w-64"
      >
        <option value="">Semua kategori</option>
        <option v-for="k in kategoriList" :key="k" :value="k">{{ k }}</option>
      </select>
    </div>

    <p v-if="sibuk && !daftar.length" class="ws-paper-card p-8 text-center text-muted">Memuat katalog…</p>

    <div v-else-if="tampil.length" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <DecorationCard v-for="d in tampil" :key="d.id" :dekorasi="d" @detail="terpilih = $event" />
    </div>

    <div v-else class="ws-paper-card bg-grid-paper p-10 text-center">
      <VintageOrnament variant="flower" warna="cherry" class="mx-auto h-10 w-10" />
      <p class="font-heading mt-2 text-2xl font-bold text-licorice">Tidak ada dekorasi yang cocok.</p>
    </div>

    <DecorationDetailModal :tampil="!!terpilih" :dekorasi="terpilih" @tutup="terpilih = null" />
  </section>
</template>
