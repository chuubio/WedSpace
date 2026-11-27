<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({
  proyek: { type: Object, default: () => ({}) },
  rancangan: { type: Object, default: () => ({}) },
  isDirty: { type: Boolean, default: false },
  isSaving: { type: Boolean, default: false },
  zoom: { type: Number, default: 1.0 },
  gridVisible: { type: Boolean, default: true },
  snapToGrid: { type: Boolean, default: true },
  canUndo: { type: Boolean, default: false },
  canRedo: { type: Boolean, default: false },
  activeToolPanel: { type: String, default: null },
  noteCount: { type: Number, default: 0 },
  themeMode: { type: String, default: 'light' }, // 'light' | 'dark'
})

defineEmits([
  'simpan',
  'kembali',
  'undo',
  'redo',
  'zoom-in',
  'zoom-out',
  'zoom-reset',
  'zoom-fit',
  'toggle-grid',
  'toggle-snap',
  'toggle-tool-panel',
  'toggle-theme',
])

const zoomPersen = computed(() => `${Math.round(props.zoom * 100)}%`)
</script>

<template>
  <header class="pointer-events-none flex w-full items-center justify-between gap-2 xl:gap-3">
    <!-- 1. Kartu Kiri Atas Terpisah: Kembali, Nama Rancangan & Status Simpan (responsif: ikon saja di < md) -->
    <button
      type="button"
      class="pointer-events-auto group relative flex h-10 w-10 md:h-11 md:w-auto xl:h-12 md:max-w-[145px] lg:max-w-[175px] xl:max-w-[210px] flex-shrink-0 items-center justify-center md:justify-start gap-2 rounded-2xl border border-white/80 bg-[#F7F7F8]/95 md:px-2.5 xl:px-3 text-left shadow-[0_6px_22px_rgba(15,23,42,0.09)] ring-1 ring-slate-200/80 backdrop-blur-md hover:bg-white transition"
      :title="`Kembali ke Detail Proyek (${proyek?.nama_proyek || 'Proyek Venue'}) — ${isDirty ? 'Belum disimpan' : 'Tersimpan'}`"
      @click="$emit('kembali')"
    >
      <span class="relative flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl bg-white text-slate-700 shadow-2xs ring-1 ring-slate-200/80 group-hover:bg-red-50 group-hover:text-[#CF2C2F] transition">
        <i class="fa-solid fa-house text-[0.6875rem] xl:text-xs"></i>
        <span
          class="md:hidden absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-2 ring-[#F7F7F8]"
          :class="isDirty ? 'bg-[#CF2C2F]' : 'bg-emerald-500'"
        ></span>
      </span>
      <div class="hidden md:block min-w-0 leading-tight">
        <p class="truncate text-[0.6875rem] xl:text-xs font-semibold text-slate-900">
          {{ rancangan?.nama_rancangan || 'Workspace 2D' }}
        </p>
        <div class="mt-0.5 flex items-center gap-1">
          <span
            class="h-1.5 w-1.5 flex-shrink-0 rounded-full"
            :class="isDirty ? 'bg-[#CF2C2F]' : 'bg-emerald-500'"
          ></span>
          <span
            class="truncate text-[0.625rem] font-semibold"
            :class="isDirty ? 'text-[#CF2C2F]' : 'text-emerald-700'"
          >
            {{ isDirty ? 'Belum disimpan' : 'Tersimpan' }}
          </span>
        </div>
      </div>
    </button>

    <!-- 2. Floating Pill Toolbar Tengah: Alat 2D + Catatan + AI + Estimasi + Simpan + Switch Tema -->
    <div class="pointer-events-auto mx-auto flex h-10 md:h-11 xl:h-12 max-w-full min-w-0 items-center gap-0.5 xl:gap-1 overflow-x-auto overflow-y-hidden rounded-2xl md:rounded-full border border-white/80 bg-[#F7F7F8]/95 px-1.5 sm:px-2 xl:px-2.5 shadow-[0_6px_24px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80 backdrop-blur-md">
      <!-- Undo / Redo -->
      <button
        type="button"
        :disabled="!canUndo"
        class="flex h-7 w-7 xl:h-8 xl:w-8 flex-shrink-0 items-center justify-center rounded-full text-[0.6875rem] xl:text-xs text-slate-700 hover:bg-white disabled:opacity-35 transition"
        title="Urungkan (Ctrl+Z)"
        @click="$emit('undo')"
      >
        <i class="fa-solid fa-rotate-left"></i>
      </button>
      <button
        type="button"
        :disabled="!canRedo"
        class="flex h-7 w-7 xl:h-8 xl:w-8 flex-shrink-0 items-center justify-center rounded-full text-[0.6875rem] xl:text-xs text-slate-700 hover:bg-white disabled:opacity-35 transition"
        title="Ulangi (Ctrl+Y)"
        @click="$emit('redo')"
      >
        <i class="fa-solid fa-rotate-right"></i>
      </button>

      <div class="mx-0.5 h-4 w-px flex-shrink-0 bg-slate-300/80"></div>

      <!-- Zoom Controls -->
      <button
        type="button"
        class="flex h-7 w-7 xl:h-8 xl:w-8 flex-shrink-0 items-center justify-center rounded-xl text-[0.6875rem] xl:text-xs text-slate-700 hover:bg-white transition"
        title="Perkecil (Zoom Out)"
        @click="$emit('zoom-out')"
      >
        <i class="fa-solid fa-minus"></i>
      </button>
      <button
        type="button"
        class="h-7 xl:h-8 min-w-[40px] flex-shrink-0 rounded-xl px-1.5 text-[0.6875rem] xl:text-xs font-semibold text-slate-700 hover:bg-white transition"
        title="Reset Zoom ke 100%"
        @click="$emit('zoom-reset')"
      >
        {{ zoomPersen }}
      </button>
      <button
        type="button"
        class="flex h-7 w-7 xl:h-8 xl:w-8 flex-shrink-0 items-center justify-center rounded-xl text-[0.6875rem] xl:text-xs text-slate-700 hover:bg-white transition"
        title="Perbesar (Zoom In)"
        @click="$emit('zoom-in')"
      >
        <i class="fa-solid fa-plus"></i>
      </button>
      <button
        type="button"
        class="flex h-7 w-7 xl:h-8 xl:w-8 flex-shrink-0 items-center justify-center rounded-xl text-[0.6875rem] xl:text-xs text-slate-700 hover:bg-white transition"
        title="Paskan ke Layar (Fit to Screen)"
        @click="$emit('zoom-fit')"
      >
        <i class="fa-solid fa-expand"></i>
      </button>

      <div class="mx-0.5 h-4 w-px flex-shrink-0 bg-slate-300/80"></div>

      <!-- Grid & Snap -->
      <button
        type="button"
        class="flex h-7 w-7 xl:h-8 xl:w-8 flex-shrink-0 items-center justify-center rounded-xl text-[0.6875rem] xl:text-xs transition"
        :class="gridVisible ? 'bg-red-50 text-[#CF2C2F] ring-1 ring-red-200' : 'text-slate-500 hover:bg-white'"
        title="Tampilkan / Sembunyikan Grid"
        @click="$emit('toggle-grid')"
      >
        <i class="fa-solid fa-border-all"></i>
      </button>
      <button
        type="button"
        class="flex h-7 w-7 xl:h-8 xl:w-8 flex-shrink-0 items-center justify-center rounded-xl text-[0.6875rem] xl:text-xs transition"
        :class="snapToGrid ? 'bg-red-50 text-[#CF2C2F] ring-1 ring-red-200' : 'text-slate-500 hover:bg-white'"
        title="Snap to Grid (10 cm)"
        @click="$emit('toggle-snap')"
      >
        <i class="fa-solid fa-magnet"></i>
      </button>

      <!-- Switch 2D / 3D -->
      <span class="flex h-7 xl:h-8 flex-shrink-0 items-center justify-center rounded-xl bg-[#CF2C2F] px-1.5 xl:px-2 text-[0.6875rem] xl:text-xs font-semibold text-white">
        2D
      </span>
      <RouterLink
        v-if="rancangan?.id"
        :to="`/rancangan/${rancangan.id}/3d`"
        class="flex h-7 xl:h-8 flex-shrink-0 items-center justify-center rounded-xl px-1.5 xl:px-2 text-[0.6875rem] xl:text-xs font-semibold text-slate-600 hover:bg-white hover:text-slate-900 transition"
        title="Buka Workspace 3D"
      >
        3D
      </RouterLink>

      <div class="mx-0.5 h-4 w-px flex-shrink-0 bg-slate-300/80"></div>

      <!-- Catatan WO, Asisten AI, Estimasi, Simpan -->
      <button
        type="button"
        class="relative flex h-7 w-7 xl:h-8 xl:w-8 flex-shrink-0 items-center justify-center rounded-xl text-[0.6875rem] xl:text-xs transition"
        :class="activeToolPanel === 'notes' ? 'bg-red-50 text-[#CF2C2F] ring-1 ring-red-200' : 'text-slate-700 hover:bg-white'"
        title="Catatan WO"
        @click="$emit('toggle-tool-panel', 'notes')"
      >
        <i class="fa-solid fa-note-sticky"></i>
        <span
          v-if="noteCount > 0"
          class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#CF2C2F] px-1 text-[0.5625rem] font-bold text-white"
        >
          {{ noteCount }}
        </span>
      </button>

      <button
        type="button"
        class="flex h-7 w-7 xl:h-8 xl:w-8 flex-shrink-0 items-center justify-center rounded-xl text-[0.6875rem] xl:text-xs transition"
        :class="activeToolPanel === 'ai' ? 'bg-[#CF2C2F] text-white shadow-xs' : 'text-slate-700 hover:bg-white'"
        title="Asisten AI Workspace"
        @click="$emit('toggle-tool-panel', 'ai')"
      >
        <i class="fa-solid fa-wand-magic-sparkles"></i>
      </button>

      <RouterLink
        v-if="rancangan?.id"
        :to="`/rancangan/${rancangan.id}/estimasi`"
        class="flex h-7 xl:h-8 flex-shrink-0 items-center gap-1.5 rounded-xl px-1.5 xl:px-2 text-[0.6875rem] xl:text-xs font-medium text-slate-700 hover:bg-white hover:text-[#CF2C2F] transition"
        title="Lihat Estimasi Biaya"
      >
        <i class="fa-solid fa-receipt text-[#CF2C2F]"></i>
        <span class="hidden xl:inline">Estimasi</span>
      </RouterLink>

      <button
        type="button"
        :disabled="isSaving"
        class="ml-0.5 flex h-7 xl:h-8 flex-shrink-0 items-center gap-1.5 rounded-full bg-[#CF2C2F] px-2 lg:px-2.5 xl:px-3 text-[0.6875rem] xl:text-xs font-semibold text-white shadow-xs hover:bg-[#B82225] active:scale-[0.98] transition disabled:opacity-60"
        title="Simpan Rancangan 2D (Ctrl+S)"
        @click="$emit('simpan')"
      >
        <i v-if="isSaving" class="fa-solid fa-circle-notch fa-spin text-[0.6875rem] xl:text-xs"></i>
        <i v-else class="fa-solid fa-floppy-disk text-[0.6875rem] xl:text-xs"></i>
        <span class="hidden lg:inline">{{ isSaving ? 'Menyimpan…' : 'Simpan' }}</span>
      </button>

      <div class="mx-0.5 h-4 w-px flex-shrink-0 bg-slate-300/80"></div>

      <!-- Switch Mode Terang / Gelap (identik dengan Workspace 3D) -->
      <button
        type="button"
        role="switch"
        :aria-checked="themeMode === 'dark'"
        aria-label="Ganti Mode Terang atau Gelap"
        class="ws2d-theme-switch flex h-7 xl:h-8 flex-shrink-0 items-center gap-1 rounded-full px-1.5 transition hover:bg-white/70"
        :title="themeMode === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'"
        @click="$emit('toggle-theme')"
      >
        <i
          class="fa-regular fa-sun text-[0.6875rem] transition-colors"
          :class="themeMode === 'light' ? 'text-amber-500' : 'text-slate-500'"
        ></i>
        <span
          class="relative inline-flex h-4 w-7 items-center rounded-full transition-colors"
          :class="themeMode === 'dark' ? 'bg-[#CF2C2F]' : 'bg-slate-300'"
        >
          <span
            class="inline-block h-3 w-3 rounded-full bg-white shadow-xs transition-transform duration-200"
            :class="themeMode === 'dark' ? 'translate-x-3.5' : 'translate-x-0.5'"
          ></span>
        </span>
        <i
          class="fa-regular fa-moon text-[0.6875rem] transition-colors"
          :class="themeMode === 'dark' ? 'text-indigo-300' : 'text-slate-400'"
        ></i>
      </button>
    </div>

    <!-- Spacer kanan transparan agar pill toolbar seimbang di tengah pada layar ekstra lebar -->
    <div class="hidden 2xl:block w-[160px] flex-shrink-0"></div>
  </header>
</template>
