<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import LogoutModal from './LogoutModal.vue'

defineProps({
  mode: { type: String, default: 'public' },
  sidebarTerbuka: { type: Boolean, default: false },
})
defineEmits(['toggle-sidebar'])

const route = useRoute()
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

function tutupMenuPublik() {
  menuTerbuka.value = false
}

function konfirmasiLogout() {
  auth.logout()
  modalLogout.value = false
  menuTerbuka.value = false
  router.push('/login')
}

function kePengaturanAkun() {
  notifTerbuka.value = false
  router.push('/akun')
}

watch(
  () => route.fullPath,
  () => {
    menuTerbuka.value = false
    notifTerbuka.value = false
  },
)
</script>

<template>
  <header class="scallop-bottom-pink sticky top-0 z-50 border-b border-licorice/20 bg-strawberry text-licorice">
    <!-- Topbar mode aplikasi: tombol buka sidebar hanya pada mobile, disembunyikan pada desktop -->
    <nav v-if="mode === 'app'" class="flex items-center justify-between gap-3 px-4 py-3 md:px-10">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="ws-btn-paper flex h-10 w-10 items-center justify-center md:hidden"
          :aria-label="sidebarTerbuka ? 'Tutup navigasi' : 'Buka navigasi'"
          :aria-expanded="sidebarTerbuka ? 'true' : 'false'"
          aria-controls="app-sidebar"
          @click="$emit('toggle-sidebar')"
        >
          <i :class="['fa-solid', sidebarTerbuka ? 'fa-xmark' : 'fa-bars']"></i>
        </button>
        <RouterLink to="/dashboard" class="group flex items-center gap-2.5">
          <span class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-licorice bg-marshmallow text-xs text-cherry shadow-[2px_2px_0px_#7F1125]">
            <i class="fa-solid fa-heart"></i>
          </span>
          <span class="font-heading text-[28px] font-bold tracking-tight text-licorice">WedSpace</span>
          <span class="hidden rounded-full border border-licorice bg-peach px-2.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-widest text-licorice shadow-[1.5px_1.5px_0px_#7F1125] sm:inline-block">
            Atelier
          </span>
        </RouterLink>
      </div>

      <div class="flex items-center gap-2.5">
        <div class="relative">
          <button
            type="button"
            class="ws-btn-paper relative flex h-10 w-10 items-center justify-center"
            aria-label="Notifikasi"
            :aria-expanded="notifTerbuka ? 'true' : 'false'"
            @click="notifTerbuka = !notifTerbuka"
          >
            <i class="fa-regular fa-bell text-sm"></i>
            <span class="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border border-licorice bg-cherry"></span>
          </button>
          <div
            v-if="notifTerbuka"
            class="ws-paper-card absolute right-0 z-50 mt-3 w-76 overflow-hidden bg-marshmallow"
          >
            <div class="flex items-center justify-between border-b-2 border-licorice bg-strawberry px-4 py-2.5">
              <p class="ws-eyebrow">Catatan &amp; Notifikasi</p>
              <span class="rounded-full border border-licorice bg-peach px-2 py-0.5 text-[0.6875rem] font-bold uppercase">Baru</span>
            </div>
            <div class="bg-grid-subtle px-4 py-3.5">
              <p class="font-heading text-lg font-bold text-licorice">Selamat datang di WedSpace!</p>
              <p v-if="auth.adalahAdmin" class="mt-1 text-xs leading-relaxed text-muted">
                Kelola data dekorasi melalui menu Data Dekorasi.
              </p>
              <p v-else class="mt-1 text-xs leading-relaxed text-muted">
                Buat proyek baru atau jelajahi katalog dekorasi untuk memulai.
              </p>
            </div>
            <div class="border-t border-dashed border-licorice/40 bg-marshmallow px-4 py-2.5">
              <p class="text-xs italic text-muted">Belum ada notifikasi baru lainnya.</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          class="ws-btn-paper flex items-center gap-2.5 py-1.5 pl-1.5 pr-3.5"
          aria-label="Pengaturan akun"
          title="Pengaturan akun"
          @click="kePengaturanAkun"
        >
          <span class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-licorice bg-violet font-heading text-base font-bold text-licorice">
            <img v-if="avatarUrl" :src="avatarUrl" alt="Foto profil" class="h-full w-full object-cover" />
            <span v-else>{{ inisial }}</span>
          </span>
          <span class="hidden max-w-32 truncate text-xs font-bold uppercase tracking-wider text-licorice sm:block">
            {{ auth.user?.nama || 'Akun' }}
          </span>
          <i class="fa-solid fa-chevron-down hidden text-[0.6875rem] text-licorice/70 sm:block"></i>
        </button>
      </div>
    </nav>

    <!-- Navbar publik: satu daftar navigasi konsisten untuk desktop & mobile -->
    <nav v-else class="mx-auto max-w-7xl px-4 py-3.5 md:px-12" aria-label="Navigasi utama">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <!-- Brand Identity WedSpace -->
        <RouterLink to="/" class="group inline-flex items-center gap-2" @click="tutupMenuPublik">
          <span class="font-heading text-3xl font-bold tracking-tight text-licorice md:text-4xl">
            wedspace
          </span>
          <span class="rounded-full border border-licorice bg-marshmallow px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-widest text-cherry shadow-[1.5px_1.5px_0px_#7F1125]">
            studio
          </span>
        </RouterLink>

        <!-- Tombol Hamburger (Hanya muncul di mobile, tersembunyi di desktop) -->
        <button
          type="button"
          class="ws-btn-paper flex h-10 w-10 items-center justify-center md:hidden"
          :aria-label="menuTerbuka ? 'Tutup menu navigasi' : 'Buka menu navigasi'"
          :aria-expanded="menuTerbuka ? 'true' : 'false'"
          aria-controls="nav-menu-publik"
          @click="menuTerbuka = !menuTerbuka"
        >
          <i :class="['fa-solid text-base', menuTerbuka ? 'fa-xmark' : 'fa-bars']"></i>
        </button>

        <!-- Daftar Navigasi Utama (Satu struktur untuk Desktop & Mobile) -->
        <ul
          id="nav-menu-publik"
          :class="[
            menuTerbuka ? 'flex' : 'hidden md:flex',
            'w-full flex-col gap-1.5 rounded-2xl border-2 border-licorice bg-marshmallow p-4 shadow-[4px_4px_0px_#7F1125] md:w-auto md:flex-row md:items-center md:gap-5 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none',
          ]"
        >
          <li v-for="m in menuPublik" :key="m.ke">
            <RouterLink
              :to="m.ke"
              class="block rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-licorice transition-colors hover:bg-strawberry md:px-1.5 md:py-1 md:text-xs md:hover:bg-transparent md:hover:text-cherry"
              @click="tutupMenuPublik"
            >
              {{ m.nama }}
            </RouterLink>
          </li>

          <template v-if="!auth.sudahLogin">
            <li class="border-t border-dashed border-licorice/30 pt-2 md:border-0 md:pt-0">
              <RouterLink
                to="/login"
                class="block rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-licorice hover:bg-strawberry md:px-2 md:py-1 md:text-xs md:hover:bg-transparent md:hover:text-cherry"
                @click="tutupMenuPublik"
              >
                Login
              </RouterLink>
            </li>
            <li class="pt-1 md:pt-0">
              <RouterLink
                to="/login"
                class="ws-btn-cherry w-full px-4 py-2.5 text-center md:w-auto md:py-2"
                @click="tutupMenuPublik"
              >
                Mulai Merancang
              </RouterLink>
            </li>
          </template>
          <template v-else>
            <li class="border-t border-dashed border-licorice/30 pt-2 md:border-0 md:pt-0">
              <RouterLink
                to="/dashboard"
                class="ws-btn-paper w-full px-3.5 py-2 text-center text-xs uppercase tracking-wider md:w-auto"
                @click="tutupMenuPublik"
              >
                Workspace
              </RouterLink>
            </li>
            <li>
              <button
                type="button"
                class="block w-full rounded-lg px-3 py-2 text-left text-xs font-bold uppercase tracking-[0.14em] text-licorice hover:bg-strawberry md:w-auto md:px-2 md:py-1 md:text-xs md:hover:bg-transparent md:hover:text-cherry"
                @click="modalLogout = true; tutupMenuPublik()"
              >
                Logout
              </button>
            </li>
          </template>
        </ul>
      </div>
    </nav>

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
