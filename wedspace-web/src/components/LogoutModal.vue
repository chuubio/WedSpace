<script setup>
import { onMounted, onUnmounted } from 'vue'

const props = defineProps({
  tampil: { type: Boolean, default: false },
  nama: { type: String, default: '' },
})
const emit = defineEmits(['batal', 'konfirmasi'])

function onKeyDown(e) {
  if (props.tampil && e.key === 'Escape') {
    emit('batal')
  }
}

onMounted(() => window.addEventListener('keydown', onKeyDown))
onUnmounted(() => window.removeEventListener('keydown', onKeyDown))
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="tampil"
        role="dialog"
        aria-modal="true"
        class="fixed inset-0 z-[80] flex items-center justify-center bg-licorice/50 p-4 backdrop-blur-[3px]"
        @click.self="$emit('batal')"
      >
        <div class="ws-paper-card relative w-full max-w-[350px] overflow-hidden rounded-[20px] bg-marshmallow shadow-[5px_5px_0px_#7F1125]">
          <div class="bg-grid-subtle px-5 pt-5 pb-4 text-center">
            <div class="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-licorice bg-marshmallow px-2.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.1em] text-licorice shadow-[2px_2px_0px_#7F1125]">
              <span class="h-1.5 w-1.5 rounded-full bg-cherry"></span>
              <span>Akun WedSpace</span>
            </div>

            <div class="mx-auto mt-3 flex h-11 w-11 items-center justify-center rounded-full border-2 border-licorice bg-strawberry/75 shadow-[2.5px_2.5px_0px_#7F1125]">
              <i class="fa-solid fa-right-from-bracket text-base text-cherry"></i>
            </div>

            <h2 class="font-heading mt-3 text-[1.45rem] leading-tight font-bold text-licorice">
              Keluar dari WedSpace?
            </h2>
            <p class="mt-1.5 text-xs leading-relaxed text-muted">
              {{ nama ? `Sampai jumpa, ${nama}. ` : '' }}Kamu harus login lagi untuk mengakses workspace.
            </p>

            <div class="mt-4 flex gap-2">
              <button
                type="button"
                class="ws-btn-paper flex-1 whitespace-nowrap px-2 py-2 text-[0.72rem]"
                @click="$emit('batal')"
              >
                Batal
              </button>
              <button
                type="button"
                class="ws-btn-cherry flex-1 whitespace-nowrap px-2 py-2 text-[0.72rem]"
                @click="$emit('konfirmasi')"
              >
                Ya, Keluar
              </button>
            </div>
          </div>

          <div class="h-1.5 w-full bg-stripes-violet border-t-[1.5px] border-licorice/25"></div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
