<script setup>
import { useRoute, useRouter } from 'vue-router'
import VintageOrnament from '../components/VintageOrnament.vue'

const route = useRoute()
const router = useRouter()
</script>

<template>
  <section class="flex min-h-screen flex-col bg-marshmallow text-licorice">
    <!-- Vintage-Modern 3D Header & Toolbar -->
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
                Visualisasi 3D
              </h1>
              <span class="ws-badge-sticker bg-violet text-licorice">3D Stage</span>
            </div>
            <p class="mt-0.5 text-[11px] font-medium text-licorice/75">
              Rancangan #{{ route.params.id }} • Pratinjau Perspektif Ruang Venue
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <RouterLink
            v-if="route.params.id"
            :to="`/rancangan/${route.params.id}/editor`"
            class="ws-btn-paper px-3.5 py-2 text-xs"
          >
            <i class="fa-solid fa-vector-square mr-1.5 text-cherry"></i>Editor 2D
          </RouterLink>
          <RouterLink
            v-if="route.params.id"
            :to="`/rancangan/${route.params.id}/estimasi`"
            class="ws-btn-cherry px-3.5 py-2 text-xs"
          >
            <i class="fa-solid fa-receipt mr-1.5"></i>Estimasi Biaya
          </RouterLink>
        </div>
      </div>
    </header>

    <!-- 3D Viewport & Side Information Panel -->
    <div class="grid flex-1 gap-4 p-4 pt-6 lg:grid-cols-12">
      <!-- Clean Unobstructed 3D Viewport Container -->
      <main class="ws-paper-card relative flex min-h-[440px] flex-col overflow-hidden bg-paper lg:col-span-9">
        <div class="flex items-center justify-between border-b-2 border-licorice bg-marshmallow px-4 py-2 text-xs font-semibold text-licorice">
          <span><i class="fa-solid fa-cube mr-1.5 text-cherry"></i>Viewport Visualisasi 3D</span>
          <span class="rounded-full border border-licorice bg-strawberry px-2.5 py-0.5 text-[10px] font-bold uppercase">
            Perspective View
          </span>
        </div>
        <div class="bg-grid-subtle flex flex-1 items-center justify-center p-6 text-center">
          <div class="max-w-sm rounded-2xl border-2 border-licorice bg-marshmallow p-6 shadow-[4px_4px_0px_#7F1125]">
            <VintageOrnament variant="ticket-stamp" label="3D Venue Preview" />
            <p class="font-heading mt-3 text-2xl font-bold text-licorice">Area Render Visualisasi 3D</p>
            <p class="mt-1 text-xs leading-relaxed text-muted">
              Menampilkan konversi tata letak dekorasi 2D ke dalam ruang tiga dimensi.
            </p>
          </div>
        </div>
      </main>

      <!-- Side Information & Camera Panel -->
      <aside class="ws-paper-card flex flex-col overflow-hidden bg-paper lg:col-span-3">
        <div class="bg-stripes-pink flex items-center justify-between border-b-2 border-licorice px-4 py-2.5">
          <span class="ws-eyebrow">Panel Informasi</span>
          <VintageOrnament variant="flower" warna="cherry" class="h-6 w-6" />
        </div>
        <div class="space-y-3 p-4 text-xs text-muted">
          <div class="rounded-xl border border-licorice/35 bg-marshmallow p-3.5">
            <p class="ws-eyebrow text-licorice">Navigasi Kamera</p>
            <p class="mt-1 leading-relaxed">
              Gunakan kontrol kamera untuk meninjau sudut pandang tamu, pelaminan, dan tata meja.
            </p>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>
