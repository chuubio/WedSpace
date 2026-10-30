<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useSubscriptionStore } from '../stores/subscription'
import ConfirmModal from '../components/ConfirmModal.vue'
import RecommendationPanel from '../components/RecommendationPanel.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const sub = useSubscriptionStore()
const API = 'http://localhost:3000/api'

const proyek = ref(null)
const sibuk = ref(false)
const error = ref('')
const namaBaru = ref('')
const menambah = ref(false)
const targetHapus = ref(false)
const pesanEkspor = ref('')
const mengekspor = ref(null)

function rupiah(n) {
  return 'Rp' + Number(n || 0).toLocaleString('id-ID')
}

function tanggal(t) {
  return new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

async function muat() {
  sibuk.value = true
  error.value = ''
  try {
    const res = await fetch(`${API}/proyek/${route.params.id}`, { headers: auth.authHeader() })
    const data = await res.json()
    if (!res.ok) throw new Error(data.pesan || 'Gagal memuat proyek.')
    proyek.value = data.data
  } catch (err) {
    error.value = err.message
  } finally {
    sibuk.value = false
  }
}

async function tambahRancangan() {
  if (!namaBaru.value.trim() && (proyek.value?.rancangan?.length || 0) > 0) {
    // nama opsional: backend memberi nomor otomatis
  }
  menambah.value = true
  try {
    const res = await fetch(`${API}/proyek/${route.params.id}/rancangan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.authHeader() },
      body: JSON.stringify(namaBaru.value.trim() ? { nama_rancangan: namaBaru.value.trim() } : {}),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.pesan || 'Gagal menambah rancangan.')
    namaBaru.value = ''
    await muat()
  } catch (err) {
    error.value = err.message
  } finally {
    menambah.value = false
  }
}

// Ekspor rancangan ke PDF (fitur Premium). Backend menolak paket Free dengan 403.
async function eksporPdf(rancangan) {
  pesanEkspor.value = ''
  mengekspor.value = rancangan.id
  try {
    const res = await fetch(`${API}/rancangan/${rancangan.id}/ekspor`, { headers: auth.authHeader() })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.pesan || 'Gagal mengekspor PDF.')
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const tautan = document.createElement('a')
    tautan.href = url
    tautan.download = `${String(rancangan.nama_rancangan || 'rancangan').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()}.pdf`
    document.body.appendChild(tautan)
    tautan.click()
    tautan.remove()
    URL.revokeObjectURL(url)
  } catch (err) {
    pesanEkspor.value = err.message
  } finally {
    mengekspor.value = null
  }
}

async function hapusProyek() {
  try {
    const res = await fetch(`${API}/proyek/${route.params.id}`, {
      method: 'DELETE', headers: auth.authHeader(),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.pesan || 'Gagal menghapus proyek.')
    router.push('/proyek')
  } catch (err) {
    error.value = err.message
  } finally {
    targetHapus.value = false
  }
}

onMounted(() => {
  muat()
  // Status paket langganan (free/premium) untuk menentukan fitur yang tersedia.
  sub.muat().catch(() => {})
})
</script>

<template>
  <section>
    <button class="text-sm text-muted hover:text-ink" @click="router.push('/proyek')">
      <i class="fa-solid fa-arrow-left mr-2"></i>Kembali ke Proyek Saya
    </button>

    <p v-if="error" class="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">{{ error }}</p>
    <p v-else-if="sibuk && !proyek" class="mt-8 text-center text-muted">Memuat proyek…</p>

    <template v-else-if="proyek">
      <div class="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="font-heading text-4xl font-semibold">{{ proyek.nama_proyek }}</h1>
          <p class="mt-1 text-sm text-muted">
            <i class="fa-solid fa-location-dot mr-1.5"></i>{{ proyek.nama_venue }}
            • {{ proyek.panjang_venue }} × {{ proyek.lebar_venue }} m
          </p>
          <div class="mt-2 flex flex-wrap gap-1.5 text-xs">
            <span v-if="proyek.tema" class="rounded-full bg-blush px-2.5 py-1 font-medium text-primary">{{ proyek.tema }}</span>
            <span v-if="proyek.jumlah_tamu" class="rounded-full bg-canvas px-2.5 py-1 text-muted">{{ proyek.jumlah_tamu }} tamu</span>
            <span v-if="proyek.anggaran" class="rounded-full bg-canvas px-2.5 py-1 text-muted">Anggaran {{ rupiah(proyek.anggaran) }}</span>
          </div>
        </div>
        <div class="flex gap-2">
          <RouterLink :to="`/proyek/${proyek.id}/edit`" class="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium hover:bg-canvas">
            <i class="fa-solid fa-pen mr-1.5"></i>Ubah
          </RouterLink>
          <button class="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-danger hover:bg-red-50" @click="targetHapus = true">
            <i class="fa-solid fa-trash mr-1.5"></i>Hapus
          </button>
        </div>
      </div>

      <h2 class="font-heading mt-8 text-2xl font-semibold">Rancangan ({{ proyek.rancangan?.length || 0 }})</h2>

      <div v-if="proyek.rancangan?.length" class="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="r in proyek.rancangan" :key="r.id"
          class="rounded-2xl border border-line bg-white p-5 shadow-[0_4px_18px_rgba(201,120,149,0.1)]"
        >
          <div class="flex items-start justify-between gap-2">
            <h3 class="font-semibold">{{ r.nama_rancangan }}</h3>
            <button
              v-if="sub.bisaEksporPdf"
              class="rounded-lg p-1 text-muted hover:bg-canvas hover:text-primary disabled:opacity-50"
              :disabled="mengekspor === r.id"
              title="Ekspor rancangan ke PDF (Premium)"
              aria-label="Ekspor rancangan ke PDF"
              @click="eksporPdf(r)"
            >
              <i :class="['fa-solid', mengekspor === r.id ? 'fa-spinner fa-spin' : 'fa-file-pdf']"></i>
            </button>
            <button
              v-else
              class="cursor-not-allowed rounded-lg p-1 text-muted/40"
              disabled
              title="Ekspor rancangan ke PDF hanya tersedia pada paket Premium."
              aria-label="Ekspor rancangan ke PDF (Paket Free)"
            >
              <i class="fa-solid fa-file-pdf"></i>
            </button>
          </div>
          <p class="mt-0.5 text-xs text-muted">{{ r.jumlah_item }} item • diubah {{ tanggal(r.updatedAt) }}</p>
          <div class="mt-4 grid grid-cols-3 gap-2">
            <RouterLink :to="`/rancangan/${r.id}/editor`" class="rounded-xl bg-primary py-2 text-center text-sm font-semibold text-white hover:opacity-90">
              Buka
            </RouterLink>
            <RouterLink :to="`/rancangan/${r.id}/estimasi`" class="rounded-xl border border-line py-2 text-center text-sm hover:bg-canvas">
              Estimasi
            </RouterLink>
            <RouterLink :to="`/rancangan/${r.id}/3d`" class="rounded-xl border border-line py-2 text-center text-sm hover:bg-canvas">
              3D
            </RouterLink>
          </div>
          <p v-if="!sub.bisaEksporPdf" class="mt-2 text-xs text-muted">
            Ekspor PDF hanya tersedia pada paket Premium.
            <RouterLink to="/langganan" class="font-semibold text-primary">Upgrade ke Premium</RouterLink>
          </p>
        </article>
      </div>
      <p v-else class="mt-3 text-sm text-muted">Belum ada rancangan.</p>

      <form class="mt-4 flex flex-col gap-2 rounded-2xl border border-dashed border-line bg-white p-4 sm:flex-row" @submit.prevent="tambahRancangan">
        <input
          v-model="namaBaru" placeholder="Nama rancangan baru (opsional — otomatis bernomor)"
          class="flex-1 rounded-xl border border-line bg-canvas px-4 py-2.5 outline-none focus:border-primary"
        />
        <button type="submit" :disabled="menambah" class="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
          {{ menambah ? 'Menambah…' : 'Rancangan Baru' }}
        </button>
      </form>

      <RecommendationPanel v-if="proyek" :project-id="proyek.id" />
    </template>

    <p v-if="pesanEkspor" class="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
      {{ pesanEkspor }}
      <RouterLink to="/langganan" class="font-semibold underline">Lihat paket</RouterLink>
    </p>

    <ConfirmModal
      :tampil="targetHapus"
      judul="Hapus proyek?"
      pesan="Proyek beserta seluruh rancangannya akan dihapus permanen."
      label-konfirmasi="Ya, Hapus"
      @batal="targetHapus = false"
      @konfirmasi="hapusProyek"
    />
  </section>
</template>
