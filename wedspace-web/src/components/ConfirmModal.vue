<script setup>
defineProps({
  tampil: { type: Boolean, default: false },
  judul: { type: String, default: 'Kamu yakin?' },
  pesan: { type: String, default: '' },
  labelKonfirmasi: { type: String, default: 'Ya' },
})

defineEmits(['batal', 'konfirmasi'])
</script>

<template>
  <Teleport to="body">
    <div v-if="tampil" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" @click.self="$emit('batal')">
      <div class="w-full max-w-sm rounded-2xl border border-line bg-white p-6 shadow-xl">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <i class="fa-solid fa-triangle-exclamation text-danger"></i>
        </div>
        <h2 class="font-heading mt-4 text-center text-2xl font-semibold">{{ judul }}</h2>
        <p v-if="pesan" class="mt-1.5 text-center text-sm text-muted">{{ pesan }}</p>
        <div class="mt-6 flex gap-2">
          <button class="flex-1 rounded-xl border border-line py-2.5 font-semibold hover:bg-canvas" @click="$emit('batal')">
            Batal
          </button>
          <button class="flex-1 rounded-xl bg-danger py-2.5 font-semibold text-white hover:opacity-90" @click="$emit('konfirmasi')">
            {{ labelKonfirmasi }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
