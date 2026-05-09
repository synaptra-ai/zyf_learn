import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { bookKeys } from './query-keys'
import type { paths } from '@/types/api.generated'

type ListBooksResponse =
  paths['/api/v1/books']['get']['responses']['200']['content']['application/json']['data']

type CreateBookRequestBody =
  paths['/api/v1/books']['post']['requestBody']
type CreateBookBody = NonNullable<CreateBookRequestBody>['content']['application/json']

type UpdateBookRequestBody =
  paths['/api/v1/books/{id}']['put']['requestBody']
type UpdateBookBody = NonNullable<UpdateBookRequestBody>['content']['application/json']

type BookItem = ListBooksResponse['items'][number] & {
  category?: { id: string; name: string; color: string }
  reviews?: { id: string; rating: number; text?: string; user: { id: string; name: string }; createdAt: string }[]
}

export type { BookItem }

interface BookListData {
  items: BookItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

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
      const { data } = await apiClient.get<BookListData>('/books', { params: filters })
      return data
    },
  })
}

export function useBook(id: string) {
  return useQuery({
    queryKey: bookKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<BookItem>(`/books/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateBook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (bookData: CreateBookBody) => {
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
    mutationFn: async ({ id, ...data }: UpdateBookBody & { id: string }) => {
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
      queryClient.setQueriesData<BookListData>({ queryKey: bookKeys.lists() }, (old) => {
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

export function useUploadCover() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ bookId, file }: { bookId: string; file: File }) => {
      const formData = new FormData()
      formData.append('cover', file)
      const { data } = await apiClient.post(`/books/${bookId}/cover`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: bookKeys.detail(variables.bookId) })
      queryClient.invalidateQueries({ queryKey: bookKeys.lists() })
    },
  })
}
