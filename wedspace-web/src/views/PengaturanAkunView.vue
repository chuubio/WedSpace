<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const API = 'http://localhost:3000/api'
const API_BASE = 'http://localhost:3000'

const nama = ref('')
const fotoPratinjau = ref('')
const fileFoto = ref(null)
const inputFile = ref(null)
const sibuk = ref(false)
const menyimpan = ref(false)
const error = ref('')
const pesan = ref('')

const avatarUrl = computed(() => {
  if (fotoPratinjau.value) return fotoPratinjau.value
  const foto = auth.user?.foto_profil
  if (!foto) return ''
  if (/^https?:\/\//.test(foto)) return foto
  return `${API_BASE}${foto.startsWith('/') ? foto : `/${foto}`}`
})

const inisial = computed(() => (nama.value || auth.user?.nama || '?').trim().charAt(0).toUpperCase())

function segarkanDariStore() {
  nama.value = auth.user?.nama || ''
  fotoPratinjau.value = ''
  fileFoto.value = null
}

function pilihFoto(e) {
  const f = e.target.files?.[0]
  if (!f) return
  if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) {
    error.value = 'Foto profil harus PNG, JPG, atau WebP.'
    return
  }
  if (f.size > 5 * 1024 * 1024) {
    error.value = 'Ukuran foto maksimal 5 MB.'
    return
  }
  error.value = ''
  fileFoto.value = f
  fotoPratinjau.value = URL.createObjectURL(f)
}

function hapusPilihanFoto() {
  fileFoto.value = null
  if (fotoPratinjau.value) URL.revokeObjectURL(fotoPratinjau.value)
  fotoPratinjau.value = ''
  if (inputFile.value) inputFile.value.value = ''
}

async function muatProfil() {
  sibuk.value = true
  error.value = ''
  try {
    const res = await fetch(`${API}/auth/me`, { headers: auth.authHeader() })
    const data = await res.json()
    if (!res.ok) throw new Error(data.pesan || 'Gagal memuat profil.')
    auth.perbaruiUser(data.user)
    segarkanDariStore()
  } catch (err) {
    error.value = err.message
  } finally {
    sibuk.value = false
  }
}

async function simpan() {
  pesan.value = ''
  error.value = ''
  if (!nama.value.trim()) {
    error.value = 'Nama tidak boleh kosong.'
    return
  }
  menyimpan.value = true
  try {
    const fd = new FormData()
    fd.append('nama', nama.value.trim())
    if (fileFoto.value) fd.append('foto_profil', fileFoto.value)
    const res = await fetch(`${API}/auth/profil`, {
      method: 'PUT',
      headers: auth.authHeader(),
      body: fd,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.pesan || 'Gagal menyimpan pengaturan akun.')
    auth.perbaruiUser(data.user)
    if (fotoPratinjau.value) URL.revokeObjectURL(fotoPratinjau.value)
    fotoPratinjau.value = ''
    fileFoto.value = null
    if (inputFile.value) inputFile.value.value = ''
    pesan.value = 'Pengaturan akun berhasil disimpan.'
  } catch (err) {
    error.value = err.message
  } finally {
    menyimpan.value = false
  }
}

onMounted(muatProfil)
</script>

<template>
  <section class="mx-auto max-w-2xl">
    <h1 class="font-heading text-4xl font-semibold">Pengaturan Akun</h1>
    <p class="mt-1 text-sm text-muted">Kelola nama dan foto profil akunmu.</p>

    <p v-if="pesan" class="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{{ pesan }}</p>
    <p v-if="error" class="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">{{ error }}</p>

    <div v-if="sibuk && !nama" class="mt-6 text-muted">Memuat profil…</div>

    <form v-else class="mt-6 rounded-2xl border border-line bg-white p-6" @submit.prevent="simpan">
      <div class="flex items-center gap-4">
        <span class="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-blush text-3xl font-bold text-primary">
          <img v-if="avatarUrl" :src="avatarUrl" alt="Foto profil" class="h-full w-full object-cover" />
          <span v-else>{{ inisial }}</span>
        </span>
        <div>
          <p class="font-semibold">{{ auth.user?.nama || 'Akun' }}</p>
          <p class="text-sm text-muted">{{ auth.user?.username_email || '' }}</p>
          <span class="mt-1 inline-block rounded-full bg-blush px-2.5 py-1 text-xs font-medium uppercase text-primary">
            {{ auth.user?.role === 'admin' ? 'Admin' : 'Wedding Organizer' }}
          </span>
        </div>
      </div>

      <div class="mt-5">
        <label class="mb-1 block text-sm font-medium">Foto profil</label>
        <div class="flex flex-wrap items-center gap-2">
          <input ref="inputFile" type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="pilihFoto" />
          <button type="button" class="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold hover:bg-canvas" @click="inputFile?.click()">
            <i class="fa-solid fa-image mr-2 text-primary"></i>Pilih foto
          </button>
          <button
            v-if="fileFoto"
            type="button"
            class="rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-muted hover:bg-canvas"
            @click="hapusPilihanFoto"
          >
            Batalkan pilihan
          </button>
        </div>
        <p class="mt-1.5 text-xs text-muted">PNG, JPG, atau WebP, maksimal 5 MB.</p>
      </div>

      <div class="mt-4">
        <label class="mb-1 block text-sm font-medium">Nama</label>
        <input
          v-model="nama"
          placeholder="Nama lengkap"
          class="w-full rounded-xl border border-line bg-canvas px-4 py-2.5 outline-none focus:border-primary"
        />
      </div>

      <div class="mt-4">
        <label class="mb-1 block text-sm font-medium">Email</label>
        <input
          :value="auth.user?.username_email || ''"
          disabled
          class="w-full cursor-not-allowed rounded-xl border border-line bg-gray-50 px-4 py-2.5 text-muted outline-none"
        />
        <p class="mt-1.5 text-xs text-muted">Email dipakai untuk login dan tidak bisa diubah di sini.</p>
      </div>

      <div class="mt-6 flex gap-2">
        <button
          type="button"
          class="flex-1 rounded-xl border border-line py-2.5 font-semibold hover:bg-canvas"
          @click="segarkanDariStore"
        >
          Atur Ulang
        </button>
        <button
          type="submit"
          :disabled="menyimpan"
          class="flex-1 rounded-xl bg-primary py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {{ menyimpan ? 'Menyimpan…' : 'Simpan Perubahan' }}
        </button>
      </div>
    </form>
  </section>
</template>
