import prisma from '../lib/prisma'

export const socialService = {
  async getReport(userId: string, workspaceId: string) {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true, email: true },
    })

    const booksFinished = await prisma.book.count({
      where: { userId, workspaceId, status: 'FINISHED' },
    })

    const totalResult = await prisma.book.aggregate({
      where: { userId, workspaceId },
      _sum: { totalReadingMinutes: true },
    })
    const totalMinutes = totalResult._sum.totalReadingMinutes || 0

    const latestSummary = await prisma.dailyReadingSummary.findFirst({
      where: { userId, workspaceId },
      orderBy: { date: 'desc' },
      select: { streakDays: true },
    })

    const achievementCount = await prisma.userAchievement.count({
      where: { userId, workspaceId },
    })

    // Top category
    const books = await prisma.book.findMany({
      where: { userId, workspaceId, category: { isNot: null } },
      include: { category: true },
    })
    const catCount: Record<string, { name: string; count: number }> = {}
    for (const book of books) {
      if (!book.category) continue
      const catId = book.categoryId!
      if (!catCount[catId]) catCount[catId] = { name: book.category.name, count: 0 }
      catCount[catId].count++
    }
    const topCategory = Object.values(catCount).sort((a, b) => b.count - a.count)[0]?.name || '暂无'

    const period = `${now.getFullYear()}年${now.getMonth() + 1}月`

    return {
      user: { nickname: user?.nickname || user?.email || '读者' },
      booksFinished,
      totalMinutes,
      streakDays: latestSummary?.streakDays || 0,
      achievements: achievementCount,
      topCategory,
      period,
    }
  },

  async createFeedItem(userId: string, workspaceId: string, type: string, content: Record<string, any>) {
    return prisma.activityFeedItem.create({
      data: {
        userId,
        workspaceId,
        type,
        content: JSON.stringify(content),
      },
    })
  },

  async getFeed(workspaceId: string, page: number, pageSize: number) {
    const where = { workspaceId }
    const [items, total] = await Promise.all([
      prisma.activityFeedItem.findMany({
        where,
        include: {
          user: { select: { nickname: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.activityFeedItem.count({ where }),
    ])

    return {
      items: items.map((item) => ({
        id: item.id,
        type: item.type,
        content: JSON.parse(item.content),
        user: { nickname: item.user.nickname || item.user.email },
        createdAt: item.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    }
  },
}
