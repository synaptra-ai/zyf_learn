import { Server as SocketServer } from 'socket.io'
import type { Server } from 'http'
import jwt from 'jsonwebtoken'

let io: SocketServer

export function initSocket(server: Server) {
  io = new SocketServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:4001',
      credentials: true,
    },
  })

  io.use((socket, next) => {
    const token = socket.handshake.auth.token
    if (!token) return next(new Error('Authentication error'))
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string }
      socket.data.userId = decoded.id
      next()
    } catch {
      next(new Error('Authentication error'))
    }
  })

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.data.userId}`)
    socket.join(`user:${socket.data.userId}`)

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.data.userId}`)
    })
  })

  return io
}

export function getIO() {
  if (!io) throw new Error('Socket.io not initialized')
  return io
}

export function notifyUser(userId: string, event: string, data: any) {
  try {
    getIO().to(`user:${userId}`).emit(event, data)
  } catch {
    // Socket not initialized, skip notification
  }
}
