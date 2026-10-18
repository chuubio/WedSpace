import { createRouter, createWebHistory } from 'vue-router'
import LandingView from '../views/LandingView.vue'
import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'
import ProyekView from '../views/ProyekView.vue'
import ProyekFormView from '../views/ProyekFormView.vue'
import ProyekDetailView from '../views/ProyekDetailView.vue'
import KatalogView from '../views/KatalogView.vue'
import EditorView from '../views/EditorView.vue'
import Visualisasi3DView from '../views/Visualisasi3DView.vue'
import EstimasiView from '../views/EstimasiView.vue'
import AdminDekorasiView from '../views/AdminDekorasiView.vue'
import PengaturanAkunView from '../views/PengaturanAkunView.vue'
import { useAuthStore } from '../stores/auth'

const publik = { layout: 'public' }
const app = { layout: 'app' }
const blank = { layout: 'blank' }

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to) {
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
  routes: [
    { path: '/', name: 'beranda', component: LandingView, meta: publik },
    { path: '/login', name: 'login', component: LoginView, meta: publik },
    { path: '/dashboard', name: 'dashboard', component: DashboardView, meta: { ...app, butuhLogin: true } },
    { path: '/akun', name: 'pengaturan-akun', component: PengaturanAkunView, meta: { ...app, butuhLogin: true } },
    { path: '/proyek', name: 'proyek', component: ProyekView, meta: { ...app, butuhLogin: true } },
    { path: '/proyek/baru', name: 'proyek-baru', component: ProyekFormView, meta: { ...app, butuhLogin: true } },
    { path: '/proyek/:id', name: 'proyek-detail', component: ProyekDetailView, meta: { ...app, butuhLogin: true } },
    { path: '/proyek/:id/edit', name: 'proyek-edit', component: ProyekFormView, meta: { ...app, butuhLogin: true } },
    { path: '/katalog', name: 'katalog', component: KatalogView, meta: { ...app, butuhLogin: true } },
    { path: '/rancangan/:id/editor', name: 'editor', component: EditorView, meta: { ...blank, butuhLogin: true } },
    { path: '/rancangan/:id/estimasi', name: 'estimasi', component: EstimasiView, meta: { ...app, butuhLogin: true } },
    { path: '/rancangan/:id/3d', name: 'visualisasi-3d', component: Visualisasi3DView, meta: { ...blank, butuhLogin: true } },
    { path: '/admin/dekorasi', name: 'admin-dekorasi', component: AdminDekorasiView, meta: { ...app, butuhLogin: true, adminSaja: true } },
  ],
})

// Navigation guard: route butuhLogin dilempar ke /login, route admin dilempar ke /dashboard (FR-AUTH1, FR-AUTH2)
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.butuhLogin && !auth.sudahLogin) {
    return { path: '/login', query: { dari: to.fullPath } }
  }
  if (to.meta.adminSaja && !auth.adalahAdmin) {
    return { path: '/dashboard' }
  }
  if (to.path === '/login' && auth.sudahLogin) {
    return { path: '/dashboard' }
  }
  return true
})

export default router
