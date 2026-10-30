<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'

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
  <section class="mt-8 rounded-2xl border border-line bg-white p-5 shadow-[0_4px_18px_rgba(201,120,149,0.1)]">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="font-heading flex items-center gap-2 text-2xl font-semibold">
          <i class="fa-solid fa-wand-magic-sparkles text-primary"></i>Rekomendasi AI
        </h2>
        <p class="mt-1 text-sm text-muted">Rekomendasi dekorasi dari AI berdasarkan informasi proyek.</p>
      </div>
    </div>

    <div v-if="sedangMemuatKuota" class="mt-4 text-sm text-muted">Memuat kuota rekomendasi…</div>

    <template v-else>
      <p class="mt-4 text-sm text-muted">
        Sisa minggu ini:
        <span class="font-semibold text-ink">{{ sisaKuota }} / {{ batasKuota }}</span>
      </p>

      <button
        class="mt-3 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        :disabled="sedangMembuat || kuotaHabis"
        @click="dapatkanRekomendasi"
      >
        <i class="fa-solid fa-wand-magic-sparkles mr-2"></i>{{ sedangMembuat ? 'Membuat Rekomendasi…' : 'Dapatkan Rekomendasi' }}
      </button>

      <p v-if="kuotaHabis" class="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
        Kuota rekomendasi AI untuk proyek ini sudah habis minggu ini.
        <RouterLink to="/langganan" class="font-semibold text-primary">Upgrade ke Premium</RouterLink>
        untuk mendapatkan kuota rekomendasi yang lebih besar.
      </p>

      <p v-if="error" class="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">{{ error }}</p>

      <div v-if="sedangMembuat" class="mt-6 text-center text-sm text-muted">
        <i class="fa-solid fa-spinner fa-spin mr-2"></i>Menggunakan AI untuk membuat rekomendasi…
      </div>

      <ul v-else-if="rekomendasi.length" class="mt-4 grid gap-4 sm:grid-cols-2">
        <li
          v-for="r in rekomendasi" :key="r.decoration_id"
          class="rounded-2xl border border-line bg-canvas p-4"
        >
          <span class="rounded-full bg-blush px-2.5 py-1 text-xs font-medium text-primary">{{ r.kategori }}</span>
          <h3 class="mt-2 font-semibold">{{ r.nama_dekorasi }}</h3>
          <p class="mt-1 font-semibold text-primary">Rp{{ Number(r.harga || 0).toLocaleString('id-ID') }}</p>
          <p class="mt-2 text-sm text-muted">{{ r.alasan }}</p>
          <p class="mt-2 text-sm font-medium">Jumlah disarankan: {{ r.jumlah_disarankan ?? '-' }}</p>
        </li>
      </ul>

      <p v-else class="mt-6 text-sm text-muted">Belum ada rekomendasi. Klik tombol untuk mendapatkan rekomendasi dari AI.</p>

      <p v-if="ringkasan" class="mt-4 rounded-xl bg-canvas px-4 py-3 text-sm text-muted">
        <span class="font-semibold text-ink">Ringkasan:</span> {{ ringkasan }}
      </p>
    </template>
  </section>
</template>
