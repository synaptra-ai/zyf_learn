import request from 'supertest'
import app from '../../src/server'
import prisma from '../../src/lib/prisma'

describe('Rate Limiting', () => {
  let token: string
  const originalNodeEnv = process.env.NODE_ENV

  beforeAll(async () => {
    // Rate limiters skip when NODE_ENV=test, so use a different value
    process.env.NODE_ENV = 'ci-test'

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@booknest.com', password: 'password123' })
    token = res.body.data.token
  })

  afterAll(async () => {
    process.env.NODE_ENV = originalNodeEnv
    await prisma.$disconnect()
  })

  test('auth routes: should block after too many login attempts', async () => {
    const requests = Array(12).fill(null).map(() =>
      request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'ratelimit@test.com', password: 'wrong' }),
    )

    const results = await Promise.all(requests)
    const blocked = results.some((r) => r.status === 429)
    expect(blocked).toBe(true)
  })
})
