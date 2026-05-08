import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../stores/useAuthStore'

interface Notification {
  message: string
  book?: any
  timestamp: Date
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const { token, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated || !token) return

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000'
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket'],
    })

    socket.on('connect', () => {
      console.log('Socket connected')
    })

    socket.on('book:created', (data) => {
      setNotifications((prev) => [...prev, { ...data, timestamp: new Date() }])
    })

    socket.on('book:updated', (data) => {
      setNotifications((prev) => [...prev, { ...data, timestamp: new Date() }])
    })

    socket.on('book:deleted', (data) => {
      setNotifications((prev) => [...prev, { ...data, timestamp: new Date() }])
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
    }
  }, [isAuthenticated, token])

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (notifications.length === 0) return
    const timer = setTimeout(() => {
      setNotifications((prev) => prev.slice(1))
    }, 5000)
    return () => clearTimeout(timer)
  }, [notifications])

  const dismiss = (index: number) => {
    setNotifications((prev) => prev.filter((_, i) => i !== index))
  }

  return { notifications, dismiss }
}
