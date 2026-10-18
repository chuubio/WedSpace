<script setup>
import AppNavbar from '../components/AppNavbar.vue'
import AppFooter from '../components/AppFooter.vue'
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <AppNavbar mode="public" />
    <main class="flex-1"><slot /></main>
    <AppFooter />
  </div>
</template>
