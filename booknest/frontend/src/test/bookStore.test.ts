import { describe, it, expect, beforeEach } from 'vitest'
import { useBookStore } from '@/stores/useBookStore'

describe('useBookStore', () => {
  beforeEach(() => {
    useBookStore.setState({ books: [] })
  })

  it('addBook should add a book with generated id and timestamps', () => {
    useBookStore.getState().addBook({
      title: '三体',
      author: '刘慈欣',
      status: 'OWNED',
    })

    const books = useBookStore.getState().books
    expect(books).toHaveLength(1)
    expect(books[0].title).toBe('三体')
    expect(books[0].author).toBe('刘慈欣')
    expect(books[0].status).toBe('OWNED')
    expect(books[0].id).toBeTruthy()
    expect(books[0].createdAt).toBeTruthy()
  })

  it('deleteBook should remove a book by id', () => {
    useBookStore.getState().addBook({ title: '三体', author: '刘慈欣', status: 'OWNED' })
    useBookStore.getState().addBook({ title: '流浪地球', author: '刘慈欣', status: 'READING' })

    const bookId = useBookStore.getState().books[0].id
    useBookStore.getState().deleteBook(bookId)

    const books = useBookStore.getState().books
    expect(books).toHaveLength(1)
    expect(books[0].title).toBe('流浪地球')
  })

  it('searchBooks should match title or author', () => {
    useBookStore.getState().addBook({ title: '三体', author: '刘慈欣', status: 'OWNED' })
    useBookStore.getState().addBook({ title: '银河帝国', author: '阿西莫夫', status: 'WISHLIST' })
    useBookStore.getState().addBook({ title: '三体II', author: '刘慈欣', status: 'READING' })

    expect(useBookStore.getState().searchBooks('三体')).toHaveLength(2)
    expect(useBookStore.getState().searchBooks('刘慈欣')).toHaveLength(2)
    expect(useBookStore.getState().searchBooks('阿西莫夫')).toHaveLength(1)
    expect(useBookStore.getState().searchBooks('不存在的书')).toHaveLength(0)
  })

  it('getBooksByStatus should filter by status', () => {
    useBookStore.getState().addBook({ title: '三体', author: '刘慈欣', status: 'OWNED' })
    useBookStore.getState().addBook({ title: '流浪地球', author: '刘慈欣', status: 'READING' })

    expect(useBookStore.getState().getBooksByStatus('OWNED')).toHaveLength(1)
    expect(useBookStore.getState().getBooksByStatus('FINISHED')).toHaveLength(0)
  })

  it('updateBook should update fields and set updatedAt', async () => {
    useBookStore.getState().addBook({ title: '三体', author: '刘慈欣', status: 'OWNED' })
    const bookId = useBookStore.getState().books[0].id
    const createdAt = useBookStore.getState().books[0].createdAt

    await new Promise((r) => setTimeout(r, 10))
    useBookStore.getState().updateBook(bookId, { title: '三体：地球往事' })

    const book = useBookStore.getState().books[0]
    expect(book.title).toBe('三体：地球往事')
    expect(book.createdAt).toBe(createdAt)
    expect(book.updatedAt).not.toBe(createdAt)
  })
})
