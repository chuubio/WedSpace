<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSubscriptionStore } from '../stores/subscription'
import ConfirmModal from '../components/ConfirmModal.vue'

const sub = useSubscriptionStore()

const pesan = ref('')
const galat = ref('')
const modalUpgrade = ref(false)
const modalBatal = ref(false)
const memproses = ref(false)

const maksProyek = computed(() => sub.maksProyek)
const kuotaAi = computed(() => sub.batas.kuota_rekomendasi_per_minggu)
const proyekAktif = computed(() => sub.proyekAktif)

const persenProyek = computed(() => {
  if (maksProyek.value === null) return 100
  if (!maksProyek.value) return 0
  return Math.min(100, Math.round((proyekAktif.value / maksProyek.value) * 100))
})

const labelMaksProyek = computed(() => (maksProyek.value === null ? 'tanpa batas' : `${maksProyek.value} proyek`))
const labelKuotaAi = computed(() => (kuotaAi.value === null ? 'tanpa batas' : `${kuotaAi.value} rekomendasi/minggu/proyek`))
const jendelaKuota = computed(() => sub.batas.jendela_kuota_hari || 7)

// Batas tiap paket dari backend (agar angka Free/Premium tidak di-hard-code di frontend).
const paketFree = computed(() => sub.ringkasan?.paket?.free || {})
const paketPremium = computed(() => sub.ringkasan?.paket?.premium || {})

const ringkasanPaket = computed(() => {
  if (sub.adalahAdmin) {
    return [
      { label: 'Proyek aktif', nilai: 'Tanpa batas' },
      { label: 'AI rekomendasi', nilai: 'Tanpa batas kuota' },
      { label: 'Ekspor rancangan ke PDF', nilai: 'Tersedia' },
    ]
  }
  if (sub.adalahPremium) {
    return [
      { label: 'Proyek aktif', nilai: 'Proyek lebih banyak (tanpa batas 2)' },
      { label: 'AI rekomendasi', nilai: `AI: ${labelKuotaAi.value}` },
      { label: 'Ekspor rancangan ke PDF', nilai: 'Tersedia' },
    ]
  }
  return [
    { label: 'Proyek aktif', nilai: `${maksProyek.value} proyek aktif maksimal` },
    { label: 'AI rekomendasi', nilai: `AI: ${labelKuotaAi.value}` },
    { label: 'Ekspor rancangan ke PDF', nilai: 'Belum tersedia' },
  ]
})

// Perbandingan fitur Free vs Premium (angka diambil dari konfigurasi backend).
const perbandingan = computed(() => [
  { fitur: 'Layout 2D', free: 'Tersedia', premium: 'Tersedia' },
  { fitur: 'Visualisasi 3D', free: 'Tersedia', premium: 'Tersedia' },
  { fitur: 'Estimasi biaya', free: 'Tersedia', premium: 'Tersedia' },
  { fitur: 'Katalog dekorasi', free: 'Tersedia', premium: 'Tersedia' },
  {
    fitur: 'Proyek aktif',
    free: `${paketFree.value.maks_proyek_aktif ?? '-'} proyek`,
    premium: paketPremium.value.maks_proyek_aktif ? `${paketPremium.value.maks_proyek_aktif} proyek` : 'Lebih banyak / tanpa batas',
  },
  {
    fitur: 'AI rekomendasi',
    free: `${paketFree.value.kuota_rekomendasi_per_minggu ?? '-'}/minggu/proyek`,
    premium: `${paketPremium.value.kuota_rekomendasi_per_minggu ?? '-'}/minggu/proyek`,
  },
  {
    fitur: 'Ekspor rancangan ke PDF',
    free: paketFree.value.ekspor_pdf ? 'Tersedia' : 'Belum tersedia',
    premium: paketPremium.value.ekspor_pdf ? 'Tersedia' : 'Belum tersedia',
  },
])

const berlakuSampai = computed(() => {
  if (!sub.ringkasan?.expires_at) return '-'
  return new Date(sub.ringkasan.expires_at).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
})

async function muat() {
  try {
    await sub.muat(true)
  } catch (err) {
    galat.value = err.message
  }
}

async function upgrade() {
  modalUpgrade.value = false
  memproses.value = true
  pesan.value = ''
  galat.value = ''
  try {
    const data = await sub.aktifkanPremium()
    pesan.value = data.pesan || 'Paket Premium berhasil diaktifkan.'
  } catch (err) {
    galat.value = err.message
  } finally {
    memproses.value = false
  }
}

async function kembaliKeFree() {
  modalBatal.value = false
  memproses.value = true
  pesan.value = ''
  galat.value = ''
  try {
    const data = await sub.kembalikanKeFree()
    pesan.value = data.pesan || 'Langganan Premium dibatalkan.'
  } catch (err) {
    galat.value = err.message
  } finally {
    memproses.value = false
  }
}

onMounted(muat)
</script>

<template>
  <section class="mx-auto max-w-4xl">
    <h1 class="font-heading text-4xl font-semibold md:text-5xl">Paket Langganan</h1>
    <p class="mt-1.5 text-sm text-muted">
      Paket menentukan batas penggunaan fitur WedSpace. Paket berbeda dari role akun (WO/Admin).
    </p>

    <p v-if="pesan" class="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{{ pesan }}</p>
    <p v-if="galat" class="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">{{ galat }}</p>

    <p v-if="sub.sibuk && !sub.ringkasan" class="mt-6 text-muted">Memuat paket langganan…</p>

    <template v-else-if="sub.ringkasan">
      <!-- Kartu paket aktif -->
      <div class="mt-6 overflow-hidden rounded-2xl border border-line bg-white shadow-[0_4px_18px_rgba(201,120,149,0.1)]">
        <div class="flex flex-wrap items-start justify-between gap-4 p-6">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-muted">Paket kamu saat ini</p>
            <div class="mt-1.5 flex items-center gap-2">
              <span class="font-heading text-3xl font-bold">{{ sub.namaPaket }}</span>
              <span
                v-if="sub.adalahPremium"
                class="rounded-full bg-blush px-2.5 py-1 text-xs font-semibold text-primary"
              >Aktif</span>
              <span
                v-else-if="sub.adalahAdmin"
                class="rounded-full bg-canvas px-2.5 py-1 text-xs font-medium text-muted"
              >Tanpa batasan</span>
            </div>
            <p class="mt-1.5 max-w-md text-sm text-muted">
              <template v-if="sub.adalahAdmin">
                Admin tidak dibatasi paket Free/Premium.
              </template>
              <template v-else-if="sub.adalahPremium">
                Semua fitur terbuka dengan kuota AI yang lebih besar.
              </template>
              <template v-else>
                Paket dasar: layout 2D, visualisasi 3D, estimasi biaya, dan katalog tetap bisa dipakai.
              </template>
            </p>
          </div>

          <div class="flex flex-col items-stretch gap-2">
            <button
              v-if="!sub.adalahPremium && !sub.adalahAdmin"
              class="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              :disabled="memproses"
              @click="modalUpgrade = true"
            >
              <i class="fa-solid fa-crown mr-2"></i>Upgrade ke Premium
            </button>
            <button
              v-else-if="sub.adalahPremium"
              class="rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-medium hover:bg-canvas disabled:opacity-60"
              :disabled="memproses"
              @click="modalBatal = true"
            >
              Kembalikan ke Free
            </button>
            <RouterLink
              v-if="!sub.adalahAdmin"
              to="/proyek"
              class="rounded-xl border border-line px-5 py-2.5 text-center text-sm font-medium hover:bg-canvas"
            >
              Ke Proyek Saya
            </RouterLink>
          </div>
        </div>

        <dl class="divide-y divide-line border-t border-line">
          <div v-for="baris in ringkasanPaket" :key="baris.label" class="flex items-center justify-between gap-3 px-6 py-3">
            <dt class="text-sm text-muted">{{ baris.label }}</dt>
            <dd class="text-right text-sm font-semibold">{{ baris.nilai }}</dd>
          </div>
          <div v-if="sub.adalahPremium" class="flex items-center justify-between gap-3 px-6 py-3">
            <dt class="text-sm text-muted">Berlaku sampai</dt>
            <dd class="text-right text-sm font-semibold">{{ berlakuSampai }}</dd>
          </div>
        </dl>
      </div>

      <!-- Pemakaian -->
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <div class="rounded-2xl border border-line bg-white p-5">
          <div class="flex items-center justify-between">
            <p class="text-sm text-muted">Proyek aktif</p>
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-blush text-primary">
              <i class="fa-solid fa-folder-open"></i>
            </span>
          </div>
          <p class="font-heading mt-2 text-3xl font-bold">
            {{ proyekAktif }}
            <span class="text-base font-medium text-muted">/ {{ labelMaksProyek }}</span>
          </p>
          <div class="mt-3 h-2 overflow-hidden rounded-full bg-canvas">
            <div
              :class="['h-full rounded-full', sub.proyekPenuh ? 'bg-danger' : 'bg-primary']"
              :style="{ width: `${persenProyek}%` }"
            ></div>
          </div>
          <p v-if="sub.proyekPenuh" class="mt-2 text-xs text-danger">
            Batas proyek paket Free sudah tercapai.
          </p>
          <p v-else-if="maksProyek !== null" class="mt-2 text-xs text-muted">
            Sisa {{ sub.proyekTersisa }} proyek pada paket ini.
          </p>
        </div>

        <div class="rounded-2xl border border-line bg-white p-5">
          <div class="flex items-center justify-between">
            <p class="text-sm text-muted">AI rekomendasi ({{ jendelaKuota }} hari terakhir)</p>
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-blush text-primary">
              <i class="fa-solid fa-wand-magic-sparkles"></i>
            </span>
          </div>
          <p class="font-heading mt-2 text-3xl font-bold">
            {{ sub.ringkasan.pemakaian?.rekomendasi_minggu_ini ?? 0 }}
            <span class="text-base font-medium text-muted">pemakaian</span>
          </p>
          <p class="mt-2 text-xs text-muted">
            Kuota: {{ labelKuotaAi }} untuk setiap proyek.
          </p>
        </div>
      </div>

      <!-- Perbandingan paket -->
      <div class="mt-4 overflow-hidden rounded-2xl border border-line bg-white">
        <div class="border-b border-line px-6 py-4">
          <h2 class="font-heading text-xl font-semibold">Perbandingan paket</h2>
          <p class="text-sm text-muted">Fitur dasar tetap tersedia di kedua paket.</p>
        </div>
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
              <th class="px-6 py-3 font-semibold">Fitur</th>
              <th class="px-4 py-3 font-semibold">Free</th>
              <th class="px-4 py-3 font-semibold">Premium</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            <tr v-for="baris in perbandingan" :key="baris.fitur">
              <td class="px-6 py-3">{{ baris.fitur }}</td>
              <td class="px-4 py-3 text-muted">{{ baris.free }}</td>
              <td class="px-4 py-3 font-medium">{{ baris.premium }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Panel simulasi -->
      <div class="mt-4 rounded-2xl border border-dashed border-line bg-white p-5">
        <p class="text-sm font-semibold">
          <i class="fa-solid fa-flask mr-1.5 text-primary"></i>Mode simulasi (tanpa pembayaran)
        </p>
        <p class="mt-1 text-sm text-muted">
          Payment gateway belum terintegrasi. Tombol di atas hanya mengubah status langganan di database
          untuk pengujian lokal, memakai durasi dari konfigurasi backend.
        </p>
      </div>
    </template>

    <ConfirmModal
      :tampil="modalUpgrade"
      judul="Aktifkan Premium?"
      pesan="Ini simulasi lokal tanpa pembayaran. Paket Premium langsung aktif dan batas proyek Free dilepas."
      label-konfirmasi="Ya, Aktifkan"
      @batal="modalUpgrade = false"
      @konfirmasi="upgrade"
    />
    <ConfirmModal
      :tampil="modalBatal"
      judul="Kembalikan ke Free?"
      pesan="Paket Premium akan dibatalkan dan akun kembali memakai batas paket Free."
      label-konfirmasi="Ya, Batalkan"
      @batal="modalBatal = false"
      @konfirmasi="kembaliKeFree"
    />
  </section>
</template>
