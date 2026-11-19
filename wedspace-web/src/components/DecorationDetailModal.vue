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
    <div
      v-if="tampil && dekorasi"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-licorice/55 p-4 backdrop-blur-[2px]"
      @click.self="$emit('tutup')"
    >
      <div class="ws-paper-card max-h-[90vh] w-full max-w-md overflow-y-auto bg-marshmallow">
        <div class="checkerboard-trim border-b-2 border-licorice"></div>

        <div class="relative border-b-2 border-licorice">
          <img
            v-if="urlGambar(dekorasi)"
            :src="urlGambar(dekorasi)"
            :alt="dekorasi.nama_dekorasi"
            class="h-48 w-full object-cover"
          />
          <div
            v-else
            class="bg-stripes-pink flex h-40 items-center justify-center"
          >
            <span class="flex h-20 w-20 items-center justify-center rounded-full border-2 border-licorice bg-marshmallow font-heading text-4xl font-bold text-cherry shadow-[3px_3px_0px_#7F1125]">
              {{ (dekorasi.nama_dekorasi || '?').trim().charAt(0).toUpperCase() }}
            </span>
          </div>
          <span class="ws-badge-sticker absolute bottom-3 left-4 bg-strawberry text-licorice">
            {{ dekorasi.kategori }}
          </span>
        </div>

        <div class="p-6">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <h2 class="font-heading text-3xl font-bold text-licorice">{{ dekorasi.nama_dekorasi }}</h2>
            <span class="ws-price-pill">{{ rupiah(dekorasi.harga) }}</span>
          </div>

          <div class="mt-3 rounded-xl border border-licorice/40 bg-paper px-3.5 py-2.5 text-xs font-semibold text-licorice">
            <i class="fa-solid fa-ruler-combined mr-1.5 text-cherry"></i>
            Ukuran: {{ dekorasi.panjang }} × {{ dekorasi.lebar }} × {{ dekorasi.tinggi }} cm
          </div>

          <p v-if="dekorasi.deskripsi" class="mt-3.5 text-sm leading-relaxed text-muted">
            {{ dekorasi.deskripsi }}
          </p>

          <button
            class="ws-btn-cherry mt-6 w-full py-3"
            @click="$emit('tutup')"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
