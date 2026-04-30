import request from 'supertest'
import app from '../../src/server'
import prisma from '../../src/lib/prisma'

describe('Books API', () => {
  let token: string

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@booknest.com', password: 'password123' })
    token = res.body.data.token
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('GET /books — 401 without token', async () => {
    const res = await request(app).get('/api/v1/books')
    expect(res.status).toBe(401)
  })

  test('GET /books — 200 with pagination', async () => {
    const res = await request(app)
      .get('/api/v1/books?page=1&pageSize=5')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.data.items).toBeDefined()
    expect(res.body.data.total).toBeDefined()
    expect(res.body.data.page).toBe(1)
    expect(res.body.data.pageSize).toBe(5)
  })

  test('GET /books?status=READING — only returns READING books', async () => {
    const res = await request(app)
      .get('/api/v1/books?status=READING')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    res.body.data.items.forEach((book: any) => {
      expect(book.status).toBe('READING')
    })
  })
})
