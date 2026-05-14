import { View } from '@tarojs/components'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useThemeStore } from '@/stores/theme-store'
import './app.scss'

function App({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    useAuthStore.getState().hydrate()
    useWorkspaceStore.getState().hydrate()
    useThemeStore.getState().hydrate()
  }, [])

  return <View>{children}</View>
}

export default App
