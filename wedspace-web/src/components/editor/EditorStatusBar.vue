<script setup>
import { computed } from 'vue'

const props = defineProps({
  panjangVenue: { type: Number, default: 0 },
  lebarVenue: { type: Number, default: 0 },
  zoom: { type: Number, default: 1 },
  gridVisible: { type: Boolean, default: true },
  snapToGrid: { type: Boolean, default: true },
  selectedItem: { type: Object, default: null },
  selectedCount: { type: Number, default: 0 },
  itemCount: { type: Number, default: 0 },
  isDirty: { type: Boolean, default: false },
  isSaving: { type: Boolean, default: false },
})

const zoomPersen = computed(() => `${Math.round(props.zoom * 100)}%`)
</script>

<template>
  <footer class="pointer-events-none absolute inset-x-3.5 bottom-3 z-20 flex justify-center">
    <div class="pointer-events-auto flex max-w-full items-center gap-2.5 sm:gap-3 rounded-full border border-slate-200/80 bg-white/90 px-3.5 py-1.5 text-[0.6875rem] text-slate-600 shadow-[0_4px_16px_rgba(15,23,42,0.07)] backdrop-blur-md select-none">
      <span class="font-semibold text-slate-700 whitespace-nowrap">Venue {{ panjangVenue }}m × {{ lebarVenue }}m</span>
      <span class="hidden sm:inline text-slate-300">•</span>
      <span class="hidden sm:inline whitespace-nowrap">{{ itemCount }} dekorasi</span>

      <template v-if="selectedCount > 1">
        <span class="hidden md:inline text-slate-300">•</span>
        <span class="hidden md:inline font-semibold text-[#CF2C2F] whitespace-nowrap">{{ selectedCount }} dipilih</span>
      </template>
      <template v-else-if="selectedItem">
        <span class="hidden md:inline text-slate-300">•</span>
        <span class="hidden md:inline font-mono text-slate-500 whitespace-nowrap">
          X:{{ Math.round(selectedItem.posisi_x) }} Y:{{ Math.round(selectedItem.posisi_y) }} • {{ Math.round(selectedItem.rotasi || 0) }}°
        </span>
      </template>
      <template v-else>
        <span class="hidden lg:inline text-slate-300">•</span>
        <span class="hidden lg:inline text-slate-400 whitespace-nowrap">Seret aset ke kanvas • Shift+Klik multi-pilih • Scroll Zoom</span>
      </template>

      <span class="text-slate-300">•</span>
      <span class="font-mono font-semibold text-slate-700 whitespace-nowrap">{{ zoomPersen }}</span>
    </div>
  </footer>
</template>
