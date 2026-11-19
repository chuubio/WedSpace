<script setup>
defineProps({
  dekorasi: { type: Object, required: true },
})

defineEmits(['detail'])

function rupiah(n) {
  return 'Rp' + Number(n || 0).toLocaleString('id-ID')
}

function inisial(nama) {
  return (nama || '?').trim().charAt(0).toUpperCase()
}

function urlGambar(d) {
  if (!d.gambar) return ''
  if (d.gambar.startsWith('http')) return d.gambar
  return `http://localhost:3000${d.gambar}`
}
</script>

<template>
  <article class="ws-paper-card ws-paper-card-hover flex flex-col justify-between overflow-hidden bg-paper">
    <button class="group relative block w-full overflow-hidden border-b-2 border-licorice" @click="$emit('detail', dekorasi)">
      <img
        v-if="urlGambar(dekorasi)"
        :src="urlGambar(dekorasi)"
        :alt="dekorasi.nama_dekorasi"
        class="h-36 w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div
        v-else
        class="bg-stripes-pink flex h-36 items-center justify-center"
      >
        <span class="flex h-16 w-16 items-center justify-center rounded-full border-2 border-licorice bg-marshmallow font-heading text-3xl font-bold text-cherry shadow-[3px_3px_0px_#7F1125]">
          {{ inisial(dekorasi.nama_dekorasi) }}
        </span>
      </div>

      <!-- Category Sticker on top-left of preview -->
      <span class="ws-badge-sticker absolute left-3 top-3 bg-strawberry text-licorice">
        {{ dekorasi.kategori }}
      </span>
    </button>

    <div class="flex flex-1 flex-col justify-between p-4">
      <div>
        <h2 class="font-heading text-xl font-bold leading-snug text-licorice">{{ dekorasi.nama_dekorasi }}</h2>
        <p class="mt-1 text-xs font-medium text-muted">
          <i class="fa-solid fa-ruler-combined mr-1 text-licorice/60"></i>
          {{ dekorasi.panjang }} × {{ dekorasi.lebar }} × {{ dekorasi.tinggi }} cm
        </p>
      </div>

      <div class="mt-3.5 border-t border-dashed border-licorice/30 pt-3">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[10px] font-bold uppercase tracking-wider text-muted">Harga Sewa</span>
          <span class="ws-price-pill">{{ rupiah(dekorasi.harga) }}</span>
        </div>

        <button
          class="ws-btn-paper mt-3 w-full py-2 text-xs uppercase tracking-wider"
          @click="$emit('detail', dekorasi)"
        >
          Lihat Detail
        </button>
      </div>
    </div>
  </article>
</template>
