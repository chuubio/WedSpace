<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import DecorationCard from '../components/DecorationCard.vue'
import DecorationDetailModal from '../components/DecorationDetailModal.vue'
import DecorationFormModal from '../components/DecorationFormModal.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import VintageOrnament from '../components/VintageOrnament.vue'

const auth = useAuthStore()
const API = 'http://localhost:3000/api'

const daftar = ref([])
const sibuk = ref(false)
const error = ref('')
const pesanSukses = ref('')

// Filter & Pencarian
const cari = ref('')
const filterVisibilitas = ref('') // '' (Semua) | 'private' | 'public'
const filterKategori = ref('')

// State Modals
const modalForm = ref(false)
const sedangEdit = ref(null)
const terpilihDetail = ref(null)
const modalHapus = ref(null)
const modalVisibilitas = ref(null)

const kategoriList = computed(() => {
  return [...new Set(daftar.value.map((d) => d.kategori).filter(Boolean))].sort()
})

const totalSemua = computed(() => daftar.value.length)
const totalPrivate = computed(() => daftar.value.filter((d) => d.visibility === 'private').length)
const totalPublic = computed(() => daftar.value.filter((d) => d.visibility === 'public').length)
const totalAktif = computed(() => daftar.value.filter((d) => d.is_active).length)

const tampil = computed(() => {
  const k = cari.value.trim().toLowerCase()
  return daftar.value.filter((d) => {
    const cocokCari = !k || (d.nama_dekorasi || '').toLowerCase().includes(k)
    const cocokVis = !filterVisibilitas.value || d.visibility === filterVisibilitas.value
    const cocokKat = !filterKategori.value || d.kategori === filterKategori.value
    return cocokCari && cocokVis && cocokKat
  })
})

async function muat() {
  sibuk.value = true
  error.value = ''
  try {
    // Gunakan scope=mine agar backend memfilter dekorasi milik WO yang sedang login
    const res = await fetch(`${API}/dekorasi?scope=mine`, {
      headers: auth.authHeader(),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.pesan || 'Gagal memuat katalog pribadi.')
    }
    daftar.value = data.data || []
  } catch (err) {
    error.value = err.message || 'Terjadi kesalahan saat memuat data.'
  } finally {
    sibuk.value = false
  }
}

function bukaTambah() {
  sedangEdit.value = null
  modalForm.value = true
}

function bukaEdit(d) {
  sedangEdit.value = d
  modalForm.value = true
}

function onFormBerhasil(payload) {
  pesanSukses.value = payload.pesan || 'Operasi berhasil.'
  muat()
  setTimeout(() => {
    pesanSukses.value = ''
  }, 4000)
}

function mintaKonfirmasiHapus(d) {
  modalHapus.value = d
}

async function konfirmasiHapus() {
  if (!modalHapus.value) return
  const item = modalHapus.value
  modalHapus.value = null
  sibuk.value = true

  try {
    const res = await fetch(`${API}/dekorasi/${item.id}`, {
      method: 'DELETE',
      headers: auth.authHeader(),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.pesan || 'Gagal menonaktifkan dekorasi.')
    }
    pesanSukses.value = data.pesan || `Dekorasi "${item.nama_dekorasi}" berhasil dinonaktifkan.`
    await muat()
  } catch (err) {
    error.value = err.message || 'Gagal menonaktifkan dekorasi.'
  } finally {
    sibuk.value = false
    setTimeout(() => {
      pesanSukses.value = ''
    }, 4000)
  }
}

function mintaKonfirmasiVisibilitas(d) {
  modalVisibilitas.value = d
}

async function konfirmasiVisibilitas() {
  if (!modalVisibilitas.value) return
  const item = modalVisibilitas.value
  const targetVis = item.visibility === 'private' ? 'public' : 'private'
  modalVisibilitas.value = null
  sibuk.value = true

  try {
    const res = await fetch(`${API}/dekorasi/${item.id}/visibility`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...auth.authHeader(),
      },
      body: JSON.stringify({ visibility: targetVis }),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.pesan || 'Gagal mengubah visibilitas dekorasi.')
    }
    pesanSukses.value = data.pesan || `Visibilitas berhasil diubah menjadi ${targetVis.toUpperCase()}.`
    await muat()
  } catch (err) {
    error.value = err.message || 'Gagal mengubah visibilitas.'
  } finally {
    sibuk.value = false
    setTimeout(() => {
      pesanSukses.value = ''
    }, 4000)
  }
}

onMounted(muat)
</script>

<template>
  <section class="space-y-6">
    <!-- Banner Header & Navigation Tabs -->
    <div class="ws-paper-card bg-grid-paper overflow-hidden">
      <!-- Striped Top Ribbon -->
      <div class="bg-stripes-pink flex flex-wrap items-center justify-between gap-2 border-b-2 border-licorice px-6 py-2.5">
        <span class="ws-eyebrow">HYBRID DECORATION CATALOG</span>
        <div class="flex items-center gap-1.5 text-xs font-bold text-cherry">
          <i class="fa-solid fa-folder-closed"></i>
          <span>Katalog Pribadi WO</span>
        </div>
      </div>

      <!-- Main Header Content -->
      <div class="flex flex-wrap items-center justify-between gap-4 p-6 md:p-8">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="font-heading text-4xl font-bold text-licorice md:text-5xl">Katalog Saya</h1>
            <VintageOrnament variant="ticket-stamp" label="Pribadi" />
          </div>
          <p class="mt-2 text-sm text-muted max-w-2xl leading-relaxed">
            Kelola inventaris dekorasi milikmu. Dekorasi yang baru ditambahkan otomatis berstatus <strong>Private</strong>. 
            Kamu dapat membagikannya ke <strong>Katalog Komunitas</strong> agar dapat digunakan oleh sesama Wedding Organizer.
          </p>
        </div>

        <button
          type="button"
          class="ws-btn-cherry px-6 py-3.5 text-sm font-bold uppercase tracking-wider shadow-md hover:scale-[1.02] transition-transform"
          @click="bukaTambah"
        >
          <i class="fa-solid fa-plus mr-2 text-base"></i>Tambah Dekorasi
        </button>
      </div>

      <!-- Tab Navigation Switcher -->
      <div class="flex items-center gap-2 border-t-2 border-licorice bg-marshmallow px-6 py-2">
        <span class="text-xs font-bold uppercase tracking-wider text-muted mr-2">Tampilan:</span>
        <RouterLink
          to="/katalog/saya"
          class="rounded-lg border-2 border-licorice bg-paper px-4 py-1.5 text-xs font-bold text-cherry shadow-[2px_2px_0px_#7F1125]"
        >
          <i class="fa-solid fa-box-open mr-1.5"></i>Katalog Saya ({{ totalSemua }})
        </RouterLink>
        <RouterLink
          to="/katalog/komunitas"
          class="rounded-lg border border-licorice/40 bg-marshmallow px-4 py-1.5 text-xs font-bold text-licorice hover:bg-paper transition-colors"
        >
          <i class="fa-solid fa-users-viewfinder mr-1.5 text-cherry"></i>Katalog Komunitas &amp; Platform
        </RouterLink>
      </div>
    </div>

    <!-- Feedback Notification Alerts -->
    <div
      v-if="pesanSukses"
      class="flex items-center justify-between rounded-xl border-2 border-licorice bg-apple/60 px-5 py-3 text-sm font-bold text-licorice shadow-sm"
    >
      <div class="flex items-center gap-2">
        <i class="fa-solid fa-circle-check text-apple text-base"></i>
        <span>{{ pesanSukses }}</span>
      </div>
      <button type="button" class="text-licorice/60 hover:text-licorice" @click="pesanSukses = ''">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>

    <div
      v-if="error"
      class="flex items-center justify-between rounded-xl border-2 border-licorice bg-strawberry/80 px-5 py-3 text-sm font-bold text-cherry shadow-sm"
    >
      <div class="flex items-center gap-2">
        <i class="fa-solid fa-circle-exclamation text-base"></i>
        <span>{{ error }}</span>
      </div>
      <button type="button" class="text-cherry/60 hover:text-cherry" @click="error = ''">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>

    <!-- Summary Stats Tickets -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="ws-ticket bg-paper p-4 text-center">
        <p class="font-heading text-3xl font-bold text-licorice">{{ totalSemua }}</p>
        <p class="ws-eyebrow mt-1 text-muted">Total Koleksi</p>
      </div>

      <div class="ws-ticket bg-violet/30 p-4 text-center">
        <p class="font-heading text-3xl font-bold text-licorice">{{ totalPrivate }}</p>
        <p class="ws-eyebrow mt-1 text-licorice font-bold">
          <i class="fa-solid fa-lock text-[0.6875rem] mr-1"></i>Private
        </p>
      </div>

      <div class="ws-ticket bg-apple/35 p-4 text-center">
        <p class="font-heading text-3xl font-bold text-cherry">{{ totalPublic }}</p>
        <p class="ws-eyebrow mt-1 text-cherry font-bold">
          <i class="fa-solid fa-globe text-[0.6875rem] mr-1"></i>Public
        </p>
      </div>

      <div class="ws-ticket bg-paper p-4 text-center">
        <p class="font-heading text-3xl font-bold text-licorice">{{ totalAktif }}</p>
        <p class="ws-eyebrow mt-1 text-muted">Aktif Digunakan</p>
      </div>
    </div>

    <!-- Filter & Search Controls -->
    <div class="ws-paper-card flex flex-col gap-3 bg-paper p-4 sm:flex-row sm:items-center">
      <!-- Search Input -->
      <div class="relative flex-1">
        <i class="fa-solid fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"></i>
        <input
          v-model="cari"
          type="search"
          placeholder="Cari nama dekorasi pribadi…"
          class="ws-input pl-11"
        />
      </div>

      <!-- Visibility Filter -->
      <select v-model="filterVisibilitas" class="ws-input sm:w-48 text-xs font-bold">
        <option value="">Semua Visibilitas</option>
        <option value="private">🔒 Hanya Private</option>
        <option value="public">🌐 Hanya Public</option>
      </select>

      <!-- Category Filter -->
      <select v-model="filterKategori" class="ws-input sm:w-52 text-xs font-bold">
        <option value="">Semua Kategori</option>
        <option v-for="kat in kategoriList" :key="kat" :value="kat">{{ kat }}</option>
      </select>
    </div>

    <!-- Loading State -->
    <div v-if="sibuk && !daftar.length" class="ws-paper-card p-12 text-center text-muted">
      <i class="fa-solid fa-circle-notch fa-spin text-3xl text-cherry"></i>
      <p class="mt-3 font-semibold text-licorice">Memuat Katalog Saya…</p>
    </div>

    <!-- Cards Grid -->
    <div v-else-if="tampil.length" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <DecorationCard
        v-for="d in tampil"
        :key="d.id"
        :dekorasi="d"
        mode="saya"
        @detail="terpilihDetail = $event"
        @edit="bukaEdit($event)"
        @hapus="mintaKonfirmasiHapus($event)"
        @toggle-visibility="mintaKonfirmasiVisibilitas($event)"
      />
    </div>

    <!-- Empty State: Belum ada dekorasi sama sekali -->
    <div
      v-else-if="!daftar.length && !sibuk"
      class="ws-paper-card bg-grid-paper p-12 text-center"
    >
      <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-licorice bg-strawberry shadow-[3px_3px_0px_#7F1125]">
        <i class="fa-solid fa-box-open text-2xl text-cherry"></i>
      </div>
      <h3 class="font-heading mt-4 text-2xl font-bold text-licorice sm:text-3xl">
        Katalog Pribadimu Masih Kosong
      </h3>
      <p class="mx-auto mt-2 max-w-md text-sm text-muted">
        Tambahkan dekorasi pertama milik Wedding Organizer kamu. Kamu dapat menggunakannya langsung dalam rancangan venue pernikahanmu.
      </p>
      <button
        type="button"
        class="ws-btn-cherry mt-6 px-6 py-3 text-xs font-bold uppercase tracking-wider"
        @click="bukaTambah"
      >
        <i class="fa-solid fa-plus mr-1.5"></i>Tambah Dekorasi Sekarang
      </button>
    </div>

    <!-- Empty State: Filter/pencarian tidak cocok -->
    <div
      v-else
      class="ws-paper-card bg-grid-paper p-10 text-center"
    >
      <VintageOrnament variant="flower" warna="cherry" class="mx-auto h-10 w-10" />
      <p class="font-heading mt-2 text-2xl font-bold text-licorice">Tidak ada dekorasi yang cocok</p>
      <p class="mt-1 text-sm text-muted">Coba ubah kata kunci pencarian atau sesuaikan pilihan filter.</p>
      <button
        type="button"
        class="ws-btn-paper mt-4 px-4 py-2 text-xs font-bold"
        @click="cari = ''; filterVisibilitas = ''; filterKategori = ''"
      >
        Reset Filter
      </button>
    </div>

    <!-- Modal Form Tambah/Edit -->
    <DecorationFormModal
      :tampil="modalForm"
      :dekorasi="sedangEdit"
      @tutup="modalForm = false"
      @berhasil="onFormBerhasil"
    />

    <!-- Modal Detail Dekorasi -->
    <DecorationDetailModal
      :tampil="!!terpilihDetail"
      :dekorasi="terpilihDetail"
      @tutup="terpilihDetail = null"
    />

    <!-- Modal Konfirmasi Hapus/Nonaktifkan -->
    <ConfirmModal
      :tampil="!!modalHapus"
      judul="Nonaktifkan Dekorasi?"
      :pesan="`Dekorasi '${modalHapus?.nama_dekorasi}' akan dinonaktifkan dari katalog Anda. Dekorasi tidak akan tersedia untuk rancangan baru, tetapi referensi pada rancangan tersimpan akan tetap aman.`"
      label-konfirmasi="Ya, Nonaktifkan"
      @batal="modalHapus = null"
      @konfirmasi="konfirmasiHapus"
    />

    <!-- Modal Konfirmasi Perubahan Visibilitas -->
    <ConfirmModal
      :tampil="!!modalVisibilitas"
      :judul="modalVisibilitas?.visibility === 'private' ? 'Bagikan ke Katalog Komunitas?' : 'Tarik Menjadi Private?'"
      :pesan="modalVisibilitas?.visibility === 'private'
        ? `Dekorasi '${modalVisibilitas?.nama_dekorasi}' akan diubah menjadi Public. Seluruh Wedding Organizer lain dapat melihat detailnya dan menggunakannya dalam rancangan venue dengan namamu sebagai kontributor.`
        : `Dekorasi '${modalVisibilitas?.nama_dekorasi}' akan ditarik menjadi Private. WO lain tidak lagi dapat menemukan atau menggunakannya untuk rancangan baru. Rancangan lama yang sudah menggunakannya tidak akan rusak.`"
      :label-konfirmasi="modalVisibilitas?.visibility === 'private' ? 'Ya, Jadikan Public' : 'Ya, Jadikan Private'"
      @batal="modalVisibilitas = null"
      @konfirmasi="konfirmasiVisibilitas"
    />
  </section>
</template>
