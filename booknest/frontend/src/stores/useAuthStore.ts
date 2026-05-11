import { create } from 'zustand'
import apiClient from '@/lib/api-client'
import type { User } from '@/types'

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  loadFromStorage: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,

  login: async (email, password) => {
    const { data } = await apiClient.post('/auth/login', { email, password })
    localStorage.setItem('auth_token', data.token)
    set({ token: data.token, user: data.user, isAuthenticated: true })
  },

  register: async (email, password, name) => {
    const { data } = await apiClient.post('/auth/register', { email, password, name })
    localStorage.setItem('auth_token', data.token)
    set({ token: data.token, user: data.user, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('auth_token')
    set({ token: null, user: null, isAuthenticated: false })
  },

  loadFromStorage: () => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      set({ token, isAuthenticated: true })
      apiClient.get('/auth/me').then(({ data }) => {
        set({ user: data })
      }).catch(() => {
        localStorage.removeItem('auth_token')
        set({ token: null, user: null, isAuthenticated: false })
      })
    }
  },
}))
