<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'

const props = defineProps({
  dekorasi: { type: Object, required: true },
  mode: { type: String, default: 'komunitas' }, // 'saya' | 'komunitas'
})

defineEmits(['detail', 'edit', 'hapus', 'toggle-visibility'])

const auth = useAuthStore()

function rupiah(n) {
  return 'Rp' + Number(n || 0).toLocaleString('id-ID')
}

function inisial(nama) {
  return (nama || '?').trim().charAt(0).toUpperCase()
}

const urlGambar = computed(() => {
  const d = props.dekorasi
  if (!d?.gambar) return ''
  let url = d.gambar.startsWith('http') ? d.gambar : `http://localhost:3000${d.gambar}`
  // Untuk file privat, tambahkan token autentikasi pemilik agar middleware media backend mengizinkan akses
  if (d.visibility === 'private' && auth?.token) {
    const sep = url.includes('?') ? '&' : '?'
    url += `${sep}token=${encodeURIComponent(auth.token)}`
  }
  return url
})

const adalahAsetPlatform = computed(() => {
  return props.dekorasi.created_by_user_id === null || props.dekorasi.kontributor === 'WedSpace'
})
</script>

<template>
  <article
    class="ws-paper-card ws-paper-card-hover flex flex-col justify-between overflow-hidden bg-paper transition-all"
    :class="{ 'opacity-70': !dekorasi.is_active }"
  >
    <!-- Preview Image Area -->
    <div class="relative block w-full overflow-hidden border-b-2 border-licorice">
      <button
        type="button"
        class="group relative block w-full text-left"
        @click="$emit('detail', dekorasi)"
      >
        <img
          v-if="urlGambar"
          :src="urlGambar"
          :alt="dekorasi.nama_dekorasi"
          class="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div
          v-else
          class="bg-stripes-pink flex h-40 items-center justify-center"
        >
          <span class="flex h-16 w-16 items-center justify-center rounded-full border-2 border-licorice bg-marshmallow font-heading text-3xl font-bold text-cherry shadow-[3px_3px_0px_#7F1125]">
            {{ inisial(dekorasi.nama_dekorasi) }}
          </span>
        </div>
      </button>

      <!-- Category Sticker -->
      <span class="ws-badge-sticker absolute left-3 top-3 bg-strawberry text-licorice">
        {{ dekorasi.kategori }}
      </span>

      <!-- Status Visibilitas Badge (Top Right) -->
      <div class="absolute right-3 top-3 flex flex-col items-end gap-1">
        <span
          v-if="dekorasi.visibility === 'public'"
          class="ws-badge-sticker bg-apple/70 text-licorice"
          title="Dapat dilihat dan digunakan seluruh WO"
        >
          <i class="fa-solid fa-globe mr-1 text-cherry"></i>Public
        </span>
        <span
          v-else
          class="ws-badge-sticker bg-violet/40 text-licorice"
          title="Hanya dapat dilihat dan digunakan oleh Anda"
        >
          <i class="fa-solid fa-lock mr-1 text-licorice/70"></i>Private
        </span>

        <span
          v-if="!dekorasi.is_active"
          class="rounded-full border border-licorice bg-marshmallow px-2 py-0.5 text-[0.6875rem] font-bold uppercase text-cherry shadow-sm"
        >
          Nonaktif
        </span>
      </div>
    </div>

    <!-- Content Area -->
    <div class="flex flex-1 flex-col justify-between p-4">
      <div>
        <!-- Mode Komunitas: Contributor Tag -->
        <div v-if="mode === 'komunitas'" class="mb-2 flex items-center justify-between gap-2">
          <span
            v-if="adalahAsetPlatform"
            class="inline-flex items-center gap-1 rounded-full border border-licorice/40 bg-marshmallow px-2.5 py-0.5 text-xs font-bold text-cherry"
          >
            <i class="fa-solid fa-certificate text-[0.6875rem]"></i>WedSpace Platform
          </span>
          <span
            v-else
            class="inline-flex items-center gap-1 text-xs font-semibold text-licorice/75 truncate"
            :title="dekorasi.kontributor"
          >
            <i class="fa-solid fa-user-pen text-cherry"></i>{{ dekorasi.kontributor || 'Kontributor' }}
          </span>

          <span class="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted">
            Komunitas
          </span>
        </div>

        <h2 class="font-heading text-xl font-bold leading-snug text-licorice line-clamp-1" :title="dekorasi.nama_dekorasi">
          {{ dekorasi.nama_dekorasi }}
        </h2>

        <p class="mt-1 text-xs font-medium text-muted">
          <i class="fa-solid fa-ruler-combined mr-1 text-licorice/60"></i>
          {{ dekorasi.panjang }} × {{ dekorasi.lebar }} × {{ dekorasi.tinggi }} cm
        </p>

        <p v-if="dekorasi.deskripsi" class="mt-2 line-clamp-2 text-xs text-licorice/70 leading-relaxed">
          {{ dekorasi.deskripsi }}
        </p>
      </div>

      <!-- Footer Info & Actions -->
      <div class="mt-3.5 border-t border-dashed border-licorice/30 pt-3">
        <!-- Price Pill -->
        <div class="flex items-center justify-between gap-2">
          <span class="text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
            {{ mode === 'komunitas' ? 'Harga Referensi' : 'Harga Estimasi' }}
          </span>
          <span class="ws-price-pill">{{ rupiah(dekorasi.harga) }}</span>
        </div>

        <!-- ACTIONS: Mode Katalog Saya -->
        <div v-if="mode === 'saya'" class="mt-3.5 space-y-2">
          <!-- Toggle Visibility Action -->
          <button
            type="button"
            class="flex w-full items-center justify-center gap-1.5 rounded-lg border border-licorice/40 px-3 py-1.5 text-xs font-bold transition-colors"
            :class="dekorasi.visibility === 'private'
              ? 'bg-apple/35 text-licorice hover:bg-apple/60'
              : 'bg-violet/35 text-licorice hover:bg-violet/60'"
            @click="$emit('toggle-visibility', dekorasi)"
          >
            <i :class="dekorasi.visibility === 'private' ? 'fa-solid fa-arrow-up-from-bracket' : 'fa-solid fa-lock'"></i>
            <span>{{ dekorasi.visibility === 'private' ? 'Bagikan ke Publik' : 'Tarik ke Private' }}</span>
          </button>

          <!-- Edit, Hapus, Detail Actions Grid -->
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              class="ws-btn-paper flex-1 py-1.5 text-xs font-bold"
              title="Lihat Detail Lengkap"
              @click="$emit('detail', dekorasi)"
            >
              <i class="fa-solid fa-eye mr-1"></i>Detail
            </button>
            <button
              type="button"
              class="ws-btn-paper flex-1 py-1.5 text-xs font-bold"
              title="Edit Informasi Dekorasi"
              @click="$emit('edit', dekorasi)"
            >
              <i class="fa-solid fa-pen mr-1"></i>Edit
            </button>
            <button
              type="button"
              class="ws-btn-paper !border-cherry !text-cherry hover:!bg-strawberry px-2.5 py-1.5 text-xs font-bold"
              title="Hapus / Nonaktifkan Dekorasi"
              @click="$emit('hapus', dekorasi)"
            >
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>

        <!-- ACTIONS: Mode Katalog Komunitas -->
        <div v-else class="mt-3">
          <button
            type="button"
            class="ws-btn-paper w-full py-2 text-xs uppercase tracking-wider font-bold"
            @click="$emit('detail', dekorasi)"
          >
            <i class="fa-solid fa-circle-info mr-1.5"></i>Lihat Detail
          </button>
        </div>
      </div>
    </div>
  </article>
</template>
