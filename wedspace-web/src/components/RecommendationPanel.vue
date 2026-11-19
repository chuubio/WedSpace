<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import VintageOrnament from './VintageOrnament.vue'

const props = defineProps({
  projectId: { type: [Number, String], required: true },
})

const auth = useAuthStore()
const API = 'http://localhost:3000/api'

const rekomendasi = ref([])
const ringkasan = ref('')
const kuota = ref(null)
const error = ref('')
const sedangMembuat = ref(false)
const sedangMemuatKuota = ref(true)

const batasKuota = computed(() => Number(kuota.value?.kuota ?? 3))
const sisaKuota = computed(() => Number(kuota.value?.sisa ?? 0))
const kuotaHabis = computed(() => kuota.value?.boleh === false || sisaKuota.value <= 0)

async function muatKuota() {
  sedangMemuatKuota.value = true
  error.value = ''
  try {
    const res = await fetch(`${API}/rekomendasi/${props.projectId}/kuota`, { headers: auth.authHeader() })
    const data = await res.json()
    if (!res.ok) throw new Error(data.pesan || 'Gagal memuat kuota rekomendasi.')
    kuota.value = data.data
  } catch (err) {
    error.value = err.message
  } finally {
    sedangMemuatKuota.value = false
  }
}

async function dapatkanRekomendasi() {
  sedangMembuat.value = true
  error.value = ''
  try {
    const res = await fetch(`${API}/rekomendasi/${props.projectId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.authHeader() },
      body: JSON.stringify({}),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.pesan || 'Gagal mendapatkan rekomendasi dekorasi.')
    rekomendasi.value = data.data?.rekomendasi || []
    ringkasan.value = data.data?.ringkasan || ''
    kuota.value = data.data?.kuota || null
  } catch (err) {
    error.value = err.message
  } finally {
    sedangMembuat.value = false
  }
}

onMounted(muatKuota)
</script>

<template>
  <section class="ws-paper-card relative mt-10 overflow-hidden bg-marshmallow">
    <!-- Top Striped Scrapbook Header -->
    <div class="bg-stripes-violet flex flex-wrap items-center justify-between gap-3 border-b-2 border-licorice px-6 py-4">
      <div class="flex items-center gap-3">
        <span class="flex h-11 w-11 items-center justify-center rounded-full border-2 border-licorice bg-violet text-licorice shadow-[2px_2px_0px_#7F1125]">
          <i class="fa-solid fa-wand-magic-sparkles text-cherry"></i>
        </span>
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="font-heading text-3xl font-bold text-licorice">Rekomendasi AI</h2>
            <span class="ws-badge-sticker bg-peach text-licorice">AI Curator</span>
          </div>
          <p class="text-xs font-medium text-muted">Rekomendasi dekorasi dari AI berdasarkan informasi proyek.</p>
        </div>
      </div>

      <VintageOrnament variant="oval-sticker" label="smart styling!" warna="strawberry" class="hidden -rotate-3 sm:inline-flex" />
    </div>

    <div class="p-6">
      <div v-if="sedangMemuatKuota" class="text-sm font-medium text-muted">
        <i class="fa-solid fa-spinner fa-spin mr-2 text-cherry"></i>Memuat kuota rekomendasi…
      </div>

      <template v-else>
        <div class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-licorice bg-paper p-4 shadow-[3px_3px_0px_#7F1125]">
          <div class="flex items-center gap-3">
            <span class="rounded-xl border border-licorice bg-strawberry px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-licorice">
              <i class="fa-solid fa-ticket mr-1.5 text-cherry"></i>Kuota Mingguan
            </span>
            <p class="text-sm text-muted">
              Sisa minggu ini:
              <span class="font-heading ml-1 text-2xl font-bold text-licorice">{{ sisaKuota }} / {{ batasKuota }}</span>
            </p>
          </div>

          <button
            class="ws-btn-cherry px-6 py-3 disabled:opacity-60"
            :disabled="sedangMembuat || kuotaHabis"
            @click="dapatkanRekomendasi"
          >
            <i class="fa-solid fa-wand-magic-sparkles mr-2"></i>
            {{ sedangMembuat ? 'Membuat Rekomendasi…' : 'Dapatkan Rekomendasi' }}
          </button>
        </div>

        <p
          v-if="kuotaHabis"
          class="mt-4 rounded-xl border-2 border-licorice bg-peach/45 px-4 py-3 text-sm font-medium text-licorice"
        >
          <i class="fa-solid fa-crown mr-1.5 text-cherry"></i>
          Kuota rekomendasi AI untuk proyek ini sudah habis minggu ini.
          <RouterLink to="/langganan" class="font-bold text-cherry underline">Upgrade ke Premium</RouterLink>
          untuk mendapatkan kuota rekomendasi yang lebih besar.
        </p>

        <p
          v-if="error"
          class="mt-4 rounded-xl border-2 border-licorice bg-strawberry/75 px-4 py-3 text-sm font-semibold text-cherry"
        >
          <i class="fa-solid fa-circle-exclamation mr-1.5"></i>{{ error }}
        </p>

        <div
          v-if="sedangMembuat"
          class="bg-grid-subtle mt-6 rounded-2xl border-2 border-dashed border-licorice/40 p-8 text-center text-sm font-semibold text-licorice"
        >
          <i class="fa-solid fa-spinner fa-spin mr-2 text-cherry"></i>Menggunakan AI untuk membuat rekomendasi…
        </div>

        <ul v-else-if="rekomendasi.length" class="mt-6 grid gap-4 sm:grid-cols-2">
          <li
            v-for="r in rekomendasi"
            :key="r.decoration_id"
            class="ws-paper-card relative flex flex-col justify-between bg-paper p-5"
          >
            <div>
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="ws-badge-sticker bg-strawberry text-licorice">{{ r.kategori }}</span>
                <span class="ws-price-pill">Rp{{ Number(r.harga || 0).toLocaleString('id-ID') }}</span>
              </div>
              <h3 class="font-heading mt-3 text-2xl font-bold text-licorice">{{ r.nama_dekorasi }}</h3>
              <p class="mt-1.5 text-sm leading-relaxed text-muted">{{ r.alasan }}</p>
            </div>

            <div class="mt-4 flex items-center justify-between border-t border-dashed border-licorice/35 pt-3 text-xs font-bold uppercase tracking-wider text-licorice">
              <span>Jumlah disarankan</span>
              <span class="rounded-lg border border-licorice bg-violet px-2.5 py-1 text-licorice">
                {{ r.jumlah_disarankan ?? '-' }} unit
              </span>
            </div>
          </li>
        </ul>

        <div
          v-else
          class="bg-grid-subtle mt-6 rounded-2xl border-2 border-dashed border-licorice/35 p-6 text-center text-sm text-muted"
        >
          Belum ada rekomendasi. Klik tombol untuk mendapatkan rekomendasi dari AI.
        </div>

        <div
          v-if="ringkasan"
          class="mt-5 rounded-2xl border-2 border-licorice bg-strawberry/45 px-5 py-4 text-sm leading-relaxed text-licorice shadow-[3px_3px_0px_#7F1125]"
        >
          <span class="ws-eyebrow mr-2 text-cherry">Ringkasan Kurator AI:</span>
          <span>{{ ringkasan }}</span>
        </div>
      </template>
    </div>
  </section>
</template>
