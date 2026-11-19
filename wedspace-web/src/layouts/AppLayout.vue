<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppNavbar from '../components/AppNavbar.vue'
import AppSidebar from '../components/AppSidebar.vue'

const route = useRoute()
const sidebarTerbuka = ref(false)

watch(
  () => route.fullPath,
  () => {
    sidebarTerbuka.value = false
  },
)
</script>

<template>
  <div class="flex min-h-screen flex-col bg-marshmallow text-licorice">
    <AppNavbar
      mode="app"
      :sidebar-terbuka="sidebarTerbuka"
      @toggle-sidebar="sidebarTerbuka = !sidebarTerbuka"
    />
    <div class="relative flex flex-1">
      <!-- Backdrop overlay untuk mobile agar sidebar dapat ditutup dengan mudah -->
      <div
        v-if="sidebarTerbuka"
        class="fixed inset-0 z-30 bg-licorice/45 backdrop-blur-[1px] md:hidden"
        aria-hidden="true"
        @click="sidebarTerbuka = false"
      ></div>

      <AppSidebar :terbuka="sidebarTerbuka" @tutup="sidebarTerbuka = false" />
      <main class="bg-grid-subtle min-w-0 flex-1 p-4 pt-7 md:px-10 md:py-10"><slot /></main>
    </div>
  </div>
</template>
