import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'

export const workspaceKeys = {
  all: ['workspaces'] as const,
  list: () => [...workspaceKeys.all, 'list'] as const,
  members: (workspaceId: string) => [...workspaceKeys.all, workspaceId, 'members'] as const,
}

export function useWorkspaces() {
  return useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: async () => {
      const { data } = await apiClient.get('/workspaces')
      return data
    },
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: { name: string; description?: string }) => {
      const { data } = await apiClient.post('/workspaces', body)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceKeys.list() }),
  })
}

export function useWorkspaceMembers() {
  const { activeWorkspaceId } = useWorkspaceStore()
  return useQuery({
    queryKey: workspaceKeys.members(activeWorkspaceId || ''),
    queryFn: async () => {
      const { data } = await apiClient.get('/workspaces/current/members')
      return data
    },
    enabled: !!activeWorkspaceId,
  })
}

export function useInviteMember() {
  const queryClient = useQueryClient()
  const { activeWorkspaceId } = useWorkspaceStore()

  return useMutation({
    mutationFn: async (body: { email: string; role: string }) => {
      const { data } = await apiClient.post('/workspaces/current/invitations', body)
      return data
    },
    onSuccess: () => {
      if (activeWorkspaceId) {
        queryClient.invalidateQueries({ queryKey: workspaceKeys.members(activeWorkspaceId) })
      }
    },
  })
}
