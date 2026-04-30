import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { BookListView } from '../components/book/BookList'

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  )
}

describe('BookListView', () => {
  test('renders books from API', async () => {
    renderWithProviders(<BookListView />)

    await waitFor(() => {
      expect(screen.getByText('Clean Code')).toBeInTheDocument()
      expect(screen.getByText('Design Patterns')).toBeInTheDocument()
      expect(screen.getByText('Refactoring')).toBeInTheDocument()
    })
  })

  test('shows loading skeleton initially', () => {
    renderWithProviders(<BookListView />)
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })
})
