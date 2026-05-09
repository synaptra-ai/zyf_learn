import request from 'supertest'
import app from '../../src/server'
import prisma from '../../src/lib/prisma'

describe('Health Check API', () => {
  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('GET /health — returns ok', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body.timestamp).toBeDefined()
  })

  test('GET /health/detailed — returns checks', async () => {
    const res = await request(app).get('/health/detailed')
    expect([200, 503]).toContain(res.status)
    expect(res.body).toHaveProperty('checks')
    expect(res.body.checks).toHaveProperty('database')
    expect(res.body.checks).toHaveProperty('redis')
    expect(res.body).toHaveProperty('uptime')
    expect(res.body).toHaveProperty('version')
  })
})
