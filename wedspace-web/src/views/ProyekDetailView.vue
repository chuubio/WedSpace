<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useSubscriptionStore } from '../stores/subscription'
import ConfirmModal from '../components/ConfirmModal.vue'
import RecommendationPanel from '../components/RecommendationPanel.vue'
import VintageOrnament from '../components/VintageOrnament.vue'

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
  <section class="space-y-6">
    <button
      class="ws-btn-paper px-4 py-2 text-xs uppercase tracking-wider"
      @click="router.push('/proyek')"
    >
      <i class="fa-solid fa-arrow-left mr-2"></i>Kembali ke Proyek Saya
    </button>

    <p v-if="error" class="rounded-xl border-2 border-licorice bg-strawberry/75 px-4 py-3 text-sm font-semibold text-cherry">
      <i class="fa-solid fa-circle-exclamation mr-1.5"></i>{{ error }}
    </p>
    <p v-else-if="sibuk && !proyek" class="ws-paper-card p-8 text-center text-muted">Memuat proyek…</p>

    <template v-else-if="proyek">
      <!-- Project Brief Dossier Card -->
      <div class="ws-paper-card bg-grid-paper overflow-hidden">
        <div class="bg-stripes-pink flex flex-wrap items-center justify-between gap-2 border-b-2 border-licorice px-6 py-2.5">
          <span class="ws-eyebrow">DOSSIER PROYEK PERNIKAHAN</span>
          <VintageOrnament variant="ticket-stamp" label="Venue Brief" />
        </div>

        <div class="flex flex-wrap items-start justify-between gap-4 p-6 md:p-8">
          <div>
            <h1 class="font-heading text-4xl font-bold text-licorice md:text-5xl">{{ proyek.nama_proyek }}</h1>
            <p class="mt-1.5 text-sm font-semibold text-muted">
              <i class="fa-solid fa-location-dot mr-1.5 text-cherry"></i>{{ proyek.nama_venue }}
              • {{ proyek.panjang_venue }} × {{ proyek.lebar_venue }} m
            </p>
            <div class="mt-4 flex flex-wrap gap-2 text-xs">
              <span
                v-if="proyek.tema"
                class="ws-badge-sticker bg-strawberry text-licorice"
              >
                <i class="fa-solid fa-palette text-cherry"></i>{{ proyek.tema }}
              </span>
              <span
                v-if="proyek.jumlah_tamu"
                class="ws-badge-sticker bg-violet text-licorice"
              >
                <i class="fa-solid fa-users"></i>{{ proyek.jumlah_tamu }} tamu
              </span>
              <span
                v-if="proyek.anggaran"
                class="ws-price-pill"
              >
                Anggaran {{ rupiah(proyek.anggaran) }}
              </span>
            </div>
          </div>

          <div class="flex gap-2.5">
            <RouterLink
              :to="`/proyek/${proyek.id}/edit`"
              class="ws-btn-paper px-4 py-2.5"
            >
              <i class="fa-solid fa-pen mr-1.5"></i>Ubah
            </RouterLink>
            <button
              class="ws-btn-paper !border-cherry !text-cherry hover:!bg-strawberry px-4 py-2.5"
              @click="targetHapus = true"
            >
              <i class="fa-solid fa-trash mr-1.5"></i>Hapus
            </button>
          </div>
        </div>
      </div>

      <!-- Rancangan Section -->
      <div>
        <div class="flex items-center justify-between">
          <h2 class="font-heading text-3xl font-bold text-licorice">
            Rancangan ({{ proyek.rancangan?.length || 0 }})
          </h2>
          <span class="ws-eyebrow text-muted">Pilih skenario layout</span>
        </div>

        <div v-if="proyek.rancangan?.length" class="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="r in proyek.rancangan"
            :key="r.id"
            class="ws-paper-card ws-paper-card-hover flex flex-col justify-between overflow-hidden bg-paper"
          >
            <div class="border-b-2 border-licorice bg-strawberry/55 px-5 py-3">
              <div class="flex items-start justify-between gap-2">
                <h3 class="font-heading text-2xl font-bold text-licorice">{{ r.nama_rancangan }}</h3>
                <button
                  v-if="sub.bisaEksporPdf"
                  class="ws-btn-paper h-8 w-8 disabled:opacity-50"
                  :disabled="mengekspor === r.id"
                  title="Ekspor rancangan ke PDF (Premium)"
                  aria-label="Ekspor rancangan ke PDF"
                  @click="eksporPdf(r)"
                >
                  <i :class="['fa-solid text-cherry', mengekspor === r.id ? 'fa-spinner fa-spin' : 'fa-file-pdf']"></i>
                </button>
                <button
                  v-else
                  class="flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-lg border border-licorice/25 bg-marshmallow text-muted/45"
                  disabled
                  title="Ekspor rancangan ke PDF hanya tersedia pada paket Premium."
                  aria-label="Ekspor rancangan ke PDF (Paket Free)"
                >
                  <i class="fa-solid fa-file-pdf"></i>
                </button>
              </div>
              <p class="mt-0.5 text-xs font-medium text-muted">
                {{ r.jumlah_item }} item • diubah {{ tanggal(r.updatedAt) }}
              </p>
            </div>

            <div class="p-5">
              <div class="grid grid-cols-3 gap-2">
                <RouterLink
                  :to="`/rancangan/${r.id}/editor`"
                  class="ws-btn-cherry py-2 text-center"
                >
                  Buka
                </RouterLink>
                <RouterLink
                  :to="`/rancangan/${r.id}/estimasi`"
                  class="ws-btn-paper py-2 text-center"
                >
                  Estimasi
                </RouterLink>
                <RouterLink
                  :to="`/rancangan/${r.id}/3d`"
                  class="ws-btn-violet py-2 text-center"
                >
                  3D
                </RouterLink>
              </div>
              <p v-if="!sub.bisaEksporPdf" class="mt-3 border-t border-dashed border-licorice/30 pt-2.5 text-xs text-muted">
                Ekspor PDF hanya tersedia pada paket Premium.
                <RouterLink to="/langganan" class="font-bold text-cherry underline">Upgrade ke Premium</RouterLink>
              </p>
            </div>
          </article>
        </div>
        <p v-else class="mt-3 text-sm text-muted">Belum ada rancangan.</p>

        <!-- Form Tambah Rancangan -->
        <form
          class="mt-5 flex flex-col gap-3 rounded-2xl border-2 border-dashed border-licorice bg-paper p-4 shadow-[3px_3px_0px_rgba(127,17,37,0.15)] sm:flex-row"
          @submit.prevent="tambahRancangan"
        >
          <input
            v-model="namaBaru"
            placeholder="Nama rancangan baru (opsional — otomatis bernomor)"
            class="ws-input flex-1"
          />
          <button
            type="submit"
            :disabled="menambah"
            class="ws-btn-cherry px-6 py-2.5 disabled:opacity-60"
          >
            <i class="fa-solid fa-plus mr-2"></i>{{ menambah ? 'Menambah…' : 'Rancangan Baru' }}
          </button>
        </form>
      </div>

      <RecommendationPanel v-if="proyek" :project-id="proyek.id" />
    </template>

    <p
      v-if="pesanEkspor"
      class="flex flex-wrap items-center gap-2 rounded-xl border-2 border-licorice bg-peach/55 px-4 py-3 text-sm font-semibold text-licorice"
    >
      {{ pesanEkspor }}
      <RouterLink to="/langganan" class="font-bold text-cherry underline">Lihat paket</RouterLink>
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
