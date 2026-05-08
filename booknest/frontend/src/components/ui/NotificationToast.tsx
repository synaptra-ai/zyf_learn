import { Bell, X } from 'lucide-react'
import { useSocket } from '../../hooks/useSocket'

export default function NotificationToast() {
  const { notifications, dismiss } = useSocket()

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((n, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 flex items-center gap-3 animate-slide-in min-w-[280px]"
        >
          <Bell className="h-5 w-5 text-blue-500 shrink-0" />
          <p className="text-sm text-gray-700 dark:text-gray-200 flex-1">{n.message}</p>
          <button
            onClick={() => dismiss(i)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
