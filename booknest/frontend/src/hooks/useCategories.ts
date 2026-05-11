import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { categoryKeys } from './query-keys'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import type { Category } from '@/types'

export function useCategories() {
  const { activeWorkspaceId } = useWorkspaceStore()
  return useQuery({
    queryKey: categoryKeys.list(activeWorkspaceId),
    queryFn: async () => {
      const { data } = await apiClient.get<Category[]>('/categories')
      return data
    },
    enabled: !!activeWorkspaceId,
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  const { activeWorkspaceId } = useWorkspaceStore()
  return useMutation({
    mutationFn: async (categoryData: { name: string; color: string }) => {
      const { data } = await apiClient.post('/categories', categoryData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.list(activeWorkspaceId) })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  const { activeWorkspaceId } = useWorkspaceStore()
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; color?: string }) => {
      const { data: updated } = await apiClient.put(`/categories/${id}`, data)
      return updated
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.list(activeWorkspaceId) })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  const { activeWorkspaceId } = useWorkspaceStore()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/categories/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.list(activeWorkspaceId) })
    },
  })
}
