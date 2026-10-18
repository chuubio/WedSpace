<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import DecorationCard from '../components/DecorationCard.vue'
import DecorationDetailModal from '../components/DecorationDetailModal.vue'

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
  <section>
    <h1 class="font-heading text-4xl font-semibold">Katalog Dekorasi</h1>
    <p class="mt-1 text-sm text-muted">Jelajahi dekorasi yang tersedia beserta harga dan ukurannya.</p>

    <p v-if="error" class="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">{{ error }}</p>

    <div class="mt-4 flex flex-col gap-2 sm:flex-row">
      <input
        v-model="cari" type="search" placeholder="Cari dekorasi…"
        class="flex-1 rounded-xl border border-line bg-white px-4 py-2.5 outline-none focus:border-primary"
      />
      <select v-model="filterKategori" class="rounded-xl border border-line bg-white px-4 py-2.5 outline-none focus:border-primary">
        <option value="">Semua kategori</option>
        <option v-for="k in kategoriList" :key="k" :value="k">{{ k }}</option>
      </select>
    </div>

    <p v-if="sibuk && !daftar.length" class="mt-8 text-center text-muted">Memuat katalog…</p>

    <div v-else-if="tampil.length" class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <DecorationCard v-for="d in tampil" :key="d.id" :dekorasi="d" @detail="terpilih = $event" />
    </div>

    <p v-else class="mt-8 text-center text-muted">Tidak ada dekorasi yang cocok.</p>

    <DecorationDetailModal :tampil="!!terpilih" :dekorasi="terpilih" @tutup="terpilih = null" />
  </section>
</template>
