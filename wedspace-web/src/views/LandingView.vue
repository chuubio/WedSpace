<script setup>
import HeroSection from '../components/HeroSection.vue'

const masalah = [
  'Sulit membayangkan susunan dekorasi',
  'Sulit melihat gambaran venue sebelum acara',
  'Sulit memperkirakan biaya dekorasi',
]
const alur = ['Layout 2D', 'Visualisasi 3D', 'Estimasi Biaya']
const fitur = [
  { ikon: 'fa-folder-open', judul: 'Project Management', isi: 'Membuat dan mengelola proyek venue.' },
  { ikon: 'fa-images', judul: 'Decoration Catalog', isi: 'Melihat katalog dan detail dekorasi.' },
  { ikon: 'fa-table-cells', judul: '2D Venue Layout', isi: 'Menyusun dekorasi pada layout venue.' },
  { ikon: 'fa-cube', judul: '3D Visualization', isi: 'Melihat rancangan venue dalam visualisasi 3D.' },
  { ikon: 'fa-calculator', judul: 'Cost Estimation', isi: 'Melihat estimasi biaya berdasarkan dekorasi yang digunakan.' },
  { ikon: 'fa-wand-magic-sparkles', judul: 'Decoration Recommendation', isi: 'Membantu WO menemukan pilihan dekorasi yang sesuai dengan kebutuhan rancangan.' },
]
const langkah = ['Buat Proyek', 'Pilih Dekorasi', 'Rancang Layout 2D', 'Lihat Visualisasi 3D', 'Cek Estimasi Biaya']
const kartu = 'rounded-2xl border border-line bg-white shadow-[0_4px_18px_rgba(201,120,149,0.1)]'
</script>

<template>
  <HeroSection />

  <section class="border-y border-line bg-white px-4 py-16 text-center md:px-16">
    <h2 class="font-heading mb-7 text-4xl font-semibold md:text-[42px]">Merancang Venue Tidak Harus Rumit</h2>
    <div class="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
      <div v-for="m in masalah" :key="m" :class="[kartu, 'flex items-center gap-3 p-6 text-left']">
        <span class="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-blush font-bold text-primary">!</span>
        <b>{{ m }}</b>
      </div>
    </div>
  </section>

  <section id="tentang" class="px-4 py-16 text-center md:px-16">
    <h2 class="font-heading mx-auto mb-3 max-w-2xl text-4xl font-semibold md:text-[42px]">
      Semua Kebutuhan Perancangan Venue dalam Satu Workspace
    </h2>
    <p class="mb-8 text-muted">WedSpace membantu Wedding Organizer merancang venue secara digital, dari layout sampai anggaran.</p>
    <div class="flex flex-wrap items-center justify-center gap-4">
      <template v-for="(a, i) in alur" :key="a">
        <div :class="[kartu, 'p-6 font-semibold']">{{ a }}</div>
        <span v-if="i < alur.length - 1" class="text-2xl text-primary">→</span>
      </template>
    </div>
  </section>

  <section id="fitur" class="border-y border-line bg-white px-4 py-16 md:px-16">
    <h2 class="font-heading mb-7 text-center text-4xl font-semibold md:text-[42px]">Fitur Utama</h2>
    <div class="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="f in fitur" :key="f.judul" :class="[kartu, 'p-6']">
        <i :class="['fa-solid mb-3 text-xl text-rosy', f.ikon]"></i>
        <b class="block">{{ f.judul }}</b>
        <p class="mt-1.5 leading-relaxed text-muted">{{ f.isi }}</p>
      </div>
    </div>
  </section>

  <section id="cara-kerja" class="px-4 py-16 text-center md:px-16">
    <h2 class="font-heading mb-10 text-4xl font-semibold md:text-[42px]">Cara Kerja</h2>
    <ol class="mx-auto grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-5">
      <li v-for="(l, i) in langkah" :key="l">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-petal font-semibold">{{ i + 1 }}</div>
        <p class="mt-3 font-medium">{{ l }}</p>
      </li>
    </ol>
  </section>

  <section class="px-4 pb-16 md:px-16">
    <div class="mx-auto max-w-6xl rounded-[28px] bg-blush px-6 py-16 text-center">
      <h2 class="font-heading mb-6 text-4xl font-semibold md:text-[42px]">Siap Merancang Venue Impian?</h2>
      <RouterLink to="/login" class="inline-block rounded-xl bg-primary px-7 py-3.5 font-semibold text-white hover:opacity-90">
        Mulai Merancang
      </RouterLink>
    </div>
  </section>
</template>
