import request from 'supertest'
import app from '../../src/server'
import prisma from '../../src/lib/prisma'
import bcrypt from 'bcrypt'

describe('Books API', () => {
  let token: string
  let workspaceId: string
  let userId: string

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('password123', 10)

    const user = await prisma.user.create({
      data: { email: 'books-test@test.com', passwordHash, name: 'Books Tester' },
    })
    userId = user.id

    const ws = await prisma.workspace.create({
      data: {
        name: 'Books Test WS',
        members: { create: { userId: user.id, role: 'OWNER' } },
      },
    })
    workspaceId = ws.id

    // Create some seed books for testing
    await prisma.book.createMany({
      data: [
        { title: 'Reading Book', author: 'Author A', status: 'READING', userId, workspaceId },
        { title: 'Owned Book', author: 'Author B', status: 'OWNED', userId, workspaceId },
      ],
    })

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'books-test@test.com', password: 'password123' })
    token = res.body.data.token
  })

  afterAll(async () => {
    await prisma.review.deleteMany({ where: { book: { workspaceId } } })
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

  test('GET /books — 401 without token', async () => {
    const res = await request(app).get('/api/v1/books')
    expect(res.status).toBe(401)
  })

  test('GET /books — 200 with pagination', async () => {
    const res = await request(app)
      .get('/api/v1/books?page=1&pageSize=5')
      .set(headers())
    expect(res.status).toBe(200)
    expect(res.body.data.items).toBeDefined()
    expect(res.body.data.total).toBeDefined()
    expect(res.body.data.page).toBe(1)
    expect(res.body.data.pageSize).toBe(5)
  })

  test('GET /books?status=READING — only returns READING books', async () => {
    const res = await request(app)
      .get('/api/v1/books?status=READING')
      .set(headers())
    expect(res.status).toBe(200)
    res.body.data.items.forEach((book: any) => {
      expect(book.status).toBe('READING')
    })
  })
})
