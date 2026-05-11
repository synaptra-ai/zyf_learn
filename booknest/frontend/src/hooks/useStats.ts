import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { statsKeys } from './query-keys'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import type { Book, Category } from '@/types'

export interface StatsData {
  totalBooks: number
  totalCategories: number
  statusBreakdown: Record<string, number>
  averageRating: number | null
  recentBooks: (Book & { category?: Category })[]
}

export function useStats() {
  const { activeWorkspaceId } = useWorkspaceStore()
  return useQuery({
    queryKey: statsKeys.overview(activeWorkspaceId),
    queryFn: async () => {
      const { data } = await apiClient.get<StatsData>('/stats')
      return data
    },
    enabled: !!activeWorkspaceId,
  })
}
