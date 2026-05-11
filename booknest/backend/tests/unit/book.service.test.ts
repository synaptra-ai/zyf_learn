import prisma from '../../src/lib/prisma'
import { bookService } from '../../src/services/book.service'
import { ApiError } from '../../src/utils/errors'

describe('BookService', () => {
  let userId: string
  let workspaceId: string
  let bookId: string

  beforeAll(async () => {
    const hash = await require('bcrypt').hash('test123', 10)
    const user = await prisma.user.create({
      data: { email: `unit-book-${Date.now()}@test.com`, passwordHash: hash, name: 'Book Tester' },
    })
    userId = user.id

    const workspace = await prisma.workspace.create({
      data: {
        name: 'Test Workspace',
        members: { create: { userId, role: 'OWNER' } },
      },
    })
    workspaceId = workspace.id

    const book = await prisma.book.create({
      data: {
        title: 'Test Book',
        author: 'Test Author',
        status: 'READING',
        userId,
        workspaceId,
      },
    })
    bookId = book.id
  })

  afterAll(async () => {
    await prisma.review.deleteMany({ where: { userId } })
    await prisma.book.deleteMany({ where: { userId } })
    await prisma.workspaceMember.deleteMany({ where: { workspaceId } })
    await prisma.workspace.delete({ where: { id: workspaceId } })
    await prisma.user.delete({ where: { id: userId } })
    await prisma.$disconnect()
  })

  test('list: should return paginated results', async () => {
    const result = await bookService.list(workspaceId, { page: 1, pageSize: 5 })
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(5)
    expect(result.total).toBeGreaterThanOrEqual(1)
    expect(result.items.length).toBeLessThanOrEqual(5)
  })

  test('list: should filter by status', async () => {
    const result = await bookService.list(workspaceId, { status: 'READING' })
    expect(result.items.every((b: any) => b.status === 'READING')).toBe(true)
  })

  test('getById: should return book with category and reviews', async () => {
    const book = await bookService.getById(workspaceId, bookId)
    expect(book.title).toBe('Test Book')
    expect(book).toHaveProperty('category')
    expect(book).toHaveProperty('reviews')
  })

  test('getById: should throw 403 for other user book', async () => {
    const hash = await require('bcrypt').hash('test123', 10)
    const other = await prisma.user.create({
      data: { email: `other-${Date.now()}@test.com`, passwordHash: hash, name: 'Other' },
    })
    const otherWs = await prisma.workspace.create({
      data: { name: 'Other Workspace' },
    })
    await expect(bookService.getById(otherWs.id, bookId))
      .rejects.toThrow(ApiError)
    try {
      await bookService.getById(otherWs.id, bookId)
    } catch (err) {
      expect((err as ApiError).statusCode).toBe(403)
    }
    await prisma.workspace.delete({ where: { id: otherWs.id } })
    await prisma.user.delete({ where: { id: other.id } })
  })
})
