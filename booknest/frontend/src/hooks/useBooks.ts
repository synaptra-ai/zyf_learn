import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { bookKeys } from './query-keys'
import type { Book, PaginatedData } from '@/types'

interface BookFilters {
  page?: number
  pageSize?: number
  status?: string
  categoryId?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export function useBooks(filters: BookFilters) {
  return useQuery({
    queryKey: bookKeys.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedData<Book>>('/books', { params: filters })
      return data
    },
  })
}

export function useBook(id: string) {
  return useQuery({
    queryKey: bookKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<Book>(`/books/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateBook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (bookData: any) => {
      const { data } = await apiClient.post('/books', bookData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookKeys.lists() })
    },
  })
}

export function useUpdateBook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { data: updated } = await apiClient.put(`/books/${id}`, data)
      return updated
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: bookKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: bookKeys.lists() })
    },
  })
}

export function useDeleteBook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/books/${id}`)
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: bookKeys.lists() })
      const previousLists = queryClient.getQueriesData({ queryKey: bookKeys.lists() })
      queryClient.setQueriesData<PaginatedData<Book>>({ queryKey: bookKeys.lists() }, (old) => {
        if (!old) return old
        return { ...old, items: old.items.filter((b) => b.id !== id), total: old.total - 1 }
      })
      return { previousLists }
    },
    onError: (_err, _id, context) => {
      if (context?.previousLists) {
        context.previousLists.forEach(([key, data]) => {
          queryClient.setQueryData(key, data)
        })
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: bookKeys.lists() })
    },
  })
}
