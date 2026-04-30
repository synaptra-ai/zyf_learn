export const bookKeys = {
  all: ['books'] as const,
  lists: () => [...bookKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...bookKeys.lists(), filters] as const,
  details: () => [...bookKeys.all, 'detail'] as const,
  detail: (id: string) => [...bookKeys.details(), id] as const,
}

export const categoryKeys = {
  all: ['categories'] as const,
  list: () => [...categoryKeys.all, 'list'] as const,
}

export const reviewKeys = {
  all: ['reviews'] as const,
  byBook: (bookId: string) => [...reviewKeys.all, 'book', bookId] as const,
}

export const statsKeys = {
  all: ['stats'] as const,
  overview: () => [...statsKeys.all, 'overview'] as const,
}
