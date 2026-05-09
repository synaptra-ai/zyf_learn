import Redis from 'ioredis'
import { logger } from '../utils/logger'

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 2000)
    return delay
  },
})

redis.on('error', (err) => {
  logger.error('Redis connection error', { error: err.message })
})

redis.on('connect', () => {
  logger.info('Redis connected')
})

export default redis
