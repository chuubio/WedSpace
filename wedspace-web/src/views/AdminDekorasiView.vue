<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import VintageOrnament from '../components/VintageOrnament.vue'

const auth = useAuthStore()
const API = 'http://localhost:3000/api'

const daftar = ref([])
const sibuk = ref(false)
const error = ref('')
const cari = ref('')
const filterKategori = ref('')

const kategoriList = computed(() => [...new Set(daftar.value.map((d) => d.kategori))].sort())
const totalAktif = computed(() => daftar.value.filter((d) => d.is_active).length)
const totalNonaktif = computed(() => daftar.value.filter((d) => !d.is_active).length)
const tampil = computed(() => daftar.value.filter((d) => {
  const cocokCari = !cari.value || d.nama_dekorasi.toLowerCase().includes(cari.value.toLowerCase())
  const cocokKategori = !filterKategori.value || d.kategori === filterKategori.value
  return cocokCari && cocokKategori
}))

function rupiah(n) {
  return 'Rp' + Number(n || 0).toLocaleString('id-ID')
}

function inisial(nama) {
  return (nama || '?').trim().charAt(0).toUpperCase()
}

async function muat() {
  sibuk.value = true
  error.value = ''
  try {
    const res = await fetch(`${API}/dekorasi`, { headers: auth.authHeader() })
    const data = await res.json()
    if (!res.ok) throw new Error(data.pesan || 'Gagal memuat data.')
    daftar.value = data.data
  } catch (err) {
    error.value = err.message
  } finally {
    sibuk.value = false
  }
}

onMounted(muat)
</script>

<template>
  <section class="space-y-5">
    <!-- Editorial Admin Header -->
    <div class="ws-paper-card bg-grid-paper overflow-hidden">
      <div class="bg-stripes-pink flex items-center justify-between border-b-2 border-licorice px-6 py-2">
        <span class="ws-eyebrow">PENGAWASAN INVENTARIS DEKORASI</span>
        <span class="text-xs font-bold uppercase tracking-wider text-cherry">Mode Pengawas (Hanya Lihat)</span>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h1 class="font-heading text-4xl font-bold text-licorice md:text-5xl">Data Dekorasi</h1>
          <p class="mt-1 text-sm text-muted">Pengawasan katalog publik platform dan kontribusi komunitas WedSpace.</p>
        </div>
        <div class="rounded-xl border border-licorice bg-marshmallow px-4 py-2 text-xs font-semibold text-licorice shadow-[2px_2px_0px_#7F1125]">
          <i class="fa-solid fa-shield-halved mr-1.5 text-cherry"></i>Pengelolaan dekorasi dimiliki oleh Wedding Organizer
        </div>
      </div>
    </div>

    <p v-if="error" class="rounded-xl border-2 border-licorice bg-strawberry/75 px-4 py-3 text-sm font-semibold text-cherry">
      <i class="fa-solid fa-circle-exclamation mr-1.5"></i>{{ error }}
    </p>

    <!-- 3 Ticket Stats -->
    <div class="grid grid-cols-3 gap-3 sm:gap-4">
      <div class="ws-ticket bg-paper p-4 text-center">
        <p class="font-heading text-3xl font-bold text-licorice sm:text-4xl">{{ daftar.length }}</p>
        <p class="ws-eyebrow mt-1 text-muted">Total Publik</p>
      </div>
      <div class="ws-ticket bg-strawberry/45 p-4 text-center">
        <p class="font-heading text-3xl font-bold text-licorice sm:text-4xl">{{ totalAktif }}</p>
        <p class="ws-eyebrow mt-1 text-cherry">Aktif</p>
      </div>
      <div class="ws-ticket bg-violet/35 p-4 text-center">
        <p class="font-heading text-3xl font-bold text-muted sm:text-4xl">{{ totalNonaktif }}</p>
        <p class="ws-eyebrow mt-1 text-muted">Nonaktif</p>
      </div>
    </div>

    <!-- Search & Filter Bar -->
    <div class="ws-paper-card flex flex-col gap-3 bg-paper p-4 sm:flex-row">
      <div class="relative flex-1">
        <i class="fa-solid fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"></i>
        <input
          v-model="cari"
          type="search"
          placeholder="Cari nama dekorasi…"
          class="ws-input pl-11"
        />
      </div>
      <select v-model="filterKategori" class="ws-input sm:w-64">
        <option value="">Semua kategori</option>
        <option v-for="k in kategoriList" :key="k" :value="k">{{ k }}</option>
      </select>
    </div>

    <p v-if="sibuk && !daftar.length" class="ws-paper-card p-8 text-center text-muted">Memuat data…</p>

    <div v-else class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <article
        v-for="d in tampil"
        :key="d.id"
        class="ws-paper-card ws-paper-card-hover flex flex-col justify-between overflow-hidden bg-paper"
        :class="{ 'opacity-65': !d.is_active }"
      >
        <div class="bg-stripes-pink relative flex h-32 items-center justify-center border-b-2 border-licorice">
          <span class="flex h-16 w-16 items-center justify-center rounded-full border-2 border-licorice bg-marshmallow font-heading text-3xl font-bold text-cherry shadow-[2px_2px_0px_#7F1125]">
            {{ inisial(d.nama_dekorasi) }}
          </span>
          <span class="ws-badge-sticker absolute left-3 top-3 bg-strawberry text-licorice">
            {{ d.kategori }}
          </span>
        </div>

        <div class="flex flex-1 flex-col justify-between p-4">
          <div>
            <div class="flex flex-wrap items-center justify-between gap-1.5">
              <span class="text-xs font-semibold text-cherry">
                <i class="fa-solid fa-user-pen mr-1"></i>{{ d.kontributor || 'WedSpace' }}
              </span>
              <span
                v-if="!d.is_active"
                class="rounded-full border border-licorice bg-marshmallow px-2.5 py-0.5 text-[0.6875rem] font-bold uppercase text-muted"
              >
                Nonaktif
              </span>
            </div>
            <h2 class="font-heading mt-2.5 text-xl font-bold leading-snug text-licorice">{{ d.nama_dekorasi }}</h2>
            <p class="mt-0.5 text-xs font-medium text-muted">
              {{ d.panjang }} × {{ d.lebar }} × {{ d.tinggi }} cm
            </p>
            <p v-if="d.deskripsi" class="mt-1 line-clamp-2 text-xs text-licorice/70">
              {{ d.deskripsi }}
            </p>
          </div>

          <div class="mt-3 border-t border-dashed border-licorice/30 pt-3">
            <div class="flex items-center justify-between">
              <span class="text-[0.6875rem] font-bold uppercase tracking-wider text-muted">Harga</span>
              <span class="ws-price-pill">{{ rupiah(d.harga) }}</span>
            </div>
            <div class="mt-2.5 flex items-center justify-between text-xs text-muted">
              <span>Visibilitas: <strong class="uppercase text-licorice">{{ d.visibility }}</strong></span>
              <span class="rounded bg-marshmallow px-2 py-0.5 text-[0.6875rem] font-semibold text-licorice border border-licorice/30">Read-Only</span>
            </div>
          </div>
        </div>
      </article>
    </div>

    <p v-if="!sibuk && !tampil.length" class="ws-paper-card p-8 text-center text-muted">
      Tidak ada dekorasi yang cocok.
    </p>
  </section>
</template>
