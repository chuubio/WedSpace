<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  awal: { type: Object, default: () => ({}) },
  sibuk: { type: Boolean, default: false },
  error: { type: String, default: '' },
  dilarang: { type: Boolean, default: false },
})

const emit = defineEmits(['simpan', 'batal'])

const form = ref({
  nama_proyek: '',
  nama_venue: '',
  panjang_venue: '',
  lebar_venue: '',
  jumlah_tamu: '',
  tema: '',
  anggaran: '',
})

function kirim() {
  if (props.dilarang) return
  emit('simpan', { ...form.value })
}

watch(() => props.awal, (v) => {
  form.value = {
    nama_proyek: v.nama_proyek || '',
    nama_venue: v.nama_venue || '',
    panjang_venue: v.panjang_venue ?? '',
    lebar_venue: v.lebar_venue ?? '',
    jumlah_tamu: v.jumlah_tamu ?? '',
    tema: v.tema || '',
    anggaran: v.anggaran ?? '',
  }
}, { immediate: true })

const medan = 'ws-input'
</script>

<template>
  <form class="ws-paper-card overflow-hidden bg-paper" @submit.prevent="kirim">
    <!-- Decorative Spiral Notebook Top Bar -->
    <div class="bg-stripes-pink flex items-center justify-between border-b-2 border-licorice px-6 py-3">
      <span class="ws-eyebrow">Formulir Spesifikasi Venue</span>
      <span class="rounded-full border border-licorice bg-peach px-2.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wider text-licorice">
        Lembar Kerja WO
      </span>
    </div>

    <div class="p-6 sm:p-8">
      <div class="grid gap-4 md:grid-cols-2">
        <div class="md:col-span-2">
          <label class="ws-eyebrow mb-1.5 block" for="nama-proyek">Nama proyek</label>
          <input id="nama-proyek" v-model="form.nama_proyek" placeholder="cth: Pernikahan Rina & Dimas" :class="medan" />
        </div>
        <div class="md:col-span-2">
          <label class="ws-eyebrow mb-1.5 block" for="nama-venue">Nama venue</label>
          <input id="nama-venue" v-model="form.nama_venue" placeholder="cth: Grand Ballroom Balikpapan" :class="medan" />
        </div>
        <div>
          <label class="ws-eyebrow mb-1.5 block" for="panjang">Panjang venue (m)</label>
          <input id="panjang" v-model="form.panjang_venue" type="number" min="0" step="any" :class="medan" />
        </div>
        <div>
          <label class="ws-eyebrow mb-1.5 block" for="lebar">Lebar venue (m)</label>
          <input id="lebar" v-model="form.lebar_venue" type="number" min="0" step="any" :class="medan" />
        </div>
        <div>
          <label class="ws-eyebrow mb-1.5 block" for="tamu">Jumlah tamu</label>
          <input id="tamu" v-model="form.jumlah_tamu" type="number" min="0" step="1" :class="medan" />
        </div>
        <div>
          <label class="ws-eyebrow mb-1.5 block" for="anggaran">Anggaran (Rp)</label>
          <input id="anggaran" v-model="form.anggaran" type="number" min="0" step="1" :class="medan" />
        </div>
        <div class="md:col-span-2">
          <label class="ws-eyebrow mb-1.5 block" for="tema">Tema</label>
          <input id="tema" v-model="form.tema" placeholder="cth: Rustic Elegan" :class="medan" />
        </div>
      </div>

      <p
        v-if="error"
        class="mt-4 rounded-xl border-2 border-licorice bg-strawberry/75 px-4 py-3 text-sm font-semibold text-cherry"
      >
        <i class="fa-solid fa-circle-exclamation mr-1.5"></i>{{ error }}
      </p>

      <div class="mt-6 flex gap-3 border-t border-dashed border-licorice/35 pt-5">
        <button type="button" class="ws-btn-paper flex-1 py-3" @click="$emit('batal')">
          Batal
        </button>
        <button
          type="submit"
          :disabled="sibuk || dilarang"
          class="ws-btn-cherry flex-1 py-3 disabled:opacity-60"
        >
          {{ sibuk ? 'Menyimpan…' : 'Simpan Proyek' }}
        </button>
      </div>
    </div>
  </form>
</template>
