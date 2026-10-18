<script setup>
defineProps({
  proyek: { type: Object, required: true },
})

defineEmits(['hapus'])

function ukuran(p) {
  return `${p.panjang_venue} × ${p.lebar_venue} m`
}

function tanggal(t) {
  return new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<template>
  <article class="rounded-2xl border border-line bg-white p-5 shadow-[0_4px_18px_rgba(201,120,149,0.1)]">
    <h2 class="text-lg font-semibold">{{ proyek.nama_proyek }}</h2>
    <p class="mt-0.5 text-sm text-muted">
      <i class="fa-solid fa-location-dot mr-1.5"></i>{{ proyek.nama_venue }}
    </p>
    <div class="mt-3 flex flex-wrap gap-1.5 text-xs">
      <span v-if="proyek.tema" class="rounded-full bg-blush px-2.5 py-1 font-medium text-primary">{{ proyek.tema }}</span>
      <span class="rounded-full bg-canvas px-2.5 py-1 text-muted">{{ ukuran(proyek) }}</span>
      <span v-if="proyek.jumlah_tamu" class="rounded-full bg-canvas px-2.5 py-1 text-muted">{{ proyek.jumlah_tamu }} tamu</span>
    </div>
    <p class="mt-3 text-xs text-muted">
      {{ proyek.jumlah_rancangan ?? 0 }} rancangan • dibuat {{ tanggal(proyek.createdAt) }}
    </p>
    <div class="mt-4 flex gap-2">
      <RouterLink
        :to="`/proyek/${proyek.id}`"
        class="flex-1 rounded-xl bg-primary py-2.5 text-center text-sm font-semibold text-white hover:opacity-90"
      >
        Buka
      </RouterLink>
      <RouterLink
        :to="`/proyek/${proyek.id}/edit`"
        class="rounded-xl border border-line px-4 py-2.5 text-sm font-medium hover:bg-canvas"
        aria-label="Ubah proyek"
      >
        <i class="fa-solid fa-pen"></i>
      </RouterLink>
      <button
        class="rounded-xl border border-red-200 px-4 py-2.5 text-sm text-danger hover:bg-red-50"
        aria-label="Hapus proyek"
        @click="$emit('hapus', proyek)"
      >
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>
  </article>
</template>
