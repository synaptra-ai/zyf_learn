import request from 'supertest'
import app from '../../src/server'
import prisma from '../../src/lib/prisma'
import bcrypt from 'bcrypt'

describe('Book CSV import', () => {
  let token: string
  let workspaceId: string
  let userId: string

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('password123', 10)

    const user = await prisma.user.create({
      data: { email: 'import-test@test.com', passwordHash, name: 'Import Tester' },
    })
    userId = user.id

    const ws = await prisma.workspace.create({
      data: {
        name: 'Import Test WS',
        members: { create: { userId: user.id, role: 'MEMBER' } },
      },
    })
    workspaceId = ws.id

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'import-test@test.com', password: 'password123' })
    token = res.body.data.token
  })

  afterAll(async () => {
    await prisma.importJob.deleteMany({ where: { workspaceId } })
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

  test('creates import job after CSV upload', async () => {
    const csv = 'title,author,status\nTest Book,Test Author,OWNED'
    const res = await request(app)
      .post('/api/v1/imports/books')
      .set(headers())
      .attach('file', Buffer.from(csv), 'books.csv')
    expect(res.status).toBe(201)
    expect(res.body.data.id).toBeDefined()
    expect(res.body.data.status).toBe('PENDING')
  })

  test('rejects non-CSV file', async () => {
    const res = await request(app)
      .post('/api/v1/imports/books')
      .set(headers())
      .attach('file', Buffer.from('not a csv'), 'books.txt')
    expect(res.status).toBe(500)
  })

  test('can get import job status', async () => {
    const csv = 'title,author\nAnother Book,Another Author'
    const createRes = await request(app)
      .post('/api/v1/imports/books')
      .set(headers())
      .attach('file', Buffer.from(csv), 'books.csv')
    const jobId = createRes.body.data.id

    // Wait a bit for worker to process (or at least check status)
    const res = await request(app)
      .get(`/api/v1/imports/${jobId}`)
      .set(headers())
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(jobId)
  })

  test('returns 404 for non-existent job', async () => {
    const res = await request(app)
      .get('/api/v1/imports/non-existent-id')
      .set(headers())
    expect(res.status).toBe(404)
  })
})
