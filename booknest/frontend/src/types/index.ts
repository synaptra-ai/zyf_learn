export type BookStatus = 'OWNED' | 'READING' | 'FINISHED' | 'WISHLIST'

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
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  color: string
  createdAt: string
}

export interface ReadingRecord {
  id: string
  bookId: string
  startDate: string
  endDate?: string
  notes?: string
}
