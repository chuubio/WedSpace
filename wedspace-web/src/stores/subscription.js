import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'

const API = 'http://localhost:3000/api'

export const useSubscriptionStore = defineStore('subscription', () => {
  const auth = useAuthStore()

  const ringkasan = ref(null)
  const sibuk = ref(false)
  const error = ref('')
  let tokenCache = null

  const plan = computed(() => ringkasan.value?.plan || 'free')
  const namaPaket = computed(() => ({ free: 'Free', premium: 'Premium', admin: 'Admin' }[plan.value] || 'Free'))
  const adalahPremium = computed(() => plan.value === 'premium')
  const adalahAdmin = computed(() => plan.value === 'admin')

  const batas = computed(() => ringkasan.value?.batas || {
    maks_proyek_aktif: 2,
    kuota_rekomendasi_per_minggu: 3,
    ekspor_pdf: false,
    jendela_kuota_hari: 7,
  })

  const maksProyek = computed(() => batas.value.maks_proyek_aktif ?? null)
  const proyekAktif = computed(() => ringkasan.value?.pemakaian?.proyek_aktif ?? 0)
  const proyekTersisa = computed(() => (maksProyek.value === null ? null : Math.max(maksProyek.value - proyekAktif.value, 0)))
  const proyekPenuh = computed(() => maksProyek.value !== null && proyekAktif.value >= maksProyek.value)
  const bisaEksporPdf = computed(() => !!batas.value.ekspor_pdf)

  async function muat(paksa = false) {
    if (!auth.sudahLogin) {
      ringkasan.value = null
      return null
    }
    if (ringkasan.value && !paksa && tokenCache === auth.token) return ringkasan.value

    sibuk.value = true
    error.value = ''
    try {
      const res = await fetch(`${API}/subscription/me`, { headers: auth.authHeader() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.pesan || 'Gagal memuat paket langganan.')
      ringkasan.value = data
      tokenCache = auth.token
      return data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      sibuk.value = false
    }
  }

  async function aktifkanPremium(hari) {
    sibuk.value = true
    error.value = ''
    try {
      const res = await fetch(`${API}/subscription/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth.authHeader() },
        body: JSON.stringify(hari ? { hari } : {}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.pesan || 'Gagal mengaktifkan Premium.')
      ringkasan.value = data
      return data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      sibuk.value = false
    }
  }

  async function kembalikanKeFree() {
    sibuk.value = true
    error.value = ''
    try {
      const res = await fetch(`${API}/subscription/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth.authHeader() },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.pesan || 'Gagal membatalkan Premium.')
      ringkasan.value = data
      return data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      sibuk.value = false
    }
  }

  function kosongkan() {
    ringkasan.value = null
    error.value = ''
    tokenCache = null
  }

  return {
    ringkasan,
    sibuk,
    error,
    plan,
    namaPaket,
    adalahPremium,
    adalahAdmin,
    batas,
    maksProyek,
    proyekAktif,
    proyekTersisa,
    proyekPenuh,
    bisaEksporPdf,
    muat,
    aktifkanPremium,
    kembalikanKeFree,
    kosongkan,
  }
})
