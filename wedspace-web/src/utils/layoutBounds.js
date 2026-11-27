/**
 * Utilitas perhitungan batas posisi fisik (dalam centimeter) untuk Workspace Layout 2D.
 *
 * Konvensi koordinat:
 * - Origin venue: sudut kiri atas (0, 0)
 * - X: arah horizontal venue (panjang_venue * 100 cm)
 * - Y: arah vertikal canvas (lebar_venue * 100 cm)
 * - Posisi item (posisi_x, posisi_y): sudut kiri atas kotak tak terotasi
 * - Transformasi rotasi: rotate(rotasi deg) dengan transform-origin: center center
 */

/**
 * Normalisasi sudut rotasi ke rentang integer 0..359 derajat.
 */
export function normalisasiRotasi(deg) {
  const n = Number(deg)
  if (!Number.isFinite(n)) return 0
  return ((Math.round(n) % 360) + 360) % 360
}

/**
 * Hitung dimensi Axis-Aligned Bounding Box (AABB) setelah objek diputar sebesar rotasiDeg
 * terhadap titik pusatnya.
 */
export function hitungDimensiRotasi(panjangCm, lebarCm, rotasiDeg = 0) {
  const w = Math.max(1, Number(panjangCm) || 100)
  const h = Math.max(1, Number(lebarCm) || 100)
  const theta = (normalisasiRotasi(rotasiDeg) * Math.PI) / 180

  const cos = Math.abs(Math.cos(theta))
  const sin = Math.abs(Math.sin(theta))

  const rotatedWidth = w * cos + h * sin
  const rotatedHeight = w * sin + h * cos

  return { rotatedWidth, rotatedHeight }
}

/**
 * Hitung rentang posisi (minX..maxX, minY..maxY) dalam centimeter agar seluruh
 * bounding box item (termasuk setelah rotasi) tetap berada di dalam area venue.
 *
 * Jika ukuran item setelah rotasi melebihi ukuran venue pada suatu sumbu,
 * sumbu tersebut dipusatkan ke tengah venue dan flag melebihiVenue = true.
 */
export function hitungBatasPosisi(panjangCm, lebarCm, rotasiDeg, venueWidthCm, venueHeightCm) {
  const w = Math.max(1, Number(panjangCm) || 100)
  const h = Math.max(1, Number(lebarCm) || 100)
  const vW = Math.max(1, Number(venueWidthCm) || 100)
  const vH = Math.max(1, Number(venueHeightCm) || 100)

  const { rotatedWidth, rotatedHeight } = hitungDimensiRotasi(w, h, rotasiDeg)

  // Karena rotasi dilakukan terhadap pusat kotak (x + w/2, y + h/2),
  // tepi kiri AABB adalah x - (rotatedWidth - w)/2,
  // tepi kanan AABB adalah x + w + (rotatedWidth - w)/2.
  const offsetX = (rotatedWidth - w) / 2
  const offsetY = (rotatedHeight - h) / 2
  const EPS = 1e-9

  const rawMinX = Math.ceil(offsetX - EPS) + 0
  const rawMaxX = Math.floor(vW - w - offsetX + EPS) + 0
  const rawMinY = Math.ceil(offsetY - EPS) + 0
  const rawMaxY = Math.floor(vH - h - offsetY + EPS) + 0

  const melebihiX = rotatedWidth > vW || rawMinX > rawMaxX
  const melebihiY = rotatedHeight > vH || rawMinY > rawMaxY
  const melebihiVenue = melebihiX || melebihiY

  const minX = melebihiX ? Math.round((vW - w) / 2) : rawMinX
  const maxX = melebihiX ? minX : rawMaxX
  const minY = melebihiY ? Math.round((vH - h) / 2) : rawMinY
  const maxY = melebihiY ? minY : rawMaxY

  return {
    minX,
    maxX,
    minY,
    maxY,
    rotatedWidth,
    rotatedHeight,
    melebihiX,
    melebihiY,
    melebihiVenue,
  }
}

/**
 * Clamp koordinat (x, y) dalam centimeter agar tidak menembus batas venue.
 */
export function clampPosisiItem(x, y, panjangCm, lebarCm, rotasiDeg, venueWidthCm, venueHeightCm) {
  const bounds = hitungBatasPosisi(panjangCm, lebarCm, rotasiDeg, venueWidthCm, venueHeightCm)
  const numX = Number.isFinite(Number(x)) ? Number(x) : bounds.minX
  const numY = Number.isFinite(Number(y)) ? Number(y) : bounds.minY

  const posisi_x = Math.round(Math.max(bounds.minX, Math.min(numX, bounds.maxX)))
  const posisi_y = Math.round(Math.max(bounds.minY, Math.min(numY, bounds.maxY)))

  return { posisi_x, posisi_y, bounds }
}
