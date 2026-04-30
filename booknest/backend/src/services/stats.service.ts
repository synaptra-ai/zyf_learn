import prisma from '../lib/prisma'

export const statsService = {
  async getOverview(userId: string) {
    const [totalBooks, statusCounts, avgResult, recentBooks, totalCategories] = await Promise.all([
      prisma.book.count({ where: { userId } }),
      prisma.book.groupBy({
        by: ['status'],
        where: { userId },
        _count: true,
      }),
      prisma.review.aggregate({
        _avg: { rating: true },
        where: { userId },
      }),
      prisma.book.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { category: true },
      }),
      prisma.category.count({ where: { userId } }),
    ])

    const statusBreakdown: Record<string, number> = {}
    for (const item of statusCounts) {
      statusBreakdown[item.status] = item._count
    }

    return {
      totalBooks,
      totalCategories,
      statusBreakdown,
      averageRating: avgResult._avg.rating ? Math.round(avgResult._avg.rating * 10) / 10 : null,
      recentBooks,
    }
  },
}
