import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const API = 'http://localhost:3000/api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('wedspace_token') || '')
  const user = ref(JSON.parse(localStorage.getItem('wedspace_user') || 'null'))

  const sudahLogin = computed(() => !!token.value)
  const adalahAdmin = computed(() => user.value?.role === 'admin')

  function simpanUser(data) {
    user.value = data
    if (data) {
      localStorage.setItem('wedspace_user', JSON.stringify(data))
    } else {
      localStorage.removeItem('wedspace_user')
    }
  }

  async function login(username_email, password) {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username_email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.pesan || 'Login gagal.')
    token.value = data.token
    simpanUser(data.user)
    localStorage.setItem('wedspace_token', data.token)
    return data.user
  }

  function perbaruiUser(data) {
    if (!data) return
    simpanUser({ ...(user.value || {}), ...data })
  }

  function logout() {
    token.value = ''
    simpanUser(null)
    localStorage.removeItem('wedspace_token')
  }

  function authHeader() {
    return token.value ? { Authorization: `Bearer ${token.value}` } : {}
  }

  return { token, user, sudahLogin, adalahAdmin, login, perbaruiUser, logout, authHeader }
})
