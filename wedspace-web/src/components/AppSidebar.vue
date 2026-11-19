<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import LogoutModal from './LogoutModal.vue'
import VintageOrnament from './VintageOrnament.vue'

defineProps({ terbuka: Boolean })
defineEmits(['tutup'])

const router = useRouter()
const auth = useAuthStore()
const modalLogout = ref(false)

const API_BASE = 'http://localhost:3000'

const menuUtama = [
  { nama: 'Dashboard', ke: '/dashboard', ikon: 'fa-gauge' },
  { nama: 'Proyek Saya', ke: '/proyek', ikon: 'fa-folder-open' },
  { nama: 'Katalog Saya', ke: '/katalog/saya', ikon: 'fa-box-open' },
  { nama: 'Katalog Komunitas', ke: '/katalog/komunitas', ikon: 'fa-users-viewfinder' },
  { nama: 'Langganan', ke: '/langganan', ikon: 'fa-crown' },
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
    id="app-sidebar"
    :class="[
      'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r-2 border-licorice bg-marshmallow transition-transform duration-200',
      'md:static md:z-auto md:translate-x-0',
      terbuka ? 'translate-x-0' : '-translate-x-full',
    ]"
  >
    <!-- Decorative striped header ribbon -->
    <div class="bg-stripes-pink border-b-2 border-licorice px-4 py-3 pt-20 md:pt-5">
      <div class="flex items-center justify-between gap-2 rounded-xl border border-licorice bg-marshmallow px-3 py-2 shadow-[2px_2px_0px_#7F1125]">
        <div>
          <p class="text-[9px] font-bold uppercase tracking-[0.16em] text-cherry">
            {{ auth.adalahAdmin ? 'Curator Desk' : 'Wedding Planner' }}
          </p>
          <p class="font-heading text-base font-bold leading-tight text-licorice">
            {{ auth.adalahAdmin ? 'Panel Admin' : 'Buku Rancangan' }}
          </p>
        </div>
        <div class="flex items-center gap-1.5">
          <VintageOrnament variant="flower" class="h-7 w-7 flex-none" />
          <button
            type="button"
            class="ws-btn-paper flex h-8 w-8 items-center justify-center md:hidden"
            aria-label="Tutup menu navigasi"
            @click="$emit('tutup')"
          >
            <i class="fa-solid fa-xmark text-xs"></i>
          </button>
        </div>
      </div>
    </div>

    <nav class="flex-1 space-y-2 overflow-y-auto p-4">
      <template v-if="auth.adalahAdmin">
        <p class="ws-eyebrow px-3 pb-1 text-muted">Menu Admin</p>
        <RouterLink
          v-for="m in menuAdmin"
          :key="m.ke"
          :to="m.ke"
          class="flex items-center gap-3 rounded-xl border border-transparent px-3.5 py-2.5 text-sm font-medium text-licorice/80 transition-all hover:border-licorice/40 hover:bg-strawberry/50 hover:text-licorice"
          active-class="!border-licorice !bg-strawberry !font-bold !text-licorice shadow-[3px_3px_0px_#7F1125]"
          @click="$emit('tutup')"
        >
          <span class="flex h-7 w-7 items-center justify-center rounded-lg border border-licorice/30 bg-marshmallow text-xs text-cherry">
            <i :class="['fa-solid', m.ikon]"></i>
          </span>
          <span>{{ m.nama }}</span>
        </RouterLink>
      </template>

      <template v-else>
        <p class="ws-eyebrow px-3 pb-1 text-muted">Menu Utama</p>
        <RouterLink
          v-for="m in menuUtama"
          :key="m.ke"
          :to="m.ke"
          class="flex items-center gap-3 rounded-xl border border-transparent px-3.5 py-2.5 text-sm font-medium text-licorice/80 transition-all hover:border-licorice/40 hover:bg-strawberry/50 hover:text-licorice"
          active-class="!border-licorice !bg-strawberry !font-bold !text-licorice shadow-[3px_3px_0px_#7F1125]"
          @click="$emit('tutup')"
        >
          <span class="flex h-7 w-7 items-center justify-center rounded-lg border border-licorice/30 bg-marshmallow text-xs text-cherry">
            <i :class="['fa-solid', m.ikon]"></i>
          </span>
          <span>{{ m.nama }}</span>
        </RouterLink>
      </template>

      <!-- Small decorative note inside sidebar -->
      <div class="mt-6 rounded-2xl border border-dashed border-licorice/40 bg-strawberry/35 p-3.5 text-center">
        <VintageOrnament variant="bow" class="mx-auto h-8 w-11" />
        <p class="font-heading mt-1 text-base font-bold italic text-licorice">
          "Crafted for timeless celebrations"
        </p>
        <p class="mt-0.5 text-[10px] uppercase tracking-widest text-muted">WedSpace Atelier</p>
      </div>
    </nav>

    <div class="checkerboard-trim border-t border-licorice"></div>

    <div class="space-y-2 border-t border-licorice bg-strawberry/40 p-3.5">
      <RouterLink
        to="/akun"
        class="flex items-center gap-3 rounded-xl border border-licorice bg-marshmallow px-3 py-2.5 text-licorice shadow-[2px_2px_0px_#7F1125] transition-transform hover:-translate-y-0.5"
        active-class="!bg-violet font-bold"
        @click="$emit('tutup')"
      >
        <span class="flex h-9 w-9 flex-none items-center justify-center overflow-hidden rounded-lg border border-licorice bg-strawberry font-heading text-base font-bold text-licorice">
          <img v-if="avatarUrl" :src="avatarUrl" alt="Foto profil" class="h-full w-full object-cover" />
          <span v-else>{{ inisial }}</span>
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-xs font-bold uppercase tracking-wider text-licorice">{{ auth.user?.nama || 'Akun' }}</span>
          <span class="block text-[11px] text-muted">Pengaturan akun</span>
        </span>
      </RouterLink>
      <button
        type="button"
        class="ws-btn-licorice flex w-full items-center justify-center gap-2 py-2.5 text-xs"
        @click="modalLogout = true"
      >
        <i class="fa-solid fa-right-from-bracket"></i>Logout
      </button>
    </div>

    <LogoutModal
      :tampil="modalLogout" :nama="auth.user?.nama || ''"
      @batal="modalLogout = false" @konfirmasi="konfirmasiLogout"
    />
  </aside>
</template>
