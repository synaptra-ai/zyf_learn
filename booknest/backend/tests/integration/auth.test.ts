import request from 'supertest'
import app from '../../src/server'
import prisma from '../../src/lib/prisma'

describe('Auth API', () => {
  const testEmail = `int-auth-${Date.now()}@test.com`

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } })
    await prisma.$disconnect()
  })

  test('POST /auth/register — 201 on success', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: testEmail, password: 'password123', name: 'Integration Test' })
    expect(res.status).toBe(201)
    expect(res.body.data.token).toBeDefined()
    expect(res.body.data.user.email).toBe(testEmail)
  })

  test('POST /auth/register — 409 on duplicate email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: testEmail, password: 'password123', name: 'Dup' })
    expect(res.status).toBe(409)
  })

  test('POST /auth/login — 200 with JWT', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: 'password123' })
    expect(res.status).toBe(200)
    expect(res.body.data.token).toBeDefined()
  })
})
