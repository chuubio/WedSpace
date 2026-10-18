<script setup>
defineProps({
  tampil: { type: Boolean, default: false },
  dekorasi: { type: Object, default: null },
})

defineEmits(['tutup'])

function rupiah(n) {
  return 'Rp' + Number(n || 0).toLocaleString('id-ID')
}

function urlGambar(d) {
  if (!d?.gambar) return ''
  if (d.gambar.startsWith('http')) return d.gambar
  return `http://localhost:3000${d.gambar}`
}
</script>

<template>
  <Teleport to="body">
    <div v-if="tampil && dekorasi" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" @click.self="$emit('tutup')">
      <div class="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-line bg-white shadow-xl">
        <img v-if="urlGambar(dekorasi)" :src="urlGambar(dekorasi)" :alt="dekorasi.nama_dekorasi" class="h-48 w-full object-cover" />
        <div v-else class="flex h-32 items-center justify-center bg-petal text-5xl font-bold text-primary">
          {{ (dekorasi.nama_dekorasi || '?').trim().charAt(0).toUpperCase() }}
        </div>
        <div class="p-6">
          <span class="rounded-full bg-blush px-2.5 py-1 text-xs font-medium text-primary">{{ dekorasi.kategori }}</span>
          <h2 class="font-heading mt-2 text-2xl font-semibold">{{ dekorasi.nama_dekorasi }}</h2>
          <p class="mt-1 font-semibold text-primary">{{ rupiah(dekorasi.harga) }}</p>
          <p class="mt-2 text-sm text-muted">Ukuran: {{ dekorasi.panjang }} × {{ dekorasi.lebar }} × {{ dekorasi.tinggi }} cm</p>
          <p v-if="dekorasi.deskripsi" class="mt-3 text-sm">{{ dekorasi.deskripsi }}</p>
          <button class="mt-5 w-full rounded-xl bg-primary py-2.5 font-semibold text-white hover:opacity-90" @click="$emit('tutup')">
            Tutup
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
