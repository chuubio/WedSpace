<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import LogoutModal from './LogoutModal.vue'

defineProps({ terbuka: Boolean })
defineEmits(['tutup'])

const router = useRouter()
const auth = useAuthStore()
const modalLogout = ref(false)

const API_BASE = 'http://localhost:3000'

const menuUtama = [
  { nama: 'Dashboard', ke: '/dashboard', ikon: 'fa-gauge' },
  { nama: 'Proyek Saya', ke: '/proyek', ikon: 'fa-folder-open' },
  { nama: 'Katalog Dekorasi', ke: '/katalog', ikon: 'fa-images' },
]

// Admin tidak memakai menu WO (proyek & katalog) — hanya dashboard dan kelola data dekorasi
const menuAdmin = [
  { nama: 'Dashboard', ke: '/dashboard', ikon: 'fa-gauge' },
  { nama: 'Data Dekorasi', ke: '/admin/dekorasi', ikon: 'fa-box-archive' },
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
</script>

<template>
  <aside
    :class="[
      'fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-line bg-white transition-transform',
      'md:static md:z-auto md:translate-x-0',
      terbuka ? 'translate-x-0' : '-translate-x-full',
    ]"
  >
    <nav class="flex-1 space-y-1 overflow-y-auto p-3.5 pt-20 md:pt-3.5">
      <template v-if="auth.adalahAdmin">
        <p class="px-3.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">Menu Admin</p>
        <RouterLink
          v-for="m in menuAdmin"
          :key="m.ke"
          :to="m.ke"
          class="flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-muted"
          active-class="bg-blush font-semibold text-ink"
          @click="$emit('tutup')"
        >
          <i :class="['fa-solid w-4 text-center', m.ikon]"></i>{{ m.nama }}
        </RouterLink>
      </template>

      <template v-else>
        <p class="px-3.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">Menu Utama</p>
        <RouterLink
          v-for="m in menuUtama"
          :key="m.ke"
          :to="m.ke"
          class="flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-muted"
          active-class="bg-blush font-semibold text-ink"
          @click="$emit('tutup')"
        >
          <i :class="['fa-solid w-4 text-center', m.ikon]"></i>{{ m.nama }}
        </RouterLink>
      </template>
    </nav>

    <div class="space-y-1 border-t border-line p-3.5">
      <RouterLink
        to="/akun"
        class="flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-muted hover:bg-canvas"
        active-class="bg-blush font-semibold text-ink"
        @click="$emit('tutup')"
      >
        <span class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-blush text-sm font-bold text-primary">
          <img v-if="avatarUrl" :src="avatarUrl" alt="Foto profil" class="h-full w-full object-cover" />
          <span v-else>{{ inisial }}</span>
        </span>
        <span class="min-w-0">
          <span class="block truncate text-sm font-semibold text-ink">{{ auth.user?.nama || 'Akun' }}</span>
          <span class="block text-xs text-muted">Pengaturan akun</span>
        </span>
      </RouterLink>
      <button
        class="flex w-full items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-left text-muted hover:bg-canvas"
        @click="modalLogout = true"
      >
        <i class="fa-solid fa-right-from-bracket w-4 text-center"></i>Logout
      </button>
    </div>

    <LogoutModal
      :tampil="modalLogout" :nama="auth.user?.nama || ''"
      @batal="modalLogout = false" @konfirmasi="konfirmasiLogout"
    />
  </aside>
</template>
