<script setup>
import AppNavbar from '../components/AppNavbar.vue'
import AppFooter from '../components/AppFooter.vue'
</script>

<template>
  <div class="flex min-h-screen flex-col bg-marshmallow text-licorice">
    <AppNavbar mode="public" />
    <main class="flex-1 pt-2"><slot /></main>
    <AppFooter />
  </div>
</template>
