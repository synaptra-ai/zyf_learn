export const bookKeys = {
  all: ['books'] as const,
  lists: (workspaceId: string | null) => [...bookKeys.all, workspaceId, 'list'] as const,
  list: (workspaceId: string | null, filters: Record<string, any>) => [...bookKeys.lists(workspaceId), filters] as const,
  details: (workspaceId: string | null) => [...bookKeys.all, workspaceId, 'detail'] as const,
  detail: (workspaceId: string | null, id: string) => [...bookKeys.details(workspaceId), id] as const,
}

export const categoryKeys = {
  all: ['categories'] as const,
  list: (workspaceId: string | null) => [...categoryKeys.all, workspaceId, 'list'] as const,
}

export const reviewKeys = {
  all: ['reviews'] as const,
  byBook: (bookId: string) => [...reviewKeys.all, 'book', bookId] as const,
}

export const statsKeys = {
  all: ['stats'] as const,
  overview: (workspaceId: string | null) => [...statsKeys.all, workspaceId, 'overview'] as const,
}
