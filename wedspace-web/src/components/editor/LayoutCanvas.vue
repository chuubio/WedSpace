<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { clampPosisiItem, normalisasiRotasi } from '../../utils/layoutBounds'
import {
  hasGlbModel,
  renderAsset2DFrontThumbnail,
  loadAsset2DFrontThumbnail,
} from '../../utils/workspace3d/AssetThumbnail'

const props = defineProps({
  panjangVenue: { type: Number, required: true }, // meter (X)
  lebarVenue: { type: Number, required: true },   // meter (Y)
  namaVenue: { type: String, default: '' },
  items: { type: Array, default: () => [] },
  notes: { type: Array, default: () => [] },
  selectedItemIds: { type: Array, default: () => [] },
  hiddenItemIds: { type: Array, default: () => [] },
  lockedItemIds: { type: Array, default: () => [] },
  zoom: { type: Number, default: 1.0 },
  gridVisible: { type: Boolean, default: true },
  snapToGrid: { type: Boolean, default: true },
})

const emit = defineEmits([
  'select-items',
  'update-items',
  'interaction-start',
  'drop-decoration',
  'delete-selected',
  'wheel-zoom',
  'open-notes',
])

const auth = useAuthStore()

// Dimensi fisik venue dalam centimeter
const venueWidthCm = computed(() => Math.max(1, (props.panjangVenue || 1) * 100))
const venueHeightCm = computed(() => Math.max(1, (props.lebarVenue || 1) * 100))

// Meter ticks untuk penggaris horizontal & vertikal
const rulerTicksX = computed(() => {
  const maxM = Math.ceil(props.panjangVenue || 1)
  const step = maxM > 20 ? 2 : 1
  const arr = []
  for (let m = 0; m <= maxM; m += step) arr.push(m)
  return arr
})

const rulerTicksY = computed(() => {
  const maxM = Math.ceil(props.lebarVenue || 1)
  const step = maxM > 16 ? 2 : 1
  const arr = []
  for (let m = 0; m <= maxM; m += step) arr.push(m)
  return arr
})

const visibleItems = computed(() =>
  props.items.filter((i) => !props.hiddenItemIds.includes(i.id))
)

// Viewport container ref
const containerRef = ref(null)
const containerWidth = ref(800)
const containerHeight = ref(600)

// Pan / Viewport offset in pixels
const panX = ref(0)
const panY = ref(0)
const isPanning = ref(false)
const panStart = ref({ x: 0, y: 0 })

// Base scale: pixels per centimeter agar venue pas di area tengah di antara panel floating
const baseScale = computed(() => {
  const padX = containerWidth.value >= 1280 ? 640 : containerWidth.value >= 1024 ? 580 : 120
  const padY = 196
  const maxW = Math.max(220, containerWidth.value - padX)
  const maxH = Math.max(180, containerHeight.value - padY)
  const scaleX = maxW / venueWidthCm.value
  const scaleY = maxH / venueHeightCm.value
  return Math.min(scaleX, scaleY, 1.2)
})

const pxPerCm = computed(() => baseScale.value * props.zoom)
const venueWidthPx = computed(() => venueWidthCm.value * pxPerCm.value)
const venueHeightPx = computed(() => venueHeightCm.value * pxPerCm.value)

// Dragging item(s) state
const isDraggingItem = ref(false)
const dragAnchorItem = ref(null)
const dragStartVenueCm = ref({ x: 0, y: 0 })
const dragInitialPositions = ref([]) // [{ id, posisi_x, posisi_y, w, h, rotasi }]
const hasRecordedHistory = ref(false)

// Rotating item state
const isRotatingItem = ref(false)
const rotateTarget = ref(null)
const rotateCenter = ref({ x: 0, y: 0 })

// Alignment guides state (cm)
const alignmentGuides = ref({ x: [], y: [] })

// Active pointer tracking
const activePointerId = ref(null)
const activeCaptureTarget = ref(null)
let resizeObserver = null

function updateContainerSize() {
  if (containerRef.value) {
    containerWidth.value = containerRef.value.clientWidth || 800
    containerHeight.value = containerRef.value.clientHeight || 600
  }
}

function isSelected(id) {
  return props.selectedItemIds.includes(id)
}

function isLocked(id) {
  return props.lockedItemIds.includes(id)
}

const gagalMuatGambar = ref({})
const front2DThumbs = ref({})

watch(
  () => props.items,
  (list) => {
    for (const item of list || []) {
      const d = item?.Decoration
      if (!d?.id || front2DThumbs.value[d.id] || !hasGlbModel(d)) continue
      loadAsset2DFrontThumbnail(d, auth.token).then((url) => {
        if (url) {
          front2DThumbs.value = { ...front2DThumbs.value, [d.id]: url }
        }
      })
    }
  },
  { immediate: true, deep: true }
)

function urlGambar(d) {
  if (!d) return ''
  // 1. Jika aset khusus unggahan 2D (punya gambar dan bukan model GLB), tampilkan gambar aslinya
  if (d.gambar && !hasGlbModel(d) && !gagalMuatGambar.value[`img_${d.id}`]) {
    let url = d.gambar.startsWith('http') ? d.gambar : `http://localhost:3000${d.gambar}`
    if (d.visibility === 'private' && auth?.token) {
      url += `${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(auth.token)}`
    }
    return url
  }
  // 2. Render tampak depan lurus (ortografis, latar transparan) khusus Workspace 2D
  if (front2DThumbs.value[d.id]) {
    return front2DThumbs.value[d.id]
  }
  return renderAsset2DFrontThumbnail(d) || ''
}

function onGambarError(d) {
  if (!d) return
  if (d.gambar && !gagalMuatGambar.value[`img_${d.id}`]) {
    gagalMuatGambar.value = { ...gagalMuatGambar.value, [`img_${d.id}`]: true }
  }
}

function snap(val, step = 10) {
  if (!props.snapToGrid) return Math.round(val)
  return Math.round(val / step) * step
}

function eventToVenueCm(clientX, clientY) {
  if (!containerRef.value) return { x: 0, y: 0 }
  const rect = containerRef.value.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2 + panX.value
  const centerY = rect.top + rect.height / 2 + panY.value
  const venueLeft = centerX - venueWidthPx.value / 2
  const venueTop = centerY - venueHeightPx.value / 2
  return {
    x: (clientX - venueLeft) / pxPerCm.value,
    y: (clientY - venueTop) / pxPerCm.value,
  }
}

// Mouse Wheel Zoom
function onWheel(e) {
  const delta = e.deltaY < 0 ? 0.1 : -0.1
  emit('wheel-zoom', delta)
}

// Hitung Smart Alignment Guides saat drag 1 objek
function hitungAlignmentGuides(movingId, x, y, w, h) {
  const threshold = 8 // cm
  const guidesX = []
  const guidesY = []
  let snappedX = x
  let snappedY = y

  const myPointsX = [x, x + w / 2, x + w]
  const myPointsY = [y, y + h / 2, y + h]

  // Referensi garis tengah venue
  const targetX = [venueWidthCm.value / 2]
  const targetY = [venueHeightCm.value / 2]

  for (const other of visibleItems.value) {
    if (other.id === movingId) continue
    const ow = Number(other.Decoration?.panjang || 100)
    const oh = Number(other.Decoration?.lebar || 100)
    targetX.push(other.posisi_x, other.posisi_x + ow / 2, other.posisi_x + ow)
    targetY.push(other.posisi_y, other.posisi_y + oh / 2, other.posisi_y + oh)
  }

  for (const tx of targetX) {
    for (let i = 0; i < myPointsX.length; i++) {
      const diff = tx - myPointsX[i]
      if (Math.abs(diff) <= threshold) {
        snappedX = x + diff
        guidesX.push(tx)
        break
      }
    }
    if (guidesX.length > 0) break
  }

  for (const ty of targetY) {
    for (let i = 0; i < myPointsY.length; i++) {
      const diff = ty - myPointsY[i]
      if (Math.abs(diff) <= threshold) {
        snappedY = y + diff
        guidesY.push(ty)
        break
      }
    }
    if (guidesY.length > 0) break
  }

  alignmentGuides.value = { x: guidesX, y: guidesY }
  return { x: snappedX, y: snappedY }
}

// Canvas Pointer Down (Deselect + Pan)
function onCanvasPointerDown(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  if (activePointerId.value !== null) return
  if (e.target.closest('.interactive-item')) return

  emit('select-items', [])
  isPanning.value = true
  activePointerId.value = e.pointerId
  activeCaptureTarget.value = e.currentTarget || null
  panStart.value = { x: e.clientX - panX.value, y: e.clientY - panY.value }

  try {
    e.currentTarget?.setPointerCapture?.(e.pointerId)
  } catch (err) {}
}

// Item Pointer Down (Select / Multi-select + Drag)
function onItemPointerDown(e, item) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  if (activePointerId.value !== null) return
  e.stopPropagation()

  let nextSelected = [...props.selectedItemIds]
  if (e.shiftKey) {
    if (nextSelected.includes(item.id)) {
      nextSelected = nextSelected.filter((id) => id !== item.id)
    } else {
      nextSelected.push(item.id)
    }
    emit('select-items', nextSelected)
    return
  } else if (!nextSelected.includes(item.id)) {
    nextSelected = [item.id]
    emit('select-items', nextSelected)
  }

  // Jika item terkunci, jangan mulai drag
  if (isLocked(item.id)) return

  isDraggingItem.value = true
  dragAnchorItem.value = item
  hasRecordedHistory.value = false
  activePointerId.value = e.pointerId
  activeCaptureTarget.value = e.currentTarget || null
  dragStartVenueCm.value = eventToVenueCm(e.clientX, e.clientY)

  // Simpan posisi awal semua item terpilih yang tidak terkunci
  const idsToMove = nextSelected.filter((id) => !isLocked(id))
  dragInitialPositions.value = props.items
    .filter((i) => idsToMove.includes(i.id))
    .map((i) => ({
      id: i.id,
      posisi_x: i.posisi_x,
      posisi_y: i.posisi_y,
      w: Number(i.Decoration?.panjang || 100),
      h: Number(i.Decoration?.lebar || 100),
      rotasi: i.rotasi || 0,
    }))

  try {
    e.currentTarget?.setPointerCapture?.(e.pointerId)
  } catch (err) {}
}

// Rotate Handle Pointer Down
function onRotateHandlePointerDown(e, item) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  if (activePointerId.value !== null || isLocked(item.id)) return
  e.stopPropagation()

  isRotatingItem.value = true
  rotateTarget.value = item
  hasRecordedHistory.value = false
  activePointerId.value = e.pointerId
  activeCaptureTarget.value = e.currentTarget || null

  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2 + panX.value
    const centerY = rect.top + rect.height / 2 + panY.value
    const venueLeft = centerX - venueWidthPx.value / 2
    const venueTop = centerY - venueHeightPx.value / 2
    const itemWidthPx = Number(item.Decoration?.panjang || 100) * pxPerCm.value
    const itemHeightPx = Number(item.Decoration?.lebar || 100) * pxPerCm.value

    rotateCenter.value = {
      x: venueLeft + item.posisi_x * pxPerCm.value + itemWidthPx / 2,
      y: venueTop + item.posisi_y * pxPerCm.value + itemHeightPx / 2,
    }
  }

  try {
    e.currentTarget?.setPointerCapture?.(e.pointerId)
  } catch (err) {}
}

function onPointerMove(e) {
  if (activePointerId.value === null || e.pointerId !== activePointerId.value) return

  // 1. Panning canvas
  if (isPanning.value) {
    panX.value = e.clientX - panStart.value.x
    panY.value = e.clientY - panStart.value.y
    return
  }

  // 2. Dragging item(s)
  if (isDraggingItem.value && dragInitialPositions.value.length > 0) {
    if (!hasRecordedHistory.value) {
      emit('interaction-start')
      hasRecordedHistory.value = true
    }

    const currentCm = eventToVenueCm(e.clientX, e.clientY)
    const rawDeltaX = currentCm.x - dragStartVenueCm.value.x
    const rawDeltaY = currentCm.y - dragStartVenueCm.value.y

    const updates = []
    if (dragInitialPositions.value.length === 1) {
      const init = dragInitialPositions.value[0]
      let nextX = snap(init.posisi_x + rawDeltaX, 10)
      let nextY = snap(init.posisi_y + rawDeltaY, 10)

      // Smart alignment guides
      const aligned = hitungAlignmentGuides(init.id, nextX, nextY, init.w, init.h)
      nextX = aligned.x
      nextY = aligned.y

      const clamped = clampPosisiItem(nextX, nextY, init.w, init.h, init.rotasi, venueWidthCm.value, venueHeightCm.value)
      updates.push({ id: init.id, posisi_x: clamped.posisi_x, posisi_y: clamped.posisi_y })
    } else {
      alignmentGuides.value = { x: [], y: [] }
      const dX = snap(rawDeltaX, 10)
      const dY = snap(rawDeltaY, 10)
      for (const init of dragInitialPositions.value) {
        const clamped = clampPosisiItem(
          init.posisi_x + dX,
          init.posisi_y + dY,
          init.w,
          init.h,
          init.rotasi,
          venueWidthCm.value,
          venueHeightCm.value
        )
        updates.push({ id: init.id, posisi_x: clamped.posisi_x, posisi_y: clamped.posisi_y })
      }
    }

    emit('update-items', updates)
    return
  }

  // 3. Rotating item
  if (isRotatingItem.value && rotateTarget.value) {
    if (!hasRecordedHistory.value) {
      emit('interaction-start')
      hasRecordedHistory.value = true
    }
    const item = props.items.find((i) => i.id === rotateTarget.value.id) || rotateTarget.value
    const dx = e.clientX - rotateCenter.value.x
    const dy = e.clientY - rotateCenter.value.y
    let deg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI + 90)
    deg = e.shiftKey ? Math.round(deg / 15) * 15 : Math.round(deg / 5) * 5
    deg = normalisasiRotasi(deg)

    const itemW = Number(item.Decoration?.panjang || 100)
    const itemH = Number(item.Decoration?.lebar || 100)
    const clamped = clampPosisiItem(item.posisi_x, item.posisi_y, itemW, itemH, deg, venueWidthCm.value, venueHeightCm.value)

    emit('update-items', [{
      id: item.id,
      rotasi: deg,
      posisi_x: clamped.posisi_x,
      posisi_y: clamped.posisi_y,
    }])
  }
}

function onPointerUp(e) {
  if (activePointerId.value !== null && e.pointerId !== activePointerId.value) return
  cleanupPointerInteraction()
}

function onPointerCancel(e) {
  if (activePointerId.value !== null && e.pointerId !== activePointerId.value) return
  cleanupPointerInteraction()
}

function onLostPointerCapture(e) {
  if (activePointerId.value !== null && e.pointerId !== activePointerId.value) return
  cleanupPointerInteraction()
}

function cleanupPointerInteraction() {
  if (activeCaptureTarget.value && activePointerId.value !== null) {
    try {
      if (activeCaptureTarget.value.hasPointerCapture?.(activePointerId.value)) {
        activeCaptureTarget.value.releasePointerCapture(activePointerId.value)
      }
    } catch (err) {}
  }
  isPanning.value = false
  isDraggingItem.value = false
  dragAnchorItem.value = null
  dragInitialPositions.value = []
  isRotatingItem.value = false
  rotateTarget.value = null
  alignmentGuides.value = { x: [], y: [] }
  activePointerId.value = null
  activeCaptureTarget.value = null
}

// Drag & Drop from Assets Panel
function onDragOver(e) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'copy'
}

function onDrop(e) {
  e.preventDefault()
  const rawData = e.dataTransfer.getData('application/json')
  if (!rawData) return
  try {
    const dekorasi = JSON.parse(rawData)
    const venuePos = eventToVenueCm(e.clientX, e.clientY)
    const itemW = Number(dekorasi.panjang || 100)
    const itemH = Number(dekorasi.lebar || 100)
    const dropX = snap(venuePos.x - itemW / 2, 10)
    const dropY = snap(venuePos.y - itemH / 2, 10)
    const clamped = clampPosisiItem(dropX, dropY, itemW, itemH, 0, venueWidthCm.value, venueHeightCm.value)

    emit('drop-decoration', {
      decoration: dekorasi,
      posisi_x: clamped.posisi_x,
      posisi_y: clamped.posisi_y,
    })
  } catch (err) {
    console.error('Error drop decoration:', err)
  }
}

function resetPan() {
  panX.value = 0
  panY.value = 0
}

defineExpose({ resetPan })

onMounted(() => {
  updateContainerSize()
  if (typeof ResizeObserver !== 'undefined' && containerRef.value) {
    resizeObserver = new ResizeObserver(updateContainerSize)
    resizeObserver.observe(containerRef.value)
  }
  window.addEventListener('resize', updateContainerSize)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerCancel)
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  cleanupPointerInteraction()
  window.removeEventListener('resize', updateContainerSize)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerCancel)
})
</script>

<template>
  <div
    ref="containerRef"
    class="ws2d-canvas-area relative h-full w-full select-none overflow-hidden touch-none"
    :class="isPanning ? 'cursor-grabbing' : 'cursor-default'"
    @pointerdown="onCanvasPointerDown"
    @lostpointercapture="onLostPointerCapture"
    @wheel.prevent="onWheel"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <!-- Centered Canvas Container with Pan -->
    <div
      class="absolute left-1/2 top-1/2 transition-transform duration-75"
      :style="{
        transform: `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px))`
      }"
    >
      <!-- Top Horizontal Ruler -->
      <div class="ws2d-ruler-bar mb-1.5 ml-7 relative h-5 border-b border-slate-600/40" :style="{ width: `${venueWidthPx}px` }">
        <span
          v-for="m in rulerTicksX"
          :key="`rx-${m}`"
          class="ws2d-ruler-tick absolute bottom-0.5 -translate-x-1/2 text-[9px] font-mono font-semibold text-slate-700"
          :style="{ left: `${Math.min(venueWidthPx, m * 100 * pxPerCm)}px` }"
        >
          {{ m }}m
        </span>
      </div>

      <div class="flex items-start">
        <!-- Left Vertical Ruler -->
        <div class="ws2d-ruler-bar mr-1.5 relative w-6 border-r border-slate-600/40" :style="{ height: `${venueHeightPx}px` }">
          <span
            v-for="m in rulerTicksY"
            :key="`ry-${m}`"
            class="ws2d-ruler-tick absolute right-1 -translate-y-1/2 text-[9px] font-mono font-semibold text-slate-700"
            :style="{ top: `${Math.min(venueHeightPx, m * 100 * pxPerCm)}px` }"
          >
            {{ m }}m
          </span>
        </div>

        <!-- Venue Floor Area -->
        <div
          class="relative rounded-md border-2 border-slate-700 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.16)] overflow-visible"
          :style="{
            width: `${venueWidthPx}px`,
            height: `${venueHeightPx}px`,
          }"
        >
          <!-- SVG Grid (1m major / 50cm minor) -->
          <svg
            v-if="gridVisible"
            class="pointer-events-none absolute inset-0 h-full w-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="studio-grid-50cm" :width="50 * pxPerCm" :height="50 * pxPerCm" patternUnits="userSpaceOnUse">
                <path
                  :d="`M ${50 * pxPerCm} 0 L 0 0 0 ${50 * pxPerCm}`"
                  fill="none"
                  stroke="#F1F5F9"
                  stroke-width="1"
                />
              </pattern>
              <pattern id="studio-grid-1m" :width="100 * pxPerCm" :height="100 * pxPerCm" patternUnits="userSpaceOnUse">
                <rect :width="100 * pxPerCm" :height="100 * pxPerCm" fill="url(#studio-grid-50cm)" />
                <path
                  :d="`M ${100 * pxPerCm} 0 L 0 0 0 ${100 * pxPerCm}`"
                  fill="none"
                  stroke="#E2E8F0"
                  stroke-width="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#studio-grid-1m)" />
          </svg>

          <!-- Venue Watermark -->
          <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center opacity-20">
            <span class="text-2xl font-bold uppercase tracking-[0.2em] text-slate-400">
              {{ namaVenue || 'VENUE' }}
            </span>
            <span class="mt-0.5 text-[11px] font-medium text-slate-400">
              {{ panjangVenue }}m × {{ lebarVenue }}m
            </span>
          </div>

          <!-- Smart Alignment Guide Lines (Pink Pastel Accent) -->
          <div
            v-for="(gx, idx) in alignmentGuides.x"
            :key="`gx-${idx}`"
            class="pointer-events-none absolute inset-y-0 z-40 border-l border-dashed border-[#E25884]"
            :style="{ left: `${gx * pxPerCm}px` }"
          ></div>
          <div
            v-for="(gy, idx) in alignmentGuides.y"
            :key="`gy-${idx}`"
            class="pointer-events-none absolute inset-x-0 z-40 border-t border-dashed border-[#E25884]"
            :style="{ top: `${gy * pxPerCm}px` }"
          ></div>

          <!-- PINNED WO NOTES -->
          <button
            v-for="note in notes.filter((n) => n.posisi_x !== null && n.posisi_y !== null)"
            :key="`note-${note.id}`"
            type="button"
            class="interactive-item absolute z-25 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 rounded-full border border-slate-300 px-2 py-0.5 text-[9px] font-semibold text-slate-800 shadow-sm hover:scale-105 transition-transform"
            :style="{
              left: `${Number(note.posisi_x) * pxPerCm}px`,
              top: `${Number(note.posisi_y) * pxPerCm}px`,
              backgroundColor: note.warna || '#FEF3C7',
            }"
            :title="`${note.judul}: ${note.isi}`"
            @pointerdown.stop
            @click.stop="$emit('open-notes')"
          >
            <i class="fa-solid fa-thumbtack text-[#E25884] text-[9px]"></i>
            <span class="max-w-[85px] truncate">{{ note.judul }}</span>
          </button>

          <!-- PLACED DECORATION ITEMS -->
          <div
            v-for="item in visibleItems"
            :key="item.id"
            class="interactive-item absolute select-none touch-none"
            :class="[
              isLocked(item.id) ? 'cursor-not-allowed' : 'cursor-move',
              isSelected(item.id) ? 'z-20' : 'z-10',
            ]"
            :style="{
              left: `${item.posisi_x * pxPerCm}px`,
              top: `${item.posisi_y * pxPerCm}px`,
              width: `${(item.Decoration?.panjang || 100) * pxPerCm}px`,
              height: `${(item.Decoration?.lebar || 100) * pxPerCm}px`,
              transform: `rotate(${item.rotasi || 0}deg)`,
              transformOrigin: 'center center',
            }"
            @pointerdown="onItemPointerDown($event, item)"
            @lostpointercapture="onLostPointerCapture"
            @click.stop
          >
            <!-- Item Body (tanpa border & latar transparan; hanya gambar dekorasi) -->
            <div
              class="relative flex h-full w-full items-center justify-center bg-transparent transition"
              :class="isSelected(item.id) ? 'ring-1 ring-[#CF2C2F]/75 rounded-sm' : ''"
            >
              <img
                v-if="urlGambar(item.Decoration)"
                :src="urlGambar(item.Decoration)"
                :alt="item.Decoration?.nama_dekorasi"
                class="pointer-events-none h-full w-full object-contain"
                @error="onGambarError(item.Decoration)"
              />
              <div
                v-else
                class="flex h-full w-full items-center justify-center text-slate-400"
              >
                <i class="fa-solid fa-cube text-base"></i>
              </div>

              <!-- Badge kecil hanya untuk status terkunci atau jumlah > 1 -->
              <div
                v-if="isLocked(item.id) || item.jumlah > 1"
                class="pointer-events-none absolute right-0.5 top-0.5 z-10 flex items-center gap-0.5"
              >
                <span
                  v-if="isLocked(item.id)"
                  class="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-800/85 text-[7px] text-white"
                  title="Terkunci"
                >
                  <i class="fa-solid fa-lock"></i>
                </span>
                <span
                  v-if="item.jumlah > 1"
                  class="rounded-full bg-[#CF2C2F] px-1.5 text-[8px] font-bold text-white shadow-2xs"
                >
                  ×{{ item.jumlah }}
                </span>
              </div>
            </div>

            <!-- Nama Dekorasi (hanya muncul saat dekorasi dipilih) -->
            <div
              v-if="isSelected(item.id)"
              class="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900/90 px-2.5 py-0.5 text-[10px] font-semibold text-white shadow-sm z-30"
            >
              {{ item.Decoration?.nama_dekorasi }}
            </div>

            <!-- Selection Overlay & Rotate Handle (Single Selection) -->
            <template v-if="isSelected(item.id) && selectedItemIds.length === 1 && !isLocked(item.id)">
              <div class="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900/90 px-2 py-0.5 text-[9px] font-mono text-white shadow z-30">
                {{ Math.round(item.posisi_x) }}, {{ Math.round(item.posisi_y) }} cm • {{ item.rotasi || 0 }}°
              </div>

              <div
                class="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center cursor-grab active:cursor-grabbing z-30 touch-none"
                title="Tarik untuk memutar (Shift = snap 15°)"
                @pointerdown="onRotateHandlePointerDown($event, item)"
                @lostpointercapture="onLostPointerCapture"
              >
                <div class="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#CF2C2F] text-white shadow">
                  <i class="fa-solid fa-rotate text-[8px]"></i>
                </div>
                <div class="h-1.5 w-0.5 bg-[#CF2C2F]"></div>
              </div>

              <div class="pointer-events-none absolute -left-1 -top-1 h-2 w-2 rounded-full border border-white bg-[#CF2C2F]"></div>
              <div class="pointer-events-none absolute -right-1 -top-1 h-2 w-2 rounded-full border border-white bg-[#CF2C2F]"></div>
              <div class="pointer-events-none absolute -left-1 -bottom-1 h-2 w-2 rounded-full border border-white bg-[#CF2C2F]"></div>
              <div class="pointer-events-none absolute -right-1 -bottom-1 h-2 w-2 rounded-full border border-white bg-[#CF2C2F]"></div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
