# Growth & Achievement System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add achievement/badge system with auto-unlock and WeChat sharing, displayed in the "我的" page.

**Architecture:** Achievement templates defined in backend service constant. New UserAchievement Prisma model stores unlocks. Backend computes progress from existing data. Frontend displays badge grid in me page.

**Tech Stack:** Express 5 / Prisma 7 / Zod / Taro 4 / React 18 / SCSS

**Spec:** `docs/superpowers/specs/2026-05-15-growth-achievement-system-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `backend/prisma/migrations/.../migration.sql` | UserAchievement table |
| `backend/src/services/achievement.service.ts` | Achievement definitions + unlock logic |
| `backend/src/controllers/achievement.controller.ts` | 2 route handlers |
| `backend/src/routes/achievement.routes.ts` | Route registration |
| `backend/src/schemas/achievement.schema.ts` | Response schemas |
| `mini-taro/src/services/achievement.ts` | Frontend API calls |

### Modified Files

| File | Change |
|------|--------|
| `backend/prisma/schema.prisma` | Add UserAchievement model + User relation |
| `backend/src/routes/index.ts` | Mount achievement routes |
| `mini-taro/src/pages/me/index.tsx` | Add achievement section |
| `mini-taro/src/pages/me/index.scss` | Achievement styles |

---

### Task 1: Backend — Prisma Schema

**Files:**
- Modify: `booknest/backend/prisma/schema.prisma`

- [ ] **Step 1: Add UserAchievement model**

Add after the `ReadingGoal` model:

```prisma
model UserAchievement {
  id            String   @id @default(cuid())
  achievementId String   @map("achievement_id")
  unlockedAt    DateTime @default(now()) @map("unlocked_at")

  userId      String @map("user_id")
  user        User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  workspaceId String    @map("workspace_id")
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@unique([userId, workspaceId, achievementId])
  @@index([workspaceId, userId])
  @@map("user_achievements")
}
```

Add to `User` model relations:

```prisma
  achievements        UserAchievement[]
```

Add to `Workspace` model relations:

```prisma
  achievements        UserAchievement[]
```

- [ ] **Step 2: Run migration**

```bash
cd booknest/backend && npx prisma migrate dev --name add_user_achievements
```

- [ ] **Step 3: Commit**

```bash
git add booknest/backend/prisma/
git commit -m "feat(achievement): add UserAchievement model and migration"
```

---

### Task 2: Backend — Achievement Schema

**Files:**
- Create: `booknest/backend/src/schemas/achievement.schema.ts`

- [ ] **Step 1: Create schema file**

```typescript
import { z } from '../lib/zod-extended'

export const achievementProgressSchema = z.object({
  current: z.number(),
  target: z.number(),
})

export const achievementItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  category: z.string(),
  unlocked: z.boolean(),
  unlockedAt: z.string().nullable(),
  progress: achievementProgressSchema,
})

export const achievementsResponseSchema = z.object({
  achievements: z.array(achievementItemSchema),
  stats: z.object({
    unlocked: z.number(),
    total: z.number(),
  }),
})

export const checkResponseSchema = z.object({
  newlyUnlocked: z.array(z.object({
    id: z.string(),
    name: z.string(),
    icon: z.string(),
  })),
})
```

- [ ] **Step 2: Commit**

```bash
git add booknest/backend/src/schemas/achievement.schema.ts
git commit -m "feat(achievement): add Zod response schemas"
```

---

### Task 3: Backend — Achievement Service

**Files:**
- Create: `booknest/backend/src/services/achievement.service.ts`

- [ ] **Step 1: Create service file**

```typescript
import prisma from '../lib/prisma'

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
  // Streak
  { id: 'streak_3', name: '三日成习', description: '连续阅读3天', icon: '🔥', category: 'streak', target: 3,
    getValue: (s) => s.streakDays },
  { id: 'streak_7', name: '坚持一周', description: '连续阅读7天', icon: '🔥', category: 'streak', target: 7,
    getValue: (s) => s.streakDays },
  { id: 'streak_14', name: '两周不辍', description: '连续阅读14天', icon: '🔥', category: 'streak', target: 14,
    getValue: (s) => s.streakDays },
  { id: 'streak_30', name: '月度读者', description: '连续阅读30天', icon: '🔥', category: 'streak', target: 30,
    getValue: (s) => s.streakDays },
  // Finished
  { id: 'finish_1', name: '初读之喜', description: '读完1本书', icon: '📚', category: 'finish', target: 1,
    getValue: (s) => s.finishedBooks },
  { id: 'finish_5', name: '小有所成', description: '读完5本书', icon: '📚', category: 'finish', target: 5,
    getValue: (s) => s.finishedBooks },
  { id: 'finish_10', name: '十卷书生', description: '读完10本书', icon: '📚', category: 'finish', target: 10,
    getValue: (s) => s.finishedBooks },
  { id: 'finish_25', name: '博览群书', description: '读完25本书', icon: '📚', category: 'finish', target: 25,
    getValue: (s) => s.finishedBooks },
  // Hours
  { id: 'hours_10', name: '十小时旅人', description: '累计阅读10小时', icon: '⏰', category: 'hours', target: 600,
    getValue: (s) => s.totalMinutes },
  { id: 'hours_50', name: '五十小时探险', description: '累计阅读50小时', icon: '⏰', category: 'hours', target: 3000,
    getValue: (s) => s.totalMinutes },
  { id: 'hours_100', name: '百小时书虫', description: '累计阅读100小时', icon: '⏰', category: 'hours', target: 6000,
    getValue: (s) => s.totalMinutes },
  // Reviews
  { id: 'review_3', name: '初涉书评', description: '写3篇书评', icon: '✍️', category: 'review', target: 3,
    getValue: (s) => s.reviewCount },
  { id: 'review_10', name: '评书达人', description: '写10篇书评', icon: '✍️', category: 'review', target: 10,
    getValue: (s) => s.reviewCount },
  // Goals
  { id: 'goal_7', name: '七日达标', description: '每日目标达成7次', icon: '🎯', category: 'goal', target: 7,
    getValue: (s) => s.goalMetCount },
  { id: 'goal_30', name: '月度全勤', description: '每日目标达成30次', icon: '🎯', category: 'goal', target: 30,
    getValue: (s) => s.goalMetCount },
  // Collection
  { id: 'collect_20', name: '小小书架', description: '书架收藏20本书', icon: '📖', category: 'collection', target: 20,
    getValue: (s) => s.bookCount },
  { id: 'collect_50', name: '满架书香', description: '书架收藏50本书', icon: '📖', category: 'collection', target: 50,
    getValue: (s) => s.bookCount },
]

async function getUserStats(userId: string, workspaceId: string): Promise<UserStats> {
  // Streak days from latest daily summary
  const latestSummary = await prisma.dailyReadingSummary.findFirst({
    where: { userId, workspaceId },
    orderBy: { date: 'desc' },
    select: { streakDays: true },
  })
  const streakDays = latestSummary?.streakDays || 0

  // Finished books count
  const finishedBooks = await prisma.book.count({
    where: { userId, workspaceId, status: 'FINISHED' },
  })

  // Total reading minutes across all books
  const totalResult = await prisma.book.aggregate({
    where: { userId, workspaceId },
    _sum: { totalReadingMinutes: true },
  })
  const totalMinutes = totalResult._sum.totalReadingMinutes || 0

  // Review count
  const reviewCount = await prisma.review.count({
    where: { userId },
  })

  // Goal met count
  const goalMetCount = await prisma.dailyReadingSummary.count({
    where: { userId, workspaceId, goalMet: true },
  })

  // Total book count
  const bookCount = await prisma.book.count({
    where: { userId, workspaceId },
  })

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
      }
    }

    return { newlyUnlocked }
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add booknest/backend/src/services/achievement.service.ts
git commit -m "feat(achievement): add service with 18 badge definitions and auto-unlock"
```

---

### Task 4: Backend — Controller + Routes + Mount

**Files:**
- Create: `booknest/backend/src/controllers/achievement.controller.ts`
- Create: `booknest/backend/src/routes/achievement.routes.ts`
- Modify: `booknest/backend/src/routes/index.ts`

- [ ] **Step 1: Create controller**

```typescript
import { Request, Response, NextFunction } from 'express'
import { achievementService } from '../services/achievement.service'
import { ResponseUtil } from '../utils/response'

export const achievementController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await achievementService.getAll(req.user!.id, req.workspace!.id)
      ResponseUtil.success(res, data)
    } catch (err) {
      next(err)
    }
  },

  async checkAndUnlock(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await achievementService.checkAndUnlock(req.user!.id, req.workspace!.id)
      ResponseUtil.success(res, data)
    } catch (err) {
      next(err)
    }
  },
}
```

- [ ] **Step 2: Create routes**

```typescript
import { Router } from 'express'
import { achievementController } from '../controllers/achievement.controller'
import { authenticate } from '../middleware/auth'
import { resolveWorkspace } from '../middleware/workspace'

const router = Router()

router.use(authenticate, resolveWorkspace)

router.get('/', achievementController.getAll)
router.post('/check', achievementController.checkAndUnlock)

export default router
```

- [ ] **Step 3: Mount in index.ts**

Add to `booknest/backend/src/routes/index.ts`:

Import after readingRoutes:
```typescript
import achievementRoutes from './achievement.routes'
```

Mount after reading:
```typescript
router.use('/achievements', achievementRoutes)
```

- [ ] **Step 4: Verify backend compiles**

```bash
cd booknest/backend && npx tsc --noEmit 2>&1 | grep -v payment.service
```

- [ ] **Step 5: Commit**

```bash
git add booknest/backend/src/controllers/achievement.controller.ts \
  booknest/backend/src/routes/achievement.routes.ts \
  booknest/backend/src/routes/index.ts
git commit -m "feat(achievement): add controller, routes, mount at /achievements"
```

---

### Task 5: Frontend — Achievement Service

**Files:**
- Create: `booknest/apps/mini-taro/src/services/achievement.ts`

- [ ] **Step 1: Create service file**

```typescript
import { request } from './request'

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: string
  unlocked: boolean
  unlockedAt: string | null
  progress: { current: number; target: number }
}

export interface AchievementsData {
  achievements: Achievement[]
  stats: { unlocked: number; total: number }
}

export function getAchievements() {
  return request<AchievementsData>({
    url: '/api/v1/achievements',
    method: 'GET',
  })
}

export function checkAchievements() {
  return request<{ newlyUnlocked: { id: string; name: string; icon: string }[] }>({
    url: '/api/v1/achievements/check',
    method: 'POST',
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add booknest/apps/mini-taro/src/services/achievement.ts
git commit -m "feat(achievement): add frontend API service"
```

---

### Task 6: Frontend — "我的" Page Integration

**Files:**
- Modify: `booknest/apps/mini-taro/src/pages/me/index.tsx`
- Modify: `booknest/apps/mini-taro/src/pages/me/index.scss`

- [ ] **Step 1: Update me page**

Read current file first. Changes:

1. Add imports:
```typescript
import { getAchievements, checkAchievements, type Achievement } from '@/services/achievement'
import { getReadingSummary } from '@/services/reading'
import { useShareAppMessage } from '@tarojs/taro'
```

2. Add state after existing state vars:
```typescript
const [achievements, setAchievements] = useState<Achievement[]>([])
const [achievementStats, setAchievementStats] = useState({ unlocked: 0, total: 0 })
const [streakDays, setStreakDays] = useState(0)
```

3. Add fetch in existing useEffect (after the import block):
```typescript
// Fetch achievements
if (activeWorkspaceId) {
  getAchievements().then((res) => {
    setAchievements(res.achievements)
    setAchievementStats(res.stats)
  }).catch(() => {})
  getReadingSummary().then((res) => setStreakDays(res.streakDays)).catch(() => {})
}
```

4. Add share handler (after handleLogout):
```typescript
useShareAppMessage((res) => {
  if (res.from === 'button' && res.target?.dataset?.achievement) {
    const a = JSON.parse(res.target.dataset.achievement)
    return {
      title: `我在BookNest解锁了「${a.name}」成就！`,
      path: '/pages/index/index',
    }
  }
  return {
    title: 'BookNest — 我的阅读空间',
    path: '/pages/index/index',
  }
})
```

5. Fix hardcoded streak days in JSX — change `<Text className="me__stat-num">0</Text>` for 连续天数 to `{streakDays}`.

6. Add achievement section JSX after `me__stats` and before `me__menu`:
```tsx
<View className="me__achievements">
  <View className="me__achievements-header">
    <Text className="me__achievements-title">成就徽章</Text>
    <Text className="me__achievements-count">{achievementStats.unlocked}/{achievementStats.total}</Text>
  </View>
  <View className="me__achievements-progress">
    <View
      className="me__achievements-progress-fill"
      style={{ width: `${achievementStats.total > 0 ? (achievementStats.unlocked / achievementStats.total) * 100 : 0}%` }}
    />
  </View>
  <View className="me__badges">
    {achievements.map((a) => (
      <View
        key={a.id}
        className={`me__badge ${a.unlocked ? 'me__badge--unlocked' : 'me__badge--locked'}`}
      >
        {a.unlocked ? (
          <View
            className="me__badge-icon"
            openType="share"
            data-achievement={JSON.stringify({ id: a.id, name: a.name })}
          >
            <Text className="me__badge-emoji">{a.icon}</Text>
          </View>
        ) : (
          <View className="me__badge-icon">
            <Text className="me__badge-emoji me__badge-emoji--locked">{a.icon}</Text>
          </View>
        )}
        <Text className="me__badge-name">{a.name}</Text>
      </View>
    ))}
  </View>
</View>
```

- [ ] **Step 2: Update me page styles**

Add to `booknest/apps/mini-taro/src/pages/me/index.scss`:

```scss
.me__achievements {
  margin: $spacing-md $spacing-lg;
  background: $color-bg-card;
  border-radius: 24rpx;
  padding: $spacing-md;
}

.me__achievements-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-sm;
}

.me__achievements-title {
  font-size: $font-size-lg;
  font-weight: 500;
  color: $color-text-primary;
}

.me__achievements-count {
  font-size: $font-size-sm;
  color: $color-text-muted;
}

.me__achievements-progress {
  height: 8rpx;
  background: $color-bg-tertiary;
  border-radius: 4rpx;
  margin-bottom: $spacing-md;
  overflow: hidden;
}

.me__achievements-progress-fill {
  height: 100%;
  background: $color-primary;
  border-radius: 4rpx;
  transition: width 0.3s ease;
}

.me__badges {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-sm;
}

.me__badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: calc(16.66% - 14rpx);

  &--locked {
    opacity: 0.35;
  }
}

.me__badge-icon {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: $color-bg-secondary;
}

.me__badge-emoji {
  font-size: 36rpx;

  &--locked {
    filter: grayscale(1);
  }
}

.me__badge-name {
  font-size: 18rpx;
  color: $color-text-secondary;
  margin-top: 6rpx;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
```

- [ ] **Step 3: Commit**

```bash
git add booknest/apps/mini-taro/src/pages/me/
git commit -m "feat(achievement): add badge grid and share to me page"
```

---

### Task 7: Final Verification

- [ ] **Step 1: Run Prisma migration**

```bash
cd booknest/backend && npx prisma migrate dev --name add_user_achievements
```

- [ ] **Step 2: Verify backend**

```bash
cd booknest/backend && npx tsc --noEmit 2>&1 | grep -v payment.service
```

- [ ] **Step 3: Build frontend**

```bash
cd booknest/apps/mini-taro && pnpm build:weapp 2>&1 | tail -10
```

- [ ] **Step 4: Test API**

```bash
# Get token and workspace id first, then:
curl -s http://localhost:4000/api/v1/achievements \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Workspace-Id: $WS" | python3 -m json.tool

curl -s -X POST http://localhost:4000/api/v1/achievements/check \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Workspace-Id: $WS" | python3 -m json.tool
```

- [ ] **Step 5: Commit remaining changes**

```bash
git add -A
git commit -m "feat: Phase 3 growth/achievement system — 18 badges, auto-unlock, WeChat share"
```
