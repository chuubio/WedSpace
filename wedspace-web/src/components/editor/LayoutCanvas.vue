<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from '../../stores/auth'

const props = defineProps({
  panjangVenue: { type: Number, required: true }, // meter (X)
  lebarVenue: { type: Number, required: true },   // meter (Y)
  namaVenue: { type: String, default: '' },
  items: { type: Array, default: () => [] },
  selectedItemId: { type: [String, Number], default: null },
  zoom: { type: Number, default: 1.0 },
  gridVisible: { type: Boolean, default: true },
  snapToGrid: { type: Boolean, default: true },
})

const emit = defineEmits([
  'select-item',
  'update-item',
  'drop-decoration',
  'delete-selected',
])

const auth = useAuthStore()

// Dimensi fisik venue dalam centimeter
const venueWidthCm = computed(() => Math.max(1, (props.panjangVenue || 1) * 100))
const venueHeightCm = computed(() => Math.max(1, (props.lebarVenue || 1) * 100))

// Viewport container ref
const containerRef = ref(null)
const containerWidth = ref(800)
const containerHeight = ref(600)

// Pan / Viewport offset in pixels
const panX = ref(0)
const panY = ref(0)
const isPanning = ref(false)
const panStart = ref({ x: 0, y: 0 })

// Base scale: pixels per centimeter agar venue pas di dalam container
const baseScale = computed(() => {
  const pad = 80 // padding in px
  const maxW = Math.max(100, containerWidth.value - pad)
  const maxH = Math.max(100, containerHeight.value - pad)
  const scaleX = maxW / venueWidthCm.value
  const scaleY = maxH / venueHeightCm.value
  return Math.min(scaleX, scaleY, 1.2)
})

// Current scale (px per cm) incorporating zoom multiplier
const pxPerCm = computed(() => baseScale.value * props.zoom)

// Pixel size of the venue floor
const venueWidthPx = computed(() => venueWidthCm.value * pxPerCm.value)
const venueHeightPx = computed(() => venueHeightCm.value * pxPerCm.value)

// Dragging item state
const isDraggingItem = ref(false)
const dragItemTarget = ref(null)
const dragOffset = ref({ x: 0, y: 0 }) // cm offset inside the dragged item

// Rotating item state
const isRotatingItem = ref(false)
const rotateTarget = ref(null)
const rotateCenter = ref({ x: 0, y: 0 }) // px on screen

function updateContainerSize() {
  if (containerRef.value) {
    containerWidth.value = containerRef.value.clientWidth || 800
    containerHeight.value = containerRef.value.clientHeight || 600
  }
}

// Helper gambar dekorasi aman
function urlGambar(d) {
  if (!d?.gambar) return ''
  let url = d.gambar.startsWith('http') ? d.gambar : `http://localhost:3000${d.gambar}`
  if (d.visibility === 'private' && auth?.token) {
    url += `${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(auth.token)}`
  }
  return url
}

// Warna aksen berdasarkan kategori dekorasi
function warnaKategori(kategori) {
  const k = String(kategori || '').toLowerCase()
  if (k.includes('pelaminan')) return '#C97895' // strawberry
  if (k.includes('meja')) return '#EDC5A5'      // peach
  if (k.includes('kursi')) return '#D1C2E0'     // violet
  if (k.includes('bunga')) return '#E78895'     // rose
  if (k.includes('lighting')) return '#F4D160'  // yellow gold
  return '#C97895'
}

// Snap helper
function snap(val, step = 10) {
  if (!props.snapToGrid) return Math.round(val)
  return Math.round(val / step) * step
}

// Koordinat event ke cm relatif terhadap venue (0, 0)
function eventToVenueCm(clientX, clientY) {
  if (!containerRef.value) return { x: 0, y: 0 }
  const rect = containerRef.value.getBoundingClientRect()
  // Hitung posisi relative terhadap tengah container
  const centerX = rect.left + rect.width / 2 + panX.value
  const centerY = rect.top + rect.height / 2 + panY.value

  const venueLeft = centerX - venueWidthPx.value / 2
  const venueTop = centerY - venueHeightPx.value / 2

  const pxX = clientX - venueLeft
  const pxY = clientY - venueTop

  const cmX = pxX / pxPerCm.value
  const cmY = pxY / pxPerCm.value

  return { x: cmX, y: cmY }
}

// Select item
function pilihItem(item, e) {
  if (e) e.stopPropagation()
  emit('select-item', item)
}

// Klik pada ruang kosong canvas (deselect & pan start)
function onCanvasMouseDown(e) {
  if (e.target.closest('.interactive-item')) return
  emit('select-item', null)

  // Start panning
  isPanning.value = true
  panStart.value = { x: e.clientX - panX.value, y: e.clientY - panY.value }
}

// Drag start on item
function onItemMouseDown(e, item) {
  e.stopPropagation()
  emit('select-item', item)

  isDraggingItem.value = true
  dragItemTarget.value = item

  const venuePos = eventToVenueCm(e.clientX, e.clientY)
  dragOffset.value = {
    x: venuePos.x - item.posisi_x,
    y: venuePos.y - item.posisi_y,
  }
}

// Start rotating selected item
function onRotateHandleMouseDown(e, item) {
  e.stopPropagation()
  isRotatingItem.value = true
  rotateTarget.value = item

  // Hitung titik tengah objek pada layar (dalam pixel)
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2 + panX.value
    const centerY = rect.top + rect.height / 2 + panY.value
    const venueLeft = centerX - venueWidthPx.value / 2
    const venueTop = centerY - venueHeightPx.value / 2

    const itemWidthPx = (item.Decoration?.panjang || 100) * pxPerCm.value
    const itemHeightPx = (item.Decoration?.lebar || 100) * pxPerCm.value

    rotateCenter.value = {
      x: venueLeft + item.posisi_x * pxPerCm.value + itemWidthPx / 2,
      y: venueTop + item.posisi_y * pxPerCm.value + itemHeightPx / 2,
    }
  }
}

// Mouse Move global
function onMouseMove(e) {
  // 1. Panning canvas
  if (isPanning.value) {
    panX.value = e.clientX - panStart.value.x
    panY.value = e.clientY - panStart.value.y
    return
  }

  // 2. Dragging item
  if (isDraggingItem.value && dragItemTarget.value) {
    const item = dragItemTarget.value
    const venuePos = eventToVenueCm(e.clientX, e.clientY)

    const itemW = item.Decoration?.panjang || 100
    const itemH = item.Decoration?.lebar || 100

    let newX = venuePos.x - dragOffset.value.x
    let newY = venuePos.y - dragOffset.value.y

    // Snap to grid (10 cm default)
    newX = snap(newX, 10)
    newY = snap(newY, 10)

    // Batasi dalam batas venue
    newX = Math.max(0, Math.min(newX, venueWidthCm.value - itemW))
    newY = Math.max(0, Math.min(newY, venueHeightCm.value - itemH))

    emit('update-item', {
      id: item.id,
      posisi_x: Math.round(newX),
      posisi_y: Math.round(newY),
    })
    return
  }

  // 3. Rotating item
  if (isRotatingItem.value && rotateTarget.value) {
    const dx = e.clientX - rotateCenter.value.x
    const dy = e.clientY - rotateCenter.value.y
    let deg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI + 90)
    if (deg < 0) deg += 360
    if (deg >= 360) deg -= 360

    // Snap rotasi ke kelipatan 15 derajat jika Shift ditekan, atau kelipatan 5 derajat
    if (e.shiftKey) {
      deg = Math.round(deg / 15) * 15
    } else {
      deg = Math.round(deg / 5) * 5
    }
    if (deg >= 360) deg = 0

    emit('update-item', {
      id: rotateTarget.value.id,
      rotasi: deg,
    })
  }
}

// Mouse Up global
function onMouseUp() {
  isPanning.value = false
  isDraggingItem.value = false
  dragItemTarget.value = null
  isRotatingItem.value = false
  rotateTarget.value = null
}

// Drag & Drop dari panel dekorasi
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

    const itemW = dekorasi.panjang || 100
    const itemH = dekorasi.lebar || 100

    let dropX = snap(venuePos.x - itemW / 2, 10)
    let dropY = snap(venuePos.y - itemH / 2, 10)

    // Batasi agar tidak di luar venue
    dropX = Math.max(0, Math.min(dropX, venueWidthCm.value - itemW))
    dropY = Math.max(0, Math.min(dropY, venueHeightCm.value - itemH))

    emit('drop-decoration', {
      decoration: dekorasi,
      posisi_x: Math.round(dropX),
      posisi_y: Math.round(dropY),
    })
  } catch (err) {
    console.error('Error drop decoration:', err)
  }
}

// Keyboard navigation & shortcuts
function onKeyDown(e) {
  if (['input', 'textarea', 'select'].includes(e.target.tagName.toLowerCase())) return

  const item = props.items.find((i) => i.id === props.selectedItemId)
  if (!item) return

  const step = e.shiftKey ? 50 : 10 // cm
  const itemW = item.Decoration?.panjang || 100
  const itemH = item.Decoration?.lebar || 100

  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    const nextX = Math.max(0, item.posisi_x - step)
    emit('update-item', { id: item.id, posisi_x: nextX })
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    const nextX = Math.min(venueWidthCm.value - itemW, item.posisi_x + step)
    emit('update-item', { id: item.id, posisi_x: nextX })
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    const nextY = Math.max(0, item.posisi_y - step)
    emit('update-item', { id: item.id, posisi_y: nextY })
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    const nextY = Math.min(venueHeightCm.value - itemH, item.posisi_y + step)
    emit('update-item', { id: item.id, posisi_y: nextY })
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault()
    emit('delete-selected')
  } else if (e.key === 'r' || e.key === 'R') {
    e.preventDefault()
    const nextRot = (item.rotasi + 45) % 360
    emit('update-item', { id: item.id, rotasi: nextRot })
  }
}

// Reset pan saat zoom fit dipanggil dari luar
function resetPan() {
  panX.value = 0
  panY.value = 0
}

defineExpose({ resetPan })

onMounted(() => {
  updateContainerSize()
  window.addEventListener('resize', updateContainerSize)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateContainerSize)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <div
    ref="containerRef"
    class="relative h-full w-full select-none overflow-hidden bg-grid-subtle cursor-default"
    @mousedown="onCanvasMouseDown"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <!-- Centered Canvas Container with Pan & Scale -->
    <div
      class="absolute left-1/2 top-1/2 transition-transform duration-75"
      :style="{
        transform: `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px))`
      }"
    >
      <!-- Venue Dimension Header Ruler (Top) -->
      <div
        class="mb-2 flex items-center justify-between text-[11px] font-bold text-licorice border-b-2 border-licorice/40 pb-1"
        :style="{ width: `${venueWidthPx}px` }"
      >
        <span class="flex items-center gap-1.5">
          <i class="fa-solid fa-arrows-left-right text-cherry text-xs"></i>
          <span>Panjang: {{ panjangVenue }} meter ({{ panjangVenue * 100 }} cm)</span>
        </span>
        <span class="rounded bg-marshmallow px-2 py-0.5 border border-licorice/30 text-[10px]">
          X: 0 → {{ panjangVenue * 100 }} cm
        </span>
      </div>

      <div class="flex items-start">
        <!-- Venue Dimension Side Ruler (Left) -->
        <div
          class="mr-2 flex flex-col justify-between text-[10px] font-bold text-licorice border-r-2 border-licorice/40 pr-1 text-right"
          :style="{ height: `${venueHeightPx}px` }"
        >
          <span class="truncate">Y: 0</span>
          <span class="-rotate-90 origin-bottom-right whitespace-nowrap text-cherry">
            Lebar: {{ lebarVenue }} m
          </span>
          <span class="truncate">{{ lebarVenue * 100 }} cm</span>
        </div>

        <!-- Venue Floor Area (Canvas Boundary) -->
        <div
          class="relative rounded-lg border-2 border-licorice bg-[#FAF5EE] shadow-[6px_6px_0px_#7F1125] overflow-visible"
          :style="{
            width: `${venueWidthPx}px`,
            height: `${venueHeightPx}px`,
          }"
        >
          <!-- SVG Grid Pattern (1 meter major & 50 cm minor) -->
          <svg
            v-if="gridVisible"
            class="pointer-events-none absolute inset-0 h-full w-full opacity-65"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <!-- 50cm sub-grid -->
              <pattern
                id="grid-50cm"
                :width="50 * pxPerCm"
                :height="50 * pxPerCm"
                patternUnits="userSpaceOnUse"
              >
                <path
                  :d="`M ${50 * pxPerCm} 0 L 0 0 0 ${50 * pxPerCm}`"
                  fill="none"
                  stroke="#E8D8CC"
                  stroke-width="0.75"
                  stroke-dasharray="2,2"
                />
              </pattern>
              <!-- 1m (100cm) major grid -->
              <pattern
                id="grid-1m"
                :width="100 * pxPerCm"
                :height="100 * pxPerCm"
                patternUnits="userSpaceOnUse"
              >
                <rect :width="100 * pxPerCm" :height="100 * pxPerCm" fill="url(#grid-50cm)" />
                <path
                  :d="`M ${100 * pxPerCm} 0 L 0 0 0 ${100 * pxPerCm}`"
                  fill="none"
                  stroke="#D4BBA5"
                  stroke-width="1.2"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-1m)" />
          </svg>

          <!-- Venue Center Axis Marker -->
          <div class="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-cherry/20"></div>
          <div class="pointer-events-none absolute inset-y-0 left-1/2 border-l border-dashed border-cherry/20"></div>

          <!-- Venue Watermark Label in Center -->
          <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center opacity-25">
            <span class="font-heading text-4xl font-black uppercase tracking-widest text-licorice">
              {{ namaVenue || 'AREA VENUE' }}
            </span>
            <span class="text-xs font-bold tracking-wider text-cherry mt-1">
              {{ panjangVenue }}m × {{ lebarVenue }}m
            </span>
          </div>

          <!-- PLACED DECORATION ITEMS -->
          <div
            v-for="item in items"
            :key="item.id"
            class="interactive-item absolute cursor-move select-none"
            :class="{ 'z-20': item.id === selectedItemId, 'z-10': item.id !== selectedItemId }"
            :style="{
              left: `${item.posisi_x * pxPerCm}px`,
              top: `${item.posisi_y * pxPerCm}px`,
              width: `${(item.Decoration?.panjang || 100) * pxPerCm}px`,
              height: `${(item.Decoration?.lebar || 100) * pxPerCm}px`,
              transform: `rotate(${item.rotasi || 0}deg)`,
              transformOrigin: 'center center',
            }"
            @mousedown="onItemMouseDown($event, item)"
            @click="pilihItem(item, $event)"
          >
            <!-- Decoration Visual Card Body -->
            <div
              class="relative h-full w-full overflow-hidden rounded-md border-2 transition-all flex flex-col justify-between shadow-sm"
              :class="item.id === selectedItemId
                ? 'border-cherry ring-2 ring-cherry ring-offset-2 shadow-[0_0_12px_rgba(201,120,149,0.6)] bg-paper'
                : 'border-licorice hover:border-cherry hover:shadow-md bg-marshmallow'"
              :style="{ backgroundColor: item.id === selectedItemId ? '#FFF' : '#FAF3EC' }"
            >
              <!-- Background Thumbnail if available -->
              <img
                v-if="urlGambar(item.Decoration)"
                :src="urlGambar(item.Decoration)"
                :alt="item.Decoration?.nama_dekorasi"
                class="absolute inset-0 h-full w-full object-cover opacity-80 pointer-events-none"
              />

              <!-- Top: Category Accent & Quantity Badge -->
              <div class="relative z-10 flex items-center justify-between p-1">
                <span
                  class="rounded px-1 py-0.2 text-[8px] font-bold uppercase shadow-sm truncate max-w-[70%]"
                  :style="{ backgroundColor: warnaKategori(item.Decoration?.kategori), color: '#1B1416' }"
                >
                  {{ item.Decoration?.kategori || 'Dekor' }}
                </span>

                <span
                  v-if="item.jumlah > 1"
                  class="rounded-full border border-licorice bg-cherry px-1.5 py-0.2 text-[9px] font-bold text-white shadow-sm"
                  title="Jumlah unit"
                >
                  ×{{ item.jumlah }}
                </span>
              </div>

              <!-- Bottom: Item Name Label -->
              <div class="relative z-10 bg-marshmallow/90 px-1 py-0.5 border-t border-licorice/40 text-[9px] font-bold text-licorice truncate text-center">
                {{ item.Decoration?.nama_dekorasi }}
              </div>
            </div>

            <!-- SELECTION OVERLAY & HANDLES (Active Item) -->
            <template v-if="item.id === selectedItemId">
              <!-- Coordinate & Rotation Tooltip Badge (Floating on top) -->
              <div
                class="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-licorice bg-licorice px-2 py-0.5 text-[9px] font-bold text-marshmallow shadow-md z-30"
              >
                X: {{ (item.posisi_x / 100).toFixed(2) }}m • Y: {{ (item.posisi_y / 100).toFixed(2) }}m • {{ item.rotasi }}°
              </div>

              <!-- Rotation Handle Knob (Top Center) -->
              <div
                class="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center cursor-grab active:cursor-grabbing z-30 group"
                title="Tarik untuk memutar dekorasi"
                @mousedown="onRotateHandleMouseDown($event, item)"
              >
                <!-- Knob Circle -->
                <div class="flex h-5 w-5 items-center justify-center rounded-full border-2 border-licorice bg-cherry text-white shadow-md group-hover:scale-110 transition-transform">
                  <i class="fa-solid fa-rotate text-[9px]"></i>
                </div>
                <!-- Connector Line -->
                <div class="h-2 w-0.5 bg-cherry"></div>
              </div>

              <!-- Corner Anchor Dots -->
              <div class="pointer-events-none absolute -left-1 -top-1 h-2 w-2 rounded-full border border-licorice bg-cherry"></div>
              <div class="pointer-events-none absolute -right-1 -top-1 h-2 w-2 rounded-full border border-licorice bg-cherry"></div>
              <div class="pointer-events-none absolute -left-1 -bottom-1 h-2 w-2 rounded-full border border-licorice bg-cherry"></div>
              <div class="pointer-events-none absolute -right-1 -bottom-1 h-2 w-2 rounded-full border border-licorice bg-cherry"></div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
