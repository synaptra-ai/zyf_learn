import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { reviewKeys } from './query-keys'
import type { Review } from '@/types'

export function useReviews(bookId: string) {
  return useQuery({
    queryKey: reviewKeys.byBook(bookId),
    queryFn: async () => {
      const { data } = await apiClient.get<Review[]>(`/books/${bookId}/reviews`)
      return data
    },
    enabled: !!bookId,
  })
}

export function useCreateReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ bookId, ...data }: { bookId: string; rating: number; text?: string }) => {
      const { data: review } = await apiClient.post(`/books/${bookId}/reviews`, data)
      return review
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.byBook(variables.bookId) })
      queryClient.invalidateQueries({ queryKey: ['books'] })
    },
  })
}
