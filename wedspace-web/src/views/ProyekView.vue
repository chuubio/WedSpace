<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useSubscriptionStore } from '../stores/subscription'
import ProjectCard from '../components/ProjectCard.vue'
import ConfirmModal from '../components/ConfirmModal.vue'

const auth = useAuthStore()
const sub = useSubscriptionStore()
const API = 'http://localhost:3000/api'

const daftar = ref([])
const sibuk = ref(false)
const error = ref('')
const pesan = ref('')
const cari = ref('')
const targetHapus = ref(null)

const tampil = computed(() => {
  if (!cari.value) return daftar.value
  const k = cari.value.toLowerCase()
  return daftar.value.filter((p) =>
    (p.nama_proyek || '').toLowerCase().includes(k) ||
    (p.nama_venue || '').toLowerCase().includes(k) ||
    (p.tema || '').toLowerCase().includes(k),
  )
})

// Info batas paket (frontend hanya menampilkan; penegakan tetap di backend)
const batasInfo = computed(() => {
  if (sub.adalahAdmin) return 'Admin: proyek tanpa batas paket.'
  if (sub.maksProyek === null) return `Paket ${sub.namaPaket}: proyek tanpa batas.`
  const dasar = `Paket ${sub.namaPaket}: ${sub.proyekAktif}/${sub.maksProyek} proyek aktif`
  return sub.proyekPenuh ? `${dasar} - batas paket tercapai.` : `${dasar}.`
})

async function muat() {
  sibuk.value = true
  error.value = ''
  try {
    const res = await fetch(`${API}/proyek`, { headers: auth.authHeader() })
    const data = await res.json()
    if (!res.ok) throw new Error(data.pesan || 'Gagal memuat proyek.')
    daftar.value = data.data
  } catch (err) {
    error.value = err.message
  } finally {
    sibuk.value = false
  }
}

async function hapus() {
  if (!targetHapus.value) return
  sibuk.value = true
  try {
    const res = await fetch(`${API}/proyek/${targetHapus.value.id}`, {
      method: 'DELETE', headers: auth.authHeader(),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.pesan || 'Gagal menghapus proyek.')
    pesan.value = data.pesan || 'Proyek dihapus.'
    targetHapus.value = null
    await muat()
  } catch (err) {
    error.value = err.message
  } finally {
    sibuk.value = false
  }
}

onMounted(() => {
  muat()
  sub.muat().catch(() => {})
})
</script>

<template>
  <section>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="font-heading text-4xl font-semibold">Proyek Saya</h1>
        <p class="mt-1 text-sm text-muted">Kelola seluruh proyek venue pernikahanmu.</p>
      </div>
      <RouterLink v-if="!sub.proyekPenuh" to="/proyek/baru" class="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
        <i class="fa-solid fa-plus mr-2"></i>Proyek Baru
      </RouterLink>
      <RouterLink v-else to="/langganan" class="rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-semibold hover:bg-canvas">
        <i class="fa-solid fa-crown mr-2 text-primary"></i>Upgrade ke Premium
      </RouterLink>
    </div>

    <div v-if="sub.ringkasan" class="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-white px-4 py-3 text-sm">
      <span :class="['text-muted', sub.proyekPenuh ? '!text-danger' : '']">
        <i class="fa-solid fa-crown mr-1.5 text-primary"></i>{{ batasInfo }}
      </span>
      <RouterLink v-if="!sub.adalahAdmin && !sub.adalahPremium" to="/langganan" class="font-semibold text-primary">
        Lihat paket
      </RouterLink>
    </div>

    <p v-if="pesan" class="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{{ pesan }}</p>
    <p v-if="error" class="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">{{ error }}</p>

    <input
      v-model="cari" type="search" placeholder="Cari proyek, venue, atau tema…"
      class="mt-4 w-full rounded-xl border border-line bg-white px-4 py-2.5 outline-none focus:border-primary"
    />

    <p v-if="sibuk && !daftar.length" class="mt-8 text-center text-muted">Memuat proyek…</p>

    <div v-else-if="tampil.length" class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <ProjectCard v-for="p in tampil" :key="p.id" :proyek="p" @hapus="targetHapus = $event" />
    </div>

    <div v-else class="mt-8 rounded-2xl border border-dashed border-line bg-white p-10 text-center">
      <p class="font-semibold">Belum ada proyek</p>
      <p class="mt-1 text-sm text-muted">Buat proyek pertamamu untuk mulai merancang venue.</p>
      <RouterLink to="/proyek/baru" class="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
        Buat Proyek
      </RouterLink>
    </div>

    <ConfirmModal
      :tampil="!!targetHapus"
      judul="Hapus proyek?"
      :pesan="targetHapus ? `&quot;${targetHapus.nama_proyek}&quot; beserta seluruh rancangannya akan dihapus permanen.` : ''"
      label-konfirmasi="Ya, Hapus"
      @batal="targetHapus = null"
      @konfirmasi="hapus"
    />
  </section>
</template>
