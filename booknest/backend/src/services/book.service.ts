import prisma from '../lib/prisma'
import { ApiError } from '../utils/errors'

interface ListParams {
  page?: number
  pageSize?: number
  status?: string
  categoryId?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

const ALLOWED_SORT_FIELDS = ['createdAt', 'title', 'author', 'pageCount']

export const bookService = {
  async list(userId: string, params: ListParams) {
    const page = Math.max(1, params.page || 1)
    const pageSize = Math.min(50, Math.max(1, params.pageSize || 10))
    const sortBy = ALLOWED_SORT_FIELDS.includes(params.sortBy || '') ? params.sortBy! : 'createdAt'
    const sortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc'

    const where: any = { userId }
    if (params.status) where.status = params.status
    if (params.categoryId) where.categoryId = params.categoryId

    const [items, total] = await Promise.all([
      prisma.book.findMany({
        where,
        include: { category: true },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.book.count({ where }),
    ])

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  },

  async getById(userId: string, bookId: string) {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: { category: true, reviews: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } } },
    })
    if (!book) throw new ApiError(404, '书籍不存在')
    if (book.userId !== userId) throw new ApiError(403, '无权访问此书籍')
    return book
  },

  async create(userId: string, data: any) {
    return prisma.book.create({
      data: {
        title: data.title,
        author: data.author,
        isbn: data.isbn || null,
        publishedDate: data.publishedDate ? new Date(data.publishedDate) : null,
        pageCount: data.pageCount || null,
        description: data.description || null,
        coverUrl: data.coverUrl || null,
        status: data.status || 'WISHLIST',
        categoryId: data.categoryId || null,
        userId,
      },
      include: { category: true },
    })
  },

  async update(userId: string, bookId: string, data: any) {
    const book = await prisma.book.findUnique({ where: { id: bookId } })
    if (!book) throw new ApiError(404, '书籍不存在')
    if (book.userId !== userId) throw new ApiError(403, '无权修改此书籍')

    return prisma.book.update({
      where: { id: bookId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.author !== undefined && { author: data.author }),
        ...(data.isbn !== undefined && { isbn: data.isbn }),
        ...(data.publishedDate !== undefined && { publishedDate: data.publishedDate ? new Date(data.publishedDate) : null }),
        ...(data.pageCount !== undefined && { pageCount: data.pageCount }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.coverUrl !== undefined && { coverUrl: data.coverUrl }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      },
      include: { category: true },
    })
  },

  async delete(userId: string, bookId: string) {
    const book = await prisma.book.findUnique({ where: { id: bookId } })
    if (!book) throw new ApiError(404, '书籍不存在')
    if (book.userId !== userId) throw new ApiError(403, '无权删除此书籍')

    await prisma.book.delete({ where: { id: bookId } })
  },

  async batchCreate(userId: string, books: any[]) {
    if (!books.length) throw new ApiError(400, '书籍列表不能为空')
    if (books.length > 50) throw new ApiError(400, '单次最多导入 50 本书')

    const data = books.map((b) => ({
      title: b.title,
      author: b.author,
      isbn: b.isbn || null,
      publishedDate: b.publishedDate ? new Date(b.publishedDate) : null,
      pageCount: b.pageCount || null,
      description: b.description || null,
      coverUrl: b.coverUrl || null,
      status: b.status || 'WISHLIST',
      categoryId: b.categoryId || null,
      userId,
    }))

    const result = await prisma.book.createMany({ data })
    return { count: result.count }
  },
}
