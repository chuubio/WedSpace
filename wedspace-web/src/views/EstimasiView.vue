<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import VintageOrnament from '../components/VintageOrnament.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const API = 'http://localhost:3000/api'

const memuat = ref(true)
const error = ref('')
const errorStatus = ref(null)
const dataEstimasi = ref(null)

async function muatEstimasi() {
  memuat.value = true
  error.value = ''
  errorStatus.value = null
  try {
    const res = await fetch(`${API}/rancangan/${route.params.id}/estimasi`, {
      headers: auth.authHeader(),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      errorStatus.value = res.status
      if (res.status === 404) {
        throw new Error(data.pesan || 'Rancangan tidak ditemukan.')
      } else if (res.status === 403) {
        throw new Error(data.pesan || 'Kamu tidak memiliki akses ke rancangan ini.')
      } else if (res.status === 401) {
        throw new Error('Sesi berakhir, silakan login kembali.')
      } else {
        throw new Error(data.pesan || 'Gagal memuat estimasi biaya.')
      }
    }
    dataEstimasi.value = data.data
  } catch (err) {
    if (errorStatus.value === null && err instanceof TypeError) {
      error.value = 'Tidak dapat terhubung ke server. Periksa koneksi atau pastikan backend berjalan.'
    } else {
      error.value = err.message || 'Terjadi kesalahan saat memuat estimasi biaya.'
    }
  } finally {
    memuat.value = false
  }
}

const rancangan = computed(() => dataEstimasi.value?.rancangan || {})
const proyek = computed(() => dataEstimasi.value?.proyek || {})
const detailBiaya = computed(() => dataEstimasi.value?.detail_biaya || [])
const ringkasan = computed(() => dataEstimasi.value?.ringkasan || {})
const jumlahJenisDekorasi = computed(() => Number(ringkasan.value.jumlah_jenis_dekorasi ?? detailBiaya.value.length))
const totalUnitDekorasi = computed(() => Number(ringkasan.value.total_unit_dekorasi ?? 0))
const totalEstimasi = computed(() => Number(ringkasan.value.total_estimasi ?? dataEstimasi.value?.total_estimasi ?? 0))
const anggaran = computed(() => {
  const val = ringkasan.value.anggaran !== undefined ? ringkasan.value.anggaran : dataEstimasi.value?.anggaran
  return val !== null && val !== undefined ? Number(val) : null
})
const sisaAnggaran = computed(() => {
  const val = ringkasan.value.sisa_anggaran !== undefined ? ringkasan.value.sisa_anggaran : dataEstimasi.value?.sisa_anggaran
  return val !== null && val !== undefined ? Number(val) : null
})
const statusAnggaran = computed(() => {
  const s = ringkasan.value.status_anggaran || dataEstimasi.value?.status_anggaran || 'belum_ditentukan'
  if (s === 'sesuai_anggaran') return 'anggaran_tepat'
  if (s === 'belum_ditetapkan') return 'belum_ditentukan'
  return s
})

const persentasePenggunaan = computed(() => {
  if (!anggaran.value || anggaran.value <= 0) return 0
  return Math.min(100, Math.round((totalEstimasi.value / anggaran.value) * 100))
})

const formatIDR = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

function rupiah(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '-'
  return formatIDR.format(Number(n))
}

function urlGambar(item) {
  const gambar = typeof item === 'string' ? item : item?.gambar
  if (!gambar) return ''
  let url = gambar.startsWith('http') ? gambar : `http://localhost:3000${gambar}`
  const isPrivate = typeof item === 'object' && item?.visibility === 'private'
  if ((isPrivate || typeof item === 'string') && auth?.token) {
    url += `${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(auth.token)}`
  }
  return url
}

function inisial(nama) {
  return (nama || '?').trim().charAt(0).toUpperCase()
}

onMounted(muatEstimasi)
</script>

<template>
  <section class="mx-auto max-w-5xl space-y-6 pb-12">
    <!-- Top Action Bar -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <RouterLink
          v-if="route.params.id"
          :to="`/rancangan/${route.params.id}/editor`"
          class="ws-btn-paper px-4 py-2 text-xs uppercase tracking-wider font-bold"
          title="Kembali ke Workspace Layout 2D"
        >
          <i class="fa-solid fa-arrow-left mr-2"></i>Kembali ke Workspace 2D
        </RouterLink>
        <RouterLink
          v-if="proyek.id"
          :to="`/proyek/${proyek.id}`"
          class="ws-btn-paper px-3.5 py-2 text-xs font-semibold"
          title="Lihat Detail Proyek"
        >
          <i class="fa-solid fa-folder-open mr-1.5 text-cherry"></i>Detail Proyek
        </RouterLink>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <RouterLink
          v-if="route.params.id"
          :to="`/rancangan/${route.params.id}/3d`"
          class="ws-btn-violet px-3.5 py-2 text-xs font-semibold"
          title="Buka Visualisasi 3D"
        >
          <i class="fa-solid fa-cube mr-1.5"></i>Visualisasi 3D
        </RouterLink>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="memuat" class="ws-paper-card p-12 text-center bg-paper">
      <i class="fa-solid fa-circle-notch fa-spin text-4xl text-cherry"></i>
      <h2 class="font-heading mt-4 text-2xl font-bold text-licorice">Memuat Estimasi Biaya…</h2>
      <p class="mt-1 text-xs text-muted">Menghitung rincian harga dekorasi dan membandingkan dengan anggaran venue.</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="ws-paper-card p-8 text-center bg-paper shadow-md">
      <i
        v-if="errorStatus === 404"
        class="fa-solid fa-compass-drafting text-4xl text-cherry"
      ></i>
      <i
        v-else-if="errorStatus === 403"
        class="fa-solid fa-shield-halved text-4xl text-cherry"
      ></i>
      <i
        v-else-if="errorStatus === 401"
        class="fa-solid fa-right-to-bracket text-4xl text-cherry"
      ></i>
      <i
        v-else
        class="fa-solid fa-circle-exclamation text-4xl text-cherry"
      ></i>

      <h2 class="font-heading mt-4 text-2xl font-bold text-licorice">
        {{
          errorStatus === 404
            ? 'Rancangan Tidak Ditemukan'
            : errorStatus === 403
            ? 'Kamu Tidak Memiliki Akses ke Rancangan Ini'
            : errorStatus === 401
            ? 'Sesi Berakhir'
            : 'Gagal Memuat Estimasi'
        }}
      </h2>
      <p class="mt-2 text-xs text-muted max-w-md mx-auto leading-relaxed">{{ error }}</p>

      <div class="mt-6 flex flex-wrap items-center justify-center gap-2">
        <RouterLink
          v-if="errorStatus === 404"
          to="/proyek"
          class="ws-btn-cherry px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
        >
          <i class="fa-solid fa-folder-open mr-1.5"></i>Daftar Proyek
        </RouterLink>
        <RouterLink
          v-else-if="errorStatus === 403"
          to="/dashboard"
          class="ws-btn-cherry px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
        >
          <i class="fa-solid fa-house mr-1.5"></i>Dashboard
        </RouterLink>
        <RouterLink
          v-else-if="errorStatus === 401"
          :to="{ path: '/login', query: { dari: route.fullPath } }"
          class="ws-btn-cherry px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
        >
          <i class="fa-solid fa-right-to-bracket mr-1.5"></i>Login Kembali
        </RouterLink>
        <template v-else>
          <button
            type="button"
            class="ws-btn-cherry px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
            @click="muatEstimasi"
          >
            <i class="fa-solid fa-rotate-right mr-1.5"></i>Coba Lagi
          </button>
          <RouterLink
            to="/proyek"
            class="ws-btn-paper px-4 py-2.5 text-xs font-bold"
          >
            Daftar Proyek
          </RouterLink>
        </template>
      </div>
    </div>

    <!-- Main Content Container: Invoice Scrapbook -->
    <div v-else class="ws-paper-card overflow-hidden bg-marshmallow shadow-md">
      <!-- Notebook Accent Bar -->
      <div class="notebook-punch-cherry bg-cherry"></div>

      <!-- Header Ribbon -->
      <div class="bg-stripes-pink flex flex-wrap items-center justify-between gap-4 border-y-2 border-licorice px-6 py-4">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="ws-badge-sticker bg-peach text-licorice">Perkiraan Anggaran</span>
            <span v-if="proyek.nama_venue" class="text-xs font-bold text-muted">
              • {{ proyek.nama_venue }}
              <template v-if="proyek.panjang_venue && proyek.lebar_venue">
                ({{ proyek.panjang_venue }}m × {{ proyek.lebar_venue }}m)
              </template>
            </span>
          </div>

          <h1 class="font-heading mt-2 text-3xl sm:text-4xl font-bold text-licorice">
            {{ rancangan.nama_rancangan || 'Estimasi Biaya Rancangan' }}
          </h1>

          <p class="mt-0.5 text-xs font-medium text-muted">
            Proyek: <strong class="text-licorice">{{ proyek.nama_proyek || '-' }}</strong> • Dihitung otomatis berdasarkan snapshot harga dekorasi tersimpan.
          </p>
        </div>

        <VintageOrnament variant="oval-sticker" label="Price Ticket" warna="cherry" class="-rotate-3 hidden sm:block" />
      </div>

      <div class="p-4 sm:p-6 md:p-8 space-y-6">
        <!-- 1. Ringkasan Anggaran (Summary 3-Card Grid) -->
        <div class="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          <!-- Card 1: Total Estimasi -->
          <div class="ws-paper-card bg-paper p-4 border-2 border-licorice shadow-[2px_2px_0px_#7F1125] flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between text-muted text-xs font-bold uppercase tracking-wider">
                <span>Total Estimasi Dekorasi</span>
                <i class="fa-solid fa-receipt text-cherry text-sm"></i>
              </div>
              <p class="font-heading mt-2 text-2xl sm:text-3xl font-extrabold text-cherry">
                {{ rupiah(totalEstimasi) }}
              </p>
            </div>
            <p class="mt-2 text-xs text-muted border-t border-dashed border-licorice/30 pt-2">
              <strong class="text-licorice">{{ jumlahJenisDekorasi }}</strong> jenis dekorasi • <strong class="text-licorice">{{ totalUnitDekorasi }}</strong> total unit dalam layout.
            </p>
          </div>

          <!-- Card 2: Anggaran Proyek -->
          <div class="ws-paper-card bg-paper p-4 border-2 border-licorice shadow-[2px_2px_0px_#7F1125] flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between text-muted text-xs font-bold uppercase tracking-wider">
                <span>Anggaran Proyek</span>
                <i class="fa-solid fa-wallet text-licorice text-sm"></i>
              </div>
              <p
                class="font-heading mt-2 text-2xl sm:text-3xl font-extrabold"
                :class="anggaran ? 'text-licorice' : 'text-muted text-xl'"
              >
                {{ anggaran ? rupiah(anggaran) : 'Belum Ditentukan' }}
              </p>
            </div>
            <div class="mt-2 text-xs text-muted border-t border-dashed border-licorice/30 pt-2 flex items-center justify-between">
              <span>Batas pagu proyek</span>
              <RouterLink
                v-if="proyek.id"
                :to="`/proyek/${proyek.id}/edit`"
                class="font-bold text-cherry hover:underline"
              >
                Ubah
              </RouterLink>
            </div>
          </div>

          <!-- Card 3: Sisa Anggaran / Status Anggaran -->
          <div
            class="ws-paper-card p-4 border-2 border-licorice shadow-[2px_2px_0px_#7F1125] sm:col-span-2 lg:col-span-1 flex flex-col justify-between"
            :class="{
              'bg-apple/30': statusAnggaran === 'dalam_anggaran',
              'bg-peach/30': statusAnggaran === 'anggaran_tepat',
              'bg-strawberry/50': statusAnggaran === 'melebihi_anggaran',
              'bg-marshmallow': statusAnggaran === 'belum_ditentukan',
            }"
          >
            <div>
              <div class="flex items-center justify-between text-muted text-xs font-bold uppercase tracking-wider">
                <span>Status & Selisih</span>
                <!-- Status Badge -->
                <span
                  v-if="statusAnggaran === 'dalam_anggaran'"
                  class="rounded-full border border-licorice bg-apple px-2 py-0.5 text-[0.6875rem] font-bold text-licorice flex items-center gap-1"
                >
                  <i class="fa-solid fa-circle-check"></i>
                  <span>Dalam Anggaran</span>
                </span>
                <span
                  v-else-if="statusAnggaran === 'anggaran_tepat'"
                  class="rounded-full border border-licorice bg-peach px-2 py-0.5 text-[0.6875rem] font-bold text-licorice flex items-center gap-1"
                >
                  <i class="fa-solid fa-check-double"></i>
                  <span>Tepat Anggaran</span>
                </span>
                <span
                  v-else-if="statusAnggaran === 'melebihi_anggaran'"
                  class="rounded-full border border-licorice bg-cherry px-2 py-0.5 text-[0.6875rem] font-bold text-white animate-pulse flex items-center gap-1"
                >
                  <i class="fa-solid fa-triangle-exclamation"></i>
                  <span>Melebihi Anggaran</span>
                </span>
                <span
                  v-else
                  class="rounded-full border border-licorice bg-marshmallow px-2 py-0.5 text-[0.6875rem] font-bold text-muted flex items-center gap-1"
                >
                  <i class="fa-solid fa-circle-info"></i>
                  <span>Belum Diatur</span>
                </span>
              </div>

              <!-- Selisih Nominal -->
              <p
                v-if="anggaran !== null"
                class="font-heading mt-2 text-2xl sm:text-3xl font-extrabold"
                :class="sisaAnggaran >= 0 ? 'text-apple-dark font-extrabold' : 'text-cherry'"
              >
                <template v-if="sisaAnggaran > 0">
                  +{{ rupiah(sisaAnggaran) }}
                </template>
                <template v-else-if="sisaAnggaran === 0">
                  Rp0
                </template>
                <template v-else>
                  -{{ rupiah(Math.abs(sisaAnggaran)) }}
                </template>
              </p>
              <p v-else class="font-heading mt-2 text-sm font-semibold text-muted">
                Anggaran proyek belum diisi.
              </p>
            </div>

            <!-- Note / Progress -->
            <div class="mt-2 border-t border-dashed border-licorice/30 pt-2 text-xs">
              <template v-if="statusAnggaran === 'melebihi_anggaran'">
                <span class="text-cherry font-bold">
                  Estimasi melebihi anggaran sebesar {{ rupiah(Math.abs(sisaAnggaran)) }}.
                </span>
              </template>
              <template v-else-if="statusAnggaran === 'dalam_anggaran'">
                <span class="text-licorice/80">
                  Masih dalam anggaran — sisa {{ rupiah(sisaAnggaran) }} ({{ 100 - persentasePenggunaan }}%).
                </span>
              </template>
              <template v-else-if="statusAnggaran === 'anggaran_tepat'">
                <span class="text-licorice font-semibold">
                  Anggaran tepat terpakai (100% dari anggaran proyek).
                </span>
              </template>
              <template v-else>
                <span class="text-muted">
                  Anggaran proyek belum ditentukan. Isi anggaran pada detail proyek untuk memantau batas biaya.
                </span>
              </template>
            </div>
          </div>
        </div>

        <!-- Budget Usage Progress Bar (if budget exists) -->
        <div v-if="anggaran && anggaran > 0" class="rounded-xl border border-licorice/30 bg-paper p-3 text-xs">
          <div class="flex items-center justify-between text-xs font-bold text-licorice mb-1.5">
            <span>Tingkat Penyerapan Anggaran Dekorasi</span>
            <span :class="totalEstimasi > anggaran ? 'text-cherry font-bold' : 'text-licorice'">
              {{ Math.round((totalEstimasi / anggaran) * 100) }}% Terpakai
            </span>
          </div>
          <div class="h-3 w-full rounded-full border border-licorice/40 bg-marshmallow overflow-hidden p-0.5">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="totalEstimasi > anggaran ? 'bg-cherry' : 'bg-apple'"
              :style="{ width: `${persentasePenggunaan}%` }"
            ></div>
          </div>
        </div>

        <!-- Striped Divider -->
        <div class="bg-stripes-pink h-2 rounded-full border border-licorice/40"></div>

        <!-- 2. Rincian Item Dekorasi -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-heading text-xl font-bold text-licorice flex items-center gap-2">
              <i class="fa-solid fa-list-check text-cherry text-sm"></i>
              <span>Rincian Item Dekorasi</span>
            </h3>
            <span class="text-xs text-muted font-bold">
              Total: {{ detailBiaya.length }} item
            </span>
          </div>

          <!-- Empty State: Belum Ada Dekorasi -->
          <div
            v-if="detailBiaya.length === 0"
            class="ws-paper-card p-10 text-center bg-paper border-2 border-dashed border-licorice/40"
          >
            <div class="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl border-2 border-dashed border-licorice/40 bg-marshmallow">
              <i class="fa-solid fa-box-open text-2xl text-cherry/60"></i>
            </div>
            <h4 class="font-heading mt-4 text-xl font-bold text-licorice">Belum Ada Dekorasi</h4>
            <p class="mt-1 text-xs text-muted max-w-sm mx-auto">
              Rancangan ini belum memiliki item dekorasi di dalam layout. Masukkan dekorasi pada Workspace 2D untuk mengkalkulasi estimasi biaya.
            </p>
            <RouterLink
              :to="`/rancangan/${route.params.id}/editor`"
              class="ws-btn-cherry mt-5 inline-block px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
            >
              <i class="fa-solid fa-vector-square mr-1.5"></i>Buka Editor Layout 2D
            </RouterLink>
          </div>

          <!-- List Table / Cards -->
          <div v-else class="space-y-4">
            <!-- Desktop Table View -->
            <div class="hidden md:block overflow-hidden rounded-xl border-2 border-licorice bg-paper shadow-sm">
              <table class="w-full text-left text-xs">
                <thead class="border-b-2 border-licorice bg-strawberry text-xs font-bold text-licorice uppercase tracking-wider">
                  <tr>
                    <th scope="col" class="py-3 px-3 text-center w-12">No.</th>
                    <th scope="col" class="py-3 px-3">Dekorasi</th>
                    <th scope="col" class="py-3 px-3">Kategori</th>
                    <th scope="col" class="py-3 px-3 text-right">Harga Satuan (Snapshot)</th>
                    <th scope="col" class="py-3 px-3 text-center w-20">Jumlah</th>
                    <th scope="col" class="py-3 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody class="divide-y border-licorice/20 font-medium">
                  <tr
                    v-for="(item, idx) in detailBiaya"
                    :key="item.design_item_id || idx"
                    class="hover:bg-marshmallow/60 transition-colors"
                  >
                    <td class="py-3 px-3 text-center text-muted font-bold">{{ idx + 1 }}</td>
                    <td class="py-3 px-3">
                      <div class="flex items-center gap-2.5">
                        <!-- Thumbnail -->
                        <div class="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-licorice/40 bg-marshmallow">
                          <img
                            v-if="urlGambar(item)"
                            :src="urlGambar(item)"
                            :alt="item.nama_dekorasi"
                            class="h-full w-full object-cover"
                          />
                          <div v-else class="flex h-full w-full items-center justify-center font-heading font-bold text-cherry text-sm">
                            {{ inisial(item.nama_dekorasi) }}
                          </div>
                        </div>
                        <div class="min-w-0">
                          <span class="font-heading font-bold text-licorice text-sm block">
                            {{ item.nama_dekorasi }}
                          </span>
                          <span v-if="item.kontributor" class="text-[0.6875rem] text-muted">
                            Kontributor: {{ item.kontributor }}
                            <span v-if="item.is_active === false" class="ml-1 text-cherry font-semibold">(Nonaktif)</span>
                          </span>
                        </div>
                      </div>
                    </td>
                    <td class="py-3 px-3">
                      <span class="rounded bg-peach/70 px-2 py-0.5 text-[0.6875rem] font-bold border border-licorice/30 uppercase text-licorice">
                        {{ item.kategori }}
                      </span>
                    </td>
                    <td class="py-3 px-3 text-right font-semibold text-licorice">
                      {{ rupiah(item.harga_satuan) }}
                    </td>
                    <td class="py-3 px-3 text-center">
                      <span class="rounded-full bg-marshmallow px-2 py-0.5 font-bold border border-licorice/30">
                        {{ item.jumlah }}
                      </span>
                    </td>
                    <td class="py-3 px-3 text-right font-bold text-cherry text-sm">
                      {{ rupiah(item.subtotal) }}
                    </td>
                  </tr>
                </tbody>
                <!-- Table Footer Total -->
                <tfoot class="border-t-2 border-licorice bg-strawberry/30 font-bold">
                  <tr>
                    <td colspan="5" class="py-3 px-4 text-right uppercase text-xs tracking-wider text-licorice">
                      Total Seluruh Biaya Dekorasi:
                    </td>
                    <td class="py-3 px-3 text-right font-heading text-lg font-extrabold text-cherry">
                      {{ rupiah(totalEstimasi) }}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Mobile Card View -->
            <div class="grid gap-3 md:hidden">
              <div
                v-for="(item, idx) in detailBiaya"
                :key="item.design_item_id || idx"
                class="ws-paper-card p-3.5 bg-paper border border-licorice/50 space-y-2.5 shadow-sm"
              >
                <div class="flex items-center gap-3">
                  <div class="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-licorice bg-marshmallow">
                    <img
                      v-if="urlGambar(item)"
                      :src="urlGambar(item)"
                      :alt="item.nama_dekorasi"
                      class="h-full w-full object-cover"
                    />
                    <div v-else class="flex h-full w-full items-center justify-center font-heading font-bold text-cherry text-base">
                      {{ inisial(item.nama_dekorasi) }}
                    </div>
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5">
                      <span class="rounded bg-peach/70 px-1.5 py-0.2 text-[0.625rem] font-bold border border-licorice/30 uppercase text-licorice">
                        {{ item.kategori }}
                      </span>
                      <span v-if="item.kontributor" class="text-[0.625rem] text-muted truncate">
                        • {{ item.kontributor }}
                      </span>
                    </div>
                    <h4 class="font-heading font-bold text-licorice text-sm truncate mt-0.5">
                      {{ item.nama_dekorasi }}
                    </h4>
                  </div>
                </div>

                <div class="grid grid-cols-3 gap-2 border-t border-dashed border-licorice/30 pt-2 text-xs">
                  <div>
                    <span class="text-muted block text-[0.6875rem]">Harga Satuan</span>
                    <span class="font-semibold text-licorice">{{ rupiah(item.harga_satuan) }}</span>
                  </div>
                  <div class="text-center">
                    <span class="text-muted block text-[0.6875rem]">Jumlah</span>
                    <span class="font-bold text-licorice">× {{ item.jumlah }}</span>
                  </div>
                  <div class="text-right">
                    <span class="text-muted block text-[0.6875rem]">Subtotal</span>
                    <span class="font-bold text-cherry">{{ rupiah(item.subtotal) }}</span>
                  </div>
                </div>
              </div>

              <!-- Mobile Total Card -->
              <div class="ws-paper-card p-4 bg-strawberry/40 border-2 border-licorice flex items-center justify-between font-bold">
                <span class="text-xs uppercase tracking-wider text-licorice">Total Estimasi:</span>
                <span class="font-heading text-xl text-cherry font-extrabold">{{ rupiah(totalEstimasi) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Final Summary Box & Disclaimer -->
        <div class="rounded-xl border border-licorice/30 bg-paper p-4 text-xs space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-licorice/20 pb-2">
            <span class="font-bold text-licorice">Catatan Referensi Anggaran</span>
            <span class="text-muted text-xs">ID Rancangan: #{{ rancangan.id }}</span>
          </div>
          <p class="text-muted leading-relaxed text-xs">
            Angka yang tertera adalah estimasi biaya dekorasi berbasis snapshot harga saat item dimasukkan ke dalam rancangan. Harga ini berfungsi sebagai acuan perancangan tata ruang dan bukan merupakan faktur tagihan resmi atau kontrak vendor.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
