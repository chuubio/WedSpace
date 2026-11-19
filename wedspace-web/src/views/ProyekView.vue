<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useSubscriptionStore } from '../stores/subscription'
import ProjectCard from '../components/ProjectCard.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import VintageOrnament from '../components/VintageOrnament.vue'

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
  <section class="space-y-5">
    <!-- Editorial Header Card -->
    <div class="ws-paper-card bg-grid-paper overflow-hidden">
      <div class="bg-stripes-pink flex items-center justify-between border-b-2 border-licorice px-6 py-2">
        <span class="ws-eyebrow">ARSIP PERANCANGAN VENUE</span>
        <span class="text-[11px] font-bold uppercase tracking-wider text-cherry">
          {{ daftar.length }} Proyek Tersimpan
        </span>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h1 class="font-heading text-4xl font-bold text-licorice md:text-5xl">Proyek Saya</h1>
          <p class="mt-1 text-sm text-muted">Kelola seluruh proyek venue pernikahanmu.</p>
        </div>
        <RouterLink
          v-if="!sub.proyekPenuh"
          to="/proyek/baru"
          class="ws-btn-cherry px-5 py-3"
        >
          <i class="fa-solid fa-plus mr-2"></i>Proyek Baru
        </RouterLink>
        <RouterLink
          v-else
          to="/langganan"
          class="ws-btn-violet px-5 py-3"
        >
          <i class="fa-solid fa-crown mr-2 text-cherry"></i>Upgrade ke Premium
        </RouterLink>
      </div>
    </div>

    <div
      v-if="sub.ringkasan"
      class="ws-ticket flex flex-wrap items-center justify-between gap-2 bg-paper px-5 py-3.5 text-sm"
    >
      <span :class="['font-medium text-licorice', sub.proyekPenuh ? '!font-bold !text-cherry' : '']">
        <i class="fa-solid fa-crown mr-2 text-cherry"></i>{{ batasInfo }}
      </span>
      <RouterLink
        v-if="!sub.adalahAdmin && !sub.adalahPremium"
        to="/langganan"
        class="text-xs font-bold uppercase tracking-wider text-cherry underline"
      >
        Lihat paket →
      </RouterLink>
    </div>

    <p v-if="pesan" class="rounded-xl border-2 border-licorice bg-apple/45 px-4 py-3 text-sm font-semibold text-licorice">
      <i class="fa-solid fa-check mr-1.5"></i>{{ pesan }}
    </p>
    <p v-if="error" class="rounded-xl border-2 border-licorice bg-strawberry/75 px-4 py-3 text-sm font-semibold text-cherry">
      <i class="fa-solid fa-circle-exclamation mr-1.5"></i>{{ error }}
    </p>

    <!-- Search Bar -->
    <div class="relative">
      <i class="fa-solid fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"></i>
      <input
        v-model="cari"
        type="search"
        placeholder="Cari proyek, venue, atau tema…"
        class="ws-input !bg-paper pl-11"
      />
    </div>

    <p v-if="sibuk && !daftar.length" class="ws-paper-card p-8 text-center text-muted">Memuat proyek…</p>

    <div v-else-if="tampil.length" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <ProjectCard v-for="p in tampil" :key="p.id" :proyek="p" @hapus="targetHapus = $event" />
    </div>

    <!-- Empty State with Grid Paper & Wedding Ornaments -->
    <div
      v-else
      class="ws-paper-card bg-grid-paper relative overflow-hidden p-12 text-center"
    >
      <VintageOrnament variant="rings" class="mx-auto h-12 w-14" />
      <p class="font-heading mt-3 text-3xl font-bold text-licorice">Belum ada proyek</p>
      <p class="mt-1 text-sm text-muted">Buat proyek pertamamu untuk mulai merancang venue.</p>
      <RouterLink
        to="/proyek/baru"
        class="ws-btn-cherry mt-5 inline-flex px-6 py-3"
      >
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
