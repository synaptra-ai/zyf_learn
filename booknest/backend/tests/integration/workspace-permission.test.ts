import request from 'supertest'
import app from '../../src/server'
import prisma from '../../src/lib/prisma'
import bcrypt from 'bcrypt'

describe('Workspace RBAC', () => {
  let ownerToken: string
  let memberToken: string
  let viewerToken: string
  let outsiderToken: string
  let workspaceId: string
  let bookId: string
  let ownerId: string
  let memberId: string
  let viewerId: string
  let outsiderId: string

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('password123', 10)

    const owner = await prisma.user.create({ data: { email: 'rbac-owner@test.com', passwordHash, name: 'Owner' } })
    const member = await prisma.user.create({ data: { email: 'rbac-member@test.com', passwordHash, name: 'Member' } })
    const viewer = await prisma.user.create({ data: { email: 'rbac-viewer@test.com', passwordHash, name: 'Viewer' } })
    const outsider = await prisma.user.create({ data: { email: 'rbac-outsider@test.com', passwordHash, name: 'Outsider' } })

    ownerId = owner.id
    memberId = member.id
    viewerId = viewer.id
    outsiderId = outsider.id

    const ws = await prisma.workspace.create({
      data: {
        name: 'RBAC Test Workspace',
        members: {
          createMany: {
            data: [
              { userId: owner.id, role: 'OWNER' },
              { userId: member.id, role: 'MEMBER' },
              { userId: viewer.id, role: 'VIEWER' },
            ],
          },
        },
      },
    })
    workspaceId = ws.id

    // Create a book owned by the OWNER user in this workspace
    const book = await prisma.book.create({
      data: {
        title: 'RBAC Test Book',
        author: 'Test Author',
        status: 'OWNED',
        userId: owner.id,
        workspaceId: ws.id,
      },
    })
    bookId = book.id

    // Login all users to get tokens
    const [ownerRes, memberRes, viewerRes, outsiderRes] = await Promise.all([
      request(app).post('/api/v1/auth/login').send({ email: 'rbac-owner@test.com', password: 'password123' }),
      request(app).post('/api/v1/auth/login').send({ email: 'rbac-member@test.com', password: 'password123' }),
      request(app).post('/api/v1/auth/login').send({ email: 'rbac-viewer@test.com', password: 'password123' }),
      request(app).post('/api/v1/auth/login').send({ email: 'rbac-outsider@test.com', password: 'password123' }),
    ])
    ownerToken = ownerRes.body.data.token
    memberToken = memberRes.body.data.token
    viewerToken = viewerRes.body.data.token
    outsiderToken = outsiderRes.body.data.token
  })

  afterAll(async () => {
    await prisma.review.deleteMany({ where: { book: { workspaceId } } })
    await prisma.book.deleteMany({ where: { workspaceId } })
    await prisma.category.deleteMany({ where: { workspaceId } })
    await prisma.workspaceMember.deleteMany({ where: { workspaceId } })
    await prisma.workspace.delete({ where: { id: workspaceId } })
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, memberId, viewerId, outsiderId] } } })
    await prisma.$disconnect()
  })

  // --- Missing X-Workspace-Id ---
  test('GET /books without X-Workspace-Id returns 400', async () => {
    const res = await request(app)
      .get('/api/v1/books')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(400)
  })

  // --- Outsider cannot access workspace ---
  test('GET /books as outsider returns 403', async () => {
    const res = await request(app)
      .get('/api/v1/books')
      .set('Authorization', `Bearer ${outsiderToken}`)
      .set('X-Workspace-Id', workspaceId)
    expect(res.status).toBe(403)
  })

  // --- VIEWER: can read, cannot write ---
  test('VIEWER can list books', async () => {
    const res = await request(app)
      .get('/api/v1/books')
      .set('Authorization', `Bearer ${viewerToken}`)
      .set('X-Workspace-Id', workspaceId)
    expect(res.status).toBe(200)
  })

  test('VIEWER cannot create books', async () => {
    const res = await request(app)
      .post('/api/v1/books')
      .set('Authorization', `Bearer ${viewerToken}`)
      .set('X-Workspace-Id', workspaceId)
      .send({ title: 'Viewer Book', author: 'Test', status: 'OWNED' })
    expect(res.status).toBe(403)
  })

  test('VIEWER cannot update books', async () => {
    const res = await request(app)
      .put(`/api/v1/books/${bookId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .set('X-Workspace-Id', workspaceId)
      .send({ title: 'Updated by Viewer' })
    expect(res.status).toBe(403)
  })

  test('VIEWER cannot delete books', async () => {
    const res = await request(app)
      .delete(`/api/v1/books/${bookId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .set('X-Workspace-Id', workspaceId)
    expect(res.status).toBe(403)
  })

  // --- MEMBER: can create, can edit own, cannot edit others', cannot delete ---
  test('MEMBER can create books', async () => {
    const res = await request(app)
      .post('/api/v1/books')
      .set('Authorization', `Bearer ${memberToken}`)
      .set('X-Workspace-Id', workspaceId)
      .send({ title: 'Member Book', author: 'Test', status: 'OWNED' })
    expect(res.status).toBe(201)
  })

  test('MEMBER cannot delete books (requires ADMIN)', async () => {
    const res = await request(app)
      .delete(`/api/v1/books/${bookId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .set('X-Workspace-Id', workspaceId)
    expect(res.status).toBe(403)
  })

  test('MEMBER cannot update books owned by others', async () => {
    const res = await request(app)
      .put(`/api/v1/books/${bookId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .set('X-Workspace-Id', workspaceId)
      .send({ title: 'Updated by Member' })
    expect(res.status).toBe(403)
  })

  // --- OWNER: full access ---
  test('OWNER can list books', async () => {
    const res = await request(app)
      .get('/api/v1/books')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Workspace-Id', workspaceId)
    expect(res.status).toBe(200)
  })

  test('OWNER can update any book', async () => {
    const res = await request(app)
      .put(`/api/v1/books/${bookId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Workspace-Id', workspaceId)
      .send({ title: 'Updated by Owner' })
    expect(res.status).toBe(200)
  })

  // --- Workspace members endpoint ---
  test('VIEWER cannot access workspace members', async () => {
    const res = await request(app)
      .get('/api/v1/workspaces/current/members')
      .set('Authorization', `Bearer ${viewerToken}`)
      .set('X-Workspace-Id', workspaceId)
    expect(res.status).toBe(403)
  })

  test('OWNER can access workspace members', async () => {
    const res = await request(app)
      .get('/api/v1/workspaces/current/members')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Workspace-Id', workspaceId)
    expect(res.status).toBe(200)
  })

  // --- Workspace list is scoped to user ---
  test('owner sees their workspace in list', async () => {
    const res = await request(app)
      .get('/api/v1/workspaces')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(200)
    const ids = res.body.data.map((w: any) => w.id)
    expect(ids).toContain(workspaceId)
  })

  test('outsider does not see RBAC workspace in list', async () => {
    const res = await request(app)
      .get('/api/v1/workspaces')
      .set('Authorization', `Bearer ${outsiderToken}`)
    expect(res.status).toBe(200)
    const ids = res.body.data.map((w: any) => w.id)
    expect(ids).not.toContain(workspaceId)
  })
})
