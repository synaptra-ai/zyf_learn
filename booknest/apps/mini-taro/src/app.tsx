import { PropsWithChildren, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useThemeStore } from '@/stores/theme-store'
import './app.scss'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

function App({ children }: PropsWithChildren) {
  useEffect(() => {
    useAuthStore.getState().hydrate()
    useWorkspaceStore.getState().hydrate()
    useThemeStore.getState().hydrate()
  }, [])

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

export default App
