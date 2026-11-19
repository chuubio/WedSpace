<script setup>
defineProps({
  judul: { type: String, required: true },
  nilai: { type: [String, Number], required: true },
  ikon: { type: String, default: 'fa-star' },
})
</script>

<template>
  <div class="ws-ticket overflow-hidden bg-paper p-5">
    <div class="flex items-center justify-between border-b border-dashed border-licorice/35 pb-3">
      <p class="ws-eyebrow text-muted">{{ judul }}</p>
      <span class="flex h-10 w-10 items-center justify-center rounded-full border-2 border-licorice bg-strawberry text-cherry shadow-[2px_2px_0px_#7F1125]">
        <i :class="['fa-solid text-sm', ikon]"></i>
      </span>
    </div>
    <div class="mt-3 flex items-baseline justify-between">
      <p class="font-heading text-5xl font-bold leading-none text-licorice">{{ nilai }}</p>
      <span class="rounded-md border border-licorice/30 bg-marshmallow px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-muted">
        Tercatat
      </span>
    </div>
  </div>
</template>
