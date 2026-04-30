import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeState {
  isDark: boolean
  toggleTheme: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDark: false,

      toggleTheme: () => {
        set((state) => {
          const next = !state.isDark
          document.documentElement.classList.toggle('dark', next)
          return { isDark: next }
        })
      },
    }),
    {
      name: 'booknest-theme',
      onRehydrateStorage: () => (state) => {
        if (state?.isDark) {
          document.documentElement.classList.add('dark')
        }
      },
    }
  )
)
