# Reading Behavior System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-stack reading behavior system (progress tracking, timer, streaks, daily goals) to the BookNest mini-program.

**Architecture:** Extend existing Prisma schema with 3 new models + Book fields. Backend follows Controller → Service → Prisma pattern with Zod validation. Frontend integrates reading card + timer into existing homepage, adds timeline subpackage page.

**Tech Stack:** Prisma 7 / PostgreSQL 16 / Express 5 / Zod / Taro 4 / React 18 / SCSS

**Spec:** `docs/superpowers/specs/2026-05-14-reading-behavior-system-design.md`

---

### Task 1: Prisma Schema — Add New Models & Extend Book

**Files:**
- Modify: `booknest/backend/prisma/schema.prisma`

- [ ] **Step 1: Add fields to Book model**

Add three fields to the `Book` model, before `@@index` lines (after `reviews Review[]`):

```prisma
  readingProgress    Int       @default(0) @map("reading_progress")
  lastReadAt         DateTime? @map("last_read_at") @db.Date
  totalReadingMinutes Int      @default(0) @map("total_reading_minutes")
```

- [ ] **Step 2: Add ReadingSession model**

Add after the `Review` model:

```prisma
model ReadingSession {
  id              String   @id @default(cuid())
  startTime       DateTime @map("start_time")
  endTime         DateTime @map("end_time")
  durationMinutes Int      @map("duration_minutes")
  note            String?  @db.Text
  createdAt       DateTime @default(now()) @map("created_at")

  userId      String @map("user_id")
  user        User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  bookId      String @map("book_id")
  book        Book   @relation(fields: [bookId], references: [id], onDelete: Cascade)

  workspaceId String    @map("workspace_id")
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([workspaceId, createdAt])
  @@map("reading_sessions")
}
```

- [ ] **Step 3: Add DailyReadingSummary model**

```prisma
model DailyReadingSummary {
  id           String   @id @default(cuid())
  date         DateTime @map("date") @db.Date
  totalMinutes Int      @default(0) @map("total_minutes")
  streakDays   Int      @default(0) @map("streak_days")
  goalMet      Boolean  @default(false) @map("goal_met")
  bookCount    Int      @default(0) @map("book_count")

  userId      String @map("user_id")
  user        User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  workspaceId String    @map("workspace_id")
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@unique([userId, workspaceId, date])
  @@index([workspaceId, date])
  @@map("daily_reading_summaries")
}
```

- [ ] **Step 4: Add ReadingGoal model**

```prisma
model ReadingGoal {
  id               String  @id @default(cuid())
  dailyGoalMinutes Int     @default(30) @map("daily_goal_minutes")
  isActive         Boolean @default(true) @map("is_active")

  userId      String @map("user_id")
  user        User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  workspaceId String    @map("workspace_id")
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@unique([userId, workspaceId])
  @@map("reading_goals")
}
```

- [ ] **Step 5: Add relations to User, Book, Workspace models**

In `User` model, add:
```prisma
  readingSessions    ReadingSession[]
  dailySummaries     DailyReadingSummary[]
  readingGoals       ReadingGoal[]
```

In `Book` model, add:
```prisma
  readingSessions ReadingSession[]
```

In `Workspace` model, add:
```prisma
  readingSessions    ReadingSession[]
  dailySummaries     DailyReadingSummary[]
  readingGoals       ReadingGoal[]
```

- [ ] **Step 6: Run migration**

```bash
cd booknest/backend && npx prisma migrate dev --name add_reading_behavior
```

- [ ] **Step 7: Commit**

```bash
git add booknest/backend/prisma/
git commit -m "feat: add reading behavior models (ReadingSession, DailyReadingSummary, ReadingGoal)"
```

---

### Task 2: Backend Zod Schemas

**Files:**
- Create: `booknest/backend/src/schemas/reading.schema.ts`

- [ ] **Step 1: Create schema file**

```typescript
import { z } from '../lib/zod-extended'

export const createSessionBodySchema = z.object({
  bookId: z.string().min(1, '请选择要阅读的书籍'),
  startTime: z.string().datetime('开始时间格式错误'),
  endTime: z.string().datetime('结束时间格式错误'),
  note: z.string().max(500).optional(),
  readingProgress: z.number().int().min(0).max(100).optional(),
}).refine(
  (data) => new Date(data.endTime) > new Date(data.startTime),
  { message: '结束时间必须晚于开始时间', path: ['endTime'] },
)

export const listSessionsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式错误').optional(),
  days: z.coerce.number().int().min(1).max(30).default(7),
})

export const updateGoalBodySchema = z.object({
  dailyGoalMinutes: z.number().int().min(1, '目标至少1分钟').max(480, '目标不能超过8小时'),
})

export const updateProgressBodySchema = z.object({
  readingProgress: z.number().int().min(0).max(100),
})

export type CreateSessionBody = z.infer<typeof createSessionBodySchema>
export type UpdateGoalBody = z.infer<typeof updateGoalBodySchema>
```

- [ ] **Step 2: Commit**

```bash
git add booknest/backend/src/schemas/reading.schema.ts
git commit -m "feat: add reading behavior Zod schemas"
```

---

### Task 3: Backend Service

**Files:**
- Create: `booknest/backend/src/services/reading.service.ts`

- [ ] **Step 1: Create service file**

```typescript
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

    // Verify book belongs to workspace
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

    // Update book fields
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

    // Upsert daily summary
    await this.upsertDailySummary(userId, workspaceId, durationMinutes, data.bookId)

    return session
  },

  async upsertDailySummary(userId: string, workspaceId: string, addedMinutes: number, bookId: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get or create today's summary
    const existing = await prisma.dailyReadingSummary.findUnique({
      where: { userId_workspaceId_date: { userId, workspaceId, date: today } },
    })

    // Calculate streak
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdaySummary = await prisma.dailyReadingSummary.findUnique({
      where: { userId_workspaceId_date: { userId, workspaceId, date: yesterday } },
    })
    const streakDays = yesterdaySummary ? yesterdaySummary.streakDays + 1 : 1

    // Get or create reading goal
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
      // Count distinct books for today
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
```

- [ ] **Step 2: Commit**

```bash
git add booknest/backend/src/services/reading.service.ts
git commit -m "feat: add reading behavior service with session, summary, goal logic"
```

---

### Task 4: Backend Controller

**Files:**
- Create: `booknest/backend/src/controllers/reading.controller.ts`

- [ ] **Step 1: Create controller file**

```typescript
import { Request, Response, NextFunction } from 'express'
import { readingService } from '../services/reading.service'
import { ResponseUtil } from '../utils/response'

export const readingController = {
  async createSession(req: Request, res: Response, next: NextFunction) {
    try {
      const session = await readingService.createSession(
        req.user!.id,
        req.workspace!.id,
        req.body,
      )
      ResponseUtil.success(res, session, '阅读记录已保存', 201)
    } catch (err) {
      next(err)
    }
  },

  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await readingService.getSummary(req.user!.id, req.workspace!.id)
      ResponseUtil.success(res, data)
    } catch (err) {
      next(err)
    }
  },

  async getSessionsByDate(req: Request, res: Response, next: NextFunction) {
    try {
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0]
      const sessions = await readingService.getSessionsByDate(
        req.user!.id,
        req.workspace!.id,
        date,
      )
      ResponseUtil.success(res, sessions)
    } catch (err) {
      next(err)
    }
  },

  async getTimeline(req: Request, res: Response, next: NextFunction) {
    try {
      const days = Number(req.query.days) || 7
      const timeline = await readingService.getTimeline(req.user!.id, req.workspace!.id, days)
      ResponseUtil.success(res, timeline)
    } catch (err) {
      next(err)
    }
  },

  async getGoal(req: Request, res: Response, next: NextFunction) {
    try {
      const goal = await readingService.getGoal(req.user!.id, req.workspace!.id)
      ResponseUtil.success(res, goal)
    } catch (err) {
      next(err)
    }
  },

  async updateGoal(req: Request, res: Response, next: NextFunction) {
    try {
      const goal = await readingService.updateGoal(
        req.user!.id,
        req.workspace!.id,
        req.body.dailyGoalMinutes,
      )
      ResponseUtil.success(res, goal, '目标已更新')
    } catch (err) {
      next(err)
    }
  },

  async updateProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const book = await readingService.updateProgress(
        req.user!.id,
        req.workspace!.id,
        req.params.id,
        req.body.readingProgress,
      )
      ResponseUtil.success(res, book, '进度已更新')
    } catch (err) {
      next(err)
    }
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add booknest/backend/src/controllers/reading.controller.ts
git commit -m "feat: add reading behavior controller"
```

---

### Task 5: Backend Routes & Registration

**Files:**
- Create: `booknest/backend/src/routes/reading.routes.ts`
- Modify: `booknest/backend/src/routes/index.ts`
- Modify: `booknest/backend/src/routes/book.routes.ts`

- [ ] **Step 1: Create reading routes file**

```typescript
import { Router } from 'express'
import { readingController } from '../controllers/reading.controller'
import { authenticate } from '../middleware/auth'
import { resolveWorkspace } from '../middleware/workspace'
import { validateBody, validateQuery } from '../middleware/zodValidate'
import {
  createSessionBodySchema,
  listSessionsQuerySchema,
  updateGoalBodySchema,
} from '../schemas/reading.schema'

const router = Router()

router.use(authenticate, resolveWorkspace)

// Sessions
router.post('/sessions', validateBody(createSessionBodySchema), readingController.createSession)
router.get('/sessions', validateQuery(listSessionsQuerySchema), readingController.getSessionsByDate)
router.get('/sessions/timeline', readingController.getTimeline)

// Summary
router.get('/summary', readingController.getSummary)

// Goal
router.get('/goal', readingController.getGoal)
router.put('/goal', validateBody(updateGoalBodySchema), readingController.updateGoal)

export default router
```

- [ ] **Step 2: Register routes in index.ts**

Add import and route registration to `booknest/backend/src/routes/index.ts`:

Add import at top:
```typescript
import readingRoutes from './reading.routes'
```

Add route before `export default router`:
```typescript
router.use('/reading', readingRoutes)
```

- [ ] **Step 3: Add progress update to book routes**

In `booknest/backend/src/routes/book.routes.ts`, add import:
```typescript
import { updateProgressBodySchema } from '../schemas/reading.schema'
```

Add route before the review routes (after `router.post('/:id/cover` line):
```typescript
router.patch('/:id/progress', requireWorkspaceRole('MEMBER'), validateBody(updateProgressBodySchema), readingController.updateProgress)
```

Add import for the controller:
```typescript
import { readingController } from '../controllers/reading.controller'
```

- [ ] **Step 4: Verify backend compiles**

```bash
cd booknest/backend && npm run build
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add booknest/backend/src/routes/
git commit -m "feat: add reading behavior routes and register in app"
```

---

### Task 6: Seed Data Update

**Files:**
- Modify: `booknest/backend/prisma/seed.ts`

- [ ] **Step 1: Add reading behavior seed data**

At the end of the seed file (before the final `console.log`), add:

```typescript
  // ===== Reading Behavior Seed Data =====
  console.log('🌱 Seeding reading behavior data...')

  // Create reading goals for test users
  for (const member of members) {
    await prisma.readingGoal.upsert({
      where: { userId_workspaceId: { userId: member.userId, workspaceId: member.workspaceId } },
      update: {},
      create: {
        userId: member.userId,
        workspaceId: member.workspaceId,
        dailyGoalMinutes: 30,
      },
    })
  }

  // Create sample reading sessions for the past 7 days
  const now = new Date()
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const day = new Date(now)
    day.setDate(day.getDate() - dayOffset)
    day.setHours(0, 0, 0, 0)

    // Each day: 1-3 sessions for user1 on random books
    const sessionsCount = dayOffset === 0 ? 1 : Math.floor(Math.random() * 3) + 1
    for (let s = 0; s < sessionsCount && s < ws1Books.length; s++) {
      const book = ws1Books[s]
      const duration = Math.floor(Math.random() * 40) + 10 // 10-50 min
      const startTime = new Date(day)
      startTime.setHours(8 + s * 4, Math.floor(Math.random() * 30))

      await prisma.readingSession.create({
        data: {
          userId: user1.id,
          bookId: book.id,
          workspaceId: workspace1.id,
          startTime,
          endTime: new Date(startTime.getTime() + duration * 60000),
          durationMinutes: duration,
        },
      })
    }

    // Upsert daily summary
    const daySessions = await prisma.readingSession.findMany({
      where: { userId: user1.id, workspaceId: workspace1.id, startTime: { gte: day, lt: new Date(day.getTime() + 86400000) } },
    })
    const totalMin = daySessions.reduce((sum, s) => sum + s.durationMinutes, 0)
    const bookIds = [...new Set(daySessions.map(s => s.bookId))]

    const yesterday = new Date(day)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdaySummary = await prisma.dailyReadingSummary.findUnique({
      where: { userId_workspaceId_date: { userId: user1.id, workspaceId: workspace1.id, date: yesterday } },
    })

    await prisma.dailyReadingSummary.upsert({
      where: { userId_workspaceId_date: { userId: user1.id, workspaceId: workspace1.id, date: day } },
      update: {},
      create: {
        userId: user1.id,
        workspaceId: workspace1.id,
        date: day,
        totalMinutes: totalMin,
        streakDays: yesterdaySummary ? yesterdaySummary.streakDays + 1 : 1,
        goalMet: totalMin >= 30,
        bookCount: bookIds.length,
      },
    })
  }

  // Update books with reading progress
  for (const book of ws1Books.slice(0, 3)) {
    await prisma.book.update({
      where: { id: book.id },
      data: {
        readingProgress: Math.floor(Math.random() * 80) + 10,
        totalReadingMinutes: Math.floor(Math.random() * 200) + 30,
        lastReadAt: new Date(),
      },
    })
  }
```

Note: The seed file uses variables `user1`, `workspace1`, `ws1Books`, `members` — verify these exist in your seed file and adjust variable names accordingly.

- [ ] **Step 2: Run seed**

```bash
cd booknest/backend && npm run prisma:seed
```

Expected: Seed completes without errors.

- [ ] **Step 3: Commit**

```bash
git add booknest/backend/prisma/seed.ts
git commit -m "feat: add reading behavior seed data (sessions, summaries, goals)"
```

---

### Task 7: Frontend Service Layer

**Files:**
- Create: `booknest/apps/mini-taro/src/services/reading.ts`

- [ ] **Step 1: Create service file**

```typescript
import { request } from './request'

export interface ReadingSession {
  id: string
  bookId: string
  startTime: string
  endTime: string
  durationMinutes: number
  note: string | null
  createdAt: string
  book?: { id: string; title: string; coverUrl: string | null }
}

export interface ReadingSummary {
  todayMinutes: number
  dailyGoal: number
  goalMet: boolean
  streakDays: number
  recentDays: { date: string; minutes: number; goalMet: boolean }[]
}

export interface ReadingGoal {
  id: string
  dailyGoalMinutes: number
  isActive: boolean
}

export interface TimelineDay {
  date: string
  totalMinutes: number
  goalMet: boolean
  sessions: ReadingSession[]
}

export function getReadingSummary() {
  return request<ReadingSummary>({
    url: '/api/v1/reading/summary',
    method: 'GET',
  })
}

export function createReadingSession(data: {
  bookId: string
  startTime: string
  endTime: string
  note?: string
  readingProgress?: number
}) {
  return request<ReadingSession>({
    url: '/api/v1/reading/sessions',
    method: 'POST',
    data,
  })
}

export function getReadingSessions(date: string) {
  return request<ReadingSession[]>({
    url: '/api/v1/reading/sessions',
    method: 'GET',
    data: { date },
  })
}

export function getReadingTimeline(days = 7) {
  return request<TimelineDay[]>({
    url: '/api/v1/reading/sessions/timeline',
    method: 'GET',
    data: { days },
  })
}

export function getReadingGoal() {
  return request<ReadingGoal>({
    url: '/api/v1/reading/goal',
    method: 'GET',
  })
}

export function updateReadingGoal(dailyGoalMinutes: number) {
  return request<ReadingGoal>({
    url: '/api/v1/reading/goal',
    method: 'PUT',
    data: { dailyGoalMinutes },
  })
}

export function updateBookProgress(bookId: string, readingProgress: number) {
  return request<{ id: string; readingProgress: number }>({
    url: `/api/v1/books/${bookId}/progress`,
    method: 'PATCH',
    data: { readingProgress },
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add booknest/apps/mini-taro/src/services/reading.ts
git commit -m "feat: add reading behavior frontend service"
```

---

### Task 8: ReadingCard Component

**Files:**
- Create: `booknest/apps/mini-taro/src/components/ReadingCard/index.tsx`
- Create: `booknest/apps/mini-taro/src/components/ReadingCard/index.scss`

- [ ] **Step 1: Create component**

```typescript
import React from 'react'
import { Text, View } from '@tarojs/components'
import { ProgressRing } from '@/components/ProgressRing'
import './index.scss'

interface ReadingCardProps {
  todayMinutes: number
  dailyGoal: number
  streakDays: number
  goalMet: boolean
  onStartReading: () => void
  onViewTimeline: () => void
}

export const ReadingCard: React.FC<ReadingCardProps> = React.memo(function ReadingCard({
  todayMinutes,
  dailyGoal,
  streakDays,
  goalMet,
  onStartReading,
  onViewTimeline,
}) {
  const progress = Math.min(100, Math.round((todayMinutes / dailyGoal) * 100))

  return (
    <View className="reading-card">
      <View className="reading-card__left">
        <ProgressRing
          percent={progress}
          size={120}
          strokeWidth={8}
          color={goalMet ? '#7BA68D' : '#8B7355'}
        >
          <Text className="reading-card__minutes">{todayMinutes}</Text>
          <Text className="reading-card__unit">min</Text>
        </ProgressRing>
      </View>

      <View className="reading-card__right">
        <View className="reading-card__streak">
          <Text className="reading-card__streak-icon">🔥</Text>
          <Text className="reading-card__streak-text">连续阅读 {streakDays} 天</Text>
        </View>
        <Text className="reading-card__goal-text">
          今日目标 {todayMinutes}/{dailyGoal} 分钟
        </Text>
        {goalMet && (
          <Text className="reading-card__goal-met">今日目标已达成</Text>
        )}
        <View className="reading-card__actions">
          <View className="reading-card__btn reading-card__btn--primary" onClick={onStartReading}>
            <Text className="reading-card__btn-text">开始阅读</Text>
          </View>
          <View className="reading-card__btn reading-card__btn--ghost" onClick={onViewTimeline}>
            <Text className="reading-card__btn-text reading-card__btn-text--ghost">记录</Text>
          </View>
        </View>
      </View>
    </View>
  )
})
```

- [ ] **Step 2: Create styles**

```scss
.reading-card {
  display: flex;
  align-items: center;
  gap: $spacing-lg;
  margin: $spacing-lg;
  padding: $spacing-lg $spacing-xl;
  background: $color-bg-card;
  border-radius: $border-radius-lg;
  box-shadow: $shadow-card;

  &__left {
    flex-shrink: 0;
    position: relative;
  }

  &__minutes {
    font-size: $font-size-xl;
    font-weight: 300;
    color: $color-text-primary;
    letter-spacing: 2rpx;
  }

  &__unit {
    font-size: $font-size-xs;
    color: $color-text-muted;
    letter-spacing: 1rpx;
  }

  &__right {
    flex: 1;
    min-width: 0;
  }

  &__streak {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    margin-bottom: $spacing-xs;
  }

  &__streak-icon {
    font-size: $font-size-md;
  }

  &__streak-text {
    font-size: $font-size-sm;
    color: $color-accent;
    font-weight: 400;
    letter-spacing: 1rpx;
  }

  &__goal-text {
    display: block;
    font-size: $font-size-sm;
    color: $color-text-secondary;
    letter-spacing: 1rpx;
    margin-bottom: $spacing-md;
  }

  &__goal-met {
    display: block;
    font-size: $font-size-xs;
    color: $color-success;
    letter-spacing: 2rpx;
    margin-bottom: $spacing-sm;
  }

  &__actions {
    display: flex;
    gap: $spacing-sm;
  }

  &__btn {
    padding: 12rpx 28rpx;
    border-radius: $border-radius-full;
    transition: all $transition-fast;

    &--primary {
      background: $color-primary;
    }

    &--ghost {
      background: transparent;
      border: 1rpx solid $color-primary;
    }

    &:active {
      opacity: 0.8;
      transform: scale(0.96);
    }
  }

  &__btn-text {
    font-size: $font-size-sm;
    color: $color-text-white;
    letter-spacing: 2rpx;

    &--ghost {
      color: $color-primary;
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add booknest/apps/mini-taro/src/components/ReadingCard/
git commit -m "feat: add ReadingCard component with progress ring and streak display"
```

---

### Task 9: ReadingTimer Component

**Files:**
- Create: `booknest/apps/mini-taro/src/components/ReadingTimer/index.tsx`
- Create: `booknest/apps/mini-taro/src/components/ReadingTimer/index.scss`

- [ ] **Step 1: Create component**

```typescript
import React, { useEffect, useRef, useState } from 'react'
import { Picker, Slider, Text, View } from '@tarojs/components'
import Taro, { useDidHide, useDidShow } from '@tarojs/taro'
import { createReadingSession } from '@/services/reading'
import './index.scss'

interface ReadingTimerProps {
  books: { id: string; title: string; coverUrl?: string | null }[]
  visible: boolean
  onClose: () => void
  onComplete: () => void
}

export const ReadingTimer: React.FC<ReadingTimerProps> = React.memo(function ReadingTimer({
  books,
  visible,
  onClose,
  onComplete,
}) {
  const [selectedBookId, setSelectedBookId] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [readingProgress, setReadingProgress] = useState(0)
  const [saving, setSaving] = useState(false)
  const [phase, setPhase] = useState<'select' | 'timing' | 'finish'>('select')

  const startTimestampRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval>>()

  useDidShow(() => {
    if (isRunning && startTimestampRef.current > 0) {
      setElapsedSeconds(Math.floor((Date.now() - startTimestampRef.current) / 1000))
    }
  })

  useDidHide(() => {
    // Timer keeps running in background via timestamp diff
  })

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTimestampRef.current) / 1000))
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRunning])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleStart = () => {
    if (!selectedBookId) {
      Taro.showToast({ title: '请先选择一本书', icon: 'none' })
      return
    }
    startTimestampRef.current = Date.now()
    setElapsedSeconds(0)
    setIsRunning(true)
    setPhase('timing')
  }

  const handleStop = () => {
    setIsRunning(false)
    if (timerRef.current) clearInterval(timerRef.current)
    setPhase('finish')
  }

  const handleSave = async () => {
    if (elapsedSeconds < 60) {
      Taro.showToast({ title: '阅读不足1分钟，不记录', icon: 'none' })
      onClose()
      resetState()
      return
    }

    setSaving(true)
    try {
      const startTime = new Date(startTimestampRef.current).toISOString()
      const endTime = new Date().toISOString()
      await createReadingSession({
        bookId: selectedBookId,
        startTime,
        endTime,
        readingProgress,
      })
      Taro.showToast({ title: '阅读记录已保存', icon: 'success' })
      onComplete()
      onClose()
      resetState()
    } catch (err) {
      // request.ts handles toast
    } finally {
      setSaving(false)
    }
  }

  const resetState = () => {
    setSelectedBookId('')
    setIsRunning(false)
    setElapsedSeconds(0)
    setReadingProgress(0)
    setPhase('select')
    startTimestampRef.current = 0
  }

  if (!visible) return null

  const selectedBook = books.find((b) => b.id === selectedBookId)

  return (
    <View className="timer-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <View className="timer-sheet">
        {/* Header */}
        <View className="timer-sheet__header">
          <Text className="timer-sheet__title">
            {phase === 'select' ? '选择书籍' : phase === 'timing' ? '阅读中...' : '阅读完成'}
          </Text>
          <Text className="timer-sheet__close" onClick={onClose}>✕</Text>
        </View>

        {/* Phase: Select Book */}
        {phase === 'select' && (
          <View className="timer-sheet__body">
            <Picker
              mode="selector"
              range={books.map((b) => b.title)}
              value={books.findIndex((b) => b.id === selectedBookId)}
              onChange={(e) => setSelectedBookId(books[Number(e.detail.value)]?.id || '')}
            >
              <View className="timer-sheet__book-picker">
                <Text className="timer-sheet__book-label">
                  {selectedBook ? selectedBook.title : '点击选择要阅读的书籍'}
                </Text>
                <Text className="timer-sheet__book-arrow">›</Text>
              </View>
            </Picker>
            <View
              className={`timer-sheet__start-btn ${!selectedBookId ? 'timer-sheet__start-btn--disabled' : ''}`}
              onClick={handleStart}
            >
              <Text className="timer-sheet__start-text">开始阅读</Text>
            </View>
          </View>
        )}

        {/* Phase: Timing */}
        {phase === 'timing' && (
          <View className="timer-sheet__body timer-sheet__body--center">
            <Text className="timer-sheet__book-name">{selectedBook?.title}</Text>
            <Text className="timer-sheet__elapsed">{formatTime(elapsedSeconds)}</Text>
            <View className="timer-sheet__stop-btn" onClick={handleStop}>
              <Text className="timer-sheet__stop-text">结束阅读</Text>
            </View>
          </View>
        )}

        {/* Phase: Finish */}
        {phase === 'finish' && (
          <View className="timer-sheet__body">
            <Text className="timer-sheet__summary">
              阅读《{selectedBook?.title}》 {Math.floor(elapsedSeconds / 60)} 分钟
            </Text>
            <View className="timer-sheet__progress-section">
              <Text className="timer-sheet__progress-label">阅读进度 {readingProgress}%</Text>
              <Slider
                min={0}
                max={100}
                value={readingProgress}
                activeColor="#8B7355"
                backgroundColor="#EDE8E1"
                blockSize={20}
                onChange={(e) => setReadingProgress(e.detail.value)}
              />
            </View>
            <View className="timer-sheet__save-btn" onClick={handleSave}>
              <Text className="timer-sheet__save-text">{saving ? '保存中...' : '保存记录'}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  )
})
```

- [ ] **Step 2: Create styles**

```scss
.timer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(44, 40, 37, 0.4);
  z-index: 999;
  display: flex;
  align-items: flex-end;
}

.timer-sheet {
  width: 100%;
  background: $color-bg-card;
  border-radius: $border-radius-lg $border-radius-lg 0 0;
  padding: $spacing-xl $spacing-lg $spacing-xxxl;
  box-shadow: $shadow-modal;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $spacing-xl;
  }

  &__title {
    font-size: $font-size-lg;
    font-weight: 400;
    color: $color-text-primary;
    letter-spacing: 2rpx;
  }

  &__close {
    font-size: $font-size-lg;
    color: $color-text-muted;
    padding: $spacing-sm;
  }

  &__body {
    &--center {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-top: $spacing-xl;
    }
  }

  &__book-picker {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: $spacing-lg;
    background: $color-bg-warm;
    border-radius: $border-radius-md;
    margin-bottom: $spacing-xl;
  }

  &__book-label {
    font-size: $font-size-md;
    color: $color-text-primary;
    letter-spacing: 1rpx;
  }

  &__book-arrow {
    font-size: $font-size-xl;
    color: $color-text-muted;
  }

  &__book-name {
    font-size: $font-size-sm;
    color: $color-text-secondary;
    letter-spacing: 2rpx;
    margin-bottom: $spacing-lg;
  }

  &__start-btn {
    width: 100%;
    padding: $spacing-lg;
    background: $color-primary;
    border-radius: $border-radius-full;
    text-align: center;
    transition: all $transition-fast;

    &--disabled {
      opacity: 0.5;
    }

    &:active {
      opacity: 0.85;
      transform: scale(0.98);
    }
  }

  &__start-text {
    font-size: $font-size-md;
    color: $color-text-white;
    letter-spacing: 4rpx;
  }

  &__elapsed {
    font-size: 96rpx;
    font-weight: 200;
    color: $color-text-primary;
    letter-spacing: 8rpx;
    margin-bottom: $spacing-xxxl;
    font-variant-numeric: tabular-nums;
  }

  &__stop-btn {
    width: 240rpx;
    height: 240rpx;
    border-radius: 50%;
    background: $color-danger;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all $transition-fast;

    &:active {
      transform: scale(0.95);
    }
  }

  &__stop-text {
    color: $color-text-white;
    font-size: $font-size-md;
    letter-spacing: 4rpx;
  }

  &__summary {
    display: block;
    font-size: $font-size-md;
    color: $color-text-primary;
    letter-spacing: 1rpx;
    margin-bottom: $spacing-xl;
    text-align: center;
  }

  &__progress-section {
    margin-bottom: $spacing-xl;
  }

  &__progress-label {
    display: block;
    font-size: $font-size-sm;
    color: $color-text-secondary;
    margin-bottom: $spacing-md;
    letter-spacing: 1rpx;
  }

  &__save-btn {
    width: 100%;
    padding: $spacing-lg;
    background: $color-success;
    border-radius: $border-radius-full;
    text-align: center;
    transition: all $transition-fast;

    &:active {
      opacity: 0.85;
      transform: scale(0.98);
    }
  }

  &__save-text {
    font-size: $font-size-md;
    color: $color-text-white;
    letter-spacing: 4rpx;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add booknest/apps/mini-taro/src/components/ReadingTimer/
git commit -m "feat: add ReadingTimer component with book picker, timer, progress slider"
```

---

### Task 10: Homepage Integration

**Files:**
- Modify: `booknest/apps/mini-taro/src/pages/index/index.tsx`
- Modify: `booknest/apps/mini-taro/src/pages/index/index.scss`

- [ ] **Step 1: Add imports to homepage**

Add to existing imports in `index.tsx`:

```typescript
import { ReadingCard } from '@/components/ReadingCard'
import { ReadingTimer } from '@/components/ReadingTimer'
import { getReadingSummary } from '@/services/reading'
import type { ReadingSummary } from '@/services/reading'
```

- [ ] **Step 2: Add state variables**

After existing `useState` declarations, add:

```typescript
const [readingSummary, setReadingSummary] = useState<ReadingSummary | null>(null)
const [showTimer, setShowTimer] = useState(false)
```

- [ ] **Step 3: Add data fetching effect**

Add after the workspace auto-select effect:

```typescript
useEffect(() => {
  if (!activeWorkspaceId) return
  getReadingSummary().then(setReadingSummary).catch(() => {})
}, [activeWorkspaceId])
```

- [ ] **Step 4: Add refresh function**

Add a `refreshReading` function:

```typescript
const refreshReading = () => {
  if (!activeWorkspaceId) return
  getReadingSummary().then(setReadingSummary).catch(() => {})
}
```

- [ ] **Step 5: Add ReadingCard to JSX**

After the hero section (after `</View>` closing the hero) and before `<View className="page__filters">`, insert:

```tsx
{readingSummary && (
  <ReadingCard
    todayMinutes={readingSummary.todayMinutes}
    dailyGoal={readingSummary.dailyGoal}
    streakDays={readingSummary.streakDays}
    goalMet={readingSummary.goalMet}
    onStartReading={() => setShowTimer(true)}
    onViewTimeline={() => Taro.navigateTo({ url: '/sub/reading/pages/timeline/index' })}
  />
)}
<ReadingTimer
  books={items}
  visible={showTimer}
  onClose={() => setShowTimer(false)}
  onComplete={() => { refreshReading(); fetchBooks(true) }}
/>
```

- [ ] **Step 6: Update pull-down refresh**

In the `usePullDownRefresh` callback, add `refreshReading()`:

```typescript
usePullDownRefresh(async () => {
  setPage(1)
  await Promise.all([fetchBooks(true), refreshReading()])
  Taro.stopPullDownRefresh()
})
```

- [ ] **Step 7: Commit**

```bash
git add booknest/apps/mini-taro/src/pages/index/
git commit -m "feat: integrate ReadingCard and ReadingTimer into homepage"
```

---

### Task 11: Timeline Subpackage Page

**Files:**
- Create: `booknest/apps/mini-taro/src/sub/reading/pages/timeline/index.tsx`
- Create: `booknest/apps/mini-taro/src/sub/reading/pages/timeline/index.scss`
- Modify: `booknest/apps/mini-taro/src/app.config.ts`

- [ ] **Step 1: Register subpackage in app.config.ts**

In the `subPackages` array, add:

```typescript
{
  root: 'sub/reading',
  pages: ['pages/timeline/index'],
},
```

In `preloadRule`, add:

```typescript
'pages/index/index': {
  network: 'all',
  packages: ['sub/books', 'sub/reading'],
},
```

(Merge with existing `pages/index/index` preloadRule, adding `'sub/reading'` to the packages array.)

- [ ] **Step 2: Create timeline page**

```typescript
import React, { useEffect, useState } from 'react'
import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { getReadingTimeline } from '@/services/reading'
import { getReadingGoal, updateReadingGoal } from '@/services/reading'
import type { TimelineDay } from '@/services/reading'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'
import './index.scss'

export default function TimelinePage() {
  const [timeline, setTimeline] = useState<TimelineDay[]>([])
  const [loading, setLoading] = useState(true)
  const [dailyGoal, setDailyGoal] = useState(30)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState('30')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [tl, goal] = await Promise.all([
        getReadingTimeline(14),
        getReadingGoal(),
      ])
      setTimeline(tl)
      setDailyGoal(goal.dailyGoalMinutes)
      setGoalInput(String(goal.dailyGoalMinutes))
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  usePullDownRefresh(async () => {
    await fetchData()
    Taro.stopPullDownRefresh()
  })

  Taro.useDidShow(() => { fetchData() })

  const handleSaveGoal = async () => {
    const val = Number(goalInput)
    if (val < 1 || val > 480) {
      Taro.showToast({ title: '目标范围 1-480 分钟', icon: 'none' })
      return
    }
    try {
      await updateReadingGoal(val)
      setDailyGoal(val)
      setEditingGoal(false)
      Taro.showToast({ title: '目标已更新', icon: 'success' })
    } catch {}
  }

  const weekDays = ['一', '二', '三', '四', '五', '六', '日']

  if (loading) return <LoadingState text="加载中..." />

  return (
    <View className="timeline-page">
      {/* Weekly overview */}
      <View className="timeline-week">
        <Text className="timeline-week__title">本周概览</Text>
        <View className="timeline-week__grid">
          {weekDays.map((d, i) => {
            const dayData = timeline[6 - i]
            const met = dayData?.goalMet
            const hasData = dayData && dayData.totalMinutes > 0
            return (
              <View
                key={d}
                className={`timeline-week__cell ${met ? 'timeline-week__cell--met' : hasData ? 'timeline-week__cell--partial' : 'timeline-week__cell--empty'}`}
              >
                <Text className="timeline-week__day-label">{d}</Text>
                {hasData && (
                  <Text className="timeline-week__day-min">{dayData.totalMinutes}</Text>
                )}
              </View>
            )
          })}
        </View>
      </View>

      {/* Goal setting */}
      <View className="timeline-goal">
        <Text className="timeline-goal__label">每日目标</Text>
        {editingGoal ? (
          <View className="timeline-goal__edit">
            <input
              className="timeline-goal__input"
              type="number"
              value={goalInput}
              onInput={(e: any) => setGoalInput(e.detail.value || e.target.value)}
            />
            <Text className="timeline-goal__unit">分钟</Text>
            <View className="timeline-goal__save" onClick={handleSaveGoal}>
              <Text className="timeline-goal__save-text">保存</Text>
            </View>
          </View>
        ) : (
          <View className="timeline-goal__display" onClick={() => setEditingGoal(true)}>
            <Text className="timeline-goal__value">{dailyGoal} 分钟/天</Text>
            <Text className="timeline-goal__edit-icon">编辑</Text>
          </View>
        )}
      </View>

      {/* Timeline list */}
      <View className="timeline-list">
        {timeline.length === 0 ? (
          <EmptyState title="还没有阅读记录" description="开始你的第一次阅读吧" />
        ) : (
          timeline.map((day) => (
            <View key={day.date} className="timeline-day">
              <View className="timeline-day__header">
                <Text className="timeline-day__date">{formatDisplayDate(day.date)}</Text>
                <Text className="timeline-day__total">{day.totalMinutes} min</Text>
              </View>
              {day.sessions.map((session) => (
                <View key={session.id} className="timeline-session">
                  {session.book?.coverUrl ? (
                    <Image className="timeline-session__cover" src={session.book.coverUrl} mode="aspectFill" />
                  ) : (
                    <View className="timeline-session__cover timeline-session__cover--placeholder">
                      <Text>{session.book?.title?.[0] || '📖'}</Text>
                    </View>
                  )}
                  <View className="timeline-session__info">
                    <Text className="timeline-session__title">{session.book?.title || '未知书籍'}</Text>
                    <Text className="timeline-session__time">
                      {formatTime(session.startTime)} · {session.durationMinutes} min
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </View>
    </View>
  )
}

function formatDisplayDate(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  const diff = (today.getTime() - target.getTime()) / 86400000
  if (diff === 0) return '今天'
  if (diff === 1) return '昨天'
  if (diff === 2) return '前天'
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function formatTime(isoStr: string) {
  const d = new Date(isoStr)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}
```

- [ ] **Step 3: Create timeline styles**

```scss
.timeline-page {
  min-height: 100vh;
  background: $color-bg-primary;
  padding-bottom: 200rpx;
}

// ===== Weekly Overview =====
.timeline-week {
  margin: $spacing-lg;
  padding: $spacing-lg;
  background: $color-bg-card;
  border-radius: $border-radius-lg;
  box-shadow: $shadow-card;

  &__title {
    display: block;
    font-size: $font-size-md;
    font-weight: 400;
    color: $color-text-primary;
    letter-spacing: 2rpx;
    margin-bottom: $spacing-lg;
  }

  &__grid {
    display: flex;
    justify-content: space-between;
    gap: $spacing-xs;
  }

  &__cell {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-xs;
    padding: $spacing-sm 0;
    border-radius: $border-radius-md;
    background: $color-bg-warm;

    &--met {
      background: rgba(123, 166, 141, 0.2);
    }

    &--partial {
      background: rgba(139, 115, 85, 0.1);
    }

    &--empty {
      opacity: 0.5;
    }
  }

  &__day-label {
    font-size: $font-size-xs;
    color: $color-text-muted;
  }

  &__day-min {
    font-size: $font-size-xs;
    color: $color-text-secondary;
    font-weight: 400;
  }
}

// ===== Goal Setting =====
.timeline-goal {
  margin: 0 $spacing-lg $spacing-lg;
  padding: $spacing-lg $spacing-xl;
  background: $color-bg-card;
  border-radius: $border-radius-lg;
  box-shadow: $shadow-sm;
  display: flex;
  justify-content: space-between;
  align-items: center;

  &__label {
    font-size: $font-size-md;
    color: $color-text-primary;
    letter-spacing: 1rpx;
  }

  &__edit {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
  }

  &__input {
    width: 100rpx;
    height: 60rpx;
    border: 1rpx solid $color-bg-tertiary;
    border-radius: $border-radius-sm;
    text-align: center;
    font-size: $font-size-sm;
    color: $color-text-primary;
  }

  &__unit {
    font-size: $font-size-sm;
    color: $color-text-muted;
  }

  &__save {
    padding: 8rpx 24rpx;
    background: $color-primary;
    border-radius: $border-radius-full;

    &:active { opacity: 0.8; }
  }

  &__save-text {
    font-size: $font-size-xs;
    color: $color-text-white;
  }

  &__display {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
  }

  &__value {
    font-size: $font-size-md;
    color: $color-accent;
    font-weight: 400;
  }

  &__edit-icon {
    font-size: $font-size-xs;
    color: $color-text-muted;
    letter-spacing: 1rpx;
  }
}

// ===== Timeline List =====
.timeline-list {
  padding: 0 $spacing-lg;
}

.timeline-day {
  margin-bottom: $spacing-lg;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $spacing-md;
    padding: 0 $spacing-sm;
  }

  &__date {
    font-size: $font-size-md;
    font-weight: 400;
    color: $color-text-primary;
    letter-spacing: 2rpx;
  }

  &__total {
    font-size: $font-size-sm;
    color: $color-text-muted;
    letter-spacing: 1rpx;
  }
}

.timeline-session {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-md $spacing-lg;
  margin-bottom: $spacing-sm;
  background: $color-bg-card;
  border-radius: $border-radius-md;
  box-shadow: $shadow-sm;

  &__cover {
    width: 64rpx;
    height: 80rpx;
    border-radius: $border-radius-sm;
    flex-shrink: 0;

    &--placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background: $color-bg-warm;
      font-size: $font-size-sm;
    }
  }

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__title {
    display: block;
    font-size: $font-size-md;
    color: $color-text-primary;
    letter-spacing: 1rpx;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  &__time {
    display: block;
    font-size: $font-size-xs;
    color: $color-text-muted;
    margin-top: $spacing-xs;
    letter-spacing: 1rpx;
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add booknest/apps/mini-taro/src/sub/reading/ booknest/apps/mini-taro/src/app.config.ts
git commit -m "feat: add reading timeline subpackage page with weekly overview and goal setting"
```

---

### Task 12: Verify & End-to-End Test

**Files:** None (verification only)

- [ ] **Step 1: Verify backend compiles and migrates**

```bash
cd booknest/backend && npm run build
```

Expected: No errors.

- [ ] **Step 2: Verify frontend compiles**

```bash
cd booknest/apps/mini-taro && pnpm build:weapp
```

Expected: No errors. Output in `dist/` directory.

- [ ] **Step 3: Start backend and test API**

```bash
cd booknest/backend && npm run dev
```

Test the reading summary endpoint:
```bash
curl -s -H "Authorization: Bearer <token>" -H "X-Workspace-Id: <ws-id>" http://localhost:4000/api/v1/reading/summary | jq .
```

Expected: JSON response with `todayMinutes`, `streakDays`, `dailyGoal`, `recentDays`.

- [ ] **Step 4: Commit all remaining changes**

If any fixes were needed during verification, commit them.

---

## Self-Review Checklist

- **Spec coverage:** All 4 subsystems covered (progress → Task 1/5, time recording → Task 9 timer, streak → Task 3 service, goal → Task 3/11). Timeline page → Task 11. Homepage integration → Task 10. Seed data → Task 6.
- **Placeholder scan:** No TBD/TODO placeholders. All code shown in full.
- **Type consistency:** `ReadingSession`, `ReadingSummary`, `ReadingGoal`, `TimelineDay` types defined in `services/reading.ts` and used consistently across components and pages.
- **Missing:** ProgressRing component already exists in the codebase, no new creation needed. The plan references it in ReadingCard.
