<script setup>
import { RouterLink } from 'vue-router'

defineProps({
  proyek: { type: Object, default: () => ({}) },
  rancangan: { type: Object, default: () => ({}) },
  activeTool: { type: String, default: 'select' }, // 'select'|'hand'|'translate'|'rotate'|'scale'|'wall'|'door'|'window'
  canUndo: { type: Boolean, default: false },
  canRedo: { type: Boolean, default: false },
  isDirty: { type: Boolean, default: false },
  isSaving: { type: Boolean, default: false },
  showGrid: { type: Boolean, default: true },
  activeViewPreset: { type: String, default: 'perspective' },
  noteCount: { type: Number, default: 0 },
  activeRightDrawer: { type: String, default: null }, // null | 'notes' | 'ai'
  leftOpen: { type: Boolean, default: true },
  themeMode: { type: String, default: 'light' }, // 'light' | 'dark'
})

defineEmits([
  'kembali',
  'simpan',
  'undo',
  'redo',
  'set-tool',
  'toggle-top-view',
  'reset-camera',
  'toggle-grid',
  'toggle-left',
  'toggle-right',
  'toggle-drawer',
  'toggle-theme',
])
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
          {{ rancangan?.nama_rancangan || 'Workspace 3D' }}
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

    <!-- 2. Floating Pill Toolbar Tengah: Alat Studio 3D + Catatan + AI + Estimasi + Simpan -->
    <div class="pointer-events-auto mx-auto flex h-10 md:h-11 xl:h-12 max-w-full min-w-0 items-center gap-0.5 xl:gap-1 overflow-x-auto overflow-y-hidden rounded-2xl md:rounded-full border border-white/80 bg-[#F7F7F8]/95 px-1.5 sm:px-2 xl:px-2.5 shadow-[0_6px_24px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80 backdrop-blur-md">
      <!-- Urungkan / Ulangi -->
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

      <!-- Alat Pilih, Geser Kamera, Pindah, Putar, Skala -->
      <button
        type="button"
        class="flex h-7 w-7 xl:h-8 xl:w-8 flex-shrink-0 items-center justify-center rounded-xl text-[0.6875rem] xl:text-xs transition"
        :class="activeTool === 'select' ? 'bg-[#CF2C2F] text-white shadow-xs' : 'text-slate-700 hover:bg-white'"
        title="Pilih Objek (Esc)"
        @click="$emit('set-tool', 'select')"
      >
        <i class="fa-solid fa-arrow-pointer"></i>
      </button>
      <button
        type="button"
        class="flex h-7 w-7 xl:h-8 xl:w-8 flex-shrink-0 items-center justify-center rounded-xl text-[0.6875rem] xl:text-xs transition"
        :class="activeTool === 'hand' ? 'bg-[#CF2C2F] text-white shadow-xs' : 'text-slate-700 hover:bg-white'"
        title="Geser Kamera"
        @click="$emit('set-tool', 'hand')"
      >
        <i class="fa-solid fa-hand"></i>
      </button>
      <button
        type="button"
        class="flex h-7 w-7 xl:h-8 xl:w-8 flex-shrink-0 items-center justify-center rounded-xl text-[0.6875rem] xl:text-xs transition"
        :class="activeTool === 'translate' ? 'bg-[#CF2C2F] text-white shadow-xs' : 'text-slate-700 hover:bg-white'"
        title="Pindah Objek (W)"
        @click="$emit('set-tool', 'translate')"
      >
        <i class="fa-solid fa-arrows-up-down-left-right"></i>
      </button>
      <button
        type="button"
        class="flex h-7 w-7 xl:h-8 xl:w-8 flex-shrink-0 items-center justify-center rounded-xl text-[0.6875rem] xl:text-xs transition"
        :class="activeTool === 'rotate' ? 'bg-[#CF2C2F] text-white shadow-xs' : 'text-slate-700 hover:bg-white'"
        title="Putar Objek (E)"
        @click="$emit('set-tool', 'rotate')"
      >
        <i class="fa-solid fa-rotate"></i>
      </button>
      <button
        type="button"
        class="flex h-7 w-7 xl:h-8 xl:w-8 flex-shrink-0 items-center justify-center rounded-xl text-[0.6875rem] xl:text-xs transition"
        :class="activeTool === 'scale' ? 'bg-[#CF2C2F] text-white shadow-xs' : 'text-slate-700 hover:bg-white'"
        title="Skala Objek (R)"
        @click="$emit('set-tool', 'scale')"
      >
        <i class="fa-solid fa-up-right-and-down-left-from-center"></i>
      </button>

      <div class="mx-0.5 h-4 w-px flex-shrink-0 bg-slate-300/80"></div>

      <!-- Alat Konstruksi: Tembok, Pintu, Jendela -->
      <button
        type="button"
        class="flex h-7 w-7 xl:h-8 xl:w-8 flex-shrink-0 items-center justify-center rounded-xl text-[0.6875rem] xl:text-xs transition"
        :class="activeTool === 'wall' ? 'bg-[#CF2C2F] text-white shadow-xs' : 'text-slate-700 hover:bg-white'"
        title="Gambar Tembok di Lantai (Enter / Klik Ganda selesai)"
        @click="$emit('set-tool', activeTool === 'wall' ? 'select' : 'wall')"
      >
        <i class="fa-solid fa-pen-ruler"></i>
      </button>
      <button
        type="button"
        class="flex h-7 w-7 xl:h-8 xl:w-8 flex-shrink-0 items-center justify-center rounded-xl text-[0.6875rem] xl:text-xs transition"
        :class="activeTool === 'door' ? 'bg-[#CF2C2F] text-white shadow-xs' : 'text-slate-700 hover:bg-white'"
        title="Pasang Pintu pada Tembok"
        @click="$emit('set-tool', activeTool === 'door' ? 'select' : 'door')"
      >
        <i class="fa-solid fa-door-open"></i>
      </button>
      <button
        type="button"
        class="flex h-7 w-7 xl:h-8 xl:w-8 flex-shrink-0 items-center justify-center rounded-xl text-[0.6875rem] xl:text-xs transition"
        :class="activeTool === 'window' ? 'bg-[#CF2C2F] text-white shadow-xs' : 'text-slate-700 hover:bg-white'"
        title="Pasang Jendela pada Tembok"
        @click="$emit('set-tool', activeTool === 'window' ? 'select' : 'window')"
      >
        <i class="fa-solid fa-window-maximize"></i>
      </button>

      <div class="mx-0.5 h-4 w-px flex-shrink-0 bg-slate-300/80"></div>

      <!-- Kamera & Grid -->
      <button
        type="button"
        class="flex h-7 xl:h-8 flex-shrink-0 items-center justify-center rounded-xl px-1.5 xl:px-2 text-[0.6875rem] xl:text-xs font-semibold transition"
        :class="activeViewPreset === 'top' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-700 hover:bg-white'"
        title="Tampak Atas / Kembali ke Perspektif"
        @click="$emit('toggle-top-view')"
      >
        Atas
      </button>
      <button
        type="button"
        class="flex h-7 w-7 xl:h-8 xl:w-8 flex-shrink-0 items-center justify-center rounded-xl text-[0.6875rem] xl:text-xs text-slate-700 hover:bg-white transition"
        title="Kembalikan Sudut Pandang Awal"
        @click="$emit('reset-camera')"
      >
        <i class="fa-solid fa-crosshairs"></i>
      </button>
      <button
        type="button"
        class="flex h-7 w-7 xl:h-8 xl:w-8 flex-shrink-0 items-center justify-center rounded-xl text-[0.6875rem] xl:text-xs transition"
        :class="showGrid ? 'bg-red-50 text-[#CF2C2F] ring-1 ring-red-200' : 'text-slate-500 hover:bg-white'"
        title="Tampilkan / Sembunyikan Grid"
        @click="$emit('toggle-grid')"
      >
        <i class="fa-solid fa-border-all"></i>
      </button>

      <!-- Switch 2D / 3D -->
      <RouterLink
        v-if="rancangan?.id"
        :to="`/rancangan/${rancangan.id}/editor`"
        class="flex h-7 xl:h-8 flex-shrink-0 items-center justify-center rounded-xl px-1.5 xl:px-2 text-[0.6875rem] xl:text-xs font-semibold text-slate-600 hover:bg-white hover:text-slate-900 transition"
        title="Buka Workspace 2D"
      >
        2D
      </RouterLink>
      <span class="flex h-7 xl:h-8 flex-shrink-0 items-center justify-center rounded-xl bg-[#CF2C2F] px-1.5 xl:px-2 text-[0.6875rem] xl:text-xs font-semibold text-white">
        3D
      </span>

      <div class="mx-0.5 h-4 w-px flex-shrink-0 bg-slate-300/80"></div>

      <!-- Catatan WO, Asisten AI, Estimasi, Simpan -->
      <button
        type="button"
        class="relative flex h-7 w-7 xl:h-8 xl:w-8 flex-shrink-0 items-center justify-center rounded-xl text-[0.6875rem] xl:text-xs transition"
        :class="activeRightDrawer === 'notes' ? 'bg-red-50 text-[#CF2C2F] ring-1 ring-red-200' : 'text-slate-700 hover:bg-white'"
        title="Catatan WO"
        @click="$emit('toggle-drawer', 'notes')"
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
        :class="activeRightDrawer === 'ai' ? 'bg-[#CF2C2F] text-white shadow-xs' : 'text-slate-700 hover:bg-white'"
        title="Asisten AI Workspace"
        @click="$emit('toggle-drawer', 'ai')"
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
        title="Simpan Rancangan 3D (Ctrl+S)"
        @click="$emit('simpan')"
      >
        <i v-if="isSaving" class="fa-solid fa-circle-notch fa-spin text-[0.6875rem] xl:text-xs"></i>
        <i v-else class="fa-solid fa-floppy-disk text-[0.6875rem] xl:text-xs"></i>
        <span class="hidden lg:inline">{{ isSaving ? 'Menyimpan…' : 'Simpan' }}</span>
      </button>

      <div class="mx-0.5 h-4 w-px flex-shrink-0 bg-slate-300/80"></div>

      <!-- Switch Mode Terang / Gelap (seperti referensi di ujung kanan bar atas) -->
      <button
        type="button"
        role="switch"
        :aria-checked="themeMode === 'dark'"
        aria-label="Ganti Mode Terang atau Gelap"
        class="ws3d-theme-switch flex h-7 xl:h-8 flex-shrink-0 items-center gap-1 rounded-full px-1.5 transition hover:bg-white/70"
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

    <!-- Spacer kanan transparan agar pill toolbar selalu seimbang di tengah pada layar ekstra lebar -->
    <div class="hidden 2xl:block w-[160px] flex-shrink-0"></div>
  </header>
</template>
