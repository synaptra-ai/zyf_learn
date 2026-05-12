import Taro from '@tarojs/taro'
import { create } from 'zustand'

interface WorkspaceState {
  activeWorkspaceId: string | null
  hydrate: () => void
  setActiveWorkspace: (id: string | null) => void
}

const WORKSPACE_KEY = 'booknest_active_workspace'

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeWorkspaceId: null,
  hydrate: () => {
    const id = Taro.getStorageSync<string>(WORKSPACE_KEY) || null
    set({ activeWorkspaceId: id })
  },
  setActiveWorkspace: (id) => {
    if (id) {
      Taro.setStorageSync(WORKSPACE_KEY, id)
    } else {
      Taro.removeStorageSync(WORKSPACE_KEY)
    }
    set({ activeWorkspaceId: id })
  },
}))
