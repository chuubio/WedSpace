<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  awal: { type: Object, default: () => ({}) },
  sibuk: { type: Boolean, default: false },
  error: { type: String, default: '' },
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

const medan = 'w-full rounded-xl border border-line bg-canvas px-4 py-2.5 outline-none focus:border-primary'

function kirim() {
  emit('simpan', { ...form.value })
}
</script>

<template>
  <form class="rounded-2xl border border-line bg-white p-6 shadow-[0_4px_18px_rgba(201,120,149,0.1)]" @submit.prevent="kirim">
    <div class="grid gap-4 md:grid-cols-2">
      <div class="md:col-span-2">
        <label class="mb-1 block text-sm font-medium" for="nama-proyek">Nama proyek</label>
        <input id="nama-proyek" v-model="form.nama_proyek" placeholder="cth: Pernikahan Rina & Dimas" :class="medan" />
      </div>
      <div class="md:col-span-2">
        <label class="mb-1 block text-sm font-medium" for="nama-venue">Nama venue</label>
        <input id="nama-venue" v-model="form.nama_venue" placeholder="cth: Grand Ballroom Balikpapan" :class="medan" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium" for="panjang">Panjang venue (m)</label>
        <input id="panjang" v-model="form.panjang_venue" type="number" min="0" step="any" :class="medan" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium" for="lebar">Lebar venue (m)</label>
        <input id="lebar" v-model="form.lebar_venue" type="number" min="0" step="any" :class="medan" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium" for="tamu">Jumlah tamu</label>
        <input id="tamu" v-model="form.jumlah_tamu" type="number" min="0" step="1" :class="medan" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium" for="anggaran">Anggaran (Rp)</label>
        <input id="anggaran" v-model="form.anggaran" type="number" min="0" step="1" :class="medan" />
      </div>
      <div class="md:col-span-2">
        <label class="mb-1 block text-sm font-medium" for="tema">Tema</label>
        <input id="tema" v-model="form.tema" placeholder="cth: Rustic Elegan" :class="medan" />
      </div>
    </div>

    <p v-if="error" class="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">{{ error }}</p>

    <div class="mt-5 flex gap-2">
      <button type="button" class="flex-1 rounded-xl border border-line py-2.5 font-semibold hover:bg-canvas" @click="$emit('batal')">
        Batal
      </button>
      <button type="submit" :disabled="sibuk" class="flex-1 rounded-xl bg-primary py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-60">
        {{ sibuk ? 'Menyimpan…' : 'Simpan Proyek' }}
      </button>
    </div>
  </form>
</template>
