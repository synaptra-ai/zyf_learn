# Day 7: BookNest 可观测性 & 性能优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 BookNest 搭建完整可观测性管道（Winston + Morgan 日志、错误追踪、健康检查），然后实施前端性能优化（代码分割、虚拟滚动、bundle 分析），最终通过 Lighthouse 审计验证。

**Architecture:** 方案 B — 可观测性先行再优化。后端先建立日志基础设施，再增强错误追踪和健康检查；前端基于基线数据做代码分割和虚拟滚动；最后 Lighthouse 审计对比验收。

**Tech Stack:** Winston 3, Morgan, winston-daily-rotate-file, react-window, rollup-plugin-visualizer, React.lazy + Suspense

---

## File Structure

### Backend — 新建文件
- `src/utils/logger.ts` — Winston logger 实例（统一出口）
- `src/utils/morgan-stream.ts` — Morgan → Winston 的 stream 桥接

### Backend — 修改文件
- `src/server.ts` — 插入 Morgan 中间件、增强 /health、新增 /health/detailed
- `src/index.ts` — 替换 console.log/error 为 logger、注册进程级异常处理
- `src/middleware/errorHandler.ts` — 替换 console.error 为 logger.error，增加结构化错误分类
- `src/lib/redis.ts` — 替换 console 为 logger

### Backend — 测试文件
- `tests/integration/health.test.ts` — 健康检查端点集成测试

### Frontend — 新建文件
- `src/components/ui/PageSkeleton.tsx` — 路由级 Suspense fallback 骨架屏

### Frontend — 修改文件
- `src/App.tsx` — 直接 import → React.lazy，包裹 Suspense
- `src/components/book/BookTable.tsx` — 集成 react-window FixedSizeList
- `src/components/book/BookList.tsx` — 表格视图 pageSize 从 12 调整为 50
- `vite.config.ts` — 添加 rollup-plugin-visualizer

---

## Task 1: 安装后端依赖

**Files:**
- Modify: `booknest/backend/package.json`

- [ ] **Step 1: 安装 Winston 及相关依赖**

```bash
cd /home/z/zyf_learn/booknest/backend
npm install winston winston-daily-rotate-file morgan
npm install -D @types/morgan
```

- [ ] **Step 2: 验证安装成功**

```bash
cd /home/z/zyf_learn/booknest/backend
node -e "require('winston'); require('morgan'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
cd /home/z/zyf_learn/booknest/backend
git add package.json package-lock.json
git commit -m "chore: 安装 winston, winston-daily-rotate-file, morgan 依赖"
```

---

## Task 2: 创建 Winston Logger 实例

**Files:**
- Create: `booknest/backend/src/utils/logger.ts`

- [ ] **Step 1: 创建 logger.ts**

```typescript
import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'

const isDev = process.env.NODE_ENV !== 'production'

const transports: winston.transport[] = [new winston.transports.Console()]

if (!isDev) {
  transports.push(
    new DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      format: winston.format.undef(),
    }),
  )
}

export const logger = winston.createLogger({
  level: isDev ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    isDev
      ? winston.format.combine(winston.format.colorize(), winston.format.simple())
      : winston.format.json(),
  ),
  defaultMeta: { service: 'booknest-api' },
  transports,
})
```

- [ ] **Step 2: 验证 logger 可以正常导入**

```bash
cd /home/z/zyf_learn/booknest/backend
npx ts-node -e "import { logger } from './src/utils/logger'; logger.info('test'); logger.error(new Error('test err'))" --transpile-only
```

Expected: 输出 info 和 error 两行日志

- [ ] **Step 3: Commit**

```bash
cd /home/z/zyf_learn/booknest/backend
git add src/utils/logger.ts
git commit -m "feat: 创建 Winston logger 实例，支持开发/生产环境切换"
```

---

## Task 3: 创建 Morgan Stream 桥接

**Files:**
- Create: `booknest/backend/src/utils/morgan-stream.ts`

- [ ] **Step 1: 创建 morgan-stream.ts**

```typescript
import { logger } from './logger'
import type { StreamOptions } from 'morgan'

export const morganStream: StreamOptions = {
  write: (message: string) => {
    logger.http(message.trim())
  },
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/z/zyf_learn/booknest/backend
git add src/utils/morgan-stream.ts
git commit -m "feat: 创建 Morgan → Winston stream 桥接"
```

---

## Task 4: 集成 Morgan 到 server.ts + 改造现有 console 调用

**Files:**
- Modify: `booknest/backend/src/server.ts`
- Modify: `booknest/backend/src/index.ts`
- Modify: `booknest/backend/src/lib/redis.ts`

- [ ] **Step 1: 改造 server.ts — 添加 Morgan + 替换健康检查**

将 `server.ts` 全部内容替换为：

```typescript
import express from 'express'
import path from 'path'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import morgan from 'morgan'
import { errorHandler } from './middleware/errorHandler'
import routes from './routes'
import { logger } from './utils/logger'
import { morganStream } from './utils/morgan-stream'

const app = express()

app.use(helmet())
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : '*'
app.use(cors({ origin: corsOrigins }))

app.use(morgan(':method :url :status :res[content-length] - :response-time ms', { stream: morganStream }))

app.use(express.json())
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { code: 429, message: '请求过于频繁，请稍后再试' } }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

app.use('/api/v1', routes)

app.use(errorHandler)

export default app
```

- [ ] **Step 2: 改造 index.ts — 替换 console + 注册全局异常处理**

将 `index.ts` 全部内容替换为：

```typescript
import dotenv from 'dotenv'
dotenv.config()

import './lib/redis'
import app from './server'
import { createServer } from 'http'
import { initSocket } from './lib/socket'
import { logger } from './utils/logger'

const PORT = process.env.PORT || 4000

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', err)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', { reason })
  process.exit(1)
})

const server = createServer(app)
initSocket(server)

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`)
})
```

- [ ] **Step 3: 改造 redis.ts — 替换 console**

将 `redis.ts` 全部内容替换为：

```typescript
import Redis from 'ioredis'
import { logger } from '../utils/logger'

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 2000)
    return delay
  },
})

redis.on('error', (err) => {
  logger.error('Redis connection error', { error: err.message })
})

redis.on('connect', () => {
  logger.info('Redis connected')
})

export default redis
```

- [ ] **Step 4: 验证服务器可以启动**

```bash
cd /home/z/zyf_learn/booknest/backend
npm run dev &
sleep 3
curl -s http://localhost:4000/health
kill %1
```

Expected: `{"status":"ok","timestamp":"..."}`

- [ ] **Step 5: Commit**

```bash
cd /home/z/zyf_learn/booknest/backend
git add src/server.ts src/index.ts src/lib/redis.ts
git commit -m "feat: 集成 Morgan 请求日志，替换所有 console 为 Winston logger"
```

---

## Task 5: 增强错误追踪 — 结构化错误分类

**Files:**
- Modify: `booknest/backend/src/middleware/errorHandler.ts`

- [ ] **Step 1: 改造 errorHandler.ts**

将 `errorHandler.ts` 全部内容替换为：

```typescript
import { Request, Response, NextFunction } from 'express'
import { ApiError } from '../utils/errors'
import { logger } from '../utils/logger'

type ErrorType = 'validation' | 'auth' | 'database' | 'internal'

function classifyError(err: Error): ErrorType {
  if (err instanceof ApiError) {
    if (err.statusCode === 400) return 'validation'
    if (err.statusCode === 401 || err.statusCode === 403) return 'auth'
    return 'validation'
  }
  if (err.message?.includes('Unique constraint')) return 'database'
  return 'internal'
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const type = classifyError(err)

  logger.error(err.message, {
    type,
    method: req.method,
    path: req.path,
    ...(err instanceof ApiError && { statusCode: err.statusCode }),
    ...(err.stack && { stack: err.stack }),
  })

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      code: err.statusCode,
      message: err.message,
      ...(err.details && { details: err.details }),
    })
  }

  if (err.message?.includes('Unique constraint')) {
    return res.status(409).json({ code: 409, message: '资源已存在' })
  }

  return res.status(500).json({ code: 500, message: '服务器内部错误' })
}
```

- [ ] **Step 2: 运行现有测试确认无回归**

```bash
cd /home/z/zyf_learn/booknest/backend
npm test
```

Expected: 所有现有测试通过

- [ ] **Step 3: Commit**

```bash
cd /home/z/zyf_learn/booknest/backend
git add src/middleware/errorHandler.ts
git commit -m "feat: errorHandler 集成 Winston 结构化日志 + 错误分类"
```

---

## Task 6: 深度健康检查端点

**Files:**
- Modify: `booknest/backend/src/server.ts`
- Create: `booknest/backend/tests/integration/health.test.ts`

- [ ] **Step 1: 修改 server.ts — 添加 /health/detailed 路由**

在 `server.ts` 中，将现有的 `/health` 端点替换为两个端点。找到：

```typescript
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})
```

替换为：

```typescript
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/health/detailed', async (_req, res) => {
  const checks: Record<string, { status: string; responseTime?: string; error?: string }> = {}

  try {
    const start = Date.now()
    const { PrismaClient } = await import('./generated/prisma/client')
    const { PrismaPg } = await import('@prisma/adapter-pg')
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
    const prisma = new PrismaClient({ adapter })
    await prisma.$queryRaw`SELECT 1`
    await prisma.$disconnect()
    checks.database = { status: 'ok', responseTime: `${Date.now() - start}ms` }
  } catch (err: any) {
    checks.database = { status: 'error', error: err.message }
  }

  try {
    const start = Date.now()
    const { default: redis } = await import('./lib/redis')
    await redis.ping()
    checks.redis = { status: 'ok', responseTime: `${Date.now() - start}ms` }
  } catch (err: any) {
    checks.redis = { status: 'error', error: err.message }
  }

  const allOk = Object.values(checks).every((c) => c.status === 'ok')

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    checks,
  })
})
```

- [ ] **Step 2: 编写健康检查集成测试**

创建 `tests/integration/health.test.ts`：

```typescript
import request from 'supertest'
import app from '../../src/server'
import prisma from '../../src/lib/prisma'

describe('Health Check API', () => {
  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('GET /health — returns ok', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body.timestamp).toBeDefined()
  })

  test('GET /health/detailed — returns checks', async () => {
    const res = await request(app).get('/health/detailed')
    expect([200, 503]).toContain(res.status)
    expect(res.body).toHaveProperty('checks')
    expect(res.body.checks).toHaveProperty('database')
    expect(res.body.checks).toHaveProperty('redis')
    expect(res.body).toHaveProperty('uptime')
    expect(res.body).toHaveProperty('version')
  })
})
```

- [ ] **Step 3: 运行健康检查测试**

```bash
cd /home/z/zyf_learn/booknest/backend
npx jest tests/integration/health.test.ts -v
```

Expected: 2 tests passed

- [ ] **Step 4: 运行全部测试确认无回归**

```bash
cd /home/z/zyf_learn/booknest/backend
npm test
```

Expected: 所有测试通过

- [ ] **Step 5: Commit**

```bash
cd /home/z/zyf_learn/booknest/backend
git add src/server.ts tests/integration/health.test.ts
git commit -m "feat: 添加 /health/detailed 深度健康检查 + 集成测试"
```

---

## Task 7: 前端 — 路由级代码分割（React.lazy）

**Files:**
- Create: `booknest/frontend/src/components/ui/PageSkeleton.tsx`
- Modify: `booknest/frontend/src/App.tsx`

- [ ] **Step 1: 创建 PageSkeleton 组件**

创建 `src/components/ui/PageSkeleton.tsx`：

```typescript
export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      <div className="h-8 w-48 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="flex gap-4">
        <div className="h-10 flex-1 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-10 w-32 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
            <div className="flex gap-4">
              <div className="h-20 w-14 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 改造 App.tsx — React.lazy + Suspense**

将 `App.tsx` 全部内容替换为：

```typescript
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import { PageSkeleton } from '@/components/ui/PageSkeleton'

const BookList = lazy(() => import('@/pages/BookList'))
const BookCreate = lazy(() => import('@/pages/BookCreate'))
const BookDetail = lazy(() => import('@/pages/BookDetail'))
const BookEdit = lazy(() => import('@/pages/BookEdit'))
const CategoryManager = lazy(() => import('@/pages/CategoryManager'))
const Stats = lazy(() => import('@/pages/Stats'))
const Login = lazy(() => import('@/pages/Login'))
const Register = lazy(() => import('@/pages/Register'))

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<BookList />} />
              <Route path="books/new" element={<BookCreate />} />
              <Route path="books/:id" element={<BookDetail />} />
              <Route path="books/:id/edit" element={<BookEdit />} />
              <Route path="categories" element={<CategoryManager />} />
              <Route path="stats" element={<Stats />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
```

- [ ] **Step 3: 验证前端可以正常构建**

```bash
cd /home/z/zyf_learn/booknest/frontend
npm run build
```

Expected: 构建成功，输出中可以看到多个 chunk 文件（非单个 bundle）

- [ ] **Step 4: Commit**

```bash
cd /home/z/zyf_learn/booknest/frontend
git add src/components/ui/PageSkeleton.tsx src/App.tsx
git commit -m "feat: React.lazy 路由级代码分割 + PageSkeleton 加载态"
```

---

## Task 8: 前端 — 安装 react-window + Bundle 分析插件

**Files:**
- Modify: `booknest/frontend/package.json`
- Modify: `booknest/frontend/vite.config.ts`

- [ ] **Step 1: 安装依赖**

```bash
cd /home/z/zyf_learn/booknest/frontend
npm install react-window
npm install -D @types/react-window rollup-plugin-visualizer
```

- [ ] **Step 2: 修改 vite.config.ts — 添加 visualizer 插件**

将 `vite.config.ts` 替换为：

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    visualizer({ open: false, emitFile: true, filename: 'stats.html' }),
  ],
  server: {
    host: '0.0.0.0',
    port: 4001,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 3: 构建并验证 bundle 分析文件生成**

```bash
cd /home/z/zyf_learn/booknest/frontend
npm run build
ls -la dist/stats.html
```

Expected: `stats.html` 文件存在

- [ ] **Step 4: Commit**

```bash
cd /home/z/zyf_learn/booknest/frontend
git add package.json package-lock.json vite.config.ts
git commit -m "feat: 安装 react-window + rollup-plugin-visualizer bundle 分析"
```

---

## Task 9: 前端 — BookTable 虚拟滚动

**Files:**
- Modify: `booknest/frontend/src/components/book/BookTable.tsx`
- Modify: `booknest/frontend/src/components/book/BookList.tsx`

- [ ] **Step 1: 改造 BookTable.tsx — 集成 react-window**

将 `BookTable.tsx` 全部内容替换为：

```typescript
import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FixedSizeList as List } from 'react-window'
import { Badge } from '@/components/ui/Badge'
import type { Book, Category } from '@/types'

const statusLabel: Record<Book['status'], 'owned' | 'reading' | 'finished' | 'wishlist'> = {
  OWNED: 'owned',
  READING: 'reading',
  FINISHED: 'finished',
  WISHLIST: 'wishlist',
}

const statusText: Record<Book['status'], string> = {
  OWNED: '已拥有',
  READING: '在读',
  FINISHED: '已读完',
  WISHLIST: '想读',
}

interface BookTableProps {
  books: Book[]
  getCategory: (id?: string) => Category | undefined
}

const ROW_HEIGHT = 52

export function BookTable({ books, getCategory }: BookTableProps) {
  const navigate = useNavigate()
  const listRef = useRef<List>(null)

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const book = books[index]
    const category = getCategory(book.categoryId)
    return (
      <div
        style={style}
        onClick={() => navigate(`/books/${book.id}`)}
        className="flex cursor-pointer items-center border-b border-gray-100 dark:border-gray-700 px-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        <span className="w-[30%] truncate font-medium text-gray-900 dark:text-gray-100">{book.title}</span>
        <span className="w-[20%] truncate text-gray-500 dark:text-gray-400">{book.author}</span>
        <span className="w-[15%]">
          <Badge variant={statusLabel[book.status]}>{statusText[book.status]}</Badge>
        </span>
        <span className="w-[20%]">
          {category ? (
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: category.color + '20', color: category.color }}
            >
              {category.name}
            </span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500">-</span>
          )}
        </span>
        <span className="w-[15%] text-gray-500 dark:text-gray-400">
          {new Date(book.createdAt).toLocaleDateString()}
        </span>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      {/* 表头 */}
      <div className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3">
        <span className="w-[30%] text-sm font-medium text-gray-500 dark:text-gray-400">书名</span>
        <span className="w-[20%] text-sm font-medium text-gray-500 dark:text-gray-400">作者</span>
        <span className="w-[15%] text-sm font-medium text-gray-500 dark:text-gray-400">状态</span>
        <span className="w-[20%] text-sm font-medium text-gray-500 dark:text-gray-400">分类</span>
        <span className="w-[15%] text-sm font-medium text-gray-500 dark:text-gray-400">添加时间</span>
      </div>
      {/* 虚拟滚动列表 */}
      <List
        ref={listRef}
        height={Math.min(books.length * ROW_HEIGHT, 520)}
        itemCount={books.length}
        itemSize={ROW_HEIGHT}
        width="100%"
      >
        {Row}
      </List>
    </div>
  )
}
```

- [ ] **Step 2: 修改 BookList.tsx — 表格视图 pageSize 改为 50**

在 `BookList.tsx` 中，找到：

```typescript
  const pageSize = 12
```

在它下方添加一行用于表格模式的 pageSize：

```typescript
  const pageSize = 12
  const tablePageSize = 50
```

然后将 `useBooks` 调用修改为根据 viewMode 使用不同的 pageSize。找到：

```typescript
  const { data, isLoading, isError, error, refetch } = useBooks({
    page,
    pageSize,
    ...(statusFilter !== 'ALL' && { status: statusFilter }),
    ...(categoryFilter !== 'ALL' && { categoryId: categoryFilter }),
  })
```

替换为：

```typescript
  const { data, isLoading, isError, error, refetch } = useBooks({
    page,
    pageSize: viewMode === 'table' ? tablePageSize : pageSize,
    ...(statusFilter !== 'ALL' && { status: statusFilter }),
    ...(categoryFilter !== 'ALL' && { categoryId: categoryFilter }),
  })
```

- [ ] **Step 3: 验证前端构建成功**

```bash
cd /home/z/zyf_learn/booknest/frontend
npm run build
```

Expected: 构建成功，无 TypeScript 错误

- [ ] **Step 4: Commit**

```bash
cd /home/z/zyf_learn/booknest/frontend
git add src/components/book/BookTable.tsx src/components/book/BookList.tsx
git commit -m "feat: BookTable 集成 react-window 虚拟滚动，表格视图 pageSize 50"
```

---

## Task 10: Lighthouse 审计 & 最终验证

**Files:** 无代码变更

- [ ] **Step 1: 构建生产版本**

```bash
cd /home/z/zyf_learn/booknest/frontend
npm run build
```

- [ ] **Step 2: 启动生产预览服务器**

```bash
cd /home/z/zyf_learn/booknest/frontend
npx vite preview --port 4001 &
```

- [ ] **Step 3: 运行 Lighthouse 审计**

```bash
npx lighthouse http://localhost:4001 --output=json --output-path=./lighthouse-report.json --chrome-flags="--headless" 2>/dev/null
```

或者使用 Chrome DevTools 手动打开 `http://localhost:4001` 运行 Lighthouse。

- [ ] **Step 4: 查看 bundle 分析**

打开 `booknest/frontend/dist/stats.html` 确认：
- 首屏 chunk 体积合理
- 每个页面路由有独立 chunk
- 无意外的大依赖

- [ ] **Step 5: 停止预览服务器**

```bash
kill %1
```

- [ ] **Step 6: 验收清单确认**

逐项检查：

| 指标 | 确认 |
|---|---|
| Winston 日志 JSON 格式（生产） | 运行 `NODE_ENV=production npm run dev` 查看日志输出 |
| Morgan 请求日志记录到 Winston | 请求任意 API 查看日志包含 method/url/status/responseTime |
| 错误分类日志 | 触发 400/401/409/500 错误查看日志 type 字段 |
| `/health` 返回 ok | `curl localhost:4000/health` |
| `/health/detailed` 含 database + redis | `curl localhost:4000/health/detailed` |
| 路由级代码分割 | `npm run build` 输出多个 chunk |
| BookTable 虚拟滚动 | 切换到表格视图，滚动行为正常 |
| Bundle stats.html 存在 | `ls dist/stats.html` |

---

## Task 11: 最终提交 & 清理

- [ ] **Step 1: 运行全部后端测试**

```bash
cd /home/z/zyf_learn/booknest/backend
npm test
```

Expected: 所有测试通过

- [ ] **Step 2: 运行前端构建确认无错误**

```bash
cd /home/z/zyf_learn/booknest/frontend
npm run build
```

Expected: 构建成功

- [ ] **Step 3: 最终提交（如有遗漏的变更）**

```bash
git status
git add -A
git commit -m "feat: Day 7 可观测性与性能优化完成 — Winston 日志 + Morgan + 错误追踪 + 健康检查 + React.lazy + 虚拟滚动 + Bundle 分析"
```
