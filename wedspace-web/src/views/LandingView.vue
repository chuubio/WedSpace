<script setup>
import HeroSection from '../components/HeroSection.vue'
import VintageOrnament from '../components/VintageOrnament.vue'

const masalah = [
  'Sulit membayangkan susunan dekorasi',
  'Sulit melihat gambaran venue sebelum acara',
  'Sulit memperkirakan biaya dekorasi',
]
const alur = ['Layout 2D', 'Visualisasi 3D', 'Estimasi Biaya']
const fitur = [
  { ikon: 'fa-folder-open', judul: 'Project Management', isi: 'Membuat dan mengelola proyek venue.', warna: 'bg-strawberry' },
  { ikon: 'fa-images', judul: 'Decoration Catalog', isi: 'Melihat katalog dan detail dekorasi.', warna: 'bg-peach' },
  { ikon: 'fa-table-cells', judul: '2D Venue Layout', isi: 'Menyusun dekorasi pada layout venue.', warna: 'bg-violet' },
  { ikon: 'fa-cube', judul: '3D Visualization', isi: 'Melihat rancangan venue dalam visualisasi 3D.', warna: 'bg-strawberry' },
  { ikon: 'fa-calculator', judul: 'Cost Estimation', isi: 'Melihat estimasi biaya berdasarkan dekorasi yang digunakan.', warna: 'bg-peach' },
  { ikon: 'fa-wand-magic-sparkles', judul: 'Decoration Recommendation', isi: 'Membantu WO menemukan pilihan dekorasi yang sesuai dengan kebutuhan rancangan.', warna: 'bg-violet' },
]
const langkah = ['Buat Proyek', 'Pilih Dekorasi', 'Rancang Layout 2D', 'Lihat Visualisasi 3D', 'Cek Estimasi Biaya']
const kartu = 'ws-paper-card ws-paper-card-hover'
</script>

<template>
  <!-- 1. HERO SECTION -->
  <HeroSection />

  <!-- =========================================================================
       AREA TENTANG (#tentang):
       2. Semua Kebutuhan Perancangan Venue dalam Satu Workspace
       3. Tentang — Merancang Venue Tidak Harus Rumit
       ========================================================================= -->
  <div id="tentang">
    <!-- 2. SEMUA KEBUTUHAN PERANCANGAN VENUE DALAM SATU WORKSPACE -->
    <section class="border-b-2 border-licorice bg-marshmallow">
      <div class="mx-auto grid max-w-7xl lg:grid-cols-12">
        <!-- Left Column on Cream -->
        <div class="flex flex-col justify-center px-6 py-16 md:px-14 lg:col-span-6">
          <p class="ws-eyebrow">TENTANG WEDSPACE</p>

          <h2 class="font-heading mt-3 text-4xl font-bold leading-[1.04] text-licorice md:text-5xl">
            Semua Kebutuhan Perancangan Venue dalam Satu Workspace
          </h2>

          <p class="mt-4 max-w-lg text-sm leading-relaxed text-muted md:text-base">
            WedSpace membantu Wedding Organizer merancang venue secara digital, dari layout sampai anggaran.
          </p>

          <!-- 3 Scalloped Stamp Badges for Alur -->
          <div class="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
            <template v-for="(a, i) in alur" :key="a">
              <VintageOrnament
                variant="scallop-stamp"
                :label="`0${i + 1}`"
                :sublabel="a"
                :warna="i === 0 ? 'peach' : i === 1 ? 'licorice' : 'strawberry'"
              />
              <span v-if="i < alur.length - 1" class="font-heading text-2xl font-bold text-cherry">→</span>
            </template>
          </div>
        </div>

        <!-- Right Column on Vertical Pink Stripes with Dinner Wedding Visual Card -->
        <div class="bg-stripes-pink relative flex items-center justify-center border-t-2 border-licorice px-6 py-14 lg:col-span-6 lg:border-l-2 lg:border-t-0">
          <div class="relative w-full max-w-md">
            <!-- Oval Sticker at Top Center -->
            <div class="mb-3 flex justify-center">
              <VintageOrnament
                variant="oval-sticker"
                label="designed to delight!"
                warna="peach"
              />
            </div>

            <!-- Paper-like Scrapbook Frame with dinner wedding.jpeg -->
            <div class="ws-paper-card relative bg-marshmallow p-4">
              <div class="bg-stripes-cherry mb-3 h-5 w-full rounded-lg border-2 border-licorice"></div>

              <div class="overflow-hidden rounded-xl border-2 border-licorice bg-paper">
                <img
                  src="/picture/dinner%20wedding.jpeg"
                  alt="Suasana dinner wedding outdoor dengan penataan meja makan bundar, rangkaian bunga segar, dan kursi tamu"
                  class="aspect-[4/3] w-full object-cover object-center"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 3. TENTANG — MERANCANG VENUE TIDAK HARUS RUMIT -->
    <section class="border-b-2 border-licorice bg-cherry px-4 py-16 md:px-16">
      <div class="mx-auto max-w-6xl">
        <!-- Cream Notebook Paper Card with Spiral Punch Holes on Top -->
        <div class="overflow-hidden rounded-b-2xl border-2 border-licorice bg-marshmallow shadow-[6px_6px_0px_#7F1125]">
          <div class="notebook-punch-cherry"></div>

          <div class="px-5 pb-10 pt-6 text-center md:px-12">
            <p class="ws-eyebrow text-licorice/80">TANTANGAN PERENCANAAN VENUE</p>
            <h2 class="font-heading mt-1 text-4xl font-bold text-licorice md:text-5xl">
              Merancang Venue Tidak Harus Rumit
            </h2>

            <!-- Nectar-style Schedule/Column Grid for Masalah (tanpa lingkaran lavender) -->
            <div class="mx-auto mt-8 grid max-w-5xl border-2 border-licorice bg-marshmallow md:grid-cols-4">
              <!-- Column 0: Dark Licorice Header Block -->
              <div class="flex flex-col items-center justify-center border-b-2 border-licorice bg-licorice p-6 text-marshmallow md:border-b-0 md:border-r-2">
                <span class="text-[10px] font-bold uppercase tracking-widest text-strawberry">Tantangan</span>
                <span class="font-heading mt-2 text-2xl font-bold italic underline decoration-strawberry underline-offset-4">
                  Masalah Umum WO
                </span>
                <span class="mt-2 text-xs text-marshmallow/75">Sebelum memakai WedSpace</span>
              </div>

              <!-- 3 Masalah Columns -->
              <div
                v-for="(m, idx) in masalah"
                :key="m"
                :class="[
                  'flex flex-col items-center justify-between p-6 text-center',
                  idx < masalah.length - 1 ? 'border-b-2 border-licorice md:border-b-0 md:border-r-2' : '',
                ]"
              >
                <div class="flex w-full items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted">
                  <span>KASUS 0{{ idx + 1 }}</span>
                  <span>(WO)</span>
                </div>

                <div class="my-4 flex h-12 w-12 items-center justify-center rounded-full border-2 border-licorice bg-strawberry font-heading text-2xl font-bold text-licorice shadow-[2px_2px_0px_#7F1125]">
                  !
                </div>

                <b class="text-sm font-bold leading-snug text-licorice underline decoration-licorice/40 underline-offset-2">
                  {{ m }}
                </b>

                <span class="mt-3 text-[11px] font-medium text-muted">Teratasi di WedSpace</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>

  <!-- =========================================================================
       4. FITUR WEDSPACE (#fitur)
       ========================================================================= -->
  <section id="fitur" class="bg-grid-paper border-b-2 border-licorice px-4 py-16 md:px-16">
    <div class="mx-auto max-w-6xl">
      <div class="text-center">
        <span class="ws-badge-sticker bg-strawberry text-licorice">
          <i class="fa-solid fa-star text-cherry"></i> Perangkat Perencana
        </span>
        <h2 class="font-heading mt-3 text-4xl font-bold text-licorice md:text-5xl">Fitur Utama</h2>
        <p class="mx-auto mt-2 max-w-xl text-sm text-muted">
          Enam modul terintegrasi untuk merancang venue pernikahan dengan presisi dan gaya.
        </p>
      </div>

      <div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="(f, idx) in fitur"
          :key="f.judul"
          :class="[kartu, 'relative overflow-hidden p-6']"
        >
          <div class="flex items-center justify-between">
            <span
              :class="[
                'flex h-11 w-11 items-center justify-center rounded-xl border-2 border-licorice text-licorice shadow-[2px_2px_0px_#7F1125]',
                f.warna,
              ]"
            >
              <i :class="['fa-solid text-lg', f.ikon]"></i>
            </span>
          </div>

          <b class="font-heading mt-4 block text-2xl font-bold text-licorice">{{ f.judul }}</b>
          <p class="mt-1.5 text-sm leading-relaxed text-muted">{{ f.isi }}</p>

          <div class="mt-4 border-t border-dashed border-licorice/30 pt-2.5 text-[10px] font-bold uppercase tracking-widest text-cherry">
            WedSpace Standard • Included
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- SIGNATURE NECTAR CHECKERBOARD SECTION DIVIDER -->
  <div class="checkerboard-divider border-b-2 border-licorice"></div>

  <!-- =========================================================================
       5. CARA KERJA (#cara-kerja) & 6. FINAL CALL TO ACTION
       ========================================================================= -->
  <section id="cara-kerja" class="relative overflow-hidden bg-violet px-4 py-16 md:px-16">
    <div class="mx-auto max-w-5xl">
      <!-- Scalloped Top Edge -->
      <div class="scallop-edge-top-cream"></div>

      <!-- Main Cream Cloud / Scalloped Paper Card -->
      <div class="relative bg-marshmallow px-6 py-12 text-center md:px-14">
        <!-- Red Sticker Badge in Top Right Corner -->
        <div class="mb-4 flex justify-center sm:absolute sm:-top-4 sm:right-8 sm:mb-0 sm:rotate-6">
          <VintageOrnament variant="oval-sticker" label="5 langkah mudah!" warna="cherry" />
        </div>

        <!-- Center Ticket Emblem -->
        <div class="flex justify-center">
          <VintageOrnament variant="ticket-stamp" label="WedSpace Atelier Club" />
        </div>

        <p class="mt-4 inline-block bg-strawberry px-3 py-0.5 text-[16px] font-bold uppercase tracking-[0.16em] text-licorice">
          PANDUAN LANGKAH DEMI LANGKAH
        </p>

        <!-- 5 Langkah in Ticket/Stamp Cards -->
        <ol class="mx-auto mt-9 grid max-w-4xl gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <li
            v-for="(l, i) in langkah"
            :key="l"
            class="relative flex flex-col items-center rounded-2xl border-2 border-licorice bg-paper p-4 shadow-[3px_3px_0px_#7F1125]"
          >
            <div
              :class="[
                'mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-licorice font-heading text-2xl font-bold text-licorice shadow-[2px_2px_0px_#7F1125]',
                i % 3 === 0 ? 'bg-strawberry' : i % 3 === 1 ? 'bg-peach' : 'bg-violet',
              ]"
            >
              {{ i + 1 }}
            </div>
            <p class="mt-3 text-sm font-bold text-licorice">{{ l }}</p>
            <span class="mt-1 text-[10px] uppercase tracking-wider text-muted">Tahap 0{{ i + 1 }}</span>
          </li>
        </ol>

        <!-- Dashed Perforation Line inside Scalloped Card -->
        <div class="my-10 border-t-2 border-dashed border-licorice/35"></div>

        <!-- 6. FINAL CALL TO ACTION (Satu-satunya tombol "Mulai Merancang" di bagian akhir halaman) -->
        <div class="mx-auto max-w-xl">
          <h2 class="font-heading text-4xl font-bold text-licorice md:text-[44px]">
            Siap Merancang Venue Impian?
          </h2>
          <p class="mt-2 text-sm text-muted">
            Mulai buat proyek pernikahan pertamamu, susun dekorasi di kanvas 2D, dan presentasikan hasilnya kepada klien.
          </p>
          <div class="mt-6 flex justify-center">
            <RouterLink to="/login" class="ws-btn-cherry px-8 py-3.5 text-sm">
              Mulai Merancang
            </RouterLink>
          </div>
        </div>
      </div>

      <!-- Scalloped Bottom Edge -->
      <div class="scallop-edge-bottom-cream"></div>
    </div>
  </section>
</template>
