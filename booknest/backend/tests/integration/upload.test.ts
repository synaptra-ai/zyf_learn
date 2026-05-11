import request from 'supertest'
import app from '../../src/server'
import prisma from '../../src/lib/prisma'
import path from 'path'

describe('Book Cover Upload', () => {
  let token: string
  let bookId: string

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@booknest.com', password: 'password123' })
    token = res.body.data.token

    const book = await prisma.book.findFirst({
      where: { user: { email: 'test@booknest.com' } },
    })
    bookId = book!.id
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('POST /books/:id/cover — 401 without token', async () => {
    const res = await request(app)
      .post(`/api/v1/books/${bookId}/cover`)
    expect(res.status).toBe(401)
  })

  test('POST /books/:id/cover — 400 without file', async () => {
    const res = await request(app)
      .post(`/api/v1/books/${bookId}/cover`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(400)
  })

  test('POST /books/:id/cover — 404 for nonexistent book', async () => {
    const res = await request(app)
      .post('/api/v1/books/nonexistent-id/cover')
      .set('Authorization', `Bearer ${token}`)
      .attach('cover', Buffer.from('fake image'), 'test.jpg')
    expect(res.status).toBe(404)
  })

  test('POST /books/:id/cover — reject non-image file', async () => {
    const res = await request(app)
      .post(`/api/v1/books/${bookId}/cover`)
      .set('Authorization', `Bearer ${token}`)
      .attach('cover', Buffer.from('not an image'), 'test.txt')
    expect(res.status).toBe(400)
  })

  test('POST /books/:id/cover — upload valid image successfully', async () => {
    // Create a minimal valid JPEG buffer (1x1 pixel)
    const jpegBuffer = Buffer.from(
      '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AKwA//9k=',
      'base64',
    )

    const res = await request(app)
      .post(`/api/v1/books/${bookId}/cover`)
      .set('Authorization', `Bearer ${token}`)
      .attach('cover', jpegBuffer, 'cover.jpg')

    expect(res.status).toBe(200)
    expect(res.body.message).toBe('封面上传成功')
    expect(res.body.data.coverUrl).toMatch(/aliyuncs\.com|mock-uploads/)
  })
})
