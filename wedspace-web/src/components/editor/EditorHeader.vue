<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({
  proyek: { type: Object, default: () => ({}) },
  rancangan: { type: Object, default: () => ({}) },
  isDirty: { type: Boolean, default: false },
  isSaving: { type: Boolean, default: false },
  sidebarKiriTerbuka: { type: Boolean, default: false },
  sidebarKananTerbuka: { type: Boolean, default: false },
})

defineEmits(['simpan', 'kembali', 'toggle-panel-kiri', 'toggle-panel-kanan'])

const ukuranVenueTeks = computed(() => {
  const p = props.proyek?.panjang_venue
  const l = props.proyek?.lebar_venue
  if (p && l) {
    return `${p}m × ${l}m`
  }
  return '-'
})
</script>

<template>
  <header class="scallop-bottom-pink relative z-30 border-b-2 border-licorice bg-strawberry px-3 py-2.5 sm:px-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <!-- Left: Back Button & Project / Design Info -->
      <div class="flex items-center gap-2.5 sm:gap-3.5">
        <button
          type="button"
          class="ws-btn-paper px-3 py-1.5 text-xs font-bold"
          title="Kembali ke Detail Proyek"
          @click="$emit('kembali')"
        >
          <i class="fa-solid fa-arrow-left sm:mr-1.5"></i>
          <span class="hidden sm:inline">Kembali</span>
        </button>

        <!-- Toggle Panel Dekorasi (Mobile/Tablet) -->
        <button
          type="button"
          class="ws-btn-paper px-2.5 py-1.5 text-xs font-bold lg:hidden"
          :class="{ '!bg-peach !border-licorice': sidebarKiriTerbuka }"
          title="Buka / Tutup Palet Dekorasi"
          @click="$emit('toggle-panel-kiri')"
        >
          <i class="fa-solid fa-boxes-stacked mr-1"></i>
          <span>Katalog</span>
        </button>

        <div>
          <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <h1 class="font-heading text-xl font-bold leading-none text-licorice sm:text-2xl">
              {{ rancangan?.nama_rancangan || 'Rancangan Layout 2D' }}
            </h1>
            <span class="ws-badge-sticker bg-peach text-[10px] sm:text-xs">
              {{ ukuranVenueTeks }}
            </span>
          </div>
          <p class="mt-0.5 text-[11px] font-medium text-licorice/75 truncate max-w-xs sm:max-w-md">
            {{ proyek?.nama_proyek || 'Proyek Venue' }} • {{ proyek?.nama_venue || 'Venue' }}
          </p>
        </div>
      </div>

      <!-- Center / Right: Save Status & Actions -->
      <div class="flex items-center gap-2">
        <!-- Status Simpan Badge -->
        <div class="hidden sm:flex items-center">
          <span
            v-if="isDirty"
            class="rounded-full border border-licorice/40 bg-peach px-2.5 py-1 text-[11px] font-bold text-cherry shadow-sm flex items-center gap-1.5"
            title="Ada perubahan yang belum disimpan"
          >
            <span class="h-2 w-2 rounded-full bg-cherry animate-pulse"></span>
            Belum Disimpan
          </span>
          <span
            v-else
            class="rounded-full border border-licorice/40 bg-apple/70 px-2.5 py-1 text-[11px] font-bold text-licorice shadow-sm flex items-center gap-1.5"
            title="Seluruh perubahan tersimpan di database"
          >
            <i class="fa-solid fa-circle-check text-apple text-[10px]"></i>
            Tersimpan
          </span>
        </div>

        <!-- Tombol Simpan -->
        <button
          type="button"
          :disabled="isSaving"
          class="ws-btn-cherry px-4 py-2 text-xs font-bold uppercase tracking-wider shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60"
          :class="{ 'ring-2 ring-cherry ring-offset-1': isDirty }"
          @click="$emit('simpan')"
        >
          <i v-if="isSaving" class="fa-solid fa-circle-notch fa-spin mr-1.5"></i>
          <i v-else class="fa-solid fa-floppy-disk mr-1.5"></i>
          <span>{{ isSaving ? 'Menyimpan…' : 'Simpan' }}</span>
        </button>

        <!-- Toggle Properties Panel (Mobile/Tablet) -->
        <button
          type="button"
          class="ws-btn-paper px-2.5 py-1.5 text-xs font-bold lg:hidden"
          :class="{ '!bg-violet !border-licorice': sidebarKananTerbuka }"
          title="Buka / Tutup Panel Properti"
          @click="$emit('toggle-panel-kanan')"
        >
          <i class="fa-solid fa-sliders mr-1"></i>
          <span>Properti</span>
        </button>

        <!-- Shortcut Links to Estimasi & 3D -->
        <div class="hidden md:flex items-center gap-1.5 border-l border-licorice/25 pl-2">
          <RouterLink
            v-if="rancangan?.id"
            :to="`/rancangan/${rancangan.id}/estimasi`"
            class="ws-btn-paper px-3 py-1.5 text-xs font-semibold"
            title="Lihat Estimasi Biaya Rancangan"
          >
            <i class="fa-solid fa-receipt mr-1 text-cherry"></i>Estimasi
          </RouterLink>
          <RouterLink
            v-if="rancangan?.id"
            :to="`/rancangan/${rancangan.id}/3d`"
            class="ws-btn-paper px-3 py-1.5 text-xs font-semibold"
            title="Buka Visualisasi 3D"
          >
            <i class="fa-solid fa-cube mr-1 text-violet"></i>3D
          </RouterLink>
        </div>
      </div>
    </div>
  </header>
</template>
