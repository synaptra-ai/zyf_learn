import { useQuery } from '@tanstack/react-query'
import { listBooks, getBook, type ListBooksParams } from '@/services/books'

export const bookKeys = {
  all: ['books'] as const,
  list: (workspaceId: string | null, params: ListBooksParams) =>
    ['books', 'list', workspaceId, params] as const,
  detail: (id: string) => ['books', 'detail', id] as const,
}

export function useBooks(workspaceId: string | null, params: ListBooksParams = {}) {
  return useQuery({
    queryKey: bookKeys.list(workspaceId, params),
    queryFn: () => listBooks(params),
    enabled: Boolean(workspaceId),
  })
}

export function useBook(id: string) {
  return useQuery({
    queryKey: bookKeys.detail(id),
    queryFn: () => getBook(id),
    enabled: Boolean(id),
  })
}
