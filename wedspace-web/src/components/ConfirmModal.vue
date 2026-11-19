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
    <div
      v-if="tampil"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-licorice/55 p-4 backdrop-blur-[2px]"
      @click.self="$emit('batal')"
    >
      <div class="ws-paper-card w-full max-w-sm overflow-hidden bg-marshmallow">
        <div class="checkerboard-trim border-b-2 border-licorice"></div>
        <div class="p-6 text-center">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-licorice bg-strawberry shadow-[2px_2px_0px_#7F1125]">
            <i class="fa-solid fa-triangle-exclamation text-cherry"></i>
          </div>
          <h2 class="font-heading mt-4 text-3xl font-bold text-licorice">{{ judul }}</h2>
          <p v-if="pesan" class="mt-2 text-sm leading-relaxed text-muted">{{ pesan }}</p>
          <div class="mt-6 flex gap-2.5">
            <button class="ws-btn-paper flex-1 py-2.5" @click="$emit('batal')">
              Batal
            </button>
            <button class="ws-btn-cherry flex-1 py-2.5" @click="$emit('konfirmasi')">
              {{ labelKonfirmasi }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
