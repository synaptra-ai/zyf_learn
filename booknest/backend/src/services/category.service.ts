import prisma from '../lib/prisma'
import { ApiError } from '../utils/errors'

export const categoryService = {
  async list(userId: string) {
    return prisma.category.findMany({
      where: { userId },
      include: { _count: { select: { books: true } } },
      orderBy: { createdAt: 'desc' },
    })
  },

  async create(userId: string, data: { name: string; color: string }) {
    return prisma.category.create({
      data: { name: data.name, color: data.color, userId },
    })
  },

  async update(userId: string, categoryId: string, data: { name?: string; color?: string }) {
    const category = await prisma.category.findUnique({ where: { id: categoryId } })
    if (!category) throw new ApiError(404, '分类不存在')
    if (category.userId !== userId) throw new ApiError(403, '无权修改此分类')

    return prisma.category.update({
      where: { id: categoryId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.color !== undefined && { color: data.color }),
      },
    })
  },

  async delete(userId: string, categoryId: string) {
    const category = await prisma.category.findUnique({ where: { id: categoryId } })
    if (!category) throw new ApiError(404, '分类不存在')
    if (category.userId !== userId) throw new ApiError(403, '无权删除此分类')

    await prisma.category.delete({ where: { id: categoryId } })
  },
}
