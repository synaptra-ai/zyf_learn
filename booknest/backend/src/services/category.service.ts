import prisma from '../lib/prisma'
import { ApiError } from '../utils/errors'

export const categoryService = {
  async list(workspaceId: string) {
    return prisma.category.findMany({
      where: { workspaceId },
      include: { _count: { select: { books: true } } },
      orderBy: { createdAt: 'desc' },
    })
  },

  async create(userId: string, workspaceId: string, data: { name: string; color: string }) {
    return prisma.category.create({
      data: { name: data.name, color: data.color, userId, workspaceId },
    })
  },

  async update(userId: string, workspaceId: string, categoryId: string, data: { name?: string; color?: string }) {
    const category = await prisma.category.findFirst({ where: { id: categoryId, workspaceId } })
    if (!category) throw new ApiError(404, '分类不存在')

    return prisma.category.update({
      where: { id: categoryId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.color !== undefined && { color: data.color }),
      },
    })
  },

  async delete(userId: string, workspaceId: string, categoryId: string) {
    const category = await prisma.category.findFirst({ where: { id: categoryId, workspaceId } })
    if (!category) throw new ApiError(404, '分类不存在')

    await prisma.category.delete({ where: { id: categoryId } })
  },
}
