import { AlertCircle } from 'lucide-react'
import { Button } from './Button'

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <AlertCircle className="mb-3 h-12 w-12 text-red-500" />
      <p className="text-lg font-medium text-gray-600 dark:text-gray-400">{message || '加载失败'}</p>
      {onRetry && (
        <Button className="mt-4" onClick={onRetry}>
          重试
        </Button>
      )}
    </div>
  )
}
