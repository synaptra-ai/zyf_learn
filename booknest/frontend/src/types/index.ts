export type BookStatus = 'OWNED' | 'READING' | 'FINISHED' | 'WISHLIST'

export interface User {
  id: string
  email: string
  name: string
  role: string
  createdAt?: string
}

export interface Book {
  id: string
  title: string
  author: string
  isbn?: string
  pageCount?: number
  description?: string
  coverUrl?: string
  status: BookStatus
  categoryId?: string
  category?: Category
  reviews?: Review[]
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  color: string
  _count?: { books: number }
  createdAt: string
}

export interface Review {
  id: string
  rating: number
  text?: string
  bookId: string
  user: { id: string; name: string }
  createdAt: string
}

export interface PaginatedData<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ReadingRecord {
  id: string
  bookId: string
  startDate: string
  endDate?: string
  notes?: string
}
