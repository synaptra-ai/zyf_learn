import prisma from '../lib/prisma'
import { ApiError } from '../utils/errors'

export const readingService = {
  async createSession(userId: string, workspaceId: string, data: {
    bookId: string
    startTime: string
    endTime: string
    note?: string
    readingProgress?: number
  }) {
    const start = new Date(data.startTime)
    const end = new Date(data.endTime)
    const durationMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000))

    const book = await prisma.book.findFirst({ where: { id: data.bookId, workspaceId } })
    if (!book) throw new ApiError(404, '书籍不存在')

    const session = await prisma.readingSession.create({
      data: {
        userId,
        bookId: data.bookId,
        workspaceId,
        startTime: start,
        endTime: end,
        durationMinutes,
        note: data.note || null,
      },
    })

    await prisma.book.update({
      where: { id: data.bookId },
      data: {
        lastReadAt: new Date(),
        totalReadingMinutes: { increment: durationMinutes },
        ...(data.readingProgress !== undefined && { readingProgress: data.readingProgress }),
        ...(data.readingProgress === 100 && { status: 'FINISHED' }),
        ...(book.status === 'WISHLIST' && { status: 'READING' }),
      },
    })

    await this.upsertDailySummary(userId, workspaceId, durationMinutes, data.bookId)

    return session
  },

  async upsertDailySummary(userId: string, workspaceId: string, addedMinutes: number, bookId: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const existing = await prisma.dailyReadingSummary.findUnique({
      where: { userId_workspaceId_date: { userId, workspaceId, date: today } },
    })

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdaySummary = await prisma.dailyReadingSummary.findUnique({
      where: { userId_workspaceId_date: { userId, workspaceId, date: yesterday } },
    })
    const streakDays = yesterdaySummary ? yesterdaySummary.streakDays + 1 : 1

    let goal = await prisma.readingGoal.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    })
    if (!goal) {
      goal = await prisma.readingGoal.create({
        data: { userId, workspaceId, dailyGoalMinutes: 30 },
      })
    }

    const newTotalMinutes = (existing?.totalMinutes || 0) + addedMinutes

    if (existing) {
      const todaySessions = await prisma.readingSession.findMany({
        where: {
          userId,
          workspaceId,
          startTime: { gte: today },
        },
        select: { bookId: true },
        distinct: ['bookId'],
      })

      await prisma.dailyReadingSummary.update({
        where: { id: existing.id },
        data: {
          totalMinutes: newTotalMinutes,
          streakDays,
          goalMet: newTotalMinutes >= goal.dailyGoalMinutes,
          bookCount: todaySessions.length,
        },
      })
    } else {
      await prisma.dailyReadingSummary.create({
        data: {
          userId,
          workspaceId,
          date: today,
          totalMinutes: addedMinutes,
          streakDays,
          goalMet: addedMinutes >= goal.dailyGoalMinutes,
          bookCount: 1,
        },
      })
    }
  },

  async getSummary(userId: string, workspaceId: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [todaySummary, goal, recentDays] = await Promise.all([
      prisma.dailyReadingSummary.findUnique({
        where: { userId_workspaceId_date: { userId, workspaceId, date: today } },
      }),
      prisma.readingGoal.findUnique({
        where: { userId_workspaceId: { userId, workspaceId } },
      }),
      this.getRecentDays(userId, workspaceId, 7),
    ])

    return {
      todayMinutes: todaySummary?.totalMinutes || 0,
      dailyGoal: goal?.dailyGoalMinutes || 30,
      goalMet: todaySummary?.goalMet || false,
      streakDays: todaySummary?.streakDays || 0,
      recentDays,
    }
  },

  async getRecentDays(userId: string, workspaceId: string, days: number) {
    const results = []
    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - i)
      const summary = await prisma.dailyReadingSummary.findUnique({
        where: { userId_workspaceId_date: { userId, workspaceId, date } },
      })
      results.push({
        date: date.toISOString().split('T')[0],
        minutes: summary?.totalMinutes || 0,
        goalMet: summary?.goalMet || false,
      })
    }
    return results
  },

  async getSessionsByDate(userId: string, workspaceId: string, date: string) {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(date)
    end.setHours(23, 59, 59, 999)

    return prisma.readingSession.findMany({
      where: {
        userId,
        workspaceId,
        startTime: { gte: start, lte: end },
      },
      include: { book: { select: { id: true, title: true, coverUrl: true } } },
      orderBy: { startTime: 'desc' },
    })
  },

  async getTimeline(userId: string, workspaceId: string, days: number) {
    const results = []
    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const start = new Date(dateStr)
      const end = new Date(dateStr)
      end.setHours(23, 59, 59, 999)

      const [summary, sessions] = await Promise.all([
        prisma.dailyReadingSummary.findUnique({
          where: { userId_workspaceId_date: { userId, workspaceId, date } },
        }),
        prisma.readingSession.findMany({
          where: {
            userId,
            workspaceId,
            startTime: { gte: start, lte: end },
          },
          include: { book: { select: { id: true, title: true, coverUrl: true } } },
          orderBy: { startTime: 'desc' },
        }),
      ])

      if (sessions.length > 0) {
        results.push({
          date: dateStr,
          totalMinutes: summary?.totalMinutes || 0,
          goalMet: summary?.goalMet || false,
          sessions,
        })
      }
    }
    return results
  },

  async getGoal(userId: string, workspaceId: string) {
    let goal = await prisma.readingGoal.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    })
    if (!goal) {
      goal = await prisma.readingGoal.create({
        data: { userId, workspaceId, dailyGoalMinutes: 30 },
      })
    }
    return goal
  },

  async updateGoal(userId: string, workspaceId: string, dailyGoalMinutes: number) {
    return prisma.readingGoal.upsert({
      where: { userId_workspaceId: { userId, workspaceId } },
      update: { dailyGoalMinutes },
      create: { userId, workspaceId, dailyGoalMinutes },
    })
  },

  async updateProgress(userId: string, workspaceId: string, bookId: string, readingProgress: number) {
    const book = await prisma.book.findFirst({ where: { id: bookId, workspaceId } })
    if (!book) throw new ApiError(404, '书籍不存在')

    return prisma.book.update({
      where: { id: bookId },
      data: {
        readingProgress,
        ...(readingProgress === 100 && { status: 'FINISHED' }),
      },
    })
  },
}
