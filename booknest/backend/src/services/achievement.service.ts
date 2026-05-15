import prisma from '../lib/prisma'
import { socialService } from './social.service'

interface AchievementDef {
  id: string
  name: string
  description: string
  icon: string
  category: string
  target: number
  getValue: (stats: UserStats) => number
}

interface UserStats {
  streakDays: number
  finishedBooks: number
  totalMinutes: number
  reviewCount: number
  goalMetCount: number
  bookCount: number
}

const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'streak_3', name: '三日成习', description: '连续阅读3天', icon: '🔥', category: 'streak', target: 3, getValue: (s) => s.streakDays },
  { id: 'streak_7', name: '坚持一周', description: '连续阅读7天', icon: '🔥', category: 'streak', target: 7, getValue: (s) => s.streakDays },
  { id: 'streak_14', name: '两周不辍', description: '连续阅读14天', icon: '🔥', category: 'streak', target: 14, getValue: (s) => s.streakDays },
  { id: 'streak_30', name: '月度读者', description: '连续阅读30天', icon: '🔥', category: 'streak', target: 30, getValue: (s) => s.streakDays },
  { id: 'finish_1', name: '初读之喜', description: '读完1本书', icon: '📚', category: 'finish', target: 1, getValue: (s) => s.finishedBooks },
  { id: 'finish_5', name: '小有所成', description: '读完5本书', icon: '📚', category: 'finish', target: 5, getValue: (s) => s.finishedBooks },
  { id: 'finish_10', name: '十卷书生', description: '读完10本书', icon: '📚', category: 'finish', target: 10, getValue: (s) => s.finishedBooks },
  { id: 'finish_25', name: '博览群书', description: '读完25本书', icon: '📚', category: 'finish', target: 25, getValue: (s) => s.finishedBooks },
  { id: 'hours_10', name: '十小时旅人', description: '累计阅读10小时', icon: '⏰', category: 'hours', target: 600, getValue: (s) => s.totalMinutes },
  { id: 'hours_50', name: '五十小时探险', description: '累计阅读50小时', icon: '⏰', category: 'hours', target: 3000, getValue: (s) => s.totalMinutes },
  { id: 'hours_100', name: '百小时书虫', description: '累计阅读100小时', icon: '⏰', category: 'hours', target: 6000, getValue: (s) => s.totalMinutes },
  { id: 'review_3', name: '初涉书评', description: '写3篇书评', icon: '✍️', category: 'review', target: 3, getValue: (s) => s.reviewCount },
  { id: 'review_10', name: '评书达人', description: '写10篇书评', icon: '✍️', category: 'review', target: 10, getValue: (s) => s.reviewCount },
  { id: 'goal_7', name: '七日达标', description: '每日目标达成7次', icon: '🎯', category: 'goal', target: 7, getValue: (s) => s.goalMetCount },
  { id: 'goal_30', name: '月度全勤', description: '每日目标达成30次', icon: '🎯', category: 'goal', target: 30, getValue: (s) => s.goalMetCount },
  { id: 'collect_20', name: '小小书架', description: '书架收藏20本书', icon: '📖', category: 'collection', target: 20, getValue: (s) => s.bookCount },
  { id: 'collect_50', name: '满架书香', description: '书架收藏50本书', icon: '📖', category: 'collection', target: 50, getValue: (s) => s.bookCount },
]

async function getUserStats(userId: string, workspaceId: string): Promise<UserStats> {
  const latestSummary = await prisma.dailyReadingSummary.findFirst({
    where: { userId, workspaceId },
    orderBy: { date: 'desc' },
    select: { streakDays: true },
  })
  const streakDays = latestSummary?.streakDays || 0

  const finishedBooks = await prisma.book.count({
    where: { userId, workspaceId, status: 'FINISHED' },
  })

  const totalResult = await prisma.book.aggregate({
    where: { userId, workspaceId },
    _sum: { totalReadingMinutes: true },
  })
  const totalMinutes = totalResult._sum.totalReadingMinutes || 0

  const reviewCount = await prisma.review.count({ where: { userId } })

  const goalMetCount = await prisma.dailyReadingSummary.count({
    where: { userId, workspaceId, goalMet: true },
  })

  const bookCount = await prisma.book.count({ where: { userId, workspaceId } })

  return { streakDays, finishedBooks, totalMinutes, reviewCount, goalMetCount, bookCount }
}

export const achievementService = {
  async getAll(userId: string, workspaceId: string) {
    const stats = await getUserStats(userId, workspaceId)
    const unlocked = await prisma.userAchievement.findMany({
      where: { userId, workspaceId },
    })
    const unlockedMap = new Map(unlocked.map((u) => [u.achievementId, u.unlockedAt]))

    const achievements = ACHIEVEMENTS.map((a) => {
      const current = a.getValue(stats)
      return {
        id: a.id,
        name: a.name,
        description: a.description,
        icon: a.icon,
        category: a.category,
        unlocked: unlockedMap.has(a.id),
        unlockedAt: unlockedMap.get(a.id)?.toISOString() || null,
        progress: { current, target: a.target },
      }
    })

    const unlockedCount = achievements.filter((a) => a.unlocked).length
    return {
      achievements,
      stats: { unlocked: unlockedCount, total: ACHIEVEMENTS.length },
    }
  },

  async checkAndUnlock(userId: string, workspaceId: string) {
    const stats = await getUserStats(userId, workspaceId)
    const unlocked = await prisma.userAchievement.findMany({
      where: { userId, workspaceId },
      select: { achievementId: true },
    })
    const unlockedIds = new Set(unlocked.map((u) => u.achievementId))

    const newlyUnlocked: { id: string; name: string; icon: string }[] = []

    for (const a of ACHIEVEMENTS) {
      if (unlockedIds.has(a.id)) continue
      const current = a.getValue(stats)
      if (current >= a.target) {
        await prisma.userAchievement.create({
          data: { achievementId: a.id, userId, workspaceId },
        })
        newlyUnlocked.push({ id: a.id, name: a.name, icon: a.icon })
        socialService.createFeedItem(userId, workspaceId, 'ACHIEVEMENT_UNLOCKED', { achievementId: a.id, name: a.name, icon: a.icon }).catch(() => {})
      }
    }

    return { newlyUnlocked }
  },
}
