import Taro from '@tarojs/taro'
import { create } from 'zustand'

interface MiniUser {
  id: string
  email?: string | null
  nickname?: string | null
  avatarUrl?: string | null
}

interface AuthState {
  token: string | null
  user: MiniUser | null
  hydrate: () => void
  setSession: (payload: { token: string; user: MiniUser }) => void
  logout: () => void
}

const TOKEN_KEY = 'booknest_token'
const USER_KEY = 'booknest_user'

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  hydrate: () => {
    const token = Taro.getStorageSync<string>(TOKEN_KEY) || null
    const user = Taro.getStorageSync<MiniUser>(USER_KEY) || null
    set({ token, user })
  },
  setSession: (payload) => {
    Taro.setStorageSync(TOKEN_KEY, payload.token)
    Taro.setStorageSync(USER_KEY, payload.user)
    set(payload)
  },
  logout: () => {
    Taro.removeStorageSync(TOKEN_KEY)
    Taro.removeStorageSync(USER_KEY)
    set({ token: null, user: null })
  },
}))
