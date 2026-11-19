<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import VintageOrnament from '../components/VintageOrnament.vue'

const auth = useAuthStore()
const API = 'http://localhost:3000/api'

const daftar = ref([])
const sibuk = ref(false)
const error = ref('')
const cari = ref('')
const filterKategori = ref('')
const modalForm = ref(false)
const sedangEdit = ref(null)
const modalHapus = ref(null)
const pesan = ref('')

const form = ref({ nama_dekorasi: '', kategori: '', harga: '', panjang: '', lebar: '', tinggi: '', deskripsi: '', is_active: true })
const errorForm = ref('')
const menyimpan = ref(false)

const kategoriList = computed(() => [...new Set(daftar.value.map((d) => d.kategori))].sort())
const totalAktif = computed(() => daftar.value.filter((d) => d.is_active).length)
const totalNonaktif = computed(() => daftar.value.filter((d) => !d.is_active).length)
const tampil = computed(() => daftar.value.filter((d) => {
  const cocokCari = !cari.value || d.nama_dekorasi.toLowerCase().includes(cari.value.toLowerCase())
  const cocokKategori = !filterKategori.value || d.kategori === filterKategori.value
  return cocokCari && cocokKategori
}))

function rupiah(n) {
  return 'Rp' + Number(n || 0).toLocaleString('id-ID')
}

function inisial(nama) {
  return (nama || '?').trim().charAt(0).toUpperCase()
}

async function muat() {
  sibuk.value = true
  error.value = ''
  try {
    const res = await fetch(`${API}/dekorasi`, { headers: auth.authHeader() })
    const data = await res.json()
    if (!res.ok) throw new Error(data.pesan || 'Gagal memuat data.')
    daftar.value = data.data
  } catch (err) {
    error.value = err.message
  } finally {
    sibuk.value = false
  }
}

function bukaTambah() {
  sedangEdit.value = null
  form.value = { nama_dekorasi: '', kategori: '', harga: '', panjang: '', lebar: '', tinggi: '', deskripsi: '', is_active: true }
  errorForm.value = ''
  modalForm.value = true
}

function bukaEdit(d) {
  sedangEdit.value = d
  form.value = {
    nama_dekorasi: d.nama_dekorasi, kategori: d.kategori, harga: d.harga,
    panjang: d.panjang, lebar: d.lebar, tinggi: d.tinggi,
    deskripsi: d.deskripsi || '', is_active: d.is_active,
  }
  errorForm.value = ''
  modalForm.value = true
}

async function simpan() {
  errorForm.value = ''
  if (!form.value.nama_dekorasi || !form.value.kategori) {
    errorForm.value = 'Nama dekorasi dan kategori wajib diisi.'
    return
  }
  menyimpan.value = true
  try {
    const url = sedangEdit.value ? `${API}/dekorasi/${sedangEdit.value.id}` : `${API}/dekorasi`
    const res = await fetch(url, {
      method: sedangEdit.value ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.authHeader() },
      body: JSON.stringify({
        ...form.value,
        harga: Number(form.value.harga),
        panjang: Number(form.value.panjang),
        lebar: Number(form.value.lebar),
        tinggi: Number(form.value.tinggi),
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.pesan || 'Gagal menyimpan.')
    modalForm.value = false
    pesan.value = sedangEdit.value ? 'Dekorasi berhasil diubah.' : 'Dekorasi berhasil ditambah.'
    await muat()
  } catch (err) {
    errorForm.value = err.message
  } finally {
    menyimpan.value = false
  }
}

async function hapus() {
  if (!modalHapus.value) return
  sibuk.value = true
  try {
    const res = await fetch(`${API}/dekorasi/${modalHapus.value.id}`, {
      method: 'DELETE', headers: auth.authHeader(),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.pesan || 'Gagal menghapus.')
    pesan.value = data.pesan || 'Dekorasi dihapus.'
    modalHapus.value = null
    await muat()
  } catch (err) {
    error.value = err.message
  } finally {
    sibuk.value = false
  }
}

onMounted(muat)
</script>

<template>
  <section class="space-y-5">
    <!-- Editorial Admin Header -->
    <div class="ws-paper-card bg-grid-paper overflow-hidden">
      <div class="bg-stripes-pink flex items-center justify-between border-b-2 border-licorice px-6 py-2">
        <span class="ws-eyebrow">INVENTARIS &amp; HARGA DEKORASI</span>
        <span class="text-[11px] font-bold uppercase tracking-wider text-cherry">Mode Kurator Admin</span>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h1 class="font-heading text-4xl font-bold text-licorice md:text-5xl">Data Dekorasi</h1>
          <p class="mt-1 text-sm text-muted">Kelola katalog dekorasi WedSpace.</p>
        </div>
        <button class="ws-btn-cherry px-5 py-3" @click="bukaTambah">
          <i class="fa-solid fa-plus mr-2"></i>Tambah Dekorasi
        </button>
      </div>
    </div>

    <p v-if="pesan" class="rounded-xl border-2 border-licorice bg-apple/45 px-4 py-3 text-sm font-semibold text-licorice">
      <i class="fa-solid fa-check mr-1.5"></i>{{ pesan }}
    </p>
    <p v-if="error" class="rounded-xl border-2 border-licorice bg-strawberry/75 px-4 py-3 text-sm font-semibold text-cherry">
      <i class="fa-solid fa-circle-exclamation mr-1.5"></i>{{ error }}
    </p>

    <!-- 3 Ticket Stats -->
    <div class="grid grid-cols-3 gap-3 sm:gap-4">
      <div class="ws-ticket bg-paper p-4 text-center">
        <p class="font-heading text-3xl font-bold text-licorice sm:text-4xl">{{ daftar.length }}</p>
        <p class="ws-eyebrow mt-1 text-muted">Total</p>
      </div>
      <div class="ws-ticket bg-strawberry/45 p-4 text-center">
        <p class="font-heading text-3xl font-bold text-licorice sm:text-4xl">{{ totalAktif }}</p>
        <p class="ws-eyebrow mt-1 text-cherry">Aktif</p>
      </div>
      <div class="ws-ticket bg-violet/35 p-4 text-center">
        <p class="font-heading text-3xl font-bold text-muted sm:text-4xl">{{ totalNonaktif }}</p>
        <p class="ws-eyebrow mt-1 text-muted">Nonaktif</p>
      </div>
    </div>

    <!-- Search & Filter Bar -->
    <div class="ws-paper-card flex flex-col gap-3 bg-paper p-4 sm:flex-row">
      <div class="relative flex-1">
        <i class="fa-solid fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"></i>
        <input
          v-model="cari"
          type="search"
          placeholder="Cari nama dekorasi…"
          class="ws-input pl-11"
        />
      </div>
      <select v-model="filterKategori" class="ws-input sm:w-64">
        <option value="">Semua kategori</option>
        <option v-for="k in kategoriList" :key="k" :value="k">{{ k }}</option>
      </select>
    </div>

    <p v-if="sibuk && !daftar.length" class="ws-paper-card p-8 text-center text-muted">Memuat data…</p>

    <div v-else class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <article
        v-for="d in tampil"
        :key="d.id"
        class="ws-paper-card ws-paper-card-hover flex flex-col justify-between overflow-hidden bg-paper"
        :class="{ 'opacity-65': !d.is_active }"
      >
        <div class="bg-stripes-pink relative flex h-32 items-center justify-center border-b-2 border-licorice">
          <span class="flex h-16 w-16 items-center justify-center rounded-full border-2 border-licorice bg-marshmallow font-heading text-3xl font-bold text-cherry shadow-[2px_2px_0px_#7F1125]">
            {{ inisial(d.nama_dekorasi) }}
          </span>
        </div>

        <div class="flex flex-1 flex-col justify-between p-4">
          <div>
            <div class="flex flex-wrap items-center justify-between gap-1.5">
              <span class="ws-badge-sticker bg-strawberry text-licorice">{{ d.kategori }}</span>
              <span
                v-if="!d.is_active"
                class="rounded-full border border-licorice bg-marshmallow px-2.5 py-0.5 text-[10px] font-bold uppercase text-muted"
              >
                Nonaktif
              </span>
            </div>
            <h2 class="font-heading mt-2.5 text-xl font-bold leading-snug text-licorice">{{ d.nama_dekorasi }}</h2>
            <p class="mt-0.5 text-xs font-medium text-muted">
              {{ d.panjang }} × {{ d.lebar }} × {{ d.tinggi }} cm
            </p>
          </div>

          <div class="mt-3 border-t border-dashed border-licorice/30 pt-3">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold uppercase tracking-wider text-muted">Harga</span>
              <span class="ws-price-pill">{{ rupiah(d.harga) }}</span>
            </div>
            <div class="mt-3 flex gap-2">
              <button class="ws-btn-paper flex-1 py-2" @click="bukaEdit(d)">
                <i class="fa-solid fa-pen mr-1.5"></i>Ubah
              </button>
              <button
                class="ws-btn-paper !border-cherry !text-cherry hover:!bg-strawberry flex-1 py-2"
                @click="modalHapus = d"
              >
                <i class="fa-solid fa-trash mr-1.5"></i>Hapus
              </button>
            </div>
          </div>
        </div>
      </article>
    </div>

    <p v-if="!sibuk && !tampil.length" class="ws-paper-card p-8 text-center text-muted">
      Tidak ada dekorasi yang cocok.
    </p>

    <!-- Modal tambah/ubah -->
    <Teleport to="body">
      <div
        v-if="modalForm"
        class="fixed inset-0 z-[60] flex items-center justify-center bg-licorice/55 p-4 backdrop-blur-[2px]"
        @click.self="modalForm = false"
      >
        <div class="ws-paper-card max-h-[90vh] w-full max-w-lg overflow-y-auto bg-marshmallow">
          <div class="bg-stripes-pink flex items-center justify-between border-b-2 border-licorice px-6 py-3">
            <h2 class="font-heading text-3xl font-bold text-licorice">
              {{ sedangEdit ? 'Ubah Dekorasi' : 'Tambah Dekorasi' }}
            </h2>
            <VintageOrnament variant="flower" warna="cherry" class="h-8 w-8" />
          </div>

          <form class="space-y-3.5 p-6" @submit.prevent="simpan">
            <div>
              <label class="ws-eyebrow mb-1 block">Nama dekorasi</label>
              <input v-model="form.nama_dekorasi" class="ws-input" />
            </div>
            <div>
              <label class="ws-eyebrow mb-1 block">Kategori</label>
              <input v-model="form.kategori" placeholder="cth: Pelaminan, Meja, Kursi" class="ws-input" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="ws-eyebrow mb-1 block">Harga (Rp)</label>
                <input v-model="form.harga" type="number" min="0" class="ws-input" />
              </div>
              <div class="flex items-end pb-2.5">
                <label class="flex cursor-pointer items-center gap-2 rounded-xl border border-licorice bg-strawberry/50 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-licorice">
                  <input v-model="form.is_active" type="checkbox" class="h-4 w-4 accent-[#CF2C2F]" /> Aktif
                </label>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="ws-eyebrow mb-1 block">Pjg (cm)</label>
                <input v-model="form.panjang" type="number" min="0" step="any" class="ws-input" />
              </div>
              <div>
                <label class="ws-eyebrow mb-1 block">Lbr (cm)</label>
                <input v-model="form.lebar" type="number" min="0" step="any" class="ws-input" />
              </div>
              <div>
                <label class="ws-eyebrow mb-1 block">Tgi (cm)</label>
                <input v-model="form.tinggi" type="number" min="0" step="any" class="ws-input" />
              </div>
            </div>
            <div>
              <label class="ws-eyebrow mb-1 block">Deskripsi</label>
              <textarea v-model="form.deskripsi" rows="3" class="ws-input"></textarea>
            </div>
            <p v-if="errorForm" class="rounded-xl border-2 border-licorice bg-strawberry/75 px-4 py-3 text-sm font-semibold text-cherry">
              {{ errorForm }}
            </p>
            <div class="flex gap-2.5 border-t border-dashed border-licorice/35 pt-4">
              <button type="button" class="ws-btn-paper flex-1 py-2.5" @click="modalForm = false">Batal</button>
              <button type="submit" :disabled="menyimpan" class="ws-btn-cherry flex-1 py-2.5 disabled:opacity-60">
                {{ menyimpan ? 'Menyimpan…' : 'Simpan' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Modal konfirmasi hapus -->
    <Teleport to="body">
      <div
        v-if="modalHapus"
        class="fixed inset-0 z-[60] flex items-center justify-center bg-licorice/55 p-4 backdrop-blur-[2px]"
        @click.self="modalHapus = null"
      >
        <div class="ws-paper-card w-full max-w-sm overflow-hidden bg-marshmallow">
          <div class="checkerboard-trim border-b-2 border-licorice"></div>
          <div class="p-6 text-center">
            <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-licorice bg-strawberry shadow-[2px_2px_0px_#7F1125]">
              <i class="fa-solid fa-trash text-cherry"></i>
            </div>
            <h2 class="font-heading mt-4 text-3xl font-bold text-licorice">Hapus dekorasi?</h2>
            <p class="mt-2 text-sm text-muted">
              "{{ modalHapus.nama_dekorasi }}" akan dihapus. Bila sedang dipakai di rancangan, ia hanya dinonaktifkan.
            </p>
            <div class="mt-6 flex gap-2.5">
              <button class="ws-btn-paper flex-1 py-2.5" @click="modalHapus = null">Batal</button>
              <button class="ws-btn-cherry flex-1 py-2.5" @click="hapus">Ya, Hapus</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>
