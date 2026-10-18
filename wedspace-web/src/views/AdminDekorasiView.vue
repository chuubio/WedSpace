<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'

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
  <section>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="font-heading text-4xl font-semibold">Data Dekorasi</h1>
        <p class="mt-1 text-sm text-muted">Kelola katalog dekorasi WedSpace.</p>
      </div>
      <button class="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90" @click="bukaTambah">
        <i class="fa-solid fa-plus mr-2"></i>Tambah Dekorasi
      </button>
    </div>

    <p v-if="pesan" class="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{{ pesan }}</p>
    <p v-if="error" class="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">{{ error }}</p>

    <div class="mt-5 grid grid-cols-3 gap-3">
      <div class="rounded-2xl border border-line bg-white p-4 text-center">
        <p class="font-heading text-3xl font-bold">{{ daftar.length }}</p>
        <p class="text-xs text-muted">Total</p>
      </div>
      <div class="rounded-2xl border border-line bg-white p-4 text-center">
        <p class="font-heading text-3xl font-bold text-green-600">{{ totalAktif }}</p>
        <p class="text-xs text-muted">Aktif</p>
      </div>
      <div class="rounded-2xl border border-line bg-white p-4 text-center">
        <p class="font-heading text-3xl font-bold text-muted">{{ totalNonaktif }}</p>
        <p class="text-xs text-muted">Nonaktif</p>
      </div>
    </div>

    <div class="mt-4 flex flex-col gap-2 sm:flex-row">
      <input
        v-model="cari" type="search" placeholder="Cari nama dekorasi…"
        class="flex-1 rounded-xl border border-line bg-white px-4 py-2.5 outline-none focus:border-primary"
      />
      <select v-model="filterKategori" class="rounded-xl border border-line bg-white px-4 py-2.5 outline-none focus:border-primary">
        <option value="">Semua kategori</option>
        <option v-for="k in kategoriList" :key="k" :value="k">{{ k }}</option>
      </select>
    </div>

    <p v-if="sibuk && !daftar.length" class="mt-8 text-center text-muted">Memuat data…</p>

    <div v-else class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <article
        v-for="d in tampil" :key="d.id"
        class="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_4px_18px_rgba(201,120,149,0.1)]"
        :class="{ 'opacity-60': !d.is_active }"
      >
        <div class="flex h-32 items-center justify-center bg-petal text-4xl font-bold text-primary">
          {{ inisial(d.nama_dekorasi) }}
        </div>
        <div class="p-4">
          <div class="flex items-center justify-between gap-2">
            <span class="rounded-full bg-blush px-2.5 py-1 text-xs font-medium text-primary">{{ d.kategori }}</span>
            <span v-if="!d.is_active" class="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-muted">Nonaktif</span>
          </div>
          <h2 class="mt-2 font-semibold">{{ d.nama_dekorasi }}</h2>
          <p class="mt-0.5 text-sm text-muted">{{ d.panjang }} × {{ d.lebar }} × {{ d.tinggi }} cm</p>
          <p class="mt-1 font-semibold text-primary">{{ rupiah(d.harga) }}</p>
          <div class="mt-3 flex gap-2">
            <button class="flex-1 rounded-lg border border-line py-2 text-sm font-medium hover:bg-canvas" @click="bukaEdit(d)">
              <i class="fa-solid fa-pen mr-1.5"></i>Ubah
            </button>
            <button class="flex-1 rounded-lg border border-red-200 py-2 text-sm font-medium text-danger hover:bg-red-50" @click="modalHapus = d">
              <i class="fa-solid fa-trash mr-1.5"></i>Hapus
            </button>
          </div>
        </div>
      </article>
    </div>

    <p v-if="!sibuk && !tampil.length" class="mt-8 text-center text-muted">Tidak ada dekorasi yang cocok.</p>

    <!-- Modal tambah/ubah -->
    <Teleport to="body">
      <div v-if="modalForm" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" @click.self="modalForm = false">
        <div class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-white p-6 shadow-xl">
          <h2 class="font-heading text-2xl font-semibold">{{ sedangEdit ? 'Ubah Dekorasi' : 'Tambah Dekorasi' }}</h2>
          <form class="mt-4 space-y-3" @submit.prevent="simpan">
            <div>
              <label class="mb-1 block text-sm font-medium">Nama dekorasi</label>
              <input v-model="form.nama_dekorasi" class="w-full rounded-xl border border-line bg-canvas px-4 py-2.5 outline-none focus:border-primary" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium">Kategori</label>
              <input v-model="form.kategori" placeholder="cth: Pelaminan, Meja, Kursi" class="w-full rounded-xl border border-line bg-canvas px-4 py-2.5 outline-none focus:border-primary" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1 block text-sm font-medium">Harga (Rp)</label>
                <input v-model="form.harga" type="number" min="0" class="w-full rounded-xl border border-line bg-canvas px-4 py-2.5 outline-none focus:border-primary" />
              </div>
              <div class="flex items-end pb-2.5">
                <label class="flex items-center gap-2 text-sm">
                  <input v-model="form.is_active" type="checkbox" class="h-4 w-4 accent-[#C97895]" /> Aktif
                </label>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="mb-1 block text-sm font-medium">Pjg (cm)</label>
                <input v-model="form.panjang" type="number" min="0" step="any" class="w-full rounded-xl border border-line bg-canvas px-4 py-2.5 outline-none focus:border-primary" />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium">Lbr (cm)</label>
                <input v-model="form.lebar" type="number" min="0" step="any" class="w-full rounded-xl border border-line bg-canvas px-4 py-2.5 outline-none focus:border-primary" />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium">Tgi (cm)</label>
                <input v-model="form.tinggi" type="number" min="0" step="any" class="w-full rounded-xl border border-line bg-canvas px-4 py-2.5 outline-none focus:border-primary" />
              </div>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium">Deskripsi</label>
              <textarea v-model="form.deskripsi" rows="3" class="w-full rounded-xl border border-line bg-canvas px-4 py-2.5 outline-none focus:border-primary"></textarea>
            </div>
            <p v-if="errorForm" class="rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">{{ errorForm }}</p>
            <div class="flex gap-2 pt-1">
              <button type="button" class="flex-1 rounded-xl border border-line py-2.5 font-semibold hover:bg-canvas" @click="modalForm = false">Batal</button>
              <button type="submit" :disabled="menyimpan" class="flex-1 rounded-xl bg-primary py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-60">
                {{ menyimpan ? 'Menyimpan…' : 'Simpan' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Modal konfirmasi hapus -->
    <Teleport to="body">
      <div v-if="modalHapus" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" @click.self="modalHapus = null">
        <div class="w-full max-w-sm rounded-2xl border border-line bg-white p-6 shadow-xl">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <i class="fa-solid fa-trash text-danger"></i>
          </div>
          <h2 class="font-heading mt-4 text-center text-2xl font-semibold">Hapus dekorasi?</h2>
          <p class="mt-1.5 text-center text-sm text-muted">
            "{{ modalHapus.nama_dekorasi }}" akan dihapus. Bila sedang dipakai di rancangan, ia hanya dinonaktifkan.
          </p>
          <div class="mt-6 flex gap-2">
            <button class="flex-1 rounded-xl border border-line py-2.5 font-semibold hover:bg-canvas" @click="modalHapus = null">Batal</button>
            <button class="flex-1 rounded-xl bg-danger py-2.5 font-semibold text-white hover:opacity-90" @click="hapus">Ya, Hapus</button>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>
