import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReviewForm } from '../components/book/ReviewForm'

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

describe('ReviewForm', () => {
  test('renders form with stars and textarea', () => {
    renderWithProviders(<ReviewForm bookId="book-1" />)

    expect(screen.getByPlaceholderText('写下你的感想...')).toBeInTheDocument()
    expect(screen.getByText('提交评论')).toBeInTheDocument()
  })

  test('submit button is disabled when no rating selected', () => {
    renderWithProviders(<ReviewForm bookId="book-1" />)

    expect(screen.getByText('提交评论')).toBeDisabled()
  })
})
