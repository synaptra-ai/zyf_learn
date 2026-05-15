import prisma from '../lib/prisma'
import { cache } from '../lib/cache'

interface ScoredBook {
  id: string
  score: number
}

async function computeScores(userId: string, workspaceId: string): Promise<ScoredBook[]> {
  // 1. Get all user's books in workspace with category
  const books = await prisma.book.findMany({
    where: { workspaceId, userId },
    include: { category: true },
  })

  if (books.length === 0) return []

  // 2. Category preference: count books per category, weight by status
  const categoryScores: Record<string, number> = {}
  for (const book of books) {
    const catId = book.categoryId || '__none__'
    const weight = book.status === 'FINISHED' ? 2 : book.status === 'READING' ? 1.5 : 1
    categoryScores[catId] = (categoryScores[catId] || 0) + weight
  }
  const maxCatScore = Math.max(...Object.values(categoryScores), 1)
  const normalizedCatScores: Record<string, number> = {}
  for (const [catId, score] of Object.entries(categoryScores)) {
    normalizedCatScores[catId] = score / maxCatScore
  }

  // 3. Recent activity: sum session minutes in last 7 days per book
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const recentSessions = await prisma.readingSession.findMany({
    where: { userId, workspaceId, createdAt: { gte: weekAgo } },
    select: { bookId: true, durationMinutes: true },
  })
  const recentMinutes: Record<string, number> = {}
  for (const s of recentSessions) {
    recentMinutes[s.bookId] = (recentMinutes[s.bookId] || 0) + s.durationMinutes
  }
  const maxRecent = Math.max(...Object.values(recentMinutes), 1)
  const normalizedRecent: Record<string, number> = {}
  for (const [bookId, mins] of Object.entries(recentMinutes)) {
    normalizedRecent[bookId] = mins / maxRecent
  }

  // 4. Score each book with weighted signals
  const scored: ScoredBook[] = books.map((book) => {
    // Category preference (30%)
    const catScore = normalizedCatScores[book.categoryId || '__none__'] || 0

    // Recent activity (25%)
    const recentScore = normalizedRecent[book.id] || 0

    // Progress continuation (20%)
    let progressScore = 0
    if (book.readingProgress >= 50 && book.readingProgress <= 90) progressScore = 1.0
    else if (book.readingProgress >= 30 && book.readingProgress < 50) progressScore = 0.7
    else if (book.readingProgress > 90 && book.readingProgress < 100) progressScore = 0.5

    // Wishlist unread (15%)
    let wishlistScore = 0
    if (book.status === 'WISHLIST') wishlistScore = 1.0
    else if (book.status === 'OWNED') wishlistScore = 0.5

    // Random factor (10%)
    const randomScore = Math.random()

    const total =
      catScore * 0.3 +
      recentScore * 0.25 +
      progressScore * 0.2 +
      wishlistScore * 0.15 +
      randomScore * 0.1

    return { id: book.id, score: total }
  })

  return scored.sort((a, b) => b.score - a.score)
}

export const recommendationService = {
  async getHomepageRecommendations(userId: string, workspaceId: string) {
    const cacheKey = `rec:home:${userId}:${workspaceId}`
    return cache.getOrSet(cacheKey, async () => {
      const scored = await computeScores(userId, workspaceId)
      const topIds = scored.slice(0, 5).map((s) => s.id)
      if (topIds.length === 0) return { items: [] }

      const items = await prisma.book.findMany({
        where: { id: { in: topIds } },
        include: { category: true },
        orderBy: { createdAt: 'desc' },
      })
      // Preserve scored order
      const orderMap = new Map(topIds.map((id, i) => [id, i]))
      items.sort((a, b) => (orderMap.get(a.id) ?? 99) - (orderMap.get(b.id) ?? 99))
      return { items }
    }, 300)
  },

  async getDiscoverPage(userId: string, workspaceId: string) {
    const cacheKey = `rec:discover:${userId}:${workspaceId}`
    return cache.getOrSet(cacheKey, async () => {
      // Continue reading: books in READING status with progress > 0
      const continueReading = await prisma.book.findMany({
        where: { workspaceId, userId, status: 'READING', readingProgress: { gt: 0 } },
        include: { category: true },
        orderBy: { lastReadAt: 'desc' },
        take: 3,
      })

      // For you: top scored books excluding continueReading
      const scored = await computeScores(userId, workspaceId)
      const continueIds = new Set(continueReading.map((b) => b.id))
      const forYouIds = scored
        .filter((s) => !continueIds.has(s.id))
        .slice(0, 6)
        .map((s) => s.id)

      let forYou: any[] = []
      if (forYouIds.length > 0) {
        forYou = await prisma.book.findMany({
          where: { id: { in: forYouIds } },
          include: { category: true },
        })
        const orderMap = new Map(forYouIds.map((id, i) => [id, i]))
        forYou.sort((a, b) => (orderMap.get(a.id) ?? 99) - (orderMap.get(b.id) ?? 99))
      }

      // Category picks: top 2 categories by preference
      const books = await prisma.book.findMany({
        where: { workspaceId, userId },
        include: { category: true },
      })
      const catCount: Record<string, { category: any; count: number }> = {}
      for (const book of books) {
        if (!book.category) continue
        const catId = book.categoryId!
        if (!catCount[catId]) catCount[catId] = { category: book.category, count: 0 }
        catCount[catId].count++
      }
      const topCategories = Object.values(catCount)
        .sort((a, b) => b.count - a.count)
        .slice(0, 2)

      const existingIds = new Set([...continueIds, ...forYouIds])
      const categoryPicks = []
      for (const { category } of topCategories) {
        const catBooks = await prisma.book.findMany({
          where: {
            workspaceId,
            userId,
            categoryId: category.id,
            id: { notIn: [...existingIds] },
          },
          include: { category: true },
          take: 4,
        })
        if (catBooks.length > 0) {
          categoryPicks.push({ category, books: catBooks })
        }
      }

      return { continueReading, forYou, categoryPicks }
    }, 300)
  },

  async getSimilarBooks(userId: string, workspaceId: string, bookId: string) {
    const cacheKey = `rec:similar:${bookId}:${workspaceId}`
    return cache.getOrSet(cacheKey, async () => {
      const book = await prisma.book.findUnique({
        where: { id: bookId },
        select: { categoryId: true, author: true },
      })
      if (!book) return { items: [] }

      const items = await prisma.book.findMany({
        where: {
          workspaceId,
          userId,
          id: { not: bookId },
          OR: [
            { categoryId: book.categoryId },
            { author: book.author },
          ],
        },
        include: { category: true },
        take: 3,
      })

      // Boost same author
      items.sort((a, b) => {
        const aAuthor = a.author === book.author ? 1 : 0
        const bAuthor = b.author === book.author ? 1 : 0
        return bAuthor - aAuthor
      })

      return { items }
    }, 600)
  },
}
