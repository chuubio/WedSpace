<script setup>
import { onMounted, onUnmounted } from 'vue'

const props = defineProps({
  tampil: { type: Boolean, default: false },
  judul: { type: String, default: 'Perubahan Belum Disimpan' },
  pesan: {
    type: String,
    default: 'Ada perubahan pada rancangan yang belum disimpan. Jika kamu keluar sekarang, perubahan tersebut akan hilang.',
  },
  labelWorkspace: { type: String, default: 'Workspace 3D' },
  bisaSimpan: { type: Boolean, default: true },
  menyimpan: { type: Boolean, default: false },
})

const emit = defineEmits(['batal', 'keluar', 'simpan-keluar'])

function onKeyDown(e) {
  if (props.tampil && e.key === 'Escape' && !props.menyimpan) {
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
        aria-labelledby="ws-unsaved-title"
        class="fixed inset-0 z-[80] flex items-center justify-center bg-licorice/50 p-4 backdrop-blur-[3px]"
        @click.self="!menyimpan && $emit('batal')"
      >
        <div class="ws-paper-card relative w-full max-w-[350px] overflow-hidden rounded-[20px] bg-marshmallow shadow-[5px_5px_0px_#7F1125]">
          <!-- Konten Peringatan (bersih tanpa stripe di atas) -->
          <div class="bg-grid-subtle px-5 pt-5 pb-4 text-center">
            <div class="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-licorice bg-marshmallow px-2.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.1em] text-licorice shadow-[2px_2px_0px_#7F1125]">
              <span class="h-1.5 w-1.5 rounded-full bg-cherry"></span>
              <span>{{ labelWorkspace }}</span>
            </div>

            <div class="mx-auto mt-3 flex h-11 w-11 items-center justify-center rounded-full border-2 border-licorice bg-strawberry/75 shadow-[2.5px_2.5px_0px_#7F1125]">
              <i class="fa-solid fa-triangle-exclamation text-base text-cherry"></i>
            </div>

            <h2 id="ws-unsaved-title" class="font-heading mt-3 text-[1.45rem] leading-tight font-bold text-licorice">
              {{ judul }}
            </h2>
            <p class="mt-1.5 text-xs leading-relaxed text-muted">
              {{ pesan }}
            </p>

            <!-- Tombol Aksi -->
            <div class="mt-4 space-y-2">
              <button
                v-if="bisaSimpan"
                type="button"
                :disabled="menyimpan"
                class="ws-btn-cherry w-full gap-1.5 py-2 text-[0.72rem] disabled:opacity-60"
                @click="$emit('simpan-keluar')"
              >
                <i v-if="menyimpan" class="fa-solid fa-circle-notch fa-spin"></i>
                <i v-else class="fa-solid fa-floppy-disk"></i>
                <span>{{ menyimpan ? 'Menyimpan Perubahan…' : 'Simpan & Keluar' }}</span>
              </button>

              <div class="flex gap-2">
                <button
                  type="button"
                  :disabled="menyimpan"
                  class="ws-btn-paper flex-1 whitespace-nowrap px-2 py-2 text-[0.72rem] disabled:opacity-60"
                  @click="$emit('batal')"
                >
                  Tetap di Sini
                </button>
                <button
                  type="button"
                  :disabled="menyimpan"
                  class="inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-[10px] border-[1.5px] border-licorice bg-strawberry/80 px-2 py-2 text-[0.72rem] font-bold tracking-[0.03em] text-licorice shadow-[2.5px_2.5px_0px_#7F1125] transition hover:-translate-x-[1px] hover:-translate-y-[1px] hover:bg-strawberry hover:shadow-[3.5px_3.5px_0px_#7F1125] disabled:opacity-60"
                  @click="$emit('keluar')"
                >
                  Keluar Tanpa Simpan
                </button>
              </div>
            </div>
          </div>

          <!-- Aksen Trim Bawah Lembut -->
          <div class="h-1.5 w-full bg-stripes-violet border-t-[1.5px] border-licorice/25"></div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
