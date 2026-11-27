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
  <article class="ws-paper-card ws-paper-card-hover relative flex flex-col justify-between overflow-hidden bg-paper">
    <!-- Top Scrapbook Striped Ribbon -->
    <div class="bg-stripes-pink flex items-center justify-between border-b-2 border-licorice px-4 py-2">
      <span class="rounded-full border border-licorice bg-marshmallow px-2.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-widest text-licorice">
        Berkas Proyek
      </span>
      <span class="font-heading text-xs font-bold italic text-licorice">
        {{ proyek.jumlah_rancangan ?? 0 }} rancangan
      </span>
    </div>

    <div class="flex-1 p-5">
      <h2 class="font-heading text-2xl font-bold leading-tight text-licorice">{{ proyek.nama_proyek }}</h2>
      <p class="mt-1 text-xs font-semibold text-muted">
        <i class="fa-solid fa-location-dot mr-1.5 text-cherry"></i>{{ proyek.nama_venue }}
      </p>

      <!-- Sticker & Label Badges -->
      <div class="mt-3.5 flex flex-wrap gap-1.5 text-xs">
        <span
          v-if="proyek.tema"
          class="rounded-full border border-licorice bg-strawberry px-2.5 py-0.5 text-xs font-bold text-licorice shadow-[1.5px_1.5px_0px_#7F1125]"
        >
          <i class="fa-solid fa-tag mr-1 text-[0.625rem] text-cherry"></i>{{ proyek.tema }}
        </span>
        <span class="rounded-full border border-licorice/50 bg-marshmallow px-2.5 py-0.5 text-xs font-semibold text-licorice">
          {{ ukuran(proyek) }}
        </span>
        <span
          v-if="proyek.jumlah_tamu"
          class="rounded-full border border-licorice/50 bg-violet/60 px-2.5 py-0.5 text-xs font-semibold text-licorice"
        >
          {{ proyek.jumlah_tamu }} tamu
        </span>
      </div>

      <p class="mt-4 border-t border-dashed border-licorice/30 pt-2.5 text-xs text-muted">
        {{ proyek.jumlah_rancangan ?? 0 }} rancangan • dibuat {{ tanggal(proyek.createdAt) }}
      </p>

      <div class="mt-4 flex gap-2">
        <RouterLink
          :to="`/proyek/${proyek.id}`"
          class="ws-btn-cherry flex-1 py-2.5 text-center"
        >
          Buka
        </RouterLink>
        <RouterLink
          :to="`/proyek/${proyek.id}/edit`"
          class="ws-btn-paper px-3.5 py-2.5"
          aria-label="Ubah proyek"
        >
          <i class="fa-solid fa-pen"></i>
        </RouterLink>
        <button
          class="ws-btn-paper !border-cherry !text-cherry hover:!bg-strawberry px-3.5 py-2.5"
          aria-label="Hapus proyek"
          @click="$emit('hapus', proyek)"
        >
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>
  </article>
</template>
