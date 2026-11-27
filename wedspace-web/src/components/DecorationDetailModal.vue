<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'

const props = defineProps({
  tampil: { type: Boolean, default: false },
  dekorasi: { type: Object, default: null },
})

defineEmits(['tutup'])

const auth = useAuthStore()

function rupiah(n) {
  return 'Rp' + Number(n || 0).toLocaleString('id-ID')
}

const urlGambar = computed(() => {
  const d = props.dekorasi
  if (!d?.gambar) return ''
  let url = d.gambar.startsWith('http') ? d.gambar : `http://localhost:3000${d.gambar}`
  if (d.visibility === 'private' && auth?.token) {
    const sep = url.includes('?') ? '&' : '?'
    url += `${sep}token=${encodeURIComponent(auth.token)}`
  }
  return url
})

const adalahAsetPlatform = computed(() => {
  return props.dekorasi?.created_by_user_id === null || props.dekorasi?.kontributor === 'WedSpace'
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="tampil && dekorasi"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-licorice/55 p-4 backdrop-blur-[2px]"
      @click.self="$emit('tutup')"
    >
      <div class="ws-paper-card max-h-[90vh] w-full max-w-lg overflow-y-auto bg-marshmallow">
        <div class="checkerboard-trim border-b-2 border-licorice"></div>

        <!-- Image Header -->
        <div class="relative border-b-2 border-licorice bg-grid-paper">
          <img
            v-if="urlGambar"
            :src="urlGambar"
            :alt="dekorasi.nama_dekorasi"
            class="h-56 w-full object-cover"
          />
          <div
            v-else
            class="bg-stripes-pink flex h-48 items-center justify-center"
          >
            <span class="flex h-20 w-20 items-center justify-center rounded-full border-2 border-licorice bg-marshmallow font-heading text-4xl font-bold text-cherry shadow-[3px_3px_0px_#7F1125]">
              {{ (dekorasi.nama_dekorasi || '?').trim().charAt(0).toUpperCase() }}
            </span>
          </div>

          <!-- Category sticker -->
          <span class="ws-badge-sticker absolute bottom-3 left-4 bg-strawberry text-licorice">
            {{ dekorasi.kategori }}
          </span>

          <!-- Visibility badge -->
          <span
            v-if="dekorasi.visibility === 'public'"
            class="ws-badge-sticker absolute bottom-3 right-4 bg-apple/80 text-licorice"
          >
            <i class="fa-solid fa-globe mr-1 text-cherry"></i>Katalog Publik
          </span>
          <span
            v-else
            class="ws-badge-sticker absolute bottom-3 right-4 bg-violet/50 text-licorice"
          >
            <i class="fa-solid fa-lock mr-1"></i>Katalog Privat
          </span>
        </div>

        <div class="p-6">
          <!-- Title & Price -->
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="font-heading text-3xl font-bold text-licorice">{{ dekorasi.nama_dekorasi }}</h2>
              <!-- Contributor info -->
              <div class="mt-1.5 flex items-center gap-2">
                <span class="text-xs font-semibold text-muted">Kontributor:</span>
                <span
                  v-if="adalahAsetPlatform"
                  class="inline-flex items-center gap-1 rounded-full border border-licorice/40 bg-paper px-2.5 py-0.5 text-xs font-bold text-cherry"
                >
                  <i class="fa-solid fa-certificate text-[0.6875rem]"></i>WedSpace Platform
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1 rounded-full border border-licorice/40 bg-paper px-2.5 py-0.5 text-xs font-bold text-licorice"
                >
                  <i class="fa-solid fa-user-pen text-cherry text-[0.6875rem]"></i>{{ dekorasi.kontributor || 'Wedding Organizer' }}
                </span>
              </div>
            </div>

            <div class="text-right">
              <span class="ws-price-pill text-sm">{{ rupiah(dekorasi.harga) }}</span>
              <p class="mt-1 text-[0.6875rem] font-semibold uppercase text-muted">Harga Referensi</p>
            </div>
          </div>

          <!-- Dimension & Spec Details -->
          <div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div class="rounded-xl border border-licorice/40 bg-paper p-2.5 text-center">
              <span class="block text-[0.6875rem] font-bold uppercase tracking-wider text-muted">Dimensi</span>
              <span class="mt-0.5 font-bold text-licorice text-xs">
                {{ dekorasi.panjang }} × {{ dekorasi.lebar }} × {{ dekorasi.tinggi }} cm
              </span>
            </div>
            <div class="rounded-xl border border-licorice/40 bg-paper p-2.5 text-center">
              <span class="block text-[0.6875rem] font-bold uppercase tracking-wider text-muted">Visibilitas</span>
              <span class="mt-0.5 font-bold text-xs uppercase" :class="dekorasi.visibility === 'public' ? 'text-cherry' : 'text-licorice'">
                {{ dekorasi.visibility }}
              </span>
            </div>
            <div class="col-span-2 sm:col-span-1 rounded-xl border border-licorice/40 bg-paper p-2.5 text-center">
              <span class="block text-[0.6875rem] font-bold uppercase tracking-wider text-muted">Aset 3D</span>
              <span class="mt-0.5 font-bold text-xs" :class="dekorasi.model_3d ? 'text-apple font-bold' : 'text-muted'">
                {{ dekorasi.model_3d ? 'Tersedia' : 'Standar' }}
              </span>
            </div>
          </div>

          <!-- Description -->
          <div class="mt-4">
            <h3 class="text-xs font-bold uppercase tracking-wider text-licorice">Deskripsi</h3>
            <p class="mt-1 text-sm leading-relaxed text-licorice/80">
              {{ dekorasi.deskripsi || 'Tidak ada deskripsi tambahan untuk item dekorasi ini.' }}
            </p>
          </div>

          <!-- Venue Planning Usage Notice Banner -->
          <div class="mt-5 rounded-xl border-2 border-licorice/30 bg-violet/20 p-3.5 flex items-start gap-3">
            <i class="fa-solid fa-shapes text-cherry mt-0.5 text-base"></i>
            <div class="text-xs text-licorice/85 leading-relaxed">
              <strong class="font-bold">Dapat Digunakan pada Rancangan:</strong>
              Dekorasi ini tersedia untuk ditambahkan ke rancangan venue pernikahan Anda melalui Workspace 2D & Visualisasi 3D.
            </div>
          </div>

          <!-- Close Action -->
          <button
            type="button"
            class="ws-btn-cherry mt-6 w-full py-3 font-bold"
            @click="$emit('tutup')"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
