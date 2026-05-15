import prisma from '../lib/prisma'

export const reviewLikeService = {
  async toggle(userId: string, reviewId: string) {
    const existing = await prisma.reviewLike.findUnique({
      where: { userId_reviewId: { userId, reviewId } },
    })

    if (existing) {
      await prisma.reviewLike.delete({ where: { id: existing.id } })
    } else {
      await prisma.reviewLike.create({ data: { userId, reviewId } })
    }

    const likeCount = await prisma.reviewLike.count({ where: { reviewId } })
    return { liked: !existing, likeCount }
  },

  async getStatus(userId: string, reviewId: string) {
    const liked = !!(await prisma.reviewLike.findUnique({
      where: { userId_reviewId: { userId, reviewId } },
    }))
    const likeCount = await prisma.reviewLike.count({ where: { reviewId } })
    return { liked, likeCount }
  },
}
