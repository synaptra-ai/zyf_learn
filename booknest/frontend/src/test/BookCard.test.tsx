import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { BookCard } from '@/components/book/BookCard'
import type { Book, Category } from '@/types'

const mockBook: Book = {
  id: 'book-1',
  title: '三体',
  author: '刘慈欣',
  status: 'OWNED',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const mockCategory: Category = {
  id: 'cat-1',
  name: '科幻',
  color: '#3B82F6',
  createdAt: '2026-01-01T00:00:00.000Z',
}

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

describe('BookCard', () => {
  it('should display book title and author', () => {
    renderWithRouter(<BookCard book={mockBook} />)

    expect(screen.getByText('三体')).toBeInTheDocument()
    expect(screen.getByText('刘慈欣')).toBeInTheDocument()
  })

  it('should display status badge', () => {
    renderWithRouter(<BookCard book={mockBook} />)

    expect(screen.getByText('已拥有')).toBeInTheDocument()
  })

  it('should display category when provided', () => {
    renderWithRouter(<BookCard book={mockBook} category={mockCategory} />)

    expect(screen.getByText('科幻')).toBeInTheDocument()
  })

  it('should not display category when not provided', () => {
    renderWithRouter(<BookCard book={mockBook} />)

    expect(screen.queryByText('科幻')).not.toBeInTheDocument()
  })

  it('should show default icon when no cover image', () => {
    const { container } = renderWithRouter(<BookCard book={mockBook} />)

    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
  })

  it('should show cover image when coverUrl is set', () => {
    const bookWithCover = { ...mockBook, coverUrl: 'https://example.com/cover.jpg' }
    renderWithRouter(<BookCard book={bookWithCover} />)

    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://example.com/cover.jpg')
  })
})
