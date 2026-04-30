import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Book, BookStatus } from '@/types'

interface BookState {
  books: Book[]
  addBook: (book: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateBook: (id: string, updates: Partial<Omit<Book, 'id' | 'createdAt'>>) => void
  deleteBook: (id: string) => void
  getBooksByStatus: (status: BookStatus) => Book[]
  searchBooks: (query: string) => Book[]
  setBooks: (books: Book[]) => void
}

export const useBookStore = create<BookState>()(
  persist(
    (set, get) => ({
      books: [],

      addBook: (book) => {
        const now = new Date().toISOString()
        const newBook: Book = {
          ...book,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({ books: [...state.books, newBook] }))
      },

      updateBook: (id, updates) => {
        set((state) => ({
          books: state.books.map((book) =>
            book.id === id
              ? { ...book, ...updates, updatedAt: new Date().toISOString() }
              : book
          ),
        }))
      },

      deleteBook: (id) => {
        set((state) => ({ books: state.books.filter((book) => book.id !== id) }))
      },

      getBooksByStatus: (status) => {
        return get().books.filter((book) => book.status === status)
      },

      searchBooks: (query) => {
        const q = query.toLowerCase()
        return get().books.filter(
          (book) =>
            book.title.toLowerCase().includes(q) ||
            book.author.toLowerCase().includes(q) ||
            book.isbn?.includes(q)
        )
      },

      setBooks: (books) => {
        set({ books })
      },
    }),
    { name: 'booknest-books' }
  )
)
