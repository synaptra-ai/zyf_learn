import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorState } from '../components/ui/ErrorState'

describe('ErrorState', () => {
  test('displays error message and retry button', () => {
    const onRetry = vi.fn()
    render(<ErrorState message="加载失败" onRetry={onRetry} />)

    expect(screen.getByText('加载失败')).toBeInTheDocument()
    expect(screen.getByText('重试')).toBeInTheDocument()
  })

  test('calls onRetry when button clicked', async () => {
    const onRetry = vi.fn()
    render(<ErrorState message="Network Error" onRetry={onRetry} />)

    await userEvent.click(screen.getByText('重试'))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
