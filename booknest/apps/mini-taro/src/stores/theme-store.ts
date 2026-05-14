import { create } from 'zustand'
import Taro from '@tarojs/taro'

type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
  isDark: boolean
  hydrate: () => void
  setTheme: (theme: Theme) => void
}

const THEME_KEY = 'booknest_theme'

function getSystemIsDark(): boolean {
  try {
    const res = Taro.getSystemInfoSync()
    return res.theme === 'dark'
  } catch {
    return false
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',
  isDark: false,

  hydrate: () => {
    const saved = Taro.getStorageSync<THEME>(THEME_KEY)
    if (!saved) return
    const isDark = saved === 'dark' || (saved === 'system' && getSystemIsDark())
    set({ theme: saved, isDark })
  },

  setTheme: (theme) => {
    const isDark = theme === 'dark' || (theme === 'system' && getSystemIsDark())
    set({ theme, isDark })
    Taro.setStorageSync(THEME_KEY, theme)
  },
}))
