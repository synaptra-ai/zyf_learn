import prisma from '../lib/prisma'
import { ApiError } from '../utils/errors'
import { checkTextSecurity } from './content-security/text-security.service'

export const reviewService = {
  async create(userId: string, bookId: string, workspaceId: string | undefined, data: { rating: number; text?: string }) {
    const book = await prisma.book.findUnique({ where: { id: bookId } })
    if (!book) throw new ApiError(404, '书籍不存在')

    if (data.text && workspaceId) {
      const check = await checkTextSecurity({
        content: data.text,
        userId,
        workspaceId,
        targetType: 'REVIEW',
      })
      if (check.status === 'REJECT') throw new ApiError(400, '评论包含违规内容，请修改')
    }

    return prisma.review.create({
      data: {
        rating: data.rating,
        text: data.text || null,
        bookId,
        userId,
      },
      include: { user: { select: { id: true, name: true } } },
    })
  },

  async listByBook(bookId: string) {
    const book = await prisma.book.findUnique({ where: { id: bookId } })
    if (!book) throw new ApiError(404, '书籍不存在')

    return prisma.review.findMany({
      where: { bookId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    })
  },
}
