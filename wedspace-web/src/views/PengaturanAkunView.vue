<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import VintageOrnament from '../components/VintageOrnament.vue'

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
  <section class="mx-auto max-w-2xl space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <span class="ws-badge-sticker bg-strawberry text-licorice">Kartu Identitas</span>
        <h1 class="font-heading mt-2 text-4xl font-bold text-licorice md:text-5xl">Pengaturan Akun</h1>
        <p class="mt-1 text-sm text-muted">Kelola nama dan foto profil akunmu.</p>
      </div>
      <VintageOrnament variant="bow" warna="violet" class="h-12 w-14" />
    </div>

    <p v-if="pesan" class="rounded-xl border-2 border-licorice bg-apple/45 px-4 py-3 text-sm font-semibold text-licorice">
      <i class="fa-solid fa-check mr-1.5"></i>{{ pesan }}
    </p>
    <p v-if="error" class="rounded-xl border-2 border-licorice bg-strawberry/75 px-4 py-3 text-sm font-semibold text-cherry">
      <i class="fa-solid fa-circle-exclamation mr-1.5"></i>{{ error }}
    </p>

    <div v-if="sibuk && !nama" class="ws-paper-card p-8 text-center text-muted">Memuat profil…</div>

    <form v-else class="ws-paper-card overflow-hidden bg-paper" @submit.prevent="simpan">
      <div class="bg-stripes-pink flex items-center justify-between border-b-2 border-licorice px-6 py-3">
        <span class="ws-eyebrow">MEMBER PASS • WEDSPACE STUDIO</span>
        <VintageOrnament variant="ticket-stamp" label="Verified Planner" />
      </div>

      <div class="p-6 sm:p-8">
        <div class="flex flex-wrap items-center gap-5 rounded-2xl border-2 border-licorice bg-marshmallow p-4 shadow-[3px_3px_0px_#7F1125]">
          <span class="flex h-20 w-20 flex-none items-center justify-center overflow-hidden rounded-2xl border-2 border-licorice bg-strawberry font-heading text-4xl font-bold text-cherry shadow-[2px_2px_0px_#7F1125]">
            <img v-if="avatarUrl" :src="avatarUrl" alt="Foto profil" class="h-full w-full object-cover" />
            <span v-else>{{ inisial }}</span>
          </span>
          <div>
            <p class="font-heading text-2xl font-bold text-licorice">{{ auth.user?.nama || 'Akun' }}</p>
            <p class="text-sm text-muted">{{ auth.user?.username_email || '' }}</p>
            <span class="ws-badge-sticker mt-2 bg-peach text-licorice">
              {{ auth.user?.role === 'admin' ? 'Admin' : 'Wedding Organizer' }}
            </span>
          </div>
        </div>

        <div class="mt-6">
          <label class="ws-eyebrow mb-2 block">Foto profil</label>
          <div class="flex flex-wrap items-center gap-2.5">
            <input ref="inputFile" type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="pilihFoto" />
            <button type="button" class="ws-btn-paper px-4 py-2.5" @click="inputFile?.click()">
              <i class="fa-solid fa-image mr-2 text-cherry"></i>Pilih foto
            </button>
            <button
              v-if="fileFoto"
              type="button"
              class="ws-btn-paper !border-cherry !text-cherry px-4 py-2.5"
              @click="hapusPilihanFoto"
            >
              Batalkan pilihan
            </button>
          </div>
          <p class="mt-1.5 text-xs text-muted">PNG, JPG, atau WebP, maksimal 5 MB.</p>
        </div>

        <div class="mt-5">
          <label class="ws-eyebrow mb-1.5 block">Nama</label>
          <input
            v-model="nama"
            placeholder="Nama lengkap"
            class="ws-input"
          />
        </div>

        <div class="mt-4">
          <label class="ws-eyebrow mb-1.5 block">Email</label>
          <input
            :value="auth.user?.username_email || ''"
            disabled
            class="ws-input cursor-not-allowed !bg-strawberry/25 opacity-75"
          />
          <p class="mt-1.5 text-xs text-muted">Email dipakai untuk login dan tidak bisa diubah di sini.</p>
        </div>

        <div class="mt-6 flex gap-3 border-t border-dashed border-licorice/35 pt-5">
          <button
            type="button"
            class="ws-btn-paper flex-1 py-3"
            @click="segarkanDariStore"
          >
            Atur Ulang
          </button>
          <button
            type="submit"
            :disabled="menyimpan"
            class="ws-btn-cherry flex-1 py-3 disabled:opacity-60"
          >
            {{ menyimpan ? 'Menyimpan…' : 'Simpan Perubahan' }}
          </button>
        </div>
      </div>
    </form>
  </section>
</template>
