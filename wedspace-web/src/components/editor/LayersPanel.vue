<script setup>
const props = defineProps({
  items: { type: Array, default: () => [] },
  selectedIds: { type: Array, default: () => [] },
  hiddenIds: { type: Array, default: () => [] },
  lockedIds: { type: Array, default: () => [] },
})

const emit = defineEmits([
  'select',
  'toggle-hide',
  'toggle-lock',
  'reorder',
])

function isSelected(id) {
  return props.selectedIds.includes(id)
}

function isHidden(id) {
  return props.hiddenIds.includes(id)
}

function isLocked(id) {
  return props.lockedIds.includes(id)
}

function ikonKategori(kategori) {
  const k = String(kategori || '').toLowerCase()
  if (k.includes('pelaminan') || k.includes('backdrop')) return 'fa-archway'
  if (k.includes('meja') || k.includes('buffet')) return 'fa-table'
  if (k.includes('kursi') || k.includes('sofa')) return 'fa-chair'
  if (k.includes('bunga') || k.includes('flower')) return 'fa-spa'
  if (k.includes('lampu') || k.includes('lighting')) return 'fa-lightbulb'
  if (k.includes('photobooth')) return 'fa-camera-retro'
  if (k.includes('karpet')) return 'fa-rug'
  return 'fa-cube'
}
</script>

<template>
  <div class="max-h-52 overflow-y-auto p-1.5 space-y-0.5 text-xs">
    <div v-if="items.length === 0" class="py-4 px-3 text-center text-xs text-slate-400">
      Belum ada objek di kanvas. Klik atau seret aset dari panel kiri.
    </div>

    <div
      v-for="(item, idx) in items"
      :key="item.id"
      class="group flex items-center justify-between gap-1.5 rounded-lg px-2 py-1.5 text-xs transition-colors cursor-pointer"
      :class="isSelected(item.id)
        ? 'bg-red-50 text-[#7F1125] font-semibold'
        : 'text-slate-700 hover:bg-slate-50'"
      @click="emit('select', { item, multi: $event.shiftKey })"
    >
      <div class="flex items-center gap-2 min-w-0 flex-1">
        <i :class="['fa-solid text-[0.6875rem] flex-shrink-0 text-[#CF2C2F]', ikonKategori(item.Decoration?.kategori)]"></i>
        <div class="min-w-0 flex-1">
          <p class="truncate text-xs leading-tight" :class="{ 'line-through opacity-50': isHidden(item.id) }">
            {{ item.Decoration?.nama_dekorasi || 'Dekorasi' }}
            <span v-if="item.jumlah > 1" class="ml-1 font-semibold text-[#CF2C2F]">×{{ item.jumlah }}</span>
          </p>
        </div>
      </div>

      <!-- Layer Controls -->
      <div class="flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
        <button
          type="button"
          class="flex h-5 w-5 items-center justify-center rounded text-[0.625rem] hover:bg-white/80 disabled:opacity-25"
          :disabled="idx === 0"
          title="Turunkan urutan"
          @click.stop="emit('reorder', { index: idx, direction: -1 })"
        >
          <i class="fa-solid fa-chevron-up"></i>
        </button>
        <button
          type="button"
          class="flex h-5 w-5 items-center justify-center rounded text-[0.625rem] hover:bg-white/80 disabled:opacity-25"
          :disabled="idx === items.length - 1"
          title="Naikkan urutan"
          @click.stop="emit('reorder', { index: idx, direction: 1 })"
        >
          <i class="fa-solid fa-chevron-down"></i>
        </button>
        <button
          type="button"
          class="flex h-5 w-5 items-center justify-center rounded text-[0.6875rem] hover:bg-white/80"
          :class="isHidden(item.id) ? 'text-slate-400' : 'text-slate-500'"
          :title="isHidden(item.id) ? 'Tampilkan objek' : 'Sembunyikan objek'"
          @click.stop="emit('toggle-hide', item.id)"
        >
          <i :class="['fa-solid', isHidden(item.id) ? 'fa-eye-slash' : 'fa-eye']"></i>
        </button>
        <button
          type="button"
          class="flex h-5 w-5 items-center justify-center rounded text-[0.6875rem] hover:bg-white/80"
          :class="isLocked(item.id) ? 'text-[#CF2C2F]' : 'text-slate-300'"
          :title="isLocked(item.id) ? 'Buka kunci posisi' : 'Kunci posisi objek'"
          @click.stop="emit('toggle-lock', item.id)"
        >
          <i :class="['fa-solid', isLocked(item.id) ? 'fa-lock' : 'fa-lock-open']"></i>
        </button>
      </div>
    </div>
  </div>
</template>
