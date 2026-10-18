<script setup>
import { computed } from 'vue'
import { useRoute, RouterView } from 'vue-router'
import PublicLayout from './layouts/PublicLayout.vue'
import AppLayout from './layouts/AppLayout.vue'
import BlankLayout from './layouts/BlankLayout.vue'

const layouts = { public: PublicLayout, app: AppLayout, blank: BlankLayout }
const route = useRoute()
const layout = computed(() => layouts[route.meta.layout] || PublicLayout)
</script>

<template>
  <component :is="layout">
    <RouterView />
  </component>
</template>
