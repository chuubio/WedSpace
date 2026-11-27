<script setup>
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import VintageOrnament from './VintageOrnament.vue'

const props = defineProps({
  tampil: { type: Boolean, default: false },
  dekorasi: { type: Object, default: null }, // null = Tambah, object = Edit
})

const emit = defineEmits(['tutup', 'berhasil'])

const auth = useAuthStore()
const API = 'http://localhost:3000/api'

const form = ref({
  nama_dekorasi: '',
  kategori: '',
  harga: '',
  panjang: '',
  lebar: '',
  tinggi: '',
  deskripsi: '',
})

const fileGambar = ref(null)
const fileModel = ref(null)
const previewGambar = ref('')
const namaModel = ref('')
const errorForm = ref('')
const menyimpan = ref(false)

const kategoriPilihan = [
  'Pelaminan',
  'Meja',
  'Kursi',
  'Bunga',
  'Backdrop',
  'Lighting',
  'Aksesori',
  'Katering',
  'Panggung',
  'Gate & Foyer',
]

const adalahEdit = computed(() => Boolean(props.dekorasi?.id))

watch(
  () => [props.tampil, props.dekorasi],
  ([terbuka, item]) => {
    if (terbuka) {
      errorForm.value = ''
      fileGambar.value = null
      fileModel.value = null
      namaModel.value = ''

      if (item) {
        // Mode Edit
        form.value = {
          nama_dekorasi: item.nama_dekorasi || '',
          kategori: item.kategori || '',
          harga: item.harga !== undefined ? item.harga : '',
          panjang: item.panjang !== undefined ? item.panjang : '',
          lebar: item.lebar !== undefined ? item.lebar : '',
          tinggi: item.tinggi !== undefined ? item.tinggi : '',
          deskripsi: item.deskripsi || '',
        }
        if (item.gambar) {
          let url = item.gambar.startsWith('http') ? item.gambar : `http://localhost:3000${item.gambar}`
          if (item.visibility === 'private' && auth.token) {
            url += `${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(auth.token)}`
          }
          previewGambar.value = url
        } else {
          previewGambar.value = ''
        }
        if (item.model_3d) {
          namaModel.value = item.model_3d.split('/').pop()
        }
      } else {
        // Mode Tambah
        form.value = {
          nama_dekorasi: '',
          kategori: '',
          harga: '',
          panjang: '',
          lebar: '',
          tinggi: '',
          deskripsi: '',
        }
        previewGambar.value = ''
        namaModel.value = ''
      }
    }
  },
  { immediate: true }
)

function onPilihGambar(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
    errorForm.value = 'File gambar harus berformat PNG, JPG, atau WebP.'
    return
  }
  if (file.size > 50 * 1024 * 1024) {
    errorForm.value = 'Ukuran gambar maksimal 50 MB.'
    return
  }
  errorForm.value = ''
  fileGambar.value = file
  previewGambar.value = URL.createObjectURL(file)
}

function onPilihModel(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const ext = file.name.split('.').pop().toLowerCase()
  if (!['glb', 'gltf', 'obj', 'dae'].includes(ext)) {
    errorForm.value = ext === 'skp'
      ? 'File .skp perlu diekspor dulu dari SketchUp (File → Export → 3D Model) ke format .dae, .obj, atau .glb.'
      : 'File model 3D harus berformat GLB, glTF, OBJ, atau DAE (ekspor SketchUp).'
    return
  }
  if (file.size > 50 * 1024 * 1024) {
    errorForm.value = 'Ukuran model 3D maksimal 50 MB.'
    return
  }
  errorForm.value = ''
  fileModel.value = file
  namaModel.value = file.name
}

async function simpan() {
  errorForm.value = ''

  // Validasi data wajib
  if (!form.value.nama_dekorasi.trim()) {
    errorForm.value = 'Nama dekorasi wajib diisi.'
    return
  }
  if (!form.value.kategori.trim()) {
    errorForm.value = 'Kategori dekorasi wajib diisi.'
    return
  }
  const harga = Number(form.value.harga)
  if (isNaN(harga) || harga < 0) {
    errorForm.value = 'Harga harus berupa angka dan tidak boleh negatif.'
    return
  }
  const p = Number(form.value.panjang)
  const l = Number(form.value.lebar)
  const t = Number(form.value.tinggi)
  if (isNaN(p) || p <= 0 || isNaN(l) || l <= 0 || isNaN(t) || t <= 0) {
    errorForm.value = 'Dimensi panjang, lebar, dan tinggi harus lebih dari 0 cm.'
    return
  }

  menyimpan.value = true

  try {
    const formData = new FormData()
    formData.append('nama_dekorasi', form.value.nama_dekorasi.trim())
    formData.append('kategori', form.value.kategori.trim())
    formData.append('harga', harga)
    formData.append('panjang', p)
    formData.append('lebar', l)
    formData.append('tinggi', t)
    formData.append('deskripsi', form.value.deskripsi ? form.value.deskripsi.trim() : '')

    if (fileGambar.value) {
      formData.append('gambar', fileGambar.value)
    }
    if (fileModel.value) {
      formData.append('model_3d', fileModel.value)
    }

    const url = adalahEdit.value ? `${API}/dekorasi/${props.dekorasi.id}` : `${API}/dekorasi`
    const method = adalahEdit.value ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: auth.authHeader(),
      body: formData,
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.pesan || 'Gagal menyimpan dekorasi.')
    }

    emit('berhasil', {
      aksi: adalahEdit.value ? 'edit' : 'tambah',
      data: data.data,
      pesan: data.pesan || (adalahEdit.value ? 'Dekorasi berhasil diperbarui.' : 'Dekorasi berhasil ditambahkan ke Katalog Saya.'),
    })
    emit('tutup')
  } catch (err) {
    errorForm.value = err.message || 'Terjadi kesalahan saat menyimpan.'
  } finally {
    menyimpan.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="tampil"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-licorice/55 p-4 backdrop-blur-[2px]"
      @click.self="$emit('tutup')"
    >
      <div class="ws-paper-card max-h-[92vh] w-full max-w-xl overflow-y-auto bg-marshmallow">
        <!-- Modal Header Ribbon -->
        <div class="bg-stripes-pink flex items-center justify-between border-b-2 border-licorice px-6 py-3.5">
          <div>
            <h2 class="font-heading text-2xl font-bold text-licorice sm:text-3xl">
              {{ adalahEdit ? 'Edit Dekorasi' : 'Tambah Dekorasi Baru' }}
            </h2>
            <p class="text-xs text-cherry font-medium">
              {{ adalahEdit ? 'Perbarui informasi dekorasi pribadi Anda' : 'Otomatis berstatus Private di Katalog Saya' }}
            </p>
          </div>
          <VintageOrnament variant="flower" warna="cherry" class="h-8 w-8 hidden sm:block" />
        </div>

        <form class="space-y-4 p-6" @submit.prevent="simpan">
          <!-- Error Alert Banner -->
          <p
            v-if="errorForm"
            class="rounded-xl border-2 border-licorice bg-strawberry/80 px-4 py-2.5 text-xs font-semibold text-cherry shadow-sm"
          >
            <i class="fa-solid fa-circle-exclamation mr-1.5"></i>{{ errorForm }}
          </p>

          <!-- Nama Dekorasi -->
          <div>
            <label class="mb-1 block text-xs font-bold uppercase tracking-wider text-licorice">
              Nama Dekorasi <span class="text-cherry">*</span>
            </label>
            <input
              v-model="form.nama_dekorasi"
              type="text"
              required
              placeholder="Contoh: Pelaminan Gebyok Rustic 4M"
              class="ws-input"
            />
          </div>

          <!-- Kategori & Harga Grid -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-xs font-bold uppercase tracking-wider text-licorice">
                Kategori <span class="text-cherry">*</span>
              </label>
              <div class="relative">
                <input
                  v-model="form.kategori"
                  type="text"
                  required
                  list="daftar-kategori-dekorasi"
                  placeholder="Pilih atau ketik kategori"
                  class="ws-input"
                />
                <datalist id="daftar-kategori-dekorasi">
                  <option v-for="kat in kategoriPilihan" :key="kat" :value="kat" />
                </datalist>
              </div>
            </div>

            <div>
              <label class="mb-1 block text-xs font-bold uppercase tracking-wider text-licorice">
                Harga Estimasi (Rp) <span class="text-cherry">*</span>
              </label>
              <input
                v-model="form.harga"
                type="number"
                min="0"
                step="1"
                required
                placeholder="0"
                class="ws-input"
              />
            </div>
          </div>

          <!-- Dimensi: Panjang, Lebar, Tinggi -->
          <div>
            <label class="mb-1 block text-xs font-bold uppercase tracking-wider text-licorice">
              Ukuran / Dimensi (cm) <span class="text-cherry">*</span>
            </label>
            <div class="grid grid-cols-3 gap-2">
              <div>
                <input
                  v-model="form.panjang"
                  type="number"
                  min="0.1"
                  step="any"
                  required
                  placeholder="Panjang (cm)"
                  class="ws-input text-center text-xs"
                />
                <span class="mt-1 block text-center text-[0.6875rem] text-muted font-bold">Panjang</span>
              </div>
              <div>
                <input
                  v-model="form.lebar"
                  type="number"
                  min="0.1"
                  step="any"
                  required
                  placeholder="Lebar (cm)"
                  class="ws-input text-center text-xs"
                />
                <span class="mt-1 block text-center text-[0.6875rem] text-muted font-bold">Lebar</span>
              </div>
              <div>
                <input
                  v-model="form.tinggi"
                  type="number"
                  min="0.1"
                  step="any"
                  required
                  placeholder="Tinggi (cm)"
                  class="ws-input text-center text-xs"
                />
                <span class="mt-1 block text-center text-[0.6875rem] text-muted font-bold">Tinggi</span>
              </div>
            </div>
          </div>

          <!-- Upload Gambar Dekorasi -->
          <div>
            <label class="mb-1 block text-xs font-bold uppercase tracking-wider text-licorice">
              Foto / Gambar Dekorasi
            </label>
            <div class="flex items-center gap-3">
              <div
                v-if="previewGambar"
                class="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 border-licorice bg-paper shadow-sm"
              >
                <img :src="previewGambar" alt="Preview" class="h-full w-full object-cover" />
              </div>
              <div class="flex-1">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  class="text-xs file:mr-2.5 file:rounded-lg file:border file:border-licorice file:bg-paper file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-licorice hover:file:bg-strawberry cursor-pointer"
                  @change="onPilihGambar"
                />
                <p class="mt-1 text-xs text-muted">Format: PNG, JPG, WebP. Maksimal 50 MB.</p>
              </div>
            </div>
          </div>

          <!-- Upload Model 3D (Opsional) -->
          <div>
            <label class="mb-1 block text-xs font-bold uppercase tracking-wider text-licorice">
              File Model 3D (Opsional)
            </label>
            <div class="rounded-xl border border-dashed border-licorice/40 bg-paper p-3 text-xs">
              <div class="flex items-center gap-2">
                <i class="fa-solid fa-cube text-cherry text-base"></i>
                <input
                  type="file"
                  accept=".glb,.gltf,.obj,.dae,.skp"
                  class="flex-1 text-xs file:mr-2 file:rounded-lg file:border file:border-licorice file:bg-marshmallow file:px-2.5 file:py-1 file:text-xs file:font-bold file:text-licorice cursor-pointer"
                  @change="onPilihModel"
                />
              </div>
              <p v-if="namaModel" class="mt-1.5 font-bold text-licorice">
                <i class="fa-solid fa-circle-check text-apple mr-1"></i>File: {{ namaModel }}
              </p>
              <p class="mt-1 text-xs text-muted">Format: .glb, .gltf, .obj, atau .dae (ekspor SketchUp). Maksimal 50 MB.</p>
            </div>
          </div>

          <!-- Deskripsi -->
          <div>
            <label class="mb-1 block text-xs font-bold uppercase tracking-wider text-licorice">
              Deskripsi Dekorasi (Opsional)
            </label>
            <textarea
              v-model="form.deskripsi"
              rows="3"
              placeholder="Jelaskan karakteristik, warna dominan, bahan, atau rekomendasi peletakan venue..."
              class="ws-input text-xs"
            ></textarea>
          </div>

          <!-- Action Buttons -->
          <div class="mt-6 flex items-center justify-end gap-2.5 border-t border-dashed border-licorice/30 pt-4">
            <button
              type="button"
              class="ws-btn-paper px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
              @click="$emit('tutup')"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="menyimpan"
              class="ws-btn-cherry px-6 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm disabled:opacity-60"
            >
              <i v-if="menyimpan" class="fa-solid fa-circle-notch fa-spin mr-1.5"></i>
              <i v-else class="fa-solid fa-floppy-disk mr-1.5"></i>
              {{ menyimpan ? 'Menyimpan…' : (adalahEdit ? 'Simpan Perubahan' : 'Tambah Dekorasi') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
