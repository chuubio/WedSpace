<script setup>
import { computed } from 'vue'

const props = defineProps({
  zoom: { type: Number, default: 1.0 },
  gridVisible: { type: Boolean, default: true },
  snapToGrid: { type: Boolean, default: true },
  itemCount: { type: Number, default: 0 },
})

defineEmits(['zoom-in', 'zoom-out', 'zoom-fit', 'zoom-reset', 'toggle-grid', 'toggle-snap'])

const zoomPersen = computed(() => `${Math.round(props.zoom * 100)}%`)
</script>

<template>
  <div class="ws-paper-card flex flex-wrap items-center justify-between gap-2 bg-marshmallow/95 px-3 py-1.5 border border-licorice shadow-sm text-xs">
    <!-- Left: Zoom & View Controls -->
    <div class="flex items-center gap-1.5">
      <span class="text-[10px] font-bold uppercase tracking-wider text-muted hidden sm:inline mr-1">
        Tampilan:
      </span>

      <!-- Zoom Out -->
      <button
        type="button"
        class="flex h-7 w-7 items-center justify-center rounded-lg border border-licorice bg-paper font-bold text-licorice hover:bg-strawberry active:scale-95 transition-all shadow-[1px_1px_0px_#7F1125]"
        title="Perkecil Tampilan (Zoom Out)"
        @click="$emit('zoom-out')"
      >
        <i class="fa-solid fa-minus text-[10px]"></i>
      </button>

      <!-- Zoom Badge -->
      <button
        type="button"
        class="min-w-[48px] rounded-lg border border-licorice/40 bg-paper px-2 py-1 text-center font-heading font-bold text-licorice hover:border-licorice transition-all text-xs"
        title="Klik untuk Reset Zoom (100%)"
        @click="$emit('zoom-reset')"
      >
        {{ zoomPersen }}
      </button>

      <!-- Zoom In -->
      <button
        type="button"
        class="flex h-7 w-7 items-center justify-center rounded-lg border border-licorice bg-paper font-bold text-licorice hover:bg-strawberry active:scale-95 transition-all shadow-[1px_1px_0px_#7F1125]"
        title="Perbesar Tampilan (Zoom In)"
        @click="$emit('zoom-in')"
      >
        <i class="fa-solid fa-plus text-[10px]"></i>
      </button>

      <!-- Fit to Venue -->
      <button
        type="button"
        class="rounded-lg border border-licorice/40 bg-paper px-2 py-1 font-semibold text-licorice hover:border-licorice hover:bg-paper transition-all text-[11px] flex items-center gap-1"
        title="Paskan Denah ke Layar (Fit View)"
        @click="$emit('zoom-fit')"
      >
        <i class="fa-solid fa-expand text-[10px] text-cherry"></i>
        <span class="hidden md:inline">Fit</span>
      </button>
    </div>

    <!-- Right: Grid, Snap, & Item Counter -->
    <div class="flex items-center gap-2">
      <!-- Toggle Grid -->
      <button
        type="button"
        class="rounded-lg border px-2 py-1 font-semibold transition-all text-[11px] flex items-center gap-1.5"
        :class="gridVisible
          ? 'border-licorice bg-strawberry/60 text-licorice font-bold shadow-[1px_1px_0px_#7F1125]'
          : 'border-licorice/30 bg-paper text-muted hover:border-licorice/60'"
        title="Tampilkan / Sembunyikan Garis Grid 1 Meter"
        @click="$emit('toggle-grid')"
      >
        <i class="fa-solid fa-border-all text-[10px]"></i>
        <span>Grid: {{ gridVisible ? 'On' : 'Off' }}</span>
      </button>

      <!-- Toggle Snap to Grid -->
      <button
        type="button"
        class="rounded-lg border px-2 py-1 font-semibold transition-all text-[11px] flex items-center gap-1.5"
        :class="snapToGrid
          ? 'border-licorice bg-apple/50 text-licorice font-bold shadow-[1px_1px_0px_#7F1125]'
          : 'border-licorice/30 bg-paper text-muted hover:border-licorice/60'"
        title="Ratakan Posisi Otomatis ke Titik Grid 10cm"
        @click="$emit('toggle-snap')"
      >
        <i class="fa-solid fa-magnet text-[10px] text-cherry"></i>
        <span>Snap: {{ snapToGrid ? 'On' : 'Off' }}</span>
      </button>

      <!-- Item Counter Pill -->
      <div class="hidden sm:flex items-center gap-1 rounded-full border border-licorice/30 bg-paper px-2.5 py-0.5 text-[11px] font-bold text-licorice">
        <span class="text-cherry">{{ itemCount }}</span>
        <span class="text-muted">Item di Canvas</span>
      </div>
    </div>
  </div>
</template>
