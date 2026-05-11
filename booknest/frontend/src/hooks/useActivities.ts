import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'

export function useActivities() {
  const { activeWorkspaceId } = useWorkspaceStore()
  return useQuery({
    queryKey: ['activities', activeWorkspaceId],
    queryFn: async () => {
      const { data } = await apiClient.get('/activities')
      return data
    },
    enabled: !!activeWorkspaceId,
  })
}

export function useCreateActivity() {
  const queryClient = useQueryClient()
  const { activeWorkspaceId } = useWorkspaceStore()
  return useMutation({
    mutationFn: async (data: any) => {
      const { data: result } = await apiClient.post('/activities', data)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', activeWorkspaceId] })
    },
  })
}

export function useCreateOrder() {
  return useMutation({
    mutationFn: async (activityId: string) => {
      const { data } = await apiClient.post('/orders', { activityId })
      return data
    },
  })
}

export function useMockPay() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data } = await apiClient.post(`/payments/mock/pay/${orderId}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useMyOrders() {
  const { activeWorkspaceId } = useWorkspaceStore()
  return useQuery({
    queryKey: ['orders', activeWorkspaceId],
    queryFn: async () => {
      const { data } = await apiClient.get('/orders/my')
      return data
    },
    enabled: !!activeWorkspaceId,
  })
}
