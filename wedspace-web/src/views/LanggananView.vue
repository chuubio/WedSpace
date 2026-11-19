<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSubscriptionStore } from '../stores/subscription'
import ConfirmModal from '../components/ConfirmModal.vue'
import VintageOrnament from '../components/VintageOrnament.vue'

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
  <section class="mx-auto max-w-4xl space-y-6">
    <!-- Editorial Header with Ribbon & Sticker -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <span class="ws-badge-sticker bg-violet text-licorice">
          <i class="fa-solid fa-crown text-cherry"></i> WedSpace Club
        </span>
        <h1 class="font-heading mt-2 text-4xl font-bold text-licorice md:text-5xl">Paket Langganan</h1>
        <p class="mt-1.5 text-sm text-muted">
          Paket menentukan batas penggunaan fitur WedSpace. Paket berbeda dari role akun (WO/Admin).
        </p>
      </div>
      <VintageOrnament variant="oval-sticker" label="vip planner club!" warna="peach" class="-rotate-3" />
    </div>

    <p v-if="pesan" class="rounded-xl border-2 border-licorice bg-apple/45 px-4 py-3 text-sm font-semibold text-licorice">
      <i class="fa-solid fa-check mr-1.5"></i>{{ pesan }}
    </p>
    <p v-if="galat" class="rounded-xl border-2 border-licorice bg-strawberry/75 px-4 py-3 text-sm font-semibold text-cherry">
      <i class="fa-solid fa-circle-exclamation mr-1.5"></i>{{ galat }}
    </p>

    <p v-if="sub.sibuk && !sub.ringkasan" class="ws-paper-card p-8 text-center text-muted">
      Memuat paket langganan…
    </p>

    <template v-else-if="sub.ringkasan">
      <!-- Kartu paket aktif: Nectar Club Scalloped / Ticket Showcase -->
      <div class="ws-paper-card overflow-hidden bg-marshmallow">
        <div
          :class="[
            'flex flex-wrap items-center justify-between gap-2 border-b-2 border-licorice px-6 py-3',
            sub.adalahPremium ? 'bg-violet' : 'bg-stripes-pink',
          ]"
        >
          <span class="ws-eyebrow">TIKET KEANGGOTAAN AKTIF</span>
          <VintageOrnament variant="ticket-stamp" :label="`Plan: ${sub.namaPaket}`" />
        </div>

        <div class="flex flex-wrap items-start justify-between gap-6 p-6 md:p-8">
          <div>
            <p class="ws-eyebrow text-muted">Paket kamu saat ini</p>
            <div class="mt-2 flex flex-wrap items-center gap-3">
              <span class="font-heading text-5xl font-bold text-licorice">{{ sub.namaPaket }}</span>
              <span
                v-if="sub.adalahPremium"
                class="ws-badge-sticker bg-strawberry text-licorice"
              >
                <i class="fa-solid fa-star text-cherry"></i> Aktif
              </span>
              <span
                v-else-if="sub.adalahAdmin"
                class="ws-badge-sticker bg-peach text-licorice"
              >
                Tanpa batasan
              </span>
            </div>
            <p class="mt-2.5 max-w-md text-sm leading-relaxed text-muted">
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

          <div class="flex flex-col items-stretch gap-2.5">
            <button
              v-if="!sub.adalahPremium && !sub.adalahAdmin"
              class="ws-btn-cherry px-6 py-3 disabled:opacity-60"
              :disabled="memproses"
              @click="modalUpgrade = true"
            >
              <i class="fa-solid fa-crown mr-2"></i>Upgrade ke Premium
            </button>
            <button
              v-else-if="sub.adalahPremium"
              class="ws-btn-paper px-6 py-3 disabled:opacity-60"
              :disabled="memproses"
              @click="modalBatal = true"
            >
              Kembalikan ke Free
            </button>
            <RouterLink
              v-if="!sub.adalahAdmin"
              to="/proyek"
              class="ws-btn-violet px-6 py-2.5 text-center"
            >
              Ke Proyek Saya
            </RouterLink>
          </div>
        </div>

        <dl class="divide-y divide-dashed divide-licorice/30 border-t-2 border-licorice bg-paper">
          <div v-for="baris in ringkasanPaket" :key="baris.label" class="flex items-center justify-between gap-3 px-6 py-3.5">
            <dt class="text-sm font-medium text-muted">{{ baris.label }}</dt>
            <dd class="text-right text-sm font-bold text-licorice">{{ baris.nilai }}</dd>
          </div>
          <div v-if="sub.adalahPremium" class="flex items-center justify-between gap-3 bg-strawberry/35 px-6 py-3.5">
            <dt class="text-sm font-medium text-muted">Berlaku sampai</dt>
            <dd class="text-right text-sm font-bold text-cherry">{{ berlakuSampai }}</dd>
          </div>
        </dl>
      </div>

      <!-- Pemakaian (Ticket Cards) -->
      <div class="grid gap-5 sm:grid-cols-2">
        <div class="ws-ticket bg-paper p-5">
          <div class="flex items-center justify-between border-b border-dashed border-licorice/35 pb-3">
            <p class="ws-eyebrow text-muted">Proyek aktif</p>
            <span class="flex h-10 w-10 items-center justify-center rounded-full border-2 border-licorice bg-strawberry text-cherry shadow-[2px_2px_0px_#7F1125]">
              <i class="fa-solid fa-folder-open"></i>
            </span>
          </div>
          <p class="font-heading mt-3 text-4xl font-bold text-licorice">
            {{ proyekAktif }}
            <span class="font-sans text-sm font-semibold text-muted">/ {{ labelMaksProyek }}</span>
          </p>
          <div class="mt-3 h-3 overflow-hidden rounded-full border border-licorice bg-marshmallow">
            <div
              :class="['h-full rounded-full', sub.proyekPenuh ? 'bg-cherry' : 'bg-violet']"
              :style="{ width: `${persenProyek}%` }"
            ></div>
          </div>
          <p v-if="sub.proyekPenuh" class="mt-2 text-xs font-bold text-cherry">
            Batas proyek paket Free sudah tercapai.
          </p>
          <p v-else-if="maksProyek !== null" class="mt-2 text-xs text-muted">
            Sisa {{ sub.proyekTersisa }} proyek pada paket ini.
          </p>
        </div>

        <div class="ws-ticket bg-paper p-5">
          <div class="flex items-center justify-between border-b border-dashed border-licorice/35 pb-3">
            <p class="ws-eyebrow text-muted">AI rekomendasi ({{ jendelaKuota }} hari terakhir)</p>
            <span class="flex h-10 w-10 items-center justify-center rounded-full border-2 border-licorice bg-violet text-licorice shadow-[2px_2px_0px_#7F1125]">
              <i class="fa-solid fa-wand-magic-sparkles text-cherry"></i>
            </span>
          </div>
          <p class="font-heading mt-3 text-4xl font-bold text-licorice">
            {{ sub.ringkasan.pemakaian?.rekomendasi_minggu_ini ?? 0 }}
            <span class="font-sans text-sm font-semibold text-muted">pemakaian</span>
          </p>
          <p class="mt-3 text-xs text-muted">
            Kuota: {{ labelKuotaAi }} untuk setiap proyek.
          </p>
        </div>
      </div>

      <!-- Perbandingan paket (Editorial Table) -->
      <div class="ws-paper-card overflow-hidden bg-paper">
        <div class="border-b-2 border-licorice bg-strawberry px-6 py-4">
          <h2 class="font-heading text-2xl font-bold text-licorice">Perbandingan paket</h2>
          <p class="text-xs font-medium text-licorice/80">Fitur dasar tetap tersedia di kedua paket.</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b-2 border-licorice bg-licorice text-left text-xs uppercase tracking-wider text-marshmallow">
                <th class="px-6 py-3.5 font-bold">Fitur</th>
                <th class="px-4 py-3.5 font-bold">Free</th>
                <th class="bg-cherry px-4 py-3.5 font-bold text-marshmallow">
                  <i class="fa-solid fa-crown mr-1"></i>Premium
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-licorice/20">
              <tr v-for="baris in perbandingan" :key="baris.fitur" class="hover:bg-strawberry/20">
                <td class="px-6 py-3.5 font-semibold text-licorice">{{ baris.fitur }}</td>
                <td class="px-4 py-3.5 text-muted">{{ baris.free }}</td>
                <td class="bg-violet/25 px-4 py-3.5 font-bold text-licorice">{{ baris.premium }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Panel simulasi -->
      <div class="rounded-2xl border-2 border-dashed border-licorice bg-strawberry/35 p-5">
        <p class="text-sm font-bold text-licorice">
          <i class="fa-solid fa-flask mr-1.5 text-cherry"></i>Mode simulasi (tanpa pembayaran)
        </p>
        <p class="mt-1 text-sm leading-relaxed text-muted">
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
