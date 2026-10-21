<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import LogoutModal from './LogoutModal.vue'

defineProps({ mode: { type: String, default: 'public' } })
defineEmits(['toggle-sidebar'])

const router = useRouter()
const auth = useAuthStore()
const menuTerbuka = ref(false)
const modalLogout = ref(false)
const notifTerbuka = ref(false)

const API_BASE = 'http://localhost:3000'

const menuPublik = [
  { nama: 'Home', ke: '/' },
  { nama: 'Tentang', ke: '/#tentang' },
  { nama: 'Fitur', ke: '/#fitur' },
  { nama: 'Cara Kerja', ke: '/#cara-kerja' },
]

const avatarUrl = computed(() => {
  const foto = auth.user?.foto_profil
  if (!foto) return ''
  if (/^https?:\/\//.test(foto)) return foto
  return `${API_BASE}${foto.startsWith('/') ? foto : `/${foto}`}`
})

const inisial = computed(() => (auth.user?.nama || '?').trim().charAt(0).toUpperCase())

function konfirmasiLogout() {
  auth.logout()
  modalLogout.value = false
  router.push('/login')
}

function kePengaturanAkun() {
  notifTerbuka.value = false
  router.push('/akun')
}
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-line bg-canvas">
    <!-- Topbar mode aplikasi: tanpa navigasi, hanya notifikasi + akun -->
    <nav v-if="mode === 'app'" class="flex items-center justify-between gap-3 px-4 py-3 md:px-10">
      <div class="flex items-center gap-3">
        <button
          class="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-ink md:hidden"
          aria-label="Buka navigasi"
          @click="$emit('toggle-sidebar')"
        >
          <i class="fa-solid fa-bars"></i>
        </button>
        <RouterLink to="/dashboard" class="font-heading text-[22px] font-bold">WedSpace</RouterLink>
      </div>

      <div class="flex items-center gap-2">
        <div class="relative">
          <button
            class="relative flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-ink hover:border-primary"
            aria-label="Notifikasi"
            @click="notifTerbuka = !notifTerbuka"
          >
            <i class="fa-regular fa-bell"></i>
            <span class="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-primary"></span>
          </button>
          <div
            v-if="notifTerbuka"
            class="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-line bg-white shadow-xl"
          >
            <p class="border-b border-line px-4 py-3 text-sm font-semibold">Notifikasi</p>
            <div class="px-4 py-3">
              <p class="text-sm font-medium">Selamat datang di WedSpace!</p>
              <p v-if="auth.adalahAdmin" class="mt-0.5 text-xs text-muted">Kelola data dekorasi melalui menu Data Dekorasi.</p>
              <p v-else class="mt-0.5 text-xs text-muted">Buat proyek baru atau jelajahi katalog dekorasi untuk memulai.</p>
            </div>
            <div class="border-t border-line px-4 py-3">
              <p class="text-xs text-muted">Belum ada notifikasi baru lainnya.</p>
            </div>
          </div>
        </div>

        <button
          class="flex items-center gap-2 rounded-xl border border-line bg-white py-1.5 pl-1.5 pr-3 hover:border-primary"
          aria-label="Pengaturan akun"
          title="Pengaturan akun"
          @click="kePengaturanAkun"
        >
          <span class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-blush font-semibold text-primary">
            <img v-if="avatarUrl" :src="avatarUrl" alt="Foto profil" class="h-full w-full object-cover" />
            <span v-else>{{ inisial }}</span>
          </span>
          <span class="hidden max-w-32 truncate text-sm font-semibold sm:block">{{ auth.user?.nama || 'Akun' }}</span>
          <i class="fa-solid fa-chevron-down hidden text-[10px] text-muted sm:block"></i>
        </button>
      </div>
    </nav>

    <!-- Navbar publik tetap seperti semula -->
    <nav v-else class="flex items-center justify-between px-4 py-3.5 md:px-16">
      <RouterLink to="/" class="flex items-center gap-2">
        <span class="font-heading text-[26px] font-bold">WedSpace</span>
      </RouterLink>

      <ul class="hidden items-center gap-1 md:flex">
        <li v-for="m in menuPublik" :key="m.ke">
          <RouterLink :to="m.ke" class="px-3.5 py-2 text-sm text-muted hover:text-ink">{{ m.nama }}</RouterLink>
        </li>
        <template v-if="!auth.sudahLogin">
          <li><RouterLink to="/login" class="px-3.5 py-2 text-sm text-muted hover:text-ink">Login</RouterLink></li>
          <li>
            <RouterLink to="/login" class="ml-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">
              Mulai Merancang
            </RouterLink>
          </li>
        </template>
        <li v-else>
          <button class="px-3.5 py-2 text-sm text-muted hover:text-ink" @click="modalLogout = true">Logout</button>
        </li>
      </ul>

      <button class="md:hidden" aria-label="Buka menu" @click="menuTerbuka = !menuTerbuka">
        <i class="fa-solid fa-bars text-xl"></i>
      </button>
    </nav>

    <ul v-if="mode === 'public' && menuTerbuka" class="space-y-1 border-t border-line px-4 py-3 md:hidden">
      <li v-for="m in menuPublik" :key="m.ke">
        <RouterLink :to="m.ke" class="block py-2 text-muted" @click="menuTerbuka = false">{{ m.nama }}</RouterLink>
      </li>
      <li v-if="!auth.sudahLogin">
        <RouterLink to="/login" class="block py-2 font-semibold text-primary" @click="menuTerbuka = false">Login</RouterLink>
      </li>
      <li v-else>
        <button class="block py-2 font-semibold text-primary" @click="modalLogout = true; menuTerbuka = false">Logout</button>
      </li>
    </ul>

    <button
      v-if="mode === 'app' && notifTerbuka"
      class="fixed inset-0 z-40 cursor-default"
      aria-hidden="true"
      tabindex="-1"
      @click="notifTerbuka = false"
    ></button>

    <LogoutModal
      :tampil="modalLogout" :nama="auth.user?.nama || ''"
      @batal="modalLogout = false" @konfirmasi="konfirmasiLogout"
    />
  </header>
</template>
