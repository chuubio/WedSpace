<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  elements: { type: Array, default: () => [] },
  selectedRef: { type: Object, default: null }, // { kind: 'item'|'element', id }
  proyek: { type: Object, default: () => ({}) },
  venueW: { type: Number, default: 15 },
  venueD: { type: Number, default: 10 },
  updatingVenue: { type: Boolean, default: false },
})

const emit = defineEmits([
  'select',
  'update-item',
  'update-element',
  'update-venue-size',
  'apply-all-walls',
  'snap-floor',
  'mirror-item',
  'duplicate-selected',
  'delete-selected',
  'toggle-visibility',
  'toggle-lock',
  'tutup',
])

const editVenueW = ref(props.venueW)
const editVenueD = ref(props.venueD)

watch(() => props.venueW, (v) => { editVenueW.value = v })
watch(() => props.venueD, (v) => { editVenueD.value = v })

function submitVenueSize() {
  const w = Math.max(2, Math.min(200, Number(editVenueW.value) || props.venueW))
  const d = Math.max(2, Math.min(200, Number(editVenueD.value) || props.venueD))
  editVenueW.value = w
  editVenueD.value = d
  emit('update-venue-size', { panjang_venue: w, lebar_venue: d })
}

const lockScale = ref(true)
const openSections = ref({
  venue: false,
  layers: true,
  properties: true,
  shortcuts: false,
})

const selectedItem = computed(() => {
  if (props.selectedRef?.kind !== 'item') return null
  return props.items.find((i) => String(i.id) === String(props.selectedRef.id)) || null
})

const selectedElement = computed(() => {
  if (props.selectedRef?.kind !== 'element') return null
  return props.elements.find((e) => String(e.id) === String(props.selectedRef.id)) || null
})

const walls = computed(() => props.elements.filter((e) => e.element_type === 'wall'))
const openings = computed(() => props.elements.filter((e) => ['door', 'window'].includes(e.element_type)))
const ceilings = computed(() => props.elements.filter((e) => e.element_type === 'ceiling'))
const primitives = computed(() => props.elements.filter((e) => e.element_type === 'primitive'))

const wallTextures = [
  { id: 'none', label: 'Polos' },
  { id: 'plaster', label: 'Plester' },
  { id: 'brick', label: 'Bata' },
  { id: 'wood', label: 'Kayu' },
  { id: 'marble', label: 'Marmer' },
]

function isSel(kind, id) {
  return props.selectedRef?.kind === kind && String(props.selectedRef?.id) === String(id)
}

function updateWallGeo(patch) {
  if (!selectedElement.value) return
  emit('update-element', {
    id: selectedElement.value.id,
    geometry_data: { ...(selectedElement.value.geometry_data || {}), ...patch },
  })
}

function updateElementMat(patch) {
  if (!selectedElement.value) return
  emit('update-element', {
    id: selectedElement.value.id,
    material_data: { ...(selectedElement.value.material_data || {}), ...patch },
  })
}

function updateItemTransform(patch) {
  if (!selectedItem.value) return
  const cur = selectedItem.value.transform_3d || { elevationY: 0, rotX: 0, rotZ: 0, scaleX: 1, scaleY: 1, scaleZ: 1 }
  emit('update-item', {
    id: selectedItem.value.id,
    transform_3d: { ...cur, ...patch },
  })
}

function onScaleChange(axis, val) {
  const v = Math.max(0.1, Math.min(10, Number(val) || 1))
  if (lockScale.value) {
    updateItemTransform({ scaleX: v, scaleY: v, scaleZ: v })
  } else {
    updateItemTransform({ [axis]: v })
  }
}
</script>

<template>
  <aside class="flex h-full flex-col overflow-hidden rounded-2xl border border-white/80 bg-[#F7F7F8]/95 shadow-[0_8px_28px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80 backdrop-blur-md">
    <!-- Header Panel Kanan (bergaya referensi: ikon + Properti + tombol tutup panah) -->
    <div class="flex items-center justify-between border-b border-slate-200/80 px-3.5 py-2.5">
      <div class="flex items-center gap-2 min-w-0">
        <i class="fa-solid fa-sliders text-xs text-[#CF2C2F]"></i>
        <span class="text-sm font-semibold text-slate-900">Properti</span>
        <span class="rounded-full bg-white px-2 py-0.5 text-[0.6875rem] font-semibold text-slate-600 ring-1 ring-slate-200/80">
          {{ items.length + elements.length }}
        </span>
      </div>
      <button
        type="button"
        class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-white hover:text-[#CF2C2F] transition"
        title="Tutup Panel Kanan"
        aria-label="Tutup Panel Kanan"
        @click="$emit('tutup')"
      >
        <i class="fa-solid fa-chevron-right text-xs"></i>
      </button>
    </div>

    <!-- Konten Accordion Section Cards (seperti referensi) -->
    <div class="flex-1 overflow-y-auto p-2.5 space-y-2.5 text-xs">
      <!-- 1. DIMENSI VENUE -->
      <div class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <button
          type="button"
          class="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-slate-50/70 transition"
          @click="openSections.venue = !openSections.venue"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <i class="fa-regular fa-map text-xs"></i>
            </span>
            <span class="truncate text-[0.6875rem] font-bold uppercase tracking-wider text-slate-700">Dimensi Venue</span>
          </div>
          <i :class="['fa-solid text-[0.625rem] text-slate-400 transition-transform', openSections.venue ? 'fa-chevron-down' : 'fa-chevron-right']"></i>
        </button>
        <div v-show="openSections.venue" class="border-t border-slate-100 px-3 py-2.5 space-y-2.5 bg-slate-50/40">
          <div>
            <p class="font-semibold text-slate-800">{{ proyek?.nama_venue || 'Venue 3D' }}</p>
            <p class="text-[0.6875rem] text-slate-500">Saat ini: <strong class="text-slate-700">{{ venueW }}m × {{ venueD }}m</strong></p>
          </div>
          <form class="space-y-2" @submit.prevent="submitVenueSize">
            <div class="grid grid-cols-2 gap-1.5">
              <label class="block">
                <span class="text-[0.625rem] font-medium text-slate-500">Panjang (m)</span>
                <input
                  v-model.number="editVenueW"
                  type="number"
                  min="2"
                  max="200"
                  step="0.5"
                  class="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold"
                />
              </label>
              <label class="block">
                <span class="text-[0.625rem] font-medium text-slate-500">Lebar (m)</span>
                <input
                  v-model.number="editVenueD"
                  type="number"
                  min="2"
                  max="200"
                  step="0.5"
                  class="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold"
                />
              </label>
            </div>
            <button
              type="submit"
              :disabled="updatingVenue"
              class="w-full rounded-lg bg-[#CF2C2F] py-1.5 text-[0.6875rem] font-semibold text-white hover:bg-[#B82225] transition disabled:opacity-60"
            >
              {{ updatingVenue ? 'Menyimpan…' : 'Terapkan Ukuran Venue' }}
            </button>
          </form>
        </div>
      </div>

      <!-- 2. LAPISAN (DAFTAR OBJEK) -->
      <div class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <button
          type="button"
          class="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-slate-50/70 transition"
          @click="openSections.layers = !openSections.layers"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-red-50 text-[#CF2C2F]">
              <i class="fa-solid fa-layer-group text-xs"></i>
            </span>
            <span class="truncate text-[0.6875rem] font-bold uppercase tracking-wider text-slate-700">Lapisan ({{ items.length + elements.length }})</span>
          </div>
          <i :class="['fa-solid text-[0.625rem] text-slate-400 transition-transform', openSections.layers ? 'fa-chevron-down' : 'fa-chevron-right']"></i>
        </button>

        <div v-show="openSections.layers" class="max-h-52 overflow-y-auto border-t border-slate-100 p-1.5 space-y-2 text-xs">
        <!-- Tembok -->
        <div v-if="walls.length">
          <p class="px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider text-slate-400">Tembok ({{ walls.length }})</p>
          <div
            v-for="w in walls"
            :key="`lw-${w.id}`"
            class="flex items-center justify-between rounded-lg px-2 py-1 cursor-pointer transition"
            :class="isSel('element', w.id) ? 'bg-red-50 text-[#7F1125] font-semibold' : 'text-slate-700 hover:bg-slate-50'"
            @click="$emit('select', { kind: 'element', id: w.id })"
          >
            <span class="truncate flex items-center gap-1.5">
              <i class="fa-solid fa-trowel-bricks text-[0.6875rem] text-[#CF2C2F]"></i>
              <span :class="{ 'line-through opacity-50': w.is_visible === false }">{{ w.name }}</span>
            </span>
            <div class="flex items-center gap-1">
              <button type="button" class="p-0.5 text-[0.6875rem]" title="Tampilkan / Sembunyikan" @click.stop="$emit('toggle-visibility', { kind: 'element', id: w.id })">
                <i :class="['fa-solid', w.is_visible === false ? 'fa-eye-slash text-slate-400' : 'fa-eye text-slate-500']"></i>
              </button>
              <button type="button" class="p-0.5 text-[0.6875rem]" title="Kunci / Buka Kunci" @click.stop="$emit('toggle-lock', { kind: 'element', id: w.id })">
                <i :class="['fa-solid', w.is_locked ? 'fa-lock text-[#CF2C2F]' : 'fa-lock-open text-slate-300']"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Pintu & Jendela -->
        <div v-if="openings.length">
          <p class="px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider text-slate-400">Pintu & Jendela ({{ openings.length }})</p>
          <div
            v-for="op in openings"
            :key="`lo-${op.id}`"
            class="flex items-center justify-between rounded-lg px-2 py-1 cursor-pointer transition"
            :class="isSel('element', op.id) ? 'bg-red-50 text-[#7F1125] font-semibold' : 'text-slate-700 hover:bg-slate-50'"
            @click="$emit('select', { kind: 'element', id: op.id })"
          >
            <span class="truncate flex items-center gap-1.5">
              <i :class="['fa-solid text-[0.6875rem] text-[#CF2C2F]', op.element_type === 'door' ? 'fa-door-open' : 'fa-window-maximize']"></i>
              <span>{{ op.name }}</span>
            </span>
            <button type="button" class="p-0.5 text-[0.6875rem]" @click.stop="$emit('toggle-visibility', { kind: 'element', id: op.id })">
              <i :class="['fa-solid', op.is_visible === false ? 'fa-eye-slash text-slate-400' : 'fa-eye text-slate-500']"></i>
            </button>
          </div>
        </div>

        <!-- Plafon & Bentuk Dasar -->
        <div v-if="ceilings.length || primitives.length">
          <p class="px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider text-slate-400">Plafon & Bentuk Dasar</p>
          <div
            v-for="el in [...ceilings, ...primitives]"
            :key="`lp-${el.id}`"
            class="flex items-center justify-between rounded-lg px-2 py-1 cursor-pointer transition"
            :class="isSel('element', el.id) ? 'bg-red-50 text-[#7F1125] font-semibold' : 'text-slate-700 hover:bg-slate-50'"
            @click="$emit('select', { kind: 'element', id: el.id })"
          >
            <span class="truncate flex items-center gap-1.5">
              <i class="fa-solid fa-cube text-[0.6875rem] text-slate-500"></i>
              <span :class="{ 'line-through opacity-50': el.is_visible === false }">{{ el.name }}</span>
            </span>
            <button type="button" class="p-0.5 text-[0.6875rem]" @click.stop="$emit('toggle-visibility', { kind: 'element', id: el.id })">
              <i :class="['fa-solid', el.is_visible === false ? 'fa-eye-slash text-slate-400' : 'fa-eye text-slate-500']"></i>
            </button>
          </div>
        </div>

        <!-- Dekorasi -->
        <div v-if="items.length">
          <p class="px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider text-slate-400">Dekorasi ({{ items.length }})</p>
          <div
            v-for="it in items"
            :key="`li-${it.id}`"
            class="flex items-center justify-between rounded-lg px-2 py-1 cursor-pointer transition"
            :class="isSel('item', it.id) ? 'bg-red-50 text-[#7F1125] font-semibold' : 'text-slate-700 hover:bg-slate-50'"
            @click="$emit('select', { kind: 'item', id: it.id })"
          >
            <span class="truncate flex items-center gap-1.5">
              <i class="fa-solid fa-spa text-[0.6875rem] text-[#CF2C2F]"></i>
              <span :class="{ 'line-through opacity-50': it.transform_3d?.isVisible === false }">{{ it.Decoration?.nama_dekorasi || 'Dekorasi' }}</span>
            </span>
            <div class="flex items-center gap-1">
              <button type="button" class="p-0.5 text-[0.6875rem]" @click.stop="$emit('toggle-visibility', { kind: 'item', id: it.id })">
                <i :class="['fa-solid', it.transform_3d?.isVisible === false ? 'fa-eye-slash text-slate-400' : 'fa-eye text-slate-500']"></i>
              </button>
              <button type="button" class="p-0.5 text-[0.6875rem]" @click.stop="$emit('toggle-lock', { kind: 'item', id: it.id })">
                <i :class="['fa-solid', it.transform_3d?.isLocked ? 'fa-lock text-[#CF2C2F]' : 'fa-lock-open text-slate-300']"></i>
              </button>
            </div>
          </div>
        </div>

        <p v-if="!items.length && !elements.length" class="py-4 text-center text-slate-400">
          Belum ada objek. Gambar tembok atau tambahkan aset.
        </p>
      </div>
    </div>

      <!-- 3. PROPERTI OBJEK -->
      <div class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <button
          type="button"
          class="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-slate-50/70 transition"
          @click="openSections.properties = !openSections.properties"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <i class="fa-solid fa-cube text-xs"></i>
            </span>
            <span class="truncate text-[0.6875rem] font-bold uppercase tracking-wider text-slate-700">Properti Objek</span>
          </div>
          <i :class="['fa-solid text-[0.625rem] text-slate-400 transition-transform', openSections.properties ? 'fa-chevron-down' : 'fa-chevron-right']"></i>
        </button>

        <div v-show="openSections.properties" class="border-t border-slate-100 p-3 space-y-3 text-xs">
      <!-- A. PROPERTI TEMBOK -->
      <template v-if="selectedElement && selectedElement.element_type === 'wall'">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-800">Properti Tembok</span>
          <span class="rounded bg-red-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-[#CF2C2F]">
            {{ Number(selectedElement.geometry_data?.length || 0).toFixed(2) }} m
          </span>
        </div>

        <label class="block">
          <span class="text-[0.6875rem] font-medium text-slate-500">Nama Tembok</span>
          <input
            type="text"
            :value="selectedElement.name"
            class="mt-0.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold focus:border-[#CF2C2F] focus:bg-white focus:outline-none"
            @change="$emit('update-element', { id: selectedElement.id, name: $event.target.value })"
          />
        </label>

        <!-- Tinggi Tembok -->
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-slate-600">Tinggi Tembok (m)</span>
            <input
              type="number"
              min="0.5"
              max="10"
              step="0.1"
              :value="Number(selectedElement.geometry_data?.height || 3).toFixed(2)"
              class="w-16 rounded border border-slate-200 px-1.5 py-0.5 text-right text-xs font-semibold"
              @change="updateWallGeo({ height: Math.max(0.5, Math.min(10, Number($event.target.value))) })"
            />
          </div>
          <input
            type="range"
            min="0.5"
            max="8"
            step="0.1"
            :value="Number(selectedElement.geometry_data?.height || 3)"
            class="w-full accent-[#CF2C2F]"
            @input="updateWallGeo({ height: Number($event.target.value) })"
          />
        </div>

        <!-- Ketebalan Tembok -->
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-slate-600">Ketebalan (m)</span>
            <input
              type="number"
              min="0.05"
              max="1"
              step="0.05"
              :value="Number(selectedElement.geometry_data?.thickness || 0.15).toFixed(2)"
              class="w-16 rounded border border-slate-200 px-1.5 py-0.5 text-right text-xs font-semibold"
              @change="updateWallGeo({ thickness: Math.max(0.05, Math.min(1, Number($event.target.value))) })"
            />
          </div>
          <input
            type="range"
            min="0.05"
            max="0.6"
            step="0.01"
            :value="Number(selectedElement.geometry_data?.thickness || 0.15)"
            class="w-full accent-[#CF2C2F]"
            @input="updateWallGeo({ thickness: Number($event.target.value) })"
          />
        </div>

        <!-- Material & Warna Tembok -->
        <div class="space-y-2 border-t border-slate-100 pt-2.5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-slate-600">Warna Tembok</span>
            <input
              type="color"
              :value="selectedElement.material_data?.color || '#F3EFEA'"
              class="h-7 w-10 cursor-pointer rounded border border-slate-200"
              @input="updateElementMat({ color: $event.target.value })"
            />
          </div>

          <div class="grid grid-cols-3 gap-1">
            <button
              v-for="t in wallTextures"
              :key="t.id"
              type="button"
              class="rounded-lg border py-1 text-[0.6875rem] font-medium transition"
              :class="(selectedElement.material_data?.texturePreset || 'none') === t.id ? 'border-[#CF2C2F] bg-red-50 text-[#CF2C2F] font-semibold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'"
              @click="updateElementMat({ texturePreset: t.id })"
            >
              {{ t.label }}
            </button>
          </div>

          <button
            type="button"
            class="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-[#CF2C2F] transition"
            @click="$emit('apply-all-walls', selectedElement)"
          >
            Terapkan ke Semua Tembok
          </button>
        </div>

        <button type="button" class="w-full rounded-lg border border-red-200 bg-red-50 py-2 text-xs font-semibold text-[#CF2C2F] hover:bg-red-100 transition" @click="$emit('delete-selected')">
          <i class="fa-solid fa-trash-can mr-1.5"></i>Hapus Ruas Tembok
        </button>
      </template>

      <!-- B. PROPERTI PINTU / JENDELA -->
      <template v-else-if="selectedElement && ['door', 'window'].includes(selectedElement.element_type)">
        <p class="text-xs font-semibold text-slate-800">
          Properti {{ selectedElement.element_type === 'door' ? 'Pintu' : 'Jendela' }}
        </p>

        <div class="grid grid-cols-2 gap-2">
          <label class="block">
            <span class="text-[0.6875rem] text-slate-500">Lebar (m)</span>
            <input
              type="number"
              min="0.4"
              max="4"
              step="0.1"
              :value="Number(selectedElement.geometry_data?.width || 1.1).toFixed(2)"
              class="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold"
              @change="updateWallGeo({ width: Math.max(0.4, Number($event.target.value)) })"
            />
          </label>
          <label class="block">
            <span class="text-[0.6875rem] text-slate-500">Tinggi (m)</span>
            <input
              type="number"
              min="0.5"
              max="3.5"
              step="0.1"
              :value="Number(selectedElement.geometry_data?.height || 2.15).toFixed(2)"
              class="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold"
              @change="updateWallGeo({ height: Math.max(0.5, Number($event.target.value)) })"
            />
          </label>
        </div>

        <label class="block">
          <div class="flex justify-between text-xs text-slate-600 mb-1">
            <span>Posisi pada Tembok</span>
            <span class="font-mono">{{ Math.round(Number(selectedElement.geometry_data?.offsetRatio ?? 0.5) * 100) }}%</span>
          </div>
          <input
            type="range"
            min="0.15"
            max="0.85"
            step="0.02"
            :value="Number(selectedElement.geometry_data?.offsetRatio ?? 0.5)"
            class="w-full accent-[#CF2C2F]"
            @input="updateWallGeo({ offsetRatio: Number($event.target.value) })"
          />
        </label>

        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-600">Warna</span>
          <input
            type="color"
            :value="selectedElement.material_data?.color || '#7F1125'"
            class="h-7 w-10 cursor-pointer rounded border border-slate-200"
            @input="updateElementMat({ color: $event.target.value })"
          />
        </div>

        <button type="button" class="w-full rounded-lg border border-red-200 bg-red-50 py-2 text-xs font-semibold text-[#CF2C2F] hover:bg-red-100 transition" @click="$emit('delete-selected')">
          <i class="fa-solid fa-trash-can mr-1.5"></i>Hapus {{ selectedElement.element_type === 'door' ? 'Pintu' : 'Jendela' }}
        </button>
      </template>

      <!-- C. PROPERTI BENTUK DASAR / PLAFON -->
      <template v-else-if="selectedElement">
        <p class="text-xs font-semibold text-slate-800">{{ selectedElement.name }}</p>

        <div class="grid grid-cols-3 gap-1.5">
          <label class="block">
            <span class="text-[0.6875rem] text-slate-500">Lebar (m)</span>
            <input type="number" min="0.1" step="0.1" :value="Number(selectedElement.geometry_data?.width || 1)" class="mt-0.5 w-full rounded border border-slate-200 px-1.5 py-1 text-xs font-semibold" @change="updateWallGeo({ width: Math.max(0.1, Number($event.target.value)) })" />
          </label>
          <label class="block">
            <span class="text-[0.6875rem] text-slate-500">Tinggi (m)</span>
            <input type="number" min="0.05" step="0.1" :value="Number(selectedElement.geometry_data?.height || 1)" class="mt-0.5 w-full rounded border border-slate-200 px-1.5 py-1 text-xs font-semibold" @change="updateWallGeo({ height: Math.max(0.05, Number($event.target.value)) })" />
          </label>
          <label class="block">
            <span class="text-[0.6875rem] text-slate-500">Dalam (m)</span>
            <input type="number" min="0.1" step="0.1" :value="Number(selectedElement.geometry_data?.depth || 1)" class="mt-0.5 w-full rounded border border-slate-200 px-1.5 py-1 text-xs font-semibold" @change="updateWallGeo({ depth: Math.max(0.1, Number($event.target.value)) })" />
          </label>
        </div>

        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-600">Warna Material</span>
          <input type="color" :value="selectedElement.material_data?.color || '#E9D8C8'" class="h-7 w-10 cursor-pointer rounded border border-slate-200" @input="updateElementMat({ color: $event.target.value })" />
        </div>

        <button type="button" class="w-full rounded-lg border border-red-200 bg-red-50 py-2 text-xs font-semibold text-[#CF2C2F] hover:bg-red-100 transition" @click="$emit('delete-selected')">
          <i class="fa-solid fa-trash-can mr-1.5"></i>Hapus Elemen
        </button>
      </template>

      <!-- D. PROPERTI DEKORASI (TERSINKRON DENGAN 2D) -->
      <template v-else-if="selectedItem">
        <div>
          <p class="text-xs font-semibold text-slate-900">{{ selectedItem.Decoration?.nama_dekorasi }}</p>
          <p class="text-[0.6875rem] text-slate-500">{{ selectedItem.Decoration?.kategori }} • {{ selectedItem.Decoration?.panjang }}×{{ selectedItem.Decoration?.lebar }}×{{ selectedItem.Decoration?.tinggi }} cm</p>
        </div>

        <div class="space-y-1.5 border-t border-slate-100 pt-2.5">
          <div class="flex items-center justify-between gap-1.5">
            <p class="text-[0.6875rem] font-semibold uppercase text-slate-400">Posisi (Sinkron 2D)</p>
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-[0.6875rem] text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-[#CF2C2F] transition"
                title="Putar ke Kiri (-90°)"
                aria-label="Putar ke Kiri"
                @click="$emit('update-item', { id: selectedItem.id, rotasi: (((Math.round(selectedItem.rotasi || 0) - 90) % 360) + 360) % 360 })"
              >
                <i class="fa-solid fa-rotate-left"></i>
              </button>
              <button
                type="button"
                class="flex h-6 w-6 items-center justify-center rounded-md border text-[0.6875rem] transition"
                :class="selectedItem.transform_3d?.mirrorX ? 'border-[#CF2C2F] bg-red-50 text-[#CF2C2F]' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-[#CF2C2F]'"
                title="Cermin X"
                aria-label="Cermin X"
                @click="$emit('mirror-item', 'x')"
              >
                <i class="fa-solid fa-left-right"></i>
              </button>
              <button
                type="button"
                class="flex h-6 w-6 items-center justify-center rounded-md border text-[0.6875rem] transition"
                :class="selectedItem.transform_3d?.mirrorZ ? 'border-[#CF2C2F] bg-red-50 text-[#CF2C2F]' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-[#CF2C2F]'"
                title="Cermin Y"
                aria-label="Cermin Y"
                @click="$emit('mirror-item', 'z')"
              >
                <i class="fa-solid fa-up-down"></i>
              </button>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-1.5">
            <label class="block">
              <span class="text-[0.625rem] text-slate-500">X (cm)</span>
              <input type="number" step="10" :value="Math.round(selectedItem.posisi_x)" class="mt-0.5 w-full rounded border border-slate-200 px-1.5 py-1 text-xs font-semibold" @change="$emit('update-item', { id: selectedItem.id, posisi_x: Number($event.target.value) })" />
            </label>
            <label class="block">
              <span class="text-[0.625rem] text-slate-500">Tinggi Y (m)</span>
              <input type="number" step="0.1" :value="Number(selectedItem.transform_3d?.elevationY || 0).toFixed(2)" class="mt-0.5 w-full rounded border border-slate-200 px-1.5 py-1 text-xs font-semibold" @change="updateItemTransform({ elevationY: Number($event.target.value) })" />
            </label>
            <label class="block">
              <span class="text-[0.625rem] text-slate-500">Z (cm)</span>
              <input type="number" step="10" :value="Math.round(selectedItem.posisi_y)" class="mt-0.5 w-full rounded border border-slate-200 px-1.5 py-1 text-xs font-semibold" @change="$emit('update-item', { id: selectedItem.id, posisi_y: Number($event.target.value) })" />
            </label>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2.5">
          <label class="block">
            <span class="text-[0.6875rem] text-slate-500">Rotasi (°)</span>
            <input type="number" step="5" :value="Math.round(selectedItem.rotasi || 0)" class="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-xs font-semibold" @change="$emit('update-item', { id: selectedItem.id, rotasi: ((Math.round(Number($event.target.value)) % 360) + 360) % 360 })" />
          </label>
          <label class="block">
            <span class="text-[0.6875rem] text-slate-500">Jumlah Unit</span>
            <input type="number" min="1" :value="selectedItem.jumlah || 1" class="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-xs font-semibold" @change="$emit('update-item', { id: selectedItem.id, jumlah: Math.max(1, parseInt($event.target.value, 10) || 1) })" />
          </label>
        </div>

        <div class="space-y-1.5 border-t border-slate-100 pt-2.5">
          <div class="flex items-center justify-between">
            <span class="text-[0.6875rem] font-semibold uppercase text-slate-400">Skala 3D</span>
            <label class="flex items-center gap-1 text-[0.6875rem] text-slate-600 cursor-pointer">
              <input v-model="lockScale" type="checkbox" class="accent-[#CF2C2F]" />
              <span>Kunci Rasio</span>
            </label>
          </div>
          <div class="grid grid-cols-3 gap-1.5">
            <input type="number" min="0.1" max="10" step="0.1" :value="Number(selectedItem.transform_3d?.scaleX || 1).toFixed(1)" class="w-full rounded border border-slate-200 px-1.5 py-1 text-center text-xs font-semibold" @change="onScaleChange('scaleX', $event.target.value)" />
            <input type="number" min="0.1" max="10" step="0.1" :value="Number(selectedItem.transform_3d?.scaleY || 1).toFixed(1)" class="w-full rounded border border-slate-200 px-1.5 py-1 text-center text-xs font-semibold" @change="onScaleChange('scaleY', $event.target.value)" />
            <input type="number" min="0.1" max="10" step="0.1" :value="Number(selectedItem.transform_3d?.scaleZ || 1).toFixed(1)" class="w-full rounded border border-slate-200 px-1.5 py-1 text-center text-xs font-semibold" @change="onScaleChange('scaleZ', $event.target.value)" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-1.5 border-t border-slate-100 pt-2.5">
          <button type="button" class="rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-[#CF2C2F] transition" title="Tempel ke Lantai (S)" @click="$emit('snap-floor')">
            Tempel Lantai
          </button>
          <button type="button" class="rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition" title="Duplikasi (Ctrl+D)" @click="$emit('duplicate-selected')">
            <i class="fa-regular fa-copy mr-1 text-[#CF2C2F]"></i>Duplikasi
          </button>
          <button type="button" class="col-span-2 rounded-lg border border-red-200 bg-red-50 py-1.5 text-xs font-semibold text-[#CF2C2F] hover:bg-red-100 transition" title="Hapus (Delete)" @click="$emit('delete-selected')">
            <i class="fa-solid fa-trash-can mr-1"></i>Hapus
          </button>
        </div>
      </template>

      <!-- E. INFO SAAT TIDAK ADA SELEKSI -->
      <template v-else>
        <p class="py-2 text-center text-xs text-slate-400">
          Klik objek di workspace atau daftar lapisan untuk mengubah propertinya.
        </p>
      </template>
        </div>
      </div>

      <!-- 4. PINTASAN KEYBOARD -->
      <div class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <button
          type="button"
          class="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-slate-50/70 transition"
          @click="openSections.shortcuts = !openSections.shortcuts"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <i class="fa-regular fa-keyboard text-xs"></i>
            </span>
            <span class="truncate text-[0.6875rem] font-bold uppercase tracking-wider text-slate-700">Pintasan Keyboard</span>
          </div>
          <i :class="['fa-solid text-[0.625rem] text-slate-400 transition-transform', openSections.shortcuts ? 'fa-chevron-down' : 'fa-chevron-right']"></i>
        </button>
        <div v-show="openSections.shortcuts" class="border-t border-slate-100 px-3 py-2.5 text-[0.6875rem] text-slate-500 space-y-1 bg-slate-50/40">
          <div class="flex justify-between"><span>Pindah / Putar / Skala</span><span class="font-mono text-slate-700">W / E / R</span></div>
          <div class="flex justify-between"><span>Tempel ke Lantai</span><span class="font-mono text-slate-700">S</span></div>
          <div class="flex justify-between"><span>Urungkan / Ulangi</span><span class="font-mono text-slate-700">Ctrl+Z / Ctrl+Y</span></div>
          <div class="flex justify-between"><span>Duplikasi / Simpan</span><span class="font-mono text-slate-700">Ctrl+D / Ctrl+S</span></div>
          <div class="flex justify-between"><span>Selesai Tembok</span><span class="font-mono text-slate-700">Enter / Klik 2×</span></div>
        </div>
      </div>
    </div>
  </aside>
</template>
