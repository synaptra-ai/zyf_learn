import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { bookKeys } from './query-keys'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'

interface CreateBookBody {
  title: string
  author: string
  isbn?: string
  pageCount?: number
  description?: string
  status?: string
  categoryId?: string
}

interface UpdateBookBody {
  title?: string
  author?: string
  isbn?: string
  pageCount?: number
  description?: string
  status?: string
  categoryId?: string
}

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
  const { activeWorkspaceId } = useWorkspaceStore()
  return useQuery({
    queryKey: bookKeys.list(activeWorkspaceId, filters),
    queryFn: async () => {
      const { data } = await apiClient.get<BookListData>('/books', { params: filters })
      return data
    },
    enabled: !!activeWorkspaceId,
  })
}

export function useBook(id: string) {
  const { activeWorkspaceId } = useWorkspaceStore()
  return useQuery({
    queryKey: bookKeys.detail(activeWorkspaceId, id),
    queryFn: async () => {
      const { data } = await apiClient.get<BookItem>(`/books/${id}`)
      return data
    },
    enabled: !!id && !!activeWorkspaceId,
  })
}

export function useCreateBook() {
  const queryClient = useQueryClient()
  const { activeWorkspaceId } = useWorkspaceStore()
  return useMutation({
    mutationFn: async (bookData: CreateBookBody) => {
      const { data } = await apiClient.post('/books', bookData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookKeys.lists(activeWorkspaceId) })
    },
  })
}

export function useUpdateBook() {
  const queryClient = useQueryClient()
  const { activeWorkspaceId } = useWorkspaceStore()
  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateBookBody & { id: string }) => {
      const { data: updated } = await apiClient.put(`/books/${id}`, data)
      return updated
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: bookKeys.detail(activeWorkspaceId, variables.id) })
      queryClient.invalidateQueries({ queryKey: bookKeys.lists(activeWorkspaceId) })
    },
  })
}

export function useDeleteBook() {
  const queryClient = useQueryClient()
  const { activeWorkspaceId } = useWorkspaceStore()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/books/${id}`)
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: bookKeys.lists(activeWorkspaceId) })
      const previousLists = queryClient.getQueriesData({ queryKey: bookKeys.lists(activeWorkspaceId) })
      queryClient.setQueriesData<BookListData>({ queryKey: bookKeys.lists(activeWorkspaceId) }, (old) => {
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
      queryClient.invalidateQueries({ queryKey: bookKeys.lists(activeWorkspaceId) })
    },
  })
}

export function useUploadCover() {
  const queryClient = useQueryClient()
  const { activeWorkspaceId } = useWorkspaceStore()
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
      queryClient.invalidateQueries({ queryKey: bookKeys.detail(activeWorkspaceId, variables.bookId) })
      queryClient.invalidateQueries({ queryKey: bookKeys.lists(activeWorkspaceId) })
    },
  })
}
