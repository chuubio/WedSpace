<script setup>
const meja = [
  [60, 100], [190, 100], [320, 100],
  [60, 170], [190, 170], [320, 170],
]
const kisi = {
  backgroundImage:
    'linear-gradient(#F1DCE3 1px, transparent 1px), linear-gradient(90deg, #F1DCE3 1px, transparent 1px)',
  backgroundSize: '22px 22px',
}
</script>

<template>
  <section class="mx-auto flex max-w-7xl flex-col items-center gap-12 px-4 py-14 md:px-16 lg:flex-row lg:justify-between lg:py-[72px]">
    <div class="max-w-xl text-center lg:text-left">
      <h1 class="font-heading text-5xl font-bold leading-[1.05] md:text-[68px]">
        Rancang Venue Pernikahan Lebih Mudah dengan WedSpace
      </h1>
      <p class="mx-auto mt-5 max-w-md text-[17px] leading-relaxed text-muted lg:mx-0">
        Rancang layout venue dalam 2D, visualisasikan hasilnya dalam 3D, dan dapatkan estimasi biaya dekorasi dalam satu workspace.
      </p>
      <div class="mt-8 flex flex-wrap justify-center gap-2 lg:justify-start">
        <RouterLink to="/login" class="rounded-xl bg-primary px-6 py-3.5 font-semibold text-white hover:opacity-90">
          Mulai Merancang
        </RouterLink>
        <RouterLink to="/#cara-kerja" class="rounded-xl border border-line bg-white px-6 py-3.5 font-semibold">
          Lihat Cara Kerja
        </RouterLink>
      </div>
    </div>

    <div class="w-full max-w-[620px] rounded-2xl border border-line bg-white p-3.5 shadow-[0_4px_18px_rgba(201,120,149,0.1)]">
      <p class="mb-2.5 text-xs text-muted">● ● ● Editor 2D · Pernikahan Prabs &amp; Teddy</p>
      <div class="flex gap-2">
        <div class="relative h-[264px] flex-1 overflow-hidden rounded-lg border border-line bg-canvas" :style="kisi">
          <div class="absolute left-[150px] top-[14px] flex h-10 w-24 items-center justify-center rounded border border-primary/60 bg-petal text-[10px]">Pelaminan</div>
          <div
            v-for="(m, i) in meja"
            :key="i"
            class="absolute flex h-8 w-8 items-center justify-center rounded border border-primary/60 bg-blush text-[10px]"
            :style="{ left: m[0] + 'px', top: m[1] + 'px' }"
          >Meja</div>
          <div class="absolute bottom-3 left-[110px] flex h-3 w-40 items-center justify-center rounded border border-primary/60 bg-line text-[9px]">Kursi ×60</div>
        </div>
        <div class="hidden w-[130px] rounded-xl bg-blush p-3 text-xs leading-8 text-muted sm:block">
          Pelaminan<br />Meja ×6<br />Kursi ×60<br />
          <b class="text-sm text-primary">Rp13,9 jt</b>
        </div>
      </div>
      <div class="mt-2.5 flex gap-2">
        <div class="flex-1 rounded-xl bg-blush p-3"><span class="text-xs text-muted">Visualisasi 3D</span><br /><b>Siap ditinjau</b></div>
        <div class="flex-1 rounded-xl bg-blush p-3"><span class="text-xs text-muted">Estimasi biaya</span><br /><b>Diperbarui otomatis</b></div>
      </div>
    </div>
  </section>
</template>
