import { cva, type VariantProps } from 'class-variance-authority'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const toastVariants = cva(
  'flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg text-sm font-medium',
  {
    variants: {
      variant: {
        success: 'bg-green-50 text-green-800 border border-green-200',
        error: 'bg-red-50 text-red-800 border border-red-200',
        info: 'bg-blue-50 text-blue-800 border border-blue-200',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  }
)

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
}

interface ToastProps extends VariantProps<typeof toastVariants> {
  message: string
  onClose: () => void
  className?: string
}

function Toast({ variant = 'info', message, onClose, className }: ToastProps) {
  const Icon = icons[variant ?? 'info']

  return (
    <div className={cn(toastVariants({ variant }), className)}>
      <Icon className="h-5 w-5 shrink-0" />
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="shrink-0 hover:opacity-70">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Array<{
    id: string
    message: string
    variant: 'success' | 'error' | 'info'
  }>
  onRemove: (id: string) => void
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          variant={toast.variant}
          message={toast.message}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  )
}

export { Toast, ToastContainer, toastVariants }
