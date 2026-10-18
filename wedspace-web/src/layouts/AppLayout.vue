<script setup>
import { ref } from 'vue'
import AppNavbar from '../components/AppNavbar.vue'
import AppSidebar from '../components/AppSidebar.vue'

const sidebarTerbuka = ref(false)
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <AppNavbar mode="app" @toggle-sidebar="sidebarTerbuka = !sidebarTerbuka" />
    <div class="flex flex-1">
      <AppSidebar :terbuka="sidebarTerbuka" @tutup="sidebarTerbuka = false" />
      <main class="min-w-0 flex-1 p-4 md:px-10 md:py-9"><slot /></main>
    </div>
  </div>
</template>
