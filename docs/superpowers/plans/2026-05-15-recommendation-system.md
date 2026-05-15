# Recommendation System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a rule-based recommendation system with three UI surfaces: homepage recommendations, discover tab, and book detail related recommendations.

**Architecture:** Backend scoring engine calculates recommendation scores from existing data (no new DB tables), caches in Redis. Frontend adds RecommendSection component, discover page (new tab), and detail page related section.

**Tech Stack:** Express 5 / Prisma 7 / Redis / Zod / Taro 4 / React 18 / SCSS

**Spec:** `docs/superpowers/specs/2026-05-15-recommendation-system-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `backend/src/services/recommendation.service.ts` | Scoring engine + Redis caching |
| `backend/src/controllers/recommendation.controller.ts` | 3 route handlers |
| `backend/src/routes/recommendation.routes.ts` | Route registration |
| `backend/src/schemas/recommendation.schema.ts` | Response Zod schemas |
| `mini-taro/src/services/recommendation.ts` | 3 API calls |
| `mini-taro/src/components/RecommendSection/index.tsx` | Reusable horizontal scroll section |
| `mini-taro/src/components/RecommendSection/index.scss` | Section styles |
| `mini-taro/src/sub/discover/pages/index/index.tsx` | Discover page |
| `mini-taro/src/sub/discover/pages/index/index.scss` | Discover page styles |

### Modified Files

| File | Change |
|------|--------|
| `backend/src/routes/index.ts` | Mount `/recommendations` routes |
| `mini-taro/src/app.config.ts` | Add discover tab + subpackage |
| `mini-taro/src/custom-tab-bar/index.tsx` | Add 4th tab |
| `mini-taro/src/custom-tab-bar/index.scss` | Adjust spacing for 4 tabs |
| `mini-taro/src/pages/index/index.tsx` | Add "为你推荐" section |
| `mini-taro/src/sub/books/pages/detail/index.tsx` | Add "相关推荐" at bottom |

---

### Task 1: Backend — Recommendation Schema

**Files:**
- Create: `booknest/backend/src/schemas/recommendation.schema.ts`

- [ ] **Step 1: Create schema file**

```typescript
import { z } from '../lib/zod-extended'

export const recommendResponseSchema = z.object({
  items: z.array(z.any()),
})

export const discoverResponseSchema = z.object({
  continueReading: z.array(z.any()),
  forYou: z.array(z.any()),
  categoryPicks: z.array(z.object({
    category: z.any(),
    books: z.array(z.any()),
  })),
})

export const similarResponseSchema = z.object({
  items: z.array(z.any()),
})
```

- [ ] **Step 2: Commit**

```bash
git add booknest/backend/src/schemas/recommendation.schema.ts
git commit -m "feat(recommendation): add Zod response schemas"
```

---

### Task 2: Backend — Recommendation Service

**Files:**
- Create: `booknest/backend/src/services/recommendation.service.ts`

- [ ] **Step 1: Create service file**

```typescript
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

  // 4. Score each book
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
```

- [ ] **Step 2: Commit**

```bash
git add booknest/backend/src/services/recommendation.service.ts
git commit -m "feat(recommendation): add scoring engine service with Redis caching"
```

---

### Task 3: Backend — Recommendation Controller

**Files:**
- Create: `booknest/backend/src/controllers/recommendation.controller.ts`

- [ ] **Step 1: Create controller file**

```typescript
import { Request, Response, NextFunction } from 'express'
import { recommendationService } from '../services/recommendation.service'
import { ResponseUtil } from '../utils/response'

export const recommendationController = {
  async getHomepage(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await recommendationService.getHomepageRecommendations(
        req.user!.id,
        req.workspace!.id,
      )
      ResponseUtil.success(res, data)
    } catch (err) {
      next(err)
    }
  },

  async getDiscover(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await recommendationService.getDiscoverPage(
        req.user!.id,
        req.workspace!.id,
      )
      ResponseUtil.success(res, data)
    } catch (err) {
      next(err)
    }
  },

  async getSimilar(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await recommendationService.getSimilarBooks(
        req.user!.id,
        req.workspace!.id,
        req.params.bookId as string,
      )
      ResponseUtil.success(res, data)
    } catch (err) {
      next(err)
    }
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add booknest/backend/src/controllers/recommendation.controller.ts
git commit -m "feat(recommendation): add controller with 3 endpoints"
```

---

### Task 4: Backend — Routes & Mount

**Files:**
- Create: `booknest/backend/src/routes/recommendation.routes.ts`
- Modify: `booknest/backend/src/routes/index.ts`

- [ ] **Step 1: Create routes file**

```typescript
import { Router } from 'express'
import { recommendationController } from '../controllers/recommendation.controller'
import { authenticate } from '../middleware/auth'
import { resolveWorkspace } from '../middleware/workspace'

const router = Router()

router.use(authenticate, resolveWorkspace)

router.get('/', recommendationController.getHomepage)
router.get('/discover', recommendationController.getDiscover)
router.get('/similar/:bookId', recommendationController.getSimilar)

export default router
```

- [ ] **Step 2: Register routes in index.ts**

In `booknest/backend/src/routes/index.ts`, add the import after the `readingRoutes` import line:

```typescript
import recommendationRoutes from './recommendation.routes'
```

And add the mount after `router.use('/reading', readingRoutes)`:

```typescript
router.use('/recommendations', recommendationRoutes)
```

- [ ] **Step 3: Verify backend compiles**

```bash
cd booknest/backend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors (or only pre-existing errors unrelated to this change).

- [ ] **Step 4: Commit**

```bash
git add booknest/backend/src/routes/recommendation.routes.ts booknest/backend/src/routes/index.ts
git commit -m "feat(recommendation): add routes and mount at /recommendations"
```

---

### Task 5: Backend — Verify API Works

- [ ] **Step 1: Restart backend and test endpoints**

```bash
# Backend should auto-restart via ts-node-dev --respawn
# Test with curl (use token from login)
TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@booknest.com","password":"password123"}' | jq -r '.data.token')

curl -s http://localhost:4000/api/v1/recommendations \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Workspace-Id: <workspace-id>" | jq .

curl -s http://localhost:4000/api/v1/recommendations/discover \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Workspace-Id: <workspace-id>" | jq .
```

Expected: JSON responses with `code: 0` and book arrays.

---

### Task 6: Frontend — Recommendation Service

**Files:**
- Create: `booknest/apps/mini-taro/src/services/recommendation.ts`

- [ ] **Step 1: Create service file**

```typescript
import { request } from './request'

export interface RecommendBook {
  id: string
  title: string
  author: string
  coverUrl: string | null
  status: string
  readingProgress: number
  category: { id: string; name: string; color: string } | null
}

export interface DiscoverData {
  continueReading: RecommendBook[]
  forYou: RecommendBook[]
  categoryPicks: {
    category: { id: string; name: string; color: string }
    books: RecommendBook[]
  }[]
}

export function getHomepageRecommendations() {
  return request<{ items: RecommendBook[] }>({
    url: '/api/v1/recommendations',
    method: 'GET',
  })
}

export function getDiscoverPage() {
  return request<DiscoverData>({
    url: '/api/v1/recommendations/discover',
    method: 'GET',
  })
}

export function getSimilarBooks(bookId: string) {
  return request<{ items: RecommendBook[] }>({
    url: `/api/v1/recommendations/similar/${bookId}`,
    method: 'GET',
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add booknest/apps/mini-taro/src/services/recommendation.ts
git commit -m "feat(recommendation): add frontend API service"
```

---

### Task 7: Frontend — RecommendSection Component

**Files:**
- Create: `booknest/apps/mini-taro/src/components/RecommendSection/index.tsx`
- Create: `booknest/apps/mini-taro/src/components/RecommendSection/index.scss`

- [ ] **Step 1: Create component**

```tsx
import React from 'react'
import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { getCoverThumbUrl } from '@/utils/image'
import type { RecommendBook } from '@/services/recommendation'
import './index.scss'

interface RecommendSectionProps {
  title: string
  books: RecommendBook[]
  showProgress?: boolean
}

export const RecommendSection: React.FC<RecommendSectionProps> = React.memo(
  function RecommendSection({ title, books, showProgress = false }) {
    if (books.length === 0) return null

    return (
      <View className="recommend-section">
        <Text className="recommend-section__title">{title}</Text>
        <ScrollView scrollX className="recommend-section__scroll">
          <View className="recommend-section__list">
            {books.map((book) => (
              <View
                key={book.id}
                className="recommend-section__card"
                onClick={() =>
                  Taro.navigateTo({ url: `/sub/books/pages/detail/index?id=${book.id}` })
                }
              >
                <View className="recommend-section__cover-wrap">
                  {book.coverUrl ? (
                    <Image
                      className="recommend-section__cover"
                      src={getCoverThumbUrl(book.coverUrl)}
                      mode="aspectFill"
                      lazyLoad
                    />
                  ) : (
                    <View className="recommend-section__cover recommend-section__cover--placeholder">
                      <Text className="recommend-section__cover-text">{book.title[0]}</Text>
                    </View>
                  )}
                  {showProgress && book.readingProgress > 0 && (
                    <View className="recommend-section__progress-bar">
                      <View
                        className="recommend-section__progress-fill"
                        style={{ width: `${book.readingProgress}%` }}
                      />
                    </View>
                  )}
                </View>
                <Text className="recommend-section__name">{book.title}</Text>
                {showProgress && book.readingProgress > 0 && (
                  <Text className="recommend-section__progress-text">
                    {book.readingProgress}%
                  </Text>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    )
  },
)
```

- [ ] **Step 2: Create styles**

```scss
@import '@/assets/variables';

.recommend-section {
  margin: $spacing-md $spacing-lg;

  &__title {
    font-size: $font-size-lg;
    font-weight: 500;
    color: $color-text-primary;
    margin-bottom: $spacing-sm;
    display: block;
  }

  &__scroll {
    width: 100%;
    white-space: nowrap;
  }

  &__list {
    display: inline-flex;
    gap: $spacing-sm;
  }

  &__card {
    display: inline-flex;
    flex-direction: column;
    width: 180rpx;
    flex-shrink: 0;
  }

  &__cover-wrap {
    position: relative;
    width: 180rpx;
    height: 240rpx;
    border-radius: $radius-md;
    overflow: hidden;
    background: $color-surface;
  }

  &__cover {
    width: 100%;
    height: 100%;

    &--placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background: $color-border;
    }

    &-text {
      font-size: $font-size-xl;
      color: $color-text-muted;
    }
  }

  &__progress-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 6rpx;
    background: rgba(0, 0, 0, 0.1);
  }

  &__progress-fill {
    height: 100%;
    background: $color-primary;
    border-radius: 0 3rpx 3rpx 0;
    transition: width 0.3s ease;
  }

  &__name {
    font-size: $font-size-sm;
    color: $color-text-primary;
    margin-top: $spacing-xs;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__progress-text {
    font-size: $font-size-xs;
    color: $color-text-muted;
    margin-top: 2rpx;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add booknest/apps/mini-taro/src/components/RecommendSection/
git commit -m "feat(recommendation): add RecommendSection component"
```

---

### Task 8: Frontend — Discover Page

**Files:**
- Create: `booknest/apps/mini-taro/src/sub/discover/pages/index/index.tsx`
- Create: `booknest/apps/mini-taro/src/sub/discover/pages/index/index.scss`

- [ ] **Step 1: Create discover page**

```tsx
import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { RecommendSection } from '@/components/RecommendSection'
import { getDiscoverPage, type DiscoverData } from '@/services/recommendation'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { LoadingState } from '@/components/LoadingState'
import { EmptyState } from '@/components/EmptyState'
import './index.scss'

export default function DiscoverPage() {
  const token = useAuthStore((s) => s.token)
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)

  const [data, setData] = useState<DiscoverData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    if (!token || !activeWorkspaceId) return
    setLoading(true)
    try {
      const res = await getDiscoverPage()
      setData(res)
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    useAuthStore.getState().hydrate()
    useWorkspaceStore.getState().hydrate()
  }, [])

  useEffect(() => {
    if (token && activeWorkspaceId) fetchData()
  }, [token, activeWorkspaceId])

  usePullDownRefresh(async () => {
    await fetchData()
    Taro.stopPullDownRefresh()
  })

  if (loading) return <LoadingState text="发现好书中..." />

  if (!data) {
    return (
      <EmptyState
        title="暂无推荐"
        description="添加更多书籍后获取个性化推荐"
      />
    )
  }

  const hasContent =
    data.continueReading.length > 0 ||
    data.forYou.length > 0 ||
    data.categoryPicks.length > 0

  if (!hasContent) {
    return (
      <EmptyState
        title="暂无推荐"
        description="添加更多书籍后获取个性化推荐"
      />
    )
  }

  return (
    <View className="discover">
      <View className="discover__header">
        <Text className="discover__title">发现</Text>
        <Text className="discover__subtitle">根据你的阅读偏好推荐</Text>
      </View>

      <RecommendSection
        title="继续阅读"
        books={data.continueReading}
        showProgress
      />

      <RecommendSection title="你可能喜欢" books={data.forYou} />

      {data.categoryPicks.map((pick) => (
        <RecommendSection
          key={pick.category.id}
          title={`${pick.category.name}精选`}
          books={pick.books}
        />
      ))}
    </View>
  )
}
```

- [ ] **Step 2: Create discover page styles**

```scss
@import '@/assets/variables';

.discover {
  min-height: 100vh;
  background: $color-bg;
  padding-bottom: calc(180rpx + env(safe-area-inset-bottom));

  &__header {
    padding: $spacing-xl $spacing-lg $spacing-md;
    background: $color-surface;
  }

  &__title {
    font-size: $font-size-xxl;
    font-weight: 600;
    color: $color-text-primary;
    display: block;
  }

  &__subtitle {
    font-size: $font-size-sm;
    color: $color-text-muted;
    margin-top: $spacing-xs;
    display: block;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add booknest/apps/mini-taro/src/sub/discover/
git commit -m "feat(recommendation): add discover page"
```

---

### Task 9: Frontend — Update TabBar

**Files:**
- Modify: `booknest/apps/mini-taro/src/custom-tab-bar/index.tsx`
- Modify: `booknest/apps/mini-taro/src/custom-tab-bar/index.scss`
- Modify: `booknest/apps/mini-taro/src/app.config.ts`

- [ ] **Step 1: Update custom-tab-bar/index.tsx**

Change the `tabs` array to include the discover tab:

```typescript
const tabs = [
  { pagePath: '/pages/index/index', text: '书架', icon: '📖' },
  { pagePath: '/pages/categories/index', text: '分类', icon: '🗂' },
  { pagePath: '/pages/discover/index', text: '发现', icon: '🧭' },
  { pagePath: '/pages/me/index', text: '我的', icon: '🪶' },
]
```

- [ ] **Step 2: Create discover main page placeholder**

Create `booknest/apps/mini-taro/src/pages/discover/index.tsx`:

```tsx
export default function DiscoverTabPage() {
  return null
}
```

Create `booknest/apps/mini-taro/src/pages/discover/index.scss`:

```scss
```

- [ ] **Step 3: Update app.config.ts**

Add discover page to `pages` array and to `tabBar.list`:

```typescript
export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/categories/index',
    'pages/discover/index',
    'pages/me/index',
    'pages/login/index',
  ],
  subPackages: [
    {
      root: 'sub/books',
      pages: ['pages/detail/index', 'pages/form/index'],
    },
    {
      root: 'sub/orders',
      pages: ['pages/result/index'],
    },
    {
      root: 'sub/admin',
      pages: ['pages/content-security/index'],
    },
    {
      root: 'sub/activities',
      pages: ['pages/list/index', 'pages/detail/index'],
    },
    {
      root: 'sub/reading',
      pages: ['pages/timeline/index'],
    },
    {
      root: 'sub/discover',
      pages: ['pages/index/index'],
    },
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#F7F3EE',
    navigationBarTitleText: 'BookNest',
    navigationBarTextStyle: 'black',
  },
  tabBar: {
    custom: true,
    color: '#B0A79F',
    selectedColor: '#8B7355',
    backgroundColor: '#FDFBF8',
    borderStyle: 'white',
    list: [
      { pagePath: 'pages/index/index', text: '书架' },
      { pagePath: 'pages/categories/index', text: '分类' },
      { pagePath: 'pages/discover/index', text: '发现' },
      { pagePath: 'pages/me/index', text: '我的' },
    ],
  },
  preloadRule: {
    'pages/index/index': {
      network: 'all',
      packages: ['sub/books', 'sub/reading'],
    },
    'pages/me/index': {
      network: 'all',
      packages: ['sub/admin'],
    },
    'pages/discover/index': {
      network: 'all',
      packages: ['sub/discover'],
    },
  },
})
```

Note: The discover tab page at `pages/discover/index` is a lightweight shell. The actual discover content is in the `sub/discover` subpackage and gets loaded on demand. The tab page just renders the subpackage page content.

Actually, since TabBar pages must be in the main `pages` array, and the content is in a subpackage, the tab page should navigate to the subpackage. But Taro tab pages can't use `navigateTo`. The simpler approach: put the discover content directly in `pages/discover/index.tsx` (main package) and remove the subpackage. The subpackage was for code splitting, but a tab page must be in main package anyway.

**Revised Step 2 and 3**: Put discover content directly in `pages/discover/index.tsx`, skip the subpackage.

Replace Step 2: Write the full discover page directly:

`booknest/apps/mini-taro/src/pages/discover/index.tsx` — same content as the subpackage version from Task 8, Step 1.

`booknest/apps/mini-taro/src/pages/discover/index.scss` — same styles as Task 8, Step 2.

Skip creating `sub/discover` subpackage entirely.

Updated `app.config.ts` — no `sub/discover` in subPackages, no preloadRule for it:

```typescript
export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/categories/index',
    'pages/discover/index',
    'pages/me/index',
    'pages/login/index',
  ],
  subPackages: [
    {
      root: 'sub/books',
      pages: ['pages/detail/index', 'pages/form/index'],
    },
    {
      root: 'sub/orders',
      pages: ['pages/result/index'],
    },
    {
      root: 'sub/admin',
      pages: ['pages/content-security/index'],
    },
    {
      root: 'sub/activities',
      pages: ['pages/list/index', 'pages/detail/index'],
    },
    {
      root: 'sub/reading',
      pages: ['pages/timeline/index'],
    },
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#F7F3EE',
    navigationBarTitleText: 'BookNest',
    navigationBarTextStyle: 'black',
  },
  tabBar: {
    custom: true,
    color: '#B0A79F',
    selectedColor: '#8B7355',
    backgroundColor: '#FDFBF8',
    borderStyle: 'white',
    list: [
      { pagePath: 'pages/index/index', text: '书架' },
      { pagePath: 'pages/categories/index', text: '分类' },
      { pagePath: 'pages/discover/index', text: '发现' },
      { pagePath: 'pages/me/index', text: '我的' },
    ],
  },
  preloadRule: {
    'pages/index/index': {
      network: 'all',
      packages: ['sub/books', 'sub/reading'],
    },
    'pages/me/index': {
      network: 'all',
      packages: ['sub/admin'],
    },
  },
})
```

- [ ] **Step 4: Commit**

```bash
git add booknest/apps/mini-taro/src/custom-tab-bar/index.tsx \
  booknest/apps/mini-taro/src/pages/discover/ \
  booknest/apps/mini-taro/src/app.config.ts
git commit -m "feat(recommendation): add discover tab to TabBar"
```

---

### Task 10: Frontend — Homepage Integration

**Files:**
- Modify: `booknest/apps/mini-taro/src/pages/index/index.tsx`

- [ ] **Step 1: Add imports**

At the top of `pages/index/index.tsx`, add after the existing imports:

```typescript
import { getHomepageRecommendations, type RecommendBook } from '@/services/recommendation'
import { RecommendSection } from '@/components/RecommendSection'
```

- [ ] **Step 2: Add state and fetch**

After the `const [readingSummary, setReadingSummary]` line (~line 71), add:

```typescript
const [recommendations, setRecommendations] = useState<RecommendBook[]>([])
```

After the `refreshReading` function (~line 140), add:

```typescript
const fetchRecommendations = () => {
  if (!activeWorkspaceId) return
  getHomepageRecommendations().then((res) => setRecommendations(res.items)).catch(() => {})
}
```

Add a new useEffect after the reading summary one (~line 135):

```typescript
useEffect(() => {
  if (!activeWorkspaceId) return
  fetchRecommendations()
}, [activeWorkspaceId])
```

Update the `usePullDownRefresh` callback (~line 142) to include recommendations:

```typescript
usePullDownRefresh(async () => {
  setPage(1)
  refreshReading()
  fetchRecommendations()
  await fetchBooks(true)
  Taro.stopPullDownRefresh()
})
```

- [ ] **Step 3: Add RecommendSection to JSX**

In the JSX, after the `<ReadingTimer>` component (~line 221) and before the `<View className="page__filters">` (~line 223), insert:

```tsx
{recommendations.length > 0 && (
  <RecommendSection title="为你推荐" books={recommendations} />
)}
```

- [ ] **Step 4: Commit**

```bash
git add booknest/apps/mini-taro/src/pages/index/index.tsx
git commit -m "feat(recommendation): add homepage recommendation section"
```

---

### Task 11: Frontend — Detail Page Related Recommendations

**Files:**
- Modify: `booknest/apps/mini-taro/src/sub/books/pages/detail/index.tsx`

- [ ] **Step 1: Add imports**

At the top, add after the existing imports:

```typescript
import { getSimilarBooks, type RecommendBook } from '@/services/recommendation'
import { RecommendSection } from '@/components/RecommendSection'
```

- [ ] **Step 2: Add state and fetch**

After the `const [submittingReview, setSubmittingReview]` line (~line 29), add:

```typescript
const [similarBooks, setSimilarBooks] = useState<RecommendBook[]>([])
```

Inside the `loadData` function, after the `Promise.all` (~line 33), add a parallel fetch:

```typescript
const loadData = async () => {
  try {
    const [bookData, reviewData] = await Promise.all([
      getBook(id),
      listReviews(id).catch(() => []),
    ])
    setBook(bookData)
    setReviews(reviewData as Review[])
    // Fetch similar books
    getSimilarBooks(id).then((res) => setSimilarBooks(res.items)).catch(() => {})
  } catch {} finally {
    setLoading(false)
  }
}
```

- [ ] **Step 3: Add to JSX**

After the actions section (after the `{(showEdit || showDelete) && ...}` block, before the closing `</View>` of `.detail`), insert:

```tsx
{similarBooks.length > 0 && (
  <View className="detail__section">
    <Text className="detail__section-title">相关推荐</Text>
    <RecommendSection title="" books={similarBooks} />
  </View>
)}
```

- [ ] **Step 4: Commit**

```bash
git add booknest/apps/mini-taro/src/sub/books/pages/detail/index.tsx
git commit -m "feat(recommendation): add related recommendations to book detail page"
```

---

### Task 12: Frontend — Clean up unused subpackage files

Since we put discover in main package instead of subpackage, delete the files from Task 8.

- [ ] **Step 1: Remove sub/discover directory if created**

```bash
rm -rf booknest/apps/mini-taro/src/sub/discover/
```

- [ ] **Step 2: Verify build**

```bash
cd booknest/apps/mini-taro && pnpm build:weapp 2>&1 | tail -20
```

Expected: build succeeds with no errors.

---

### Task 13: Final Verification

- [ ] **Step 1: Verify backend compiles**

```bash
cd booknest/backend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 2: Verify frontend compiles**

```bash
cd booknest/apps/mini-taro && pnpm build:weapp 2>&1 | tail -20
```

Expected: build succeeds.

- [ ] **Step 3: Test full flow in WeChat DevTools**

1. Open mini program in WeChat DevTools
2. Login
3. Verify homepage shows "为你推荐" section with books
4. Tap "发现" tab — verify discover page loads with sections
5. Tap a book — verify detail page shows "相关推荐"
6. Pull down to refresh on homepage — verify recommendations refresh

- [ ] **Step 4: Commit all remaining changes**

```bash
git add -A
git commit -m "feat: Phase 2 recommendation system — homepage, discover tab, related recommendations"
```
