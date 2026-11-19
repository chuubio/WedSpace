<script setup>
import { useRoute, useRouter } from 'vue-router'
import VintageOrnament from '../components/VintageOrnament.vue'

const route = useRoute()
const router = useRouter()
</script>

<template>
  <section class="flex min-h-screen flex-col bg-marshmallow text-licorice">
    <!-- Vintage-Modern Editor Toolbar with Scalloped Bottom Edge -->
    <header class="scallop-bottom-pink relative z-20 border-b-2 border-licorice bg-strawberry px-4 py-3 md:px-8">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="ws-btn-paper px-3.5 py-2 text-xs"
            @click="router.back()"
          >
            <i class="fa-solid fa-arrow-left mr-1.5"></i>Kembali
          </button>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="font-heading text-2xl font-bold leading-none text-licorice md:text-3xl">
                Editor Layout 2D
              </h1>
              <span class="ws-badge-sticker bg-peach text-licorice">Kanvas 2D</span>
            </div>
            <p class="mt-0.5 text-[11px] font-medium text-licorice/75">
              Rancangan #{{ route.params.id }} • Ruang Kerja Perancangan Venue
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <RouterLink
            v-if="route.params.id"
            :to="`/rancangan/${route.params.id}/estimasi`"
            class="ws-btn-paper px-3.5 py-2 text-xs"
          >
            <i class="fa-solid fa-receipt mr-1.5 text-cherry"></i>Estimasi
          </RouterLink>
          <RouterLink
            v-if="route.params.id"
            :to="`/rancangan/${route.params.id}/3d`"
            class="ws-btn-violet px-3.5 py-2 text-xs"
          >
            <i class="fa-solid fa-cube mr-1.5"></i>Visualisasi 3D
          </RouterLink>
        </div>
      </div>
    </header>

    <!-- Main 2D Workspace Area -->
    <div class="grid flex-1 gap-4 p-4 pt-6 lg:grid-cols-12">
      <!-- Left Panel: Decoration Catalog Palette -->
      <aside class="ws-paper-card flex flex-col overflow-hidden bg-paper lg:col-span-3">
        <div class="bg-stripes-pink flex items-center justify-between border-b-2 border-licorice px-4 py-2.5">
          <span class="ws-eyebrow">Palet Dekorasi</span>
          <span class="ws-badge-sticker bg-strawberry text-licorice">Kategori</span>
        </div>
        <div class="flex-1 space-y-3 p-4">
          <div class="flex flex-wrap gap-1.5">
            <span class="ws-badge-sticker bg-strawberry text-licorice">Pelaminan</span>
            <span class="ws-badge-sticker bg-peach text-licorice">Meja</span>
            <span class="ws-badge-sticker bg-violet text-licorice">Kursi</span>
          </div>
          <p class="text-xs leading-relaxed text-muted">
            Area daftar elemen dekorasi untuk disusun pada kanvas lantai venue 2D.
          </p>
        </div>
      </aside>

      <!-- Center: Spacious 2D Floorplan Canvas with Ultra-Subtle Grid Paper -->
      <main class="ws-paper-card bg-grid-subtle relative flex min-h-[420px] flex-col overflow-hidden lg:col-span-6">
        <div class="flex items-center justify-between border-b border-dashed border-licorice/35 bg-marshmallow/90 px-4 py-2 text-xs font-semibold text-muted">
          <span><i class="fa-solid fa-border-all mr-1.5 text-cherry"></i>Area Kanvas Venue 2D</span>
          <span class="rounded-md border border-licorice/30 bg-paper px-2 py-0.5 text-[10px] font-bold uppercase text-licorice">
            Grid 1m × 1m
          </span>
        </div>
        <div class="flex flex-1 items-center justify-center p-6 text-center">
          <div class="max-w-sm rounded-2xl border-2 border-dashed border-licorice/35 bg-marshmallow/90 p-6">
            <p class="font-heading text-2xl font-bold text-licorice">Kanvas Layout 2D</p>
            <p class="mt-1 text-xs leading-relaxed text-muted">
              Bidang kerja penataan posisi dan orientasi dekorasi venue.
            </p>
          </div>
        </div>
      </main>

      <!-- Right Panel: Properties Paper Card -->
      <aside class="ws-paper-card flex flex-col overflow-hidden bg-paper lg:col-span-3">
        <div class="bg-stripes-violet flex items-center justify-between border-b-2 border-licorice px-4 py-2.5">
          <span class="ws-eyebrow">Properti Item</span>
          <VintageOrnament variant="sparkle" warna="peach" class="h-5 w-5" />
        </div>
        <div class="flex-1 space-y-3 p-4 text-xs text-muted">
          <div class="rounded-xl border border-licorice/30 bg-marshmallow p-3">
            <p class="ws-eyebrow text-licorice">Koordinat &amp; Rotasi</p>
            <p class="mt-1">Pilih item dekorasi pada kanvas untuk melihat posisi X, Y, rotasi, dan jumlah unit.</p>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>
