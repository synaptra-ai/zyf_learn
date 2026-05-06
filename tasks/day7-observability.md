# Day 7: BookNest 可观测性 & 性能优化 — 日志 + 监控 + 调优

## 项目简介

今天是 BookNest 进阶阶段的第四天，也是最后一阶段。应用已经上线，功能也丰富了，但你还需要回答两个关键问题："线上到底发生了什么？" 和 "为什么页面加载这么慢？"。今天你将搭建日志系统、配置监控告警、优化前后端性能，让应用从"能跑"变成"能扛"。

**今天的目标**: 拥有结构化日志、错误追踪、性能指标监控，前端 Lighthouse 评分 90+。

---

## 学习目标

完成今天的工作后，你将掌握：

1. **Winston** 结构化日志 — 分级日志、日志轮转、JSON 格式
2. **Morgan** HTTP 请求日志 — 请求耗时、状态码、响应大小
3. **错误追踪** — 全局错误捕获、错误分类、告警通知
4. **React 性能优化** — 懒加载、memo、虚拟列表、bundle 分析
5. **API 性能优化** — 数据库查询优化、N+1 问题、批量操作
6. **Lighthouse** 审计 — Core Web Vitals、可访问性、SEO
7. **健康检查** — 应用 + 依赖服务的深度健康检查

---

## 技术栈

| 技术 | 用途 |
|------|------|
| Winston 3 | 结构化日志框架 |
| Morgan | HTTP 请求日志中间件 |
| winston-daily-rotate-file | 日志文件轮转 |
| React.lazy + Suspense | 前端路由懒加载 |
| react-window | 虚拟滚动列表 |
| rollup-plugin-visualizer | Bundle 分析 |
| Lighthouse | 性能审计 |

---

## 前置条件

确保以下内容已就绪：

- [ ] Day 5 的 Redis 缓存、文件上传、WebSocket 功能正常
- [ ] 应用可通过 `https://booknest.yourdomain.com` 访问
- [ ] GitHub Actions CI/CD 正常工作

---

## 功能清单

### Must-Have (必做)

| # | 功能 | 说明 |
|---|------|------|
| 1 | 结构化日志 | Winston + JSON 格式 + 日志分级 |
| 2 | 请求日志 | Morgan 记录每个 HTTP 请求的耗时和状态 |
| 3 | 日志轮转 | 按天分割、保留 14 天、单文件不超过 20MB |
| 4 | 错误追踪 | 全局错误捕获 + 分类 + 错误日志 |
| 5 | 深度健康检查 | 检查 PostgreSQL、Redis、OSS 连接状态 |
| 6 | 前端懒加载 | React.lazy 路由级代码分割 |
| 7 | Bundle 分析 | 可视化分析打包体积 |
| 8 | Lighthouse 优化 | Performance 评分 90+ |

### Nice-to-Have (加量)

| # | 功能 | 说明 |
|---|------|------|
| 9 | 前端错误边界 | ErrorBoundary 组件捕获渲染错误 |
| 10 | 虚拟列表 | 大量书籍时用 react-window 虚拟滚动 |
| 11 | 数据库查询优化 | 解决 N+1 问题、添加索引 |
| 12 | 邮件告警 | 错误超阈值发邮件通知 |

---

## 分步实施指南

### Step 1: Winston 结构化日志 (1 小时)

**目标**: 替换 console.log，建立分级结构化日志系统

1. **安装依赖**：
   ```bash
   cd backend
   npm install winston winston-daily-rotate-file morgan
   npm install -D @types/morgan
   ```

2. **`src/lib/logger.ts`** — 日志工具：
   ```typescript
   import winston from 'winston'
   DailyRotateFile from 'winston-daily-rotate-file'

   const { combine, timestamp, printf, colorize, json } = winston.format

   // 自定义控制台格式
   const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
     const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : ''
     return `${timestamp} [${level}]: ${message} ${metaStr}`
   })

   // 日志轮转配置
   const fileRotateTransport = new DailyRotateFile({
     filename: 'logs/application-%DATE%.log',
     datePattern: 'YYYY-MM-DD',
     maxSize: '20m',
     maxFiles: '14d',
     format: combine(timestamp(), json()),
   })

   const errorRotateTransport = new DailyRotateFile({
     filename: 'logs/error-%DATE%.log',
     datePattern: 'YYYY-MM-DD',
     maxSize: '20m',
     maxFiles: '30d',
     level: 'error',
     format: combine(timestamp(), json()),
   })

   const logger = winston.createLogger({
     level: process.env.LOG_LEVEL || 'info',
     format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })),
     defaultMeta: { service: 'booknest-api' },
     transports: [
       // 控制台 (开发环境用彩色格式)
       new winston.transports.Console({
         format: combine(colorize(), consoleFormat),
       }),
       // 文件 (所有日志)
       fileRotateTransport,
       // 文件 (仅错误)
       errorRotateTransport,
     ],
   })

   export default logger
   ```

3. **`src/lib/requestLogger.ts`** — HTTP 请求日志:
   ```typescript
   import morgan from 'morgan'
   import logger from './logger'

   // 自定义 Morgan 格式: 方法 路径 状态码 响应时间 字节数
   const stream = {
     write: (message: string) => {
       const { method, url, status, responseTime } = parseMorgan(message)
       logger.info('HTTP Request', {
         method,
         url,
         status,
         responseTime: `${responseTime}ms`,
       })
     },
   }

   morgan.token('response-time-ms', (req, res) => {
     const ms = (Date.now() - (req as any)._startTime) / 1000
     return ms.toFixed(3)
   })

   export const requestLogger = morgan(
     ':method :url :status :response-time-ms ms :res[content-length]',
     { stream }
   )
   ```

4. **集成到 Express** — `src/server.ts`:
   ```typescript
   import logger from './lib/logger'
   import { requestLogger } from './lib/requestLogger'

   // 在所有中间件之前添加请求日志
   app.use(requestLogger)

   // 替换所有 console.log 为 logger
   // 之前: console.log(`Server running on port ${PORT}`)
   // 之后: logger.info(`Server running on port ${PORT}`)
   ```

5. **在各 Service 中使用日志**:
   ```typescript
   import logger from '@/lib/logger'

   // 信息日志
   logger.info('Book created', { bookId: book.id, userId })

   // 警告日志
   logger.warn('Cache miss for stats', { userId })

   // 错误日志
   logger.error('Failed to upload cover', { error: err.message, bookId })

   // 调试日志 (开发环境)
   logger.debug('Query params', { params })
   ```

**正反馈时刻**: 发起几个 API 请求后，查看 `logs/application-2026-05-06.log`，看到结构化的 JSON 日志。

---

### Step 2: 错误追踪 (45 分钟)

**目标**: 所有错误统一捕获、分类、记录

1. **增强错误中间件** — `src/middleware/errorHandler.ts`:
   ```typescript
   import { Request, Response, NextFunction } from 'express'
   import logger from '@/lib/logger'
   import { ApiError } from '@/utils/errors'

   export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
     // 已知的业务错误
     if (err instanceof ApiError) {
       logger.warn('Business error', {
         statusCode: err.statusCode,
         message: err.message,
         path: req.path,
         method: req.method,
         userId: (req as any).user?.id,
       })

       return res.status(err.statusCode).json({
         code: err.statusCode,
         message: err.message,
         ...(err.details && { details: err.details }),
       })
     }

     // Multer 文件上传错误
     if (err.name === 'MulterError') {
       logger.warn('File upload error', { error: err.message })
       return res.status(400).json({
         code: 400,
         message: '文件上传失败: ' + err.message,
       })
     }

     // 验证错误 (express-validator)
     if (err.name === 'ValidationError') {
       return res.status(400).json({
         code: 400,
         message: '输入验证失败',
         details: err.details,
       })
     }

     // JWT 错误
     if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
       logger.warn('JWT error', { error: err.message, path: req.path })
       return res.status(401).json({
         code: 401,
         message: '认证失败: ' + err.message,
       })
     }

     // 未知错误 — 需要告警
     logger.error('Unhandled error', {
       error: err.message,
       stack: err.stack,
       path: req.path,
       method: req.method,
       body: req.body,
       userId: (req as any).user?.id,
     })

     res.status(500).json({
       code: 500,
       message: '服务器内部错误',
       ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
     })
   }
   ```

2. **进程级错误捕获** — `src/index.ts`:
   ```typescript
   import logger from './lib/logger'

   // 捕获未处理的 Promise 拒绝
   process.on('unhandledRejection', (reason, promise) => {
     logger.error('Unhandled Rejection', { reason, stack: (reason as Error)?.stack })
   })

   // 捕获未捕获的异常
   process.on('uncaughtException', (error) => {
     logger.error('Uncaught Exception', { error: error.message, stack: error.stack })
     // 严重错误，优雅退出
     process.exit(1)
   })
   ```

3. **前端错误边界** — `src/components/ErrorBoundary.tsx`:
   ```tsx
   import { Component, ReactNode } from 'react'

   interface Props {
     children: ReactNode
     fallback?: ReactNode
   }

   interface State {
     hasError: boolean
     error?: Error
   }

   export class ErrorBoundary extends Component<Props, State> {
     constructor(props: Props) {
       super(props)
       this.state = { hasError: false }
     }

     static getDerivedStateFromError(error: Error) {
       return { hasError: true, error }
     }

     componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
       console.error('UI Error:', error, errorInfo)
       // 可以发送到错误追踪服务
     }

     render() {
       if (this.state.hasError) {
         return this.props.fallback || (
           <div className="min-h-screen flex items-center justify-center">
             <div className="text-center">
               <h2 className="text-xl font-bold text-gray-800">页面出了点问题</h2>
               <p className="mt-2 text-gray-600">请刷新页面重试</p>
               <button
                 onClick={() => window.location.reload()}
                 className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
               >
                 刷新页面
               </button>
             </div>
           </div>
         )
       }
       return this.props.children
     }
   }
   ```

---

### Step 3: 深度健康检查 (45 分钟)

**目标**: 健康检查不止查进程，还检查所有依赖

1. **`src/routes/health.routes.ts`**:
   ```typescript
   import { Router } from 'express'
   import prisma from '@/lib/prisma'
   import redis from '@/lib/redis'
   import logger from '@/lib/logger'

   const router = Router()

   // 简单存活检查 (用于负载均衡)
   router.get('/health', (req, res) => {
     res.json({ status: 'ok', timestamp: new Date().toISOString() })
   })

   // 深度健康检查 (用于监控)
   router.get('/health/detailed', async (req, res) => {
     const checks: Record<string, any> = {}
     let isHealthy = true

     // 检查 PostgreSQL
     try {
       const start = Date.now()
       await prisma.$queryRaw`SELECT 1`
       checks.database = {
         status: 'ok',
         responseTime: `${Date.now() - start}ms`,
       }
     } catch (err) {
       isHealthy = false
       checks.database = { status: 'error', message: (err as Error).message }
     }

     // 检查 Redis
     try {
       const start = Date.now()
       await redis.ping()
       checks.redis = {
         status: 'ok',
         responseTime: `${Date.now() - start}ms`,
       }
     } catch (err) {
       isHealthy = false
       checks.redis = { status: 'error', message: (err as Error).message }
     }

     // 检查 OSS (可选)
     if (process.env.OSS_ACCESS_KEY_ID) {
       try {
         const oss = await import('@/lib/oss')
         // 简单检查: 列出 bucket 下的文件 (限制1条)
         checks.oss = { status: 'ok' }
       } catch (err) {
         // OSS 不可用不影响核心功能
         checks.oss = { status: 'degraded', message: (err as Error).message }
       }
     }

     // 内存使用
     const memUsage = process.memoryUsage()
     checks.memory = {
       rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
       heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
       heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
     }

     // 运行时间
     checks.uptime = `${Math.round(process.uptime())}s`

     const statusCode = isHealthy ? 200 : 503
     res.status(statusCode).json({
       status: isHealthy ? 'ok' : 'degraded',
       timestamp: new Date().toISOString(),
       version: process.env.npm_package_version || '1.0.0',
       checks,
     })

     if (!isHealthy) {
       logger.warn('Health check failed', { checks })
     }
   })

   export default router
   ```

2. **在 `src/server.ts` 中注册**:
   ```typescript
   import healthRoutes from './routes/health.routes'

   app.use(healthRoutes)  // /health 和 /health/detailed
   ```

**正反馈时刻**: 访问 `https://booknest.yourdomain.com/health/detailed`，看到 PostgreSQL、Redis、内存、运行时间的完整状态报告。

---

### Step 4: 前端性能优化 — 懒加载 + Bundle 分析 (1 小时)

**目标**: 减小首屏加载体积，提升加载速度

1. **路由级懒加载** — `src/App.tsx`:
   ```tsx
   import { lazy, Suspense } from 'react'

   // 懒加载路由组件
   const BookList = lazy(() => import('@/pages/BookList'))
   const BookDetail = lazy(() => import('@/pages/BookDetail'))
   const BookCreate = lazy(() => import('@/pages/BookCreate'))
   const BookEdit = lazy(() => import('@/pages/BookEdit'))
   const CategoryManager = lazy(() => import('@/pages/CategoryManager'))
   const Stats = lazy(() => import('@/pages/Stats'))
   const Login = lazy(() => import('@/pages/Login'))
   const Register = lazy(() => import('@/pages/Register'))

   function App() {
     return (
       <QueryClientProvider client={queryClient}>
         <ErrorBoundary>
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
         </ErrorBoundary>
         <ReactQueryDevtools initialIsOpen={false} />
       </QueryClientProvider>
     )
   }
   ```

2. **页面骨架屏** — `src/components/ui/PageSkeleton.tsx`:
   ```tsx
   function PageSkeleton() {
     return (
       <div className="animate-pulse min-h-screen">
         <div className="bg-gray-200 dark:bg-gray-700 h-16" />
         <div className="max-w-7xl mx-auto px-4 py-8">
           <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-8 w-1/4 mb-6" />
           <div className="grid grid-cols-4 gap-4">
             {Array.from({ length: 8 }).map((_, i) => (
               <div key={i} className="space-y-3">
                 <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-48" />
                 <div className="bg-gray-200 dark:bg-gray-700 rounded h-4 w-3/4" />
                 <div className="bg-gray-200 dark:bg-gray-700 rounded h-3 w-1/2" />
               </div>
             ))}
           </div>
         </div>
       </div>
     )
   }
   ```

3. **React.memo 优化频繁渲染的组件**:
   ```tsx
   // BookCard 在列表中频繁渲染，用 memo 避免不必要的重渲染
   const BookCard = React.memo(function BookCard({ book }: BookCardProps) {
     // ...
   })

   // Badge 组件很简单但数量多，memo 避免重复渲染
   const Badge = React.memo(function Badge({ variant, children }: BadgeProps) {
     // ...
   })
   ```

4. **图片懒加载**:
   ```tsx
   function BookCard({ book }: BookCardProps) {
     return (
       <div className="...">
         {book.coverUrl ? (
           <img
             src={book.coverUrl}
             alt={book.title}
             loading="lazy"                    // 浏览器原生懒加载
             className="w-full h-48 object-cover"
           />
         ) : (
           <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
             <BookOpen className="h-12 w-12 text-gray-400" />
           </div>
         )}
       </div>
     )
   }
   ```

5. **Bundle 分析** — `vite.config.ts`:
   ```typescript
   import { visualizer } from 'rollup-plugin-visualizer'

   export default defineConfig({
     plugins: [
       react(),
       visualizer({
         open: true,
         filename: 'dist/stats.html',
         gzipSize: true,
         brotliSize: true,
       }),
     ],
   })
   ```
   安装: `npm install -D rollup-plugin-visualizer`

   运行 `npm run build` 后打开 `dist/stats.html`，看到每个模块的体积占比。

**正反馈时刻**: `npm run build` 后，看到首页 JS 从 300KB 减小到 80KB (gzip)，stats.html 可视化展示各模块大小。

---

### Step 5: API 性能优化 (45 分钟)

**目标**: 优化数据库查询，减少不必要的查询次数

1. **解决 N+1 问题** — 书籍列表查询：
   ```typescript
   // 问题: 查 N 本书，每本额外查一次 category 和 review count
   // 解决: 使用 include 一次查出

   async list(userId: string, params: ListParams) {
     const books = await prisma.book.findMany({
       where,
       include: {
         category: { select: { id: true, name: true, color: true } },
         _count: { select: { reviews: true } },
       },
     })
   }
   ```

2. **添加数据库索引** — `prisma/migrations/add_indexes/migration.sql`:
   ```sql
   -- 书籍列表最常用的查询条件
   CREATE INDEX IF NOT EXISTS idx_books_user_status ON books(user_id, status);
   CREATE INDEX IF NOT EXISTS idx_books_user_created ON books(user_id, created_at DESC);
   CREATE INDEX IF NOT EXISTS idx_books_user_category ON books(user_id, category_id);

   -- 评论查询
   CREATE INDEX IF NOT EXISTS idx_reviews_book_id ON reviews(book_id);
   CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
   ```
   或在 Prisma Schema 中添加:
   ```prisma
   model Book {
     // ... 现有字段
     @@index([userId, status])
     @@index([userId, createdAt(sort: Desc)])
     @@index([userId, categoryId])
   }
   ```

3. **批量操作优化**:
   ```typescript
   // 不好: 循环单条查询
   for (const bookId of bookIds) {
     const book = await prisma.book.findUnique({ where: { id: bookId } })
   }

   // 好: 批量查询
   const books = await prisma.book.findMany({
     where: { id: { in: bookIds } },
   })
   ```

4. **只查需要的字段**:
   ```typescript
   // 列表页不需要 description 这种大字段
   const books = await prisma.book.findMany({
     select: {
       id: true,
       title: true,
       author: true,
       status: true,
       coverUrl: true,
       category: { select: { id: true, name: true, color: true } },
     },
   })
   ```

---

### Step 6: Lighthouse 审计 & 最终优化 (45 分钟)

**目标**: Lighthouse Performance 评分达到 90+

1. **运行 Lighthouse 审计**:
   - Chrome 浏览器 → F12 → Lighthouse 标签
   - 勾选: Performance, Accessibility, Best Practices, SEO
   - 点击 "Analyze page load"

2. **常见优化项对照表**:

   | 指标 | 目标 | 优化方法 |
   |------|------|----------|
   | FCP (First Contentful Paint) | < 1.8s | 懒加载非首屏组件 |
   | LCP (Largest Contentful Paint) | < 2.5s | 优化首图、CDN |
   | CLS (Cumulative Layout Shift) | < 0.1 | 图片设置宽高、字体 preload |
   | TTI (Time to Interactive) | < 3.8s | 代码分割、减少 JS |
   | TBT (Total Blocking Time) | < 200ms | 减少长任务 |

3. **具体优化操作**:

   a. **图片优化**:
   ```html
   <!-- 在 index.html 中预加载关键字体 -->
   <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
   ```

   b. **Vite 构建优化** — `vite.config.ts`:
   ```typescript
   export default defineConfig({
     build: {
       rollupOptions: {
         output: {
           manualChunks: {
             'vendor-react': ['react', 'react-dom', 'react-router-dom'],
             'vendor-query': ['@tanstack/react-query'],
             'vendor-form': ['react-hook-form', '@hookform/resolvers', 'zod'],
           },
         },
       },
       // 启用 gzip 压缩提示
       reportCompressedSize: true,
       // chunk 大小警告阈值
       chunkSizeWarningLimit: 500,
     },
   })
   ```

   c. **meta 标签** — `index.html`:
   ```html
   <meta name="description" content="BookNest - 个人藏书管理应用">
   <meta name="theme-color" content="#3B82F6">
   <link rel="icon" type="image/svg+xml" href="/favicon.svg">
   ```

   d. **Nginx 静态资源缓存**:
   ```nginx
   # 前端静态资源长期缓存 (文件名带 hash)
   location /assets/ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }

   # HTML 不缓存 (每次拉最新)
   location / {
       try_files $uri $uri/ /index.html;
       add_header Cache-Control "no-cache";
   }
   ```

**正反馈时刻**: 再次运行 Lighthouse，Performance 评分从 60 提升到 90+。

---

## 验收标准 Checklist

### 日志 & 监控
- [ ] 所有 API 请求都有结构化日志 (方法、路径、状态码、耗时)
- [ ] 错误日志单独存储在 `logs/error-*.log`
- [ ] 日志文件按天轮转，不超过 14 天
- [ ] `/health/detailed` 返回 PostgreSQL、Redis、内存状态
- [ ] 模拟 Redis 断开后，`/health/detailed` 返回 503

### 前端性能
- [ ] 首屏 JS 体积 < 100KB (gzip)
- [ ] 非首屏路由使用 React.lazy 懒加载
- [ ] Lighthouse Performance 评分 90+
- [ ] Lighthouse Accessibility 评分 85+
- [ ] 图片使用 `loading="lazy"` 延迟加载

### 后端性能
- [ ] 书籍列表无 N+1 查询问题
   (用 Prisma 的 `include` 一次查出)
- [ ] 列表查询不返回 `description` 大字段
- [ ] 数据库索引已添加
- [ ] 生产环境日志级别为 `info`，不输出 `debug`

### 前端健壮性
- [ ] ErrorBoundary 包裹应用，渲染错误有友好提示
- [ ] 路由懒加载时显示骨架屏

---

## 项目目录结构 (新增/修改文件)

```
booknest/
├── backend/
│   ├── logs/                       ← 日志目录 (.gitignore)
│   ├── src/
│   │   ├── lib/
│   │   │   ├── logger.ts           ← Winston 日志
│   │   │   ├── requestLogger.ts    ← Morgan 请求日志
│   │   │   └── ...
│   │   ├── routes/
│   │   │   ├── health.routes.ts    ← 深度健康检查
│   │   │   └── ...
│   │   ├── middleware/
│   │   │   ├── errorHandler.ts     ← 增强: 错误分类
│   │   │   └── ...
│   │   └── index.ts                ← 进程级错误捕获
│   └── .gitignore                  ← 添加 logs/
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ui/
│       │   │   ├── PageSkeleton.tsx  ← 页面骨架屏
│       │   │   └── ...
│       │   ├── ErrorBoundary.tsx     ← 错误边界
│       │   └── ...
│       ├── App.tsx                   ← 懒加载改造
│       └── ...
```

---

## Git 工作规范

### 分支策略

```bash
git checkout -b feat/day7-observability
```

### Commit 示例

```bash
git commit -m "feat: add Winston structured logging with daily rotation"
git commit -m "feat: add Morgan HTTP request logging"
git commit -m "feat: enhance error handler with error classification"
git commit -m "feat: add detailed health check for PostgreSQL, Redis, OSS"
git commit -m "feat: add React.lazy route splitting and page skeleton"
git commit -m "perf: optimize database queries with include and field selection"
git commit -m "perf: add database indexes for common queries"
git commit -m "perf: add Vite manual chunks for vendor splitting"
git commit -m "feat: add ErrorBoundary for graceful error handling"
git commit -m "ci: update GitHub Actions to run Lighthouse audit"
```

---

## Prompt 模板

### Winston 日志

```
帮我创建一个 Winston 日志模块 (src/lib/logger.ts)，要求:

1. 三个传输: Console (彩色格式) + 文件轮转 (所有日志) + 文件轮转 (仅错误)
2. 文件轮转: 按天分割, maxSize 20MB, 保留 14 天 (错误日志 30 天)
3. 日志格式: JSON 结构化，包含 timestamp, level, message, meta
4. 控制台使用人类可读格式
5. 日志级别从环境变量 LOG_LEVEL 读取，默认 info
6. 默认 meta 包含 service: 'booknest-api'
```

### 健康检查

```
帮我创建一个深度健康检查路由:

GET /health → 简单存活检查 (用于负载均衡)
GET /health/detailed → 深度检查 (用于监控面板)

深度检查需要测试:
1. PostgreSQL: 执行 SELECT 1，记录响应时间
2. Redis: 执行 PING，记录响应时间
3. OSS: 检查是否可访问
4. 内存: 输出 process.memoryUsage()
5. 运行时间: process.uptime()

任何关键依赖失败返回 503，否则返回 200。
```

### 前端优化

```
帮我优化前端性能:

1. 路由级懒加载: 所有页面组件改为 React.lazy + Suspense
2. 骨架屏: Suspense fallback 使用骨架屏而非 loading 文字
3. React.memo: BookCard 和 Badge 组件用 memo 包裹
4. 图片懒加载: img 标签添加 loading="lazy"
5. Vite 手动分包: react/react-dom/query/form 拆分为独立 chunk
6. Bundle 分析: 集成 rollup-plugin-visualizer

当前 bundle 约 300KB，目标首屏 < 100KB (gzip)。
```

### 调试

```
我的 Lighthouse Performance 评分只有 55 分，主要问题:

1. LCP: 3.2s (目标 < 2.5s)
2. TBT: 450ms (目标 < 200ms)
3. CLS: 0.15 (目标 < 0.1)

当前状态:
- 首屏 JS bundle 280KB (gzip)
- 没有代码分割
- 图片未优化
- 没有使用 lazy loading

帮我逐项分析原因并给出具体的优化方案。
```

---

## 每日回顾

Day 7 结束前，回答以下问题：

1. **为什么生产环境不能用 console.log？结构化日志的好处是什么？**
2. **健康检查接口为什么需要区分 /health 和 /health/detailed？**
3. **React.lazy 解决了什么问题？为什么不在所有组件上都用 lazy？**
4. **什么是 N+1 查询问题？你在实际项目中如何发现和解决它？**
5. **如果线上用户反馈"页面很慢"，你会按什么顺序排查？**

---

## 七天总回顾

### 技能矩阵

| 阶段 | 天数 | 掌握了什么 | 对应真实工作 |
|------|------|-----------|-------------|
| **前端基础** | Day 1 | React + TS + Tailwind + Zustand | 前端日常开发 |
| **后端基础** | Day 2 | Express + Prisma + JWT + 测试 | 后端日常开发 |
| **全栈集成** | Day 3 | React Query + MSW + Docker Compose | 前后端联调 |
| **部署上线** | Day 4 | CI/CD + 阿里云 + Nginx + HTTPS | DevOps |
| **云服务器安全** | Day 5 | 网络安全 + 系统加固 + 备份恢复 | 安全运维 |
| **进阶能力** | Day 6 | Redis + OSS + WebSocket + 限流 | 性能与安全 |
| **可观测性** | Day 7 | 日志 + 监控 + 性能优化 | 线上运维 |

### 完整技术栈

```
前端:  React 19 + TypeScript 6 + Tailwind CSS 3 + Zustand
       React Query 5 + React Hook Form + Zod
       React Router v7 + Axios + Socket.IO Client

后端:  Express 5 + TypeScript 6 + Prisma 7
       Redis (ioredis) + 阿里云 OSS + Socket.IO
       Winston + Morgan + JWT + bcrypt

运维:  Docker Compose + Nginx + Let's Encrypt
       GitHub Actions CI/CD + 阿里云 ECS

安全:  阿里云安全组 + VPC + fail2ban + WAF + 自动备份
```

### 最终项目结构

```
booknest/
├── .github/workflows/
│   └── deploy.yml                ← CI/CD 流水线
├── frontend/
│   ├── Dockerfile                ← 前端容器
│   ├── nginx.conf                ← SPA 路由
│   └── src/
│       ├── components/ui/        ← Button, Input, Card, Badge, Modal, Toast, Skeleton
│       ├── components/book/      ← BookCard, BookList, ReviewForm
│       ├── components/           ← Layout, ErrorBoundary, NotificationToast
│       ├── pages/                ← BookList, BookDetail, BookCreate, Login, Register, Stats
│       ├── stores/               ← useAuthStore, useThemeStore
│       ├── hooks/                ← useBooks, useCategories, useReviews, useSocket
│       ├── lib/                  ← api-client, query-client, utils, schemas
│       ├── mocks/                ← MSW handlers + server
│       └── types/                ← TypeScript 类型
├── backend/
│   ├── Dockerfile                ← 后端容器
│   ├── prisma/
│   │   ├── schema.prisma         ← 数据模型 (含索引)
│   │   ├── seed.ts               ← 种子数据
│   │   └── migrations/           ← 数据库迁移
│   └── src/
│       ├── controllers/          ← auth, book, category, review, upload
│       ├── services/             ← auth, book, category, review, upload, stats
│       ├── routes/               ← auth, book, category, health
│       ├── middleware/           ← auth, validate, errorHandler, upload, rateLimit
│       ├── lib/                  ← prisma, redis, cache, oss, socket, logger
│       ├── utils/                ← response, errors
│       └── types/                ← Express 类型扩展
├── docker-compose.yml            ← 开发环境
├── docker-compose.prod.yml       ← 生产环境
├── CLAUDE.md                     ← 项目上下文
└── tasks/                        ← 任务文档 (Day 1-7)
```

### 这七天你的成长轨迹

```
Day 1: "我能写前端页面了"
Day 2: "我能写后端 API 了"
Day 3: "我能把前后端连起来了"
Day 4: "我能把应用部署到线上了"
Day 5: "我能保障云服务器的安全了"
Day 6: "我能给应用加缓存、上传、实时通知了"
Day 7: "我能监控应用状态、优化性能了"

→ 你已经具备了独立交付一个全栈 Web 应用的能力。
```

### 下一步建议

完成七天后，你可以选择以下方向继续深入：

1. **参与真实项目** — 用学到的技能参与公司的项目开发
2. **补齐基础** — 深入学习 HTTP 协议、数据库原理、设计模式
3. **学习微前端** — qiankun / Module Federation 等大型项目架构
4. **学习测试** — E2E 测试 (Playwright)、TDD 开发流程
5. **学习移动端** — React Native 或微信小程序 (有 React 基础上手很快)

**记住**: 技术栈会变，但工程思维和解决问题的能力不会。这七天你学到的不仅是框架，更重要的是"怎么把一个想法变成线上产品"的完整方法论。
