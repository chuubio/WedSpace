<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import VintageOrnament from '../components/VintageOrnament.vue'

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
  <section class="bg-grid-paper relative min-h-[calc(100vh-140px)] px-4 py-12 md:px-10 md:py-16">
    <div class="mx-auto max-w-4xl">
      <div class="text-center">
        <h2 class="font-heading mt-3 text-4xl font-bold text-licorice md:text-5xl">Selamat datang kembali</h2>
        <p class="mt-1.5 text-sm text-muted">Masuk untuk melanjutkan merancang venue pernikahanmu.</p>
      </div>

      <!-- Split Vintage Card: Left Pink Stripes Decorative Side + Right Paper Form Panel -->
      <div class="ws-paper-card relative mt-8 grid overflow-hidden bg-marshmallow md:grid-cols-12">
        <!-- Left Decorative Panel with Pink Vertical Stripes & Taped Wedding Card -->
        <div class="bg-stripes-pink relative flex flex-col items-center justify-between border-b-2 border-licorice p-8 text-center md:col-span-5 md:border-b-0 md:border-r-2">
          <div class="w-full">
            <VintageOrnament variant="ticket-stamp" label="WedSpace Atelier" />
          </div>

          <div class="ws-paper-card relative my-6 rotate-1 bg-marshmallow p-5">
            <span class="ws-tape-tl"></span>
            <VintageOrnament variant="rings" class="mx-auto h-11 w-14" />
            <p class="font-heading mt-2 text-2xl font-bold italic text-licorice">
              "Every great celebration begins with a thoughtful blueprint."
            </p>
            <div class="mt-3 flex justify-center gap-1.5">
              <span class="rounded-full border border-licorice bg-strawberry px-2.5 py-0.5 text-[0.6875rem] font-bold uppercase">2D Layout</span>
              <span class="rounded-full border border-licorice bg-violet px-2.5 py-0.5 text-[0.6875rem] font-bold uppercase">3D View</span>
            </div>
          </div>
        </div>

        <!-- Right Form Panel (Paper Note Style) -->
        <div class="relative bg-paper p-7 sm:p-10 md:col-span-7">
          <div class="flex items-start justify-between">
            <div>
              <h1 class="font-heading mt-1 text-4xl font-bold text-licorice">Login</h1>
              <p class="mt-1 text-sm text-muted">Masuk ke workspace WedSpace.</p>
            </div>
          </div>

          <form class="mt-6 space-y-4" @submit.prevent="masuk">
            <div>
              <label for="email" class="ws-eyebrow mb-1.5 block">Email</label>
              <input
                id="email"
                v-model="email"
                type="email"
                autocomplete="username"
                placeholder="nama@email.com"
                class="ws-input"
              />
            </div>

            <div>
              <label for="password" class="ws-eyebrow mb-1.5 block">Password</label>
              <div class="relative">
                <input
                  id="password"
                  v-model="password"
                  :type="tampilPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  placeholder="........"
                  class="ws-input pr-11"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-licorice"
                  aria-label="Tampil/sembunyi password"
                  @click="tampilPassword = !tampilPassword"
                >
                  <i :class="['fa-solid', tampilPassword ? 'fa-eye-slash' : 'fa-eye']"></i>
                </button>
              </div>
            </div>

            <p
              v-if="error"
              class="rounded-xl border-2 border-licorice bg-strawberry/70 px-4 py-3 text-sm font-semibold text-cherry shadow-[2px_2px_0px_#7F1125]"
            >
              <i class="fa-solid fa-circle-exclamation mr-1.5"></i>{{ error }}
            </p>

            <div class="pt-2">
              <button
                type="submit"
                :disabled="sibuk"
                class="ws-btn-cherry w-full py-3.5 text-sm disabled:opacity-60"
              >
                <i class="fa-solid fa-right-to-bracket mr-2"></i>
                {{ sibuk ? 'Memproses...' : 'Masuk' }}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  </section>
</template>
