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
  <article class="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_4px_18px_rgba(201,120,149,0.1)]">
    <button class="block w-full" @click="$emit('detail', dekorasi)">
      <img v-if="urlGambar(dekorasi)" :src="urlGambar(dekorasi)" :alt="dekorasi.nama_dekorasi" class="h-32 w-full object-cover" />
      <div v-else class="flex h-32 items-center justify-center bg-petal text-4xl font-bold text-primary">
        {{ inisial(dekorasi.nama_dekorasi) }}
      </div>
    </button>
    <div class="p-4">
      <span class="rounded-full bg-blush px-2.5 py-1 text-xs font-medium text-primary">{{ dekorasi.kategori }}</span>
      <h2 class="mt-2 font-semibold">{{ dekorasi.nama_dekorasi }}</h2>
      <p class="mt-0.5 text-sm text-muted">{{ dekorasi.panjang }} × {{ dekorasi.lebar }} × {{ dekorasi.tinggi }} cm</p>
      <p class="mt-1 font-semibold text-primary">{{ rupiah(dekorasi.harga) }}</p>
      <button class="mt-3 w-full rounded-xl border border-line py-2 text-sm font-medium hover:bg-canvas" @click="$emit('detail', dekorasi)">
        Lihat Detail
      </button>
    </div>
  </article>
</template>
