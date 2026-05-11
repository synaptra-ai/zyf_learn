import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WorkspaceState {
  activeWorkspaceId: string | null
  setActiveWorkspaceId: (id: string) => void
  clearActiveWorkspaceId: () => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      activeWorkspaceId: null,
      setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),
      clearActiveWorkspaceId: () => set({ activeWorkspaceId: null }),
    }),
    { name: 'booknest-workspace' },
  ),
)
