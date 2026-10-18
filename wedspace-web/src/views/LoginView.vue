<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const tampilPassword = ref(false)
const error = ref('')
const sibuk = ref(false)

async function masuk() {
  error.value = ''
  if (!email.value || !password.value) {
    error.value = 'Email dan password wajib diisi.'
    return
  }
  sibuk.value = true
  try {
    await auth.login(email.value, password.value)
    router.push('/dashboard')
  } catch (err) {
    error.value = err.message
  } finally {
    sibuk.value = false
  }
}
</script>

<template>
  <section class="mx-auto flex max-w-xl flex-col items-center px-4 py-12 md:px-8">
    <h2 class="font-heading text-center text-3xl font-semibold md:text-4xl">Selamat datang kembali</h2>
    <p class="mt-2 text-center text-muted">Masuk untuk melanjutkan merancang venue pernikahanmu.</p>

    <div class="mt-6 w-full rounded-[28px] border border-line bg-white p-8 shadow-[0_4px_18px_rgba(201,120,149,0.1)]">
      <h1 class="font-heading text-center text-4xl font-semibold">Login</h1>
      <p class="mt-1.5 text-center text-sm text-muted">Masuk ke workspace WedSpace.</p>

      <form class="mt-6 space-y-4" @submit.prevent="masuk">
        <div>
          <label for="email" class="mb-1.5 block text-sm font-medium">Email</label>
          <input
            id="email" v-model="email" type="email" autocomplete="username"
            placeholder="nama@email.com"
            class="w-full rounded-xl border border-line bg-canvas px-4 py-3 outline-none focus:border-primary"
          />
        </div>
        <div>
          <label for="password" class="mb-1.5 block text-sm font-medium">Password</label>
          <div class="relative">
            <input
              id="password" v-model="password" :type="tampilPassword ? 'text' : 'password'"
              autocomplete="current-password" placeholder="........"
              class="w-full rounded-xl border border-line bg-canvas px-4 py-3 pr-11 outline-none focus:border-primary"
            />
            <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted" @click="tampilPassword = !tampilPassword" aria-label="Tampil/sembunyi password">
              <i :class="['fa-solid', tampilPassword ? 'fa-eye-slash' : 'fa-eye']"></i>
            </button>
          </div>
        </div>

        <p v-if="error" class="rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">{{ error }}</p>

        <button
          type="submit" :disabled="sibuk"
          class="w-full rounded-xl bg-primary py-3.5 font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {{ sibuk ? 'Memproses...' : 'Masuk' }}
        </button>
      </form>
    </div>
  </section>
</template>
