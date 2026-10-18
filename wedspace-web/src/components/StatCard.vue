<script setup>
defineProps({
  judul: { type: String, required: true },
  nilai: { type: [String, Number], required: true },
  ikon: { type: String, default: 'fa-star' },
})
</script>

<template>
  <div class="rounded-2xl border border-line bg-white p-5 shadow-[0_4px_18px_rgba(201,120,149,0.1)]">
    <div class="flex items-center justify-between">
      <p class="text-sm text-muted">{{ judul }}</p>
      <span class="flex h-9 w-9 items-center justify-center rounded-full bg-blush">
        <i :class="['fa-solid text-primary', ikon]"></i>
      </span>
    </div>
    <p class="font-heading mt-2 text-4xl font-bold">{{ nilai }}</p>
  </div>
</template>
