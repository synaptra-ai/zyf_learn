import redis from '../../src/lib/redis'
import { cache } from '../../src/lib/cache'

describe('Cache', () => {
  afterAll(async () => {
    const keys = await redis.keys('test:*')
    if (keys.length > 0) await redis.del(...keys)
    await redis.quit()
  })

  test('getOrSet: first call executes fetcher, second hits cache', async () => {
    let callCount = 0
    const fetcher = async () => {
      callCount++
      return { total: 42 }
    }

    const result1 = await cache.getOrSet('test:getOrSet', fetcher, 60)
    expect(result1).toEqual({ total: 42 })
    expect(callCount).toBe(1)

    const result2 = await cache.getOrSet('test:getOrSet', fetcher, 60)
    expect(result2).toEqual({ total: 42 })
    expect(callCount).toBe(1) // still 1, cache hit
  })

  test('del: clears cache, fetcher runs again', async () => {
    let callCount = 0
    const fetcher = async () => {
      callCount++
      return { value: callCount }
    }

    await cache.getOrSet('test:del', fetcher, 60)
    expect(callCount).toBe(1)

    await cache.del('test:del')

    await cache.getOrSet('test:del', fetcher, 60)
    expect(callCount).toBe(2) // fetcher called again
  })

  test('del: wildcard pattern clears multiple keys', async () => {
    await cache.set('test:wildcard:1', { a: 1 }, 60)
    await cache.set('test:wildcard:2', { b: 2 }, 60)

    const hit1 = await cache.get('test:wildcard:1')
    const hit2 = await cache.get('test:wildcard:2')
    expect(hit1).not.toBeNull()
    expect(hit2).not.toBeNull()

    await cache.del('test:wildcard:*')

    const miss1 = await cache.get('test:wildcard:1')
    const miss2 = await cache.get('test:wildcard:2')
    expect(miss1).toBeNull()
    expect(miss2).toBeNull()
  })

  test('get: returns null for missing key', async () => {
    const result = await cache.get('test:nonexistent')
    expect(result).toBeNull()
  })

  test('set and get: stores and retrieves data', async () => {
    await cache.set('test:setget', { name: 'booknest' }, 60)
    const result = await cache.get('test:setget')
    expect(result).toEqual({ name: 'booknest' })
  })
})
