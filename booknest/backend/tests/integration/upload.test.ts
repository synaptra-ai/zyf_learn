import request from 'supertest'
import app from '../../src/server'
import prisma from '../../src/lib/prisma'
import bcrypt from 'bcrypt'

describe('Book Cover Upload', () => {
  let token: string
  let workspaceId: string
  let userId: string
  let bookId: string

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('password123', 10)

    const user = await prisma.user.create({
      data: { email: 'upload-test@test.com', passwordHash, name: 'Upload Tester' },
    })
    userId = user.id

    const ws = await prisma.workspace.create({
      data: {
        name: 'Upload Test WS',
        members: { create: { userId: user.id, role: 'OWNER' } },
      },
    })
    workspaceId = ws.id

    const book = await prisma.book.create({
      data: {
        title: 'Upload Test Book',
        author: 'Test Author',
        status: 'OWNED',
        userId,
        workspaceId,
      },
    })
    bookId = book.id

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'upload-test@test.com', password: 'password123' })
    token = res.body.data.token
  })

  afterAll(async () => {
    await prisma.book.deleteMany({ where: { workspaceId } })
    await prisma.workspaceMember.deleteMany({ where: { workspaceId } })
    await prisma.workspace.delete({ where: { id: workspaceId } })
    await prisma.user.delete({ where: { id: userId } })
    await prisma.$disconnect()
  })

  const headers = () => ({
    Authorization: `Bearer ${token}`,
    'X-Workspace-Id': workspaceId,
  })

  test('POST /books/:id/cover — 401 without token', async () => {
    const res = await request(app)
      .post(`/api/v1/books/${bookId}/cover`)
    expect(res.status).toBe(401)
  })

  test('POST /books/:id/cover — 400 without file', async () => {
    const res = await request(app)
      .post(`/api/v1/books/${bookId}/cover`)
      .set(headers())
    expect(res.status).toBe(400)
  })

  test('POST /books/:id/cover — 404 for nonexistent book', async () => {
    const res = await request(app)
      .post('/api/v1/books/nonexistent-id/cover')
      .set(headers())
      .attach('cover', Buffer.from('fake image'), 'test.jpg')
    expect(res.status).toBe(404)
  })

  test('POST /books/:id/cover — reject non-image file', async () => {
    const res = await request(app)
      .post(`/api/v1/books/${bookId}/cover`)
      .set(headers())
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
      .set(headers())
      .attach('cover', jpegBuffer, 'cover.jpg')

    expect(res.status).toBe(200)
    expect(res.body.message).toBe('封面上传成功')
    expect(res.body.data.coverUrl).toMatch(/aliyuncs\.com|mock-uploads/)
  })
})
