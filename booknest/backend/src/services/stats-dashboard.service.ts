import prisma from '../lib/prisma'

export const statsDashboardService = {
  async getDashboard(userId: string, workspaceId: string) {
    // Status distribution
    const statusCounts = await prisma.book.groupBy({
      by: ['status'],
      where: { userId, workspaceId },
      _count: { status: true },
    })
    const statusDistribution = statusCounts.map(s => ({
      status: s.status,
      count: s._count.status,
    }))

    // Category stats
    const categories = await prisma.category.findMany({
      where: { workspaceId },
      include: { _count: { select: { books: { where: { userId } } } } },
      orderBy: { books: { _count: 'desc' } },
    })
    const categoryStats = categories.map(c => ({
      id: c.id,
      name: c.name,
      color: c.color,
      count: c._count.books,
    }))

    // Monthly summary (current month)
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const monthlyFinished = await prisma.book.count({
      where: {
        userId,
        workspaceId,
        status: 'FINISHED',
        updatedAt: { gte: monthStart, lte: monthEnd },
      },
    })

    const monthlyMinutes = await prisma.dailyReadingSummary.aggregate({
      where: { userId, workspaceId, date: { gte: monthStart, lte: monthEnd } },
      _sum: { totalMinutes: true },
    })

    // Streak
    const latestSummary = await prisma.dailyReadingSummary.findFirst({
      where: { userId, workspaceId },
      orderBy: { date: 'desc' },
      select: { streakDays: true },
    })

    // Total stats
    const totalBooks = await prisma.book.count({ where: { userId, workspaceId } })
    const totalFinished = await prisma.book.count({
      where: { userId, workspaceId, status: 'FINISHED' },
    })
    const totalMinutesResult = await prisma.book.aggregate({
      where: { userId, workspaceId },
      _sum: { totalReadingMinutes: true },
    })

    return {
      statusDistribution,
      categoryStats,
      monthly: {
        finishedBooks: monthlyFinished,
        totalMinutes: monthlyMinutes._sum.totalMinutes || 0,
        month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      },
      streak: {
        days: latestSummary?.streakDays || 0,
      },
      total: {
        books: totalBooks,
        finished: totalFinished,
        minutes: totalMinutesResult._sum.totalReadingMinutes || 0,
      },
    }
  },

  async getHeatmap(userId: string, workspaceId: string, year: number) {
    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year, 11, 31)

    const summaries = await prisma.dailyReadingSummary.findMany({
      where: { userId, workspaceId, date: { gte: startDate, lte: endDate } },
      select: { date: true, totalMinutes: true },
      orderBy: { date: 'asc' },
    })

    return summaries.map(s => ({
      date: s.date.toISOString().split('T')[0],
      minutes: s.totalMinutes,
    }))
  },
}
