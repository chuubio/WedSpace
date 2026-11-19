<script setup>
import VintageOrnament from './VintageOrnament.vue'
</script>

<template>
  <footer class="relative bg-licorice text-marshmallow">
    <!-- Signature Nectar Checkerboard Top Border -->
    <div class="checkerboard-divider border-y-2 border-licorice"></div>

    <div class="mx-auto max-w-7xl px-4 py-14 md:px-16">
      <div class="grid gap-10 sm:grid-cols-2 lg:grid-cols-12">
        <div class="lg:col-span-5">
          <div class="flex flex-wrap items-center gap-3">
            <span class="font-heading text-4xl font-bold tracking-tight text-strawberry">wedspace</span>
            <VintageOrnament variant="oval-sticker" label="designed for weddings!" warna="peach" class="-rotate-3 scale-90" />
          </div>
          <p class="mt-4 max-w-sm text-sm leading-relaxed text-marshmallow/80">
            Workspace perancangan venue pernikahan untuk Wedding Organizer. Susun layout 2D, pratinjau 3D, dan hitung estimasi anggaran dengan sentuhan editorial.
          </p>
          <div class="mt-5 flex items-center gap-2">
            <span class="rounded-full border border-marshmallow/30 bg-cherry px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-marshmallow">
              Est. 2026
            </span>
            <span class="rounded-full border border-marshmallow/30 bg-violet px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-licorice">
              Balikpapan, ID
            </span>
          </div>
        </div>

        <div class="lg:col-span-2">
          <b class="ws-eyebrow !text-strawberry">Navigasi</b>
          <ul class="mt-3 space-y-2 text-sm text-marshmallow/80">
            <li><RouterLink to="/" class="hover:text-strawberry">Home</RouterLink></li>
            <li><RouterLink to="/#tentang" class="hover:text-strawberry">Tentang</RouterLink></li>
            <li><RouterLink to="/#cara-kerja" class="hover:text-strawberry">Cara Kerja</RouterLink></li>
            <li><RouterLink to="/login" class="hover:text-strawberry">Login</RouterLink></li>
          </ul>
        </div>


        <div class="lg:col-span-3">
          <b class="ws-eyebrow !text-strawberry">Kontak Studio</b>
          <div class="mt-3 rounded-2xl border border-marshmallow/25 bg-marshmallow/10 p-4">
            <ul class="space-y-2 text-sm text-marshmallow/90">
              <li class="flex items-center gap-2">
                <i class="fa-regular fa-envelope text-strawberry"></i>
                <span>halo@wedspace.id</span>
              </li>
              <li class="flex items-center gap-2">
                <i class="fa-solid fa-location-dot text-peach"></i>
                <span>Balikpapan, Indonesia</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div class="border-t border-marshmallow/15 bg-licorice/95 px-4 py-4 text-center text-xs tracking-wider text-marshmallow/70">
      © 2026 WedSpace. Hak cipta dilindungi.
    </div>
  </footer>
</template>
