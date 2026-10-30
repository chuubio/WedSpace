<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useSubscriptionStore } from '../stores/subscription'
import ProjectForm from '../components/ProjectForm.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const sub = useSubscriptionStore()
const API = 'http://localhost:3000/api'

const modeEdit = computed(() => !!route.params.id)
const awal = ref({})
const sibuk = ref(false)
const error = ref('')

// Paket langganan: bila Free sudah mencapai 2 proyek aktif, pembuatan proyek
// baru harus diblokir (kecuali admin/premium). Penegakan di backend tetap
// dilakukan oleh POST /api/proyek.
const dilarangMembuat = computed(() => !modeEdit.value && sub.proyekPenuh && !sub.adalahAdmin && !sub.adalahPremium)

async function muatLama() {
  if (!modeEdit.value) return
  sibuk.value = true
  try {
    const res = await fetch(`${API}/proyek/${route.params.id}`, { headers: auth.authHeader() })
    const data = await res.json()
    if (!res.ok) throw new Error(data.pesan || 'Gagal memuat proyek.')
    awal.value = data.data
  } catch (err) {
    error.value = err.message
  } finally {
    sibuk.value = false
  }
}

async function simpan(payload) {
  error.value = ''
  sibuk.value = true
  try {
    const url = modeEdit.value ? `${API}/proyek/${route.params.id}` : `${API}/proyek`
    const res = await fetch(url, {
      method: modeEdit.value ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.authHeader() },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.pesan || 'Gagal menyimpan proyek.')
    router.push(`/proyek/${data.data.id}`)
  } catch (err) {
    error.value = err.message
  } finally {
    sibuk.value = false
  }
}

onMounted(() => {
  muatLama()
  sub.muat().catch(() => {})
})
</script>

<template>
  <section class="mx-auto max-w-2xl">
    <h1 class="font-heading text-4xl font-semibold">{{ modeEdit ? 'Ubah Proyek' : 'Buat Proyek Baru' }}</h1>
    <p class="mt-1 text-sm text-muted">
      {{ modeEdit ? 'Perbarui informasi proyek venue.' : 'Isi detail proyek — Rancangan 1 otomatis dibuat untukmu.' }}
    </p>

    <p v-if="!modeEdit && dilarangMembuat" class="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
      Anda telah mencapai batas {{ sub.maksProyek }} proyek aktif pada paket Free. Upgrade ke Premium untuk membuat lebih banyak proyek.
    </p>

    <div class="mt-5">
      <ProjectForm :awal="awal" :sibuk="sibuk" :error="error" :dilarang="dilarangMembuat" @simpan="simpan" @batal="router.back()" />
    </div>
  </section>
</template>
