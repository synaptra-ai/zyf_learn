import dotenv from 'dotenv'
dotenv.config()

import './lib/redis'
import app from './server'
import { createServer } from 'http'
import { initSocket } from './lib/socket'
import { logger } from './utils/logger'

const PORT = process.env.PORT || 4000

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', err)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', { reason })
  process.exit(1)
})

const server = createServer(app)
initSocket(server)

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`)
})
