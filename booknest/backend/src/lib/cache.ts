import redis from './redis'

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const data = await redis.get(key)
    if (!data) return null
    return JSON.parse(data)
  },

  async set(key: string, value: any, ttl: number): Promise<void> {
    await redis.setex(key, ttl, JSON.stringify(value))
  },

  async del(pattern: string): Promise<void> {
    if (pattern.includes('*')) {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } else {
      await redis.del(pattern)
    }
  },

  async getOrSet<T>(key: string, fn: () => Promise<T>, ttl: number): Promise<T> {
    const cached = await cache.get<T>(key)
    if (cached !== null) return cached

    const data = await fn()
    await cache.set(key, data, ttl)
    return data
  },
}
