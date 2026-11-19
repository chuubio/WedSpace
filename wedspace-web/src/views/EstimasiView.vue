<script setup>
import { useRoute, useRouter } from 'vue-router'
import VintageOrnament from '../components/VintageOrnament.vue'

const route = useRoute()
const router = useRouter()
</script>

<template>
  <section class="mx-auto max-w-4xl space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <button
        type="button"
        class="ws-btn-paper px-4 py-2 text-xs uppercase tracking-wider"
        @click="router.back()"
      >
        <i class="fa-solid fa-arrow-left mr-2"></i>Kembali
      </button>

      <div class="flex flex-wrap gap-2">
        <RouterLink
          v-if="route.params.id"
          :to="`/rancangan/${route.params.id}/editor`"
          class="ws-btn-paper px-4 py-2 text-xs"
        >
          <i class="fa-solid fa-vector-square mr-1.5 text-cherry"></i>Editor 2D
        </RouterLink>
        <RouterLink
          v-if="route.params.id"
          :to="`/rancangan/${route.params.id}/3d`"
          class="ws-btn-violet px-4 py-2 text-xs"
        >
          <i class="fa-solid fa-cube mr-1.5"></i>Visualisasi 3D
        </RouterLink>
      </div>
    </div>

    <!-- Invoice Scrapbook / Price Ticket Container -->
    <div class="ws-paper-card overflow-hidden bg-marshmallow">
      <div class="notebook-punch-cherry bg-cherry"></div>

      <div class="bg-stripes-pink flex flex-wrap items-center justify-between gap-3 border-y-2 border-licorice px-6 py-4">
        <div>
          <span class="ws-badge-sticker bg-peach text-licorice">Invoice Scrapbook</span>
          <h1 class="font-heading mt-2 text-4xl font-bold text-licorice md:text-5xl">Estimasi Biaya</h1>
          <p class="mt-0.5 text-xs font-medium text-muted">
            Ringkasan kalkulasi anggaran dekorasi untuk Rancangan #{{ route.params.id }}
          </p>
        </div>
        <VintageOrnament variant="oval-sticker" label="price ticket" warna="cherry" class="-rotate-3" />
      </div>

      <div class="p-6 md:p-8">
        <!-- Total Cost Ticket Highlight -->
        <div class="ws-ticket flex flex-wrap items-center justify-between gap-4 bg-licorice p-6 text-marshmallow">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-strawberry">
              Total Estimasi Anggaran Dekorasi
            </p>
            <p class="mt-1 text-xs text-marshmallow/80">
              Dihitung otomatis berdasarkan jumlah dan harga satuan item dekorasi pada rancangan.
            </p>
          </div>
          <span class="rounded-xl border-2 border-marshmallow bg-cherry px-4 py-2 font-heading text-3xl font-bold text-marshmallow shadow-[3px_3px_0px_#FFCFDA]">
            Kalkulasi Otomatis
          </span>
        </div>

        <!-- Striped Divider -->
        <div class="bg-stripes-pink my-6 h-3 rounded-full border border-licorice"></div>

        <!-- Rincian Item Table Frame -->
        <div class="overflow-hidden rounded-2xl border-2 border-licorice bg-paper">
          <div class="flex items-center justify-between border-b-2 border-licorice bg-strawberry px-5 py-3">
            <span class="ws-eyebrow">Rincian Item Dekorasi</span>
            <VintageOrnament variant="ticket-stamp" label="WedSpace Receipt" />
          </div>
          <div class="p-6 text-center text-sm text-muted">
            Susun item dekorasi pada Editor Layout 2D untuk memperbarui rincian biaya rancangan secara otomatis.
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
