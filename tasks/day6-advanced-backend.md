# Day 6: BookNest 进阶后端 — Redis 缓存 + 文件上传 + WebSocket

## 项目简介

今天是 BookNest 进阶阶段的第三天。你的应用已经部署上线，但真实产品需要更多能力：热门数据需要缓存提速、用户需要上传书籍封面、操作需要实时通知。今天你将为后端添加 Redis 缓存层、文件上传功能和 WebSocket 实时通信，这些都是面试高频考点。

**今天的目标**: 给 BookNest 加上缓存加速、图片上传、实时通知三大能力，让应用从"能用"变成"好用"。

---

## 学习目标

完成今天的工作后，你将掌握：

1. **Redis** 缓存策略 — Cache-Aside 模式、TTL 管理、缓存穿透防护
2. **ioredis** Node.js Redis 客户端操作
3. **文件上传** — Multer 中间件 + 阿里云 OSS 对象存储
4. **WebSocket (Socket.IO)** — 实时双向通信、事件驱动
5. **接口限流** — express-rate-limit 防刷保护
6. **缓存测试策略** — 如何测试缓存逻辑的正确性

---

## 技术栈

| 技术 | 用途 |
|------|------|
| Redis 7 | 内存缓存 |
| ioredis | Node.js Redis 客户端 |
| Multer | 文件上传中间件 |
| 阿里云 OSS SDK | 云端文件存储 |
| Socket.IO | WebSocket 实时通信 |
| express-rate-limit | 接口限流 |

### 新增采购

| 资源 | 预估费用 | 说明 |
|------|----------|------|
| 阿里云 OSS | 约 ¥1-5/月 (学习量) | 对象存储，用于书籍封面 |
| Redis | ¥0 (Docker 自建) | 学习阶段用 Docker 跑 Redis |

> 阿里云 OSS 按量付费，标准存储 ¥0.12/GB/月，外网下行 ¥0.50/GB。学习阶段几毛钱。

---

## 前置条件

确保以下内容已就绪：

- [ ] Day 4 的部署流程正常，应用可通过域名访问
- [ ] 本地开发环境正常 (`npm run dev` 前后端均可启动)
- [ ] Docker 可运行 (Redis 将用 Docker 启动)

---

## 功能清单

### Must-Have (必做)

| # | 功能 | 说明 |
|---|------|------|
| 1 | Redis 集成 | Docker 启动 Redis + ioredis 客户端封装 |
| 2 | 统计数据缓存 | GET /stats 缓存 5 分钟，减少数据库查询 |
| 3 | 书籍列表缓存 | 热门查询缓存，创建/更新/删除时自动失效 |
| 4 | 文件上传 API | POST /books/:id/cover，Multer 接收文件 |
| 5 | 阿里云 OSS 集成 | 上传封面到 OSS，返回公网 URL |
| 6 | WebSocket 通知 | 书籍状态变更时推送实时通知 |
| 7 | 接口限流 | 每用户每分钟 60 次请求 |

### Nice-to-Have (加量)

| # | 功能 | 说明 |
|---|------|------|
| 8 | 缓存预热 | 服务启动时预加载热门数据 |
| 9 | 缓存穿透防护 | Bloom Filter 或空值缓存 |
| 10 | 图片压缩 | 上传前压缩图片 (sharp) |
| 11 | 前端实时面板 | Toast 通知 + 在线用户计数 |
| 12 | 上传进度条 | 前端显示上传百分比 |

---

## 分步实施指南

### Step 1: Redis 集成 (1 小时)

**目标**: 在项目中引入 Redis 缓存层

1. **启动 Redis** — 添加到 `docker-compose.yml`:
   ```yaml
   services:
     redis:
       image: redis:7-alpine
       ports:
         - "6379:6379"
       volumes:
         - redisdata:/data
       command: redis-server --appendonly yes

   volumes:
     redisdata:
   ```

   本地启动：
   ```bash
   docker run -d --name booknest-redis -p 6379:6379 redis:7-alpine redis-server --appendonly yes
   ```

2. **安装依赖**：
   ```bash
   cd backend
   npm install ioredis
   ```

3. **`src/lib/redis.ts`** — Redis 客户端封装：
   ```typescript
   import Redis from 'ioredis'

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
     console.error('Redis connection error:', err)
   })

   redis.on('connect', () => {
     console.log('Redis connected')
   })

   export default redis
   ```

4. **`src/lib/cache.ts`** — 缓存工具类：
   ```typescript
   import redis from './redis'

   interface CacheOptions {
     ttl: number          // 过期时间 (秒)
     prefix?: string      // 键前缀
   }

   export const cache = {
     async get<T>(key: string): Promise<T | null> {
       const data = await redis.get(key)
       if (!data) return null
       return JSON.parse(data)
     },

     async set(key: string, value: any, ttl: number): Promise<void> {
       await redis.setex(key, ttl, JSON.stringify(value))
     },

     async del(pattern: string): Promise<void> {
       if (pattern.includes('*')) {
         const keys = await redis.keys(pattern)
         if (keys.length > 0) {
           await redis.del(...keys)
         }
       } else {
         await redis.del(pattern)
       }
     },

     async getOrSet<T>(key: string, fn: () => Promise<T>, ttl: number): Promise<T> {
       const cached = await cache.get<T>(key)
       if (cached !== null) return cached

       const data = await fn()
       await cache.set(key, data, ttl)
       return data
     },
   }
   ```

5. **添加环境变量** — `.env`:
   ```
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

6. **验证 Redis 连接**：
   ```bash
   cd backend && npm run dev
   # 控制台应显示 "Redis connected"

   # 测试命令
   redis-cli ping  # 返回 PONG
   ```

**正反馈时刻**: 启动后端，看到 `Redis connected` 日志。运行 `redis-cli monitor` 可以看到实时命令。

---

### Step 2: 统计数据缓存 (45 分钟)

**目标**: 给 GET /api/v1/stats 加上缓存，5 分钟内不查数据库

1. **修改 `src/services/stats.service.ts`**：
   ```typescript
   import { cache } from '@/lib/cache'

   export async function getStats(userId: string) {
     const cacheKey = `stats:${userId}`

     return cache.getOrSet(
       cacheKey,
       async () => {
         const [totalBooks, statusBreakdown, recentBooks, avgRating] = await Promise.all([
           prisma.book.count({ where: { userId } }),
           prisma.book.groupBy({
             by: ['status'],
             where: { userId },
             _count: true,
           }),
           prisma.book.findMany({
             where: { userId },
             orderBy: { createdAt: 'desc' },
             take: 5,
             include: { category: true },
           }),
           prisma.review.aggregate({
             where: { userId },
             _avg: { rating: true },
           }),
         ])

         return {
           totalBooks,
           statusBreakdown: Object.fromEntries(
             statusBreakdown.map(s => [s.status, s._count])
           ),
           recentBooks,
           averageRating: avgRating._avg.rating || 0,
         }
       },
       300  // 5 分钟 TTL
     )
   }
   ```

2. **缓存失效** — 在书籍变更时清除缓存：
   ```typescript
   // src/services/book.service.ts

   import { cache } from '@/lib/cache'

   async function invalidateBookCache(userId: string) {
     await cache.del(`stats:${userId}`)
     await cache.del(`books:${userId}:*`)
   }

   // 在 create / update / delete 方法中调用:
   async create(userId: string, data: CreateBookDTO) {
     const book = await prisma.book.create({ data: { ...data, userId } })
     await invalidateBookCache(userId)
     return book
   }
   ```

3. **测试缓存效果**：
   ```bash
   # 第一次请求 (查数据库)
   time curl -H "Authorization: Bearer <token>" http://localhost:4000/api/v1/stats

   # 第二次请求 (命中缓存，明显更快)
   time curl -H "Authorization: Bearer <token>" http://localhost:4000/api/v1/stats
   ```

**正反馈时刻**: 第一次请求 50ms，第二次请求 5ms，速度提升 10 倍。

---

### Step 3: 书籍列表缓存 (30 分钟)

**目标**: 缓存书籍列表查询结果

1. **修改 `src/services/book.service.ts`** — 列表查询加缓存：
   ```typescript
   async list(userId: string, params: ListParams) {
     const { page = 1, pageSize = 10, status, categoryId } = params
     const cacheKey = `books:${userId}:list:${JSON.stringify(params)}`

     return cache.getOrSet(
       cacheKey,
       async () => {
         const where = { userId, ...(status && { status }), ...(categoryId && { categoryId }) }
         const [items, total] = await Promise.all([
           prisma.book.findMany({
             where,
             skip: (page - 1) * pageSize,
             take: pageSize,
             include: { category: true },
             orderBy: { createdAt: 'desc' },
           }),
           prisma.book.count({ where }),
         ])
         return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
       },
       120  // 2 分钟 TTL (列表变化较频繁)
     )
   }
   ```

2. **缓存键设计原则**：
   ```
   stats:<userId>                  → 统计数据 (TTL 5min)
   books:<userId>:list:<params>    → 列表查询 (TTL 2min)
   books:<userId>:detail:<bookId>  → 书籍详情 (TTL 5min)
   ```

---

### Step 4: 文件上传 + 阿里云 OSS (1.5 小时)

**目标**: 用户可以上传书籍封面图片

#### 4.1 阿里云 OSS 准备

1. **创建 OSS Bucket**：
   - 阿里云控制台 → 对象存储 OSS → 创建 Bucket
   - Bucket 名称: `booknest-covers` (全局唯一)
   - 地域: 与 ECS 相同区域 (如华东1)
   - 存储类型: 标准存储
   - 读写权限: 公共读 (封面图片需要公网访问)

2. **创建 RAM 子账号 + AccessKey**：
   - 阿里云控制台 → RAM 访问控制 → 用户 → 创建用户
   - 勾选 "OpenAPI 调用访问"
   - 添加权限: `AliyunOSSFullAccess` (或仅 `AliyunOSSWriteOnlyAccess` + `AliyunOSSReadOnlyAccess`)
   - 记录 AccessKey ID 和 AccessKey Secret

3. **配置环境变量** — `.env`:
   ```
   OSS_ACCESS_KEY_ID=<你的AccessKey ID>
   OSS_ACCESS_KEY_SECRET=<你的AccessKey Secret>
   OSS_BUCKET=booknest-covers
   OSS_REGION=oss-cn-hangzhou
   OSS_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com
   ```

#### 4.2 后端实现

1. **安装依赖**：
   ```bash
   cd backend
   npm install multer ali-oss
   npm install -D @types/multer
   ```

2. **`src/lib/oss.ts`** — OSS 客户端封装：
   ```typescript
   import OSS from 'ali-oss'

   const client = new OSS({
     region: process.env.OSS_REGION!,
     accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
     accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
     bucket: process.env.OSS_BUCKET!,
   })

   export async function uploadToOSS(
     filename: string,
     buffer: Buffer,
     contentType: string
   ): Promise<string> {
     const key = `covers/${Date.now()}-${filename}`
     const result = await client.put(key, buffer, {
       headers: { 'Content-Type': contentType },
     })
     return result.url
   }

   export async function deleteFromOSS(url: string): Promise<void> {
     const key = url.split('.com/')[1]
     if (key) {
       await client.delete(key)
     }
   }
   ```

3. **`src/middleware/upload.ts`** — Multer 配置：
   ```typescript
   import multer from 'multer'

   const storage = multer.memoryStorage()

   const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
     const allowed = ['image/jpeg', 'image/png', 'image/webp']
     if (allowed.includes(file.mimetype)) {
       cb(null, true)
     } else {
       cb(new Error('仅支持 JPG、PNG、WebP 格式'))
     }
   }

   export const upload = multer({
     storage,
     fileFilter,
     limits: { fileSize: 5 * 1024 * 1024 },  // 5MB
   })
   ```

4. **`src/services/upload.service.ts`**：
   ```typescript
   import { uploadToOSS, deleteFromOSS } from '@/lib/oss'
   import prisma from '@/lib/prisma'
   import { cache } from '@/lib/cache'
   import { ApiError } from '@/utils/errors'

   export async function uploadCover(
     userId: string,
     bookId: string,
     file: Express.Multer.File
   ) {
     const book = await prisma.book.findFirst({ where: { id: bookId, userId } })
     if (!book) throw new ApiError(404, '书籍不存在')

     // 删除旧封面
     if (book.coverUrl) {
       await deleteFromOSS(book.coverUrl).catch(() => {})
     }

     // 上传新封面
     const coverUrl = await uploadToOSS(file.originalname, file.buffer, file.mimetype)

     // 更新数据库
     const updated = await prisma.book.update({
       where: { id: bookId },
       data: { coverUrl },
     })

     // 清除缓存
     await cache.del(`stats:${userId}`)
     await cache.del(`books:${userId}:*`)

     return updated
   }
   ```

5. **`src/controllers/upload.controller.ts`**：
   ```typescript
   import { Request, Response, NextFunction } from 'express'
   import { uploadService } from '@/services/upload.service'

   export async function uploadCover(req: Request, res: Response, next: NextFunction) {
     try {
       if (!req.file) {
         return res.status(400).json({ code: 400, message: '请选择文件' })
       }
       const book = await uploadService.uploadCover(
         req.user!.id,
         req.params.id,
         req.file
       )
       res.json({ code: 200, message: '封面上传成功', data: book })
     } catch (err) {
       next(err)
     }
   }
   ```

6. **路由注册** — `src/routes/book.routes.ts`：
   ```typescript
   router.post(
     '/:id/cover',
     authenticate,
     upload.single('cover'),
     uploadController.uploadCover
   )
   ```

**正反馈时刻**: 用 curl 上传一张图片，在阿里云 OSS 控制台看到文件，前端书籍卡片显示封面。

---

### Step 5: WebSocket 实时通知 (1.5 小时)

**目标**: 书籍状态变更时，前端实时收到通知

1. **安装依赖**：
   ```bash
   cd backend
   npm install socket.io
   cd ../frontend
   npm install socket.io-client
   ```

2. **后端 Socket.IO 集成** — `src/lib/socket.ts`:
   ```typescript
   import { Server as SocketServer } from 'socket.io'
   import type { Server } from 'http'

   let io: SocketServer

   export function initSocket(server: Server) {
     io = new SocketServer(server, {
       cors: {
         origin: process.env.FRONTEND_URL || 'http://localhost:4001',
         credentials: true,
       },
     })

     io.use((socket, next) => {
       const token = socket.handshake.auth.token
       if (!token) {
         return next(new Error('Authentication error'))
       }
       // 验证 JWT token (复用 auth 逻辑)
       try {
         const decoded = jwt.verify(token, process.env.JWT_SECRET!)
         socket.data.userId = decoded.userId
         next()
       } catch {
         next(new Error('Authentication error'))
       }
     })

     io.on('connection', (socket) => {
       console.log(`User connected: ${socket.data.userId}`)

       // 加入用户专属房间 (用于定向推送)
       socket.join(`user:${socket.data.userId}`)

       socket.on('disconnect', () => {
         console.log(`User disconnected: ${socket.data.userId}`)
       })
     })

     return io
   }

   export function getIO() {
     if (!io) throw new Error('Socket.io not initialized')
     return io
   }

   // 发送通知给特定用户
   export function notifyUser(userId: string, event: string, data: any) {
     getIO().to(`user:${userId}`).emit(event, data)
   }
   ```

3. **修改 `src/index.ts`** — 集成 Socket.IO:
   ```typescript
   import dotenv from 'dotenv'
   dotenv.config()
   import app from './server'
   import { createServer } from 'http'
   import { initSocket } from './lib/socket'

   const PORT = process.env.PORT || 4000
   const server = createServer(app)
   initSocket(server)

   server.listen(PORT, () => {
     console.log(`Server running on port ${PORT}`)
   })
   ```

4. **在业务逻辑中发送通知**:
   ```typescript
   // src/services/book.service.ts
   import { notifyUser } from '@/lib/socket'

   async create(userId: string, data: CreateBookDTO) {
     const book = await prisma.book.create({ data: { ...data, userId } })
     await invalidateBookCache(userId)

     // 发送实时通知
     notifyUser(userId, 'book:created', {
       message: `《${book.title}》已添加到书架`,
       book,
     })

     return book
   }

   async updateStatus(userId: string, bookId: string, status: BookStatus) {
     const book = await prisma.book.update({
       where: { id: bookId },
       data: { status },
     })
     await invalidateBookCache(userId)

     const statusLabels = {
       OWNED: '已拥有', READING: '在读', FINISHED: '已读完', WISHLIST: '想读'
     }
     notifyUser(userId, 'book:statusChanged', {
       message: `《${book.title}》状态更新为「${statusLabels[status]}」`,
       book,
     })

     return book
   }
   ```

5. **前端 Socket.IO 集成** — `src/hooks/useSocket.ts`:
   ```typescript
   import { useEffect, useRef, useState } from 'react'
   import { io, Socket } from 'socket.io-client'
   import { useAuthStore } from '@/stores/useAuthStore'

   interface Notification {
     message: string
     book?: any
     timestamp: Date
   }

   export function useSocket() {
     const socketRef = useRef<Socket | null>(null)
     const [notifications, setNotifications] = useState<Notification[]>([])
     const { token, isAuthenticated } = useAuthStore()

     useEffect(() => {
       if (!isAuthenticated || !token) return

       const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000', {
         auth: { token },
         transports: ['websocket'],
       })

       socket.on('connect', () => {
         console.log('Socket connected')
       })

       socket.on('book:created', (data) => {
         setNotifications(prev => [...prev, { ...data, timestamp: new Date() }])
       })

       socket.on('book:statusChanged', (data) => {
         setNotifications(prev => [...prev, { ...data, timestamp: new Date() }])
       })

       socketRef.current = socket

       return () => {
         socket.disconnect()
       }
     }, [isAuthenticated, token])

     const dismiss = (index: number) => {
       setNotifications(prev => prev.filter((_, i) => i !== index))
     }

     return { notifications, dismiss }
   }
   ```

6. **前端通知组件** — `src/components/ui/NotificationToast.tsx`:
   ```tsx
   function NotificationToast() {
     const { notifications, dismiss } = useSocket()

     return (
       <div className="fixed top-4 right-4 z-50 space-y-2">
         {notifications.map((n, i) => (
           <div
             key={i}
             className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 flex items-center gap-3 animate-slide-in"
           >
             <Bell className="h-5 w-5 text-blue-500" />
             <p className="text-sm">{n.message}</p>
             <button onClick={() => dismiss(i)} className="text-gray-400 hover:text-gray-600">
               <X className="h-4 w-4" />
             </button>
           </div>
         ))}
       </div>
     )
   }
   ```

**正反馈时刻**: 在浏览器 A 创建一本书，浏览器 B (同一账号) 实时弹出通知："《Clean Code》已添加到书架"。

---

### Step 6: 接口限流 (30 分钟)

**目标**: 防止恶意请求刷爆服务器

1. **安装依赖**：
   ```bash
   cd backend
   npm install express-rate-limit
   ```

2. **`src/middleware/rateLimit.ts`**:
   ```typescript
   import rateLimit from 'express-rate-limit'

   // 通用限流: 每IP每分钟100次
   export const apiLimiter = rateLimit({
     windowMs: 60 * 1000,
     max: 100,
     message: { code: 429, message: '请求过于频繁，请稍后再试' },
     standardHeaders: true,
     legacyHeaders: false,
   })

   // 认证接口限流: 每IP每15分钟5次 (防暴力破解)
   export const authLimiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 5,
     message: { code: 429, message: '登录尝试过多，请15分钟后再试' },
   })

   // 上传限流: 每用户每分钟10次
   export const uploadLimiter = rateLimit({
     windowMs: 60 * 1000,
     max: 10,
     keyGenerator: (req) => req.user?.id || req.ip!,
   })
   ```

3. **应用到路由**:
   ```typescript
   // src/server.ts
   app.use('/api/v1', apiLimiter)

   // src/routes/auth.routes.ts
   router.post('/login', authLimiter, validate(loginRules), authController.login)
   router.post('/register', authLimiter, validate(registerRules), authController.register)

   // src/routes/book.routes.ts
   router.post('/:id/cover', authenticate, uploadLimiter, upload.single('cover'), ...)
   ```

---

### Step 7: 测试 (45 分钟)

1. **Redis 缓存测试** — `tests/unit/cache.test.ts`:
   ```typescript
   describe('Cache', () => {
     it('should cache and retrieve data', async () => {
       let callCount = 0
       const fetcher = async () => {
         callCount++
         return { total: 42 }
       }

       // 第一次调用 fetcher
       const result1 = await cache.getOrSet('test:key', fetcher, 60)
       expect(result1).toEqual({ total: 42 })
       expect(callCount).toBe(1)

       // 第二次命中缓存，不调用 fetcher
       const result2 = await cache.getOrSet('test:key', fetcher, 60)
       expect(result2).toEqual({ total: 42 })
       expect(callCount).toBe(1)  // 仍然是 1

       // 清除缓存后再次调用
       await cache.del('test:key')
       const result3 = await cache.getOrSet('test:key', fetcher, 60)
       expect(callCount).toBe(2)
     })
   })
   ```

2. **文件上传测试** — `tests/integration/upload.test.ts`:
   ```typescript
   describe('Book Cover Upload', () => {
     it('should upload cover image', async () => {
       const res = await request(app)
         .post(`/api/v1/books/${bookId}/cover`)
         .set('Authorization', `Bearer ${token}`)
         .attach('cover', path.join(__dirname, 'fixtures/test-cover.jpg'))

       expect(res.status).toBe(200)
       expect(res.body.data.coverUrl).toContain('oss-cn-hangzhou.aliyuncs.com')
     })

     it('should reject non-image files', async () => {
       const res = await request(app)
         .post(`/api/v1/books/${bookId}/cover`)
         .set('Authorization', `Bearer ${token}`)
         .attach('cover', path.join(__dirname, 'fixtures/test.txt'))

       expect(res.status).toBe(400)
     })
   })
   ```

3. **限流测试** — `tests/integration/rateLimit.test.ts`:
   ```typescript
   describe('Rate Limiting', () => {
     it('should block requests after limit', async () => {
       // 发送超过限制的请求
       for (let i = 0; i < 110; i++) {
         await request(app).get('/api/v1/books').set('Authorization', `Bearer ${token}`)
       }

       const res = await request(app)
         .get('/api/v1/books')
         .set('Authorization', `Bearer ${token}`)

       expect(res.status).toBe(429)
     })
   })
   ```

---

## 验收标准 Checklist

- [ ] Redis Docker 容器正常运行 (`docker ps` 显示 redis)
- [ ] 第一次请求 /stats 后，`redis-cli get stats:<userId>` 返回缓存数据
- [ ] 第二次请求 /stats 速度明显快于第一次
- [ ] 创建/更新/删除书籍后，stats 缓存被清除
- [ ] POST /books/:id/cover 可上传图片，返回 OSS URL
- [ ] 上传非图片文件返回 400 错误
- [ ] 上传超过 5MB 文件被拒绝
- [ ] WebSocket 连接成功 (前端控制台显示 "Socket connected")
- [ ] 创建书籍后，同账号其他标签页收到实时通知
- [ ] 限流生效：超过限制返回 429
- [ ] 所有新增测试通过 (`npm test`)
- [ ] 生产环境 Redis 添加到 docker-compose.prod.yml

---

## 生产环境更新

### `docker-compose.prod.yml` 添加 Redis

```yaml
services:
  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redisdata:/data
    networks:
      - booknest-internal

  backend:
    environment:
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      # ... 其他变量
```

---

## 项目目录结构 (新增文件)

```
booknest/
├── backend/src/
│   ├── lib/
│   │   ├── redis.ts              ← Redis 客户端
│   │   ├── cache.ts              ← 缓存工具类
│   │   ├── oss.ts                ← OSS 客户端
│   │   └── socket.ts             ← Socket.IO 服务端
│   ├── middleware/
│   │   ├── upload.ts             ← Multer 上传配置
│   │   └── rateLimit.ts          ← 接口限流
│   ├── services/
│   │   ├── upload.service.ts     ← 上传业务逻辑
│   │   └── book.service.ts       ← 修改: 添加缓存和通知
│   ├── controllers/
│   │   └── upload.controller.ts  ← 上传控制器
│   └── tests/
│       ├── unit/cache.test.ts
│       └── integration/upload.test.ts
├── frontend/src/
│   ├── hooks/
│   │   └── useSocket.ts          ← Socket.IO 客户端 hook
│   └── components/ui/
│       └── NotificationToast.tsx  ← 实时通知组件
```

---

## Git 工作规范

### 分支策略

```bash
git checkout -b feat/day6-advanced-backend
```

### Commit 示例

```bash
git commit -m "feat: add Redis cache layer with ioredis"
git commit -m "feat: cache stats and book list with auto-invalidation"
git commit -m "feat: add book cover upload with Alibaba Cloud OSS"
git commit -m "feat: add WebSocket real-time notifications with Socket.IO"
git commit -m "feat: add API rate limiting for auth and upload endpoints"
git commit -m "test: add cache, upload, and rate limit tests"
```

---

## Prompt 模板

### Redis 缓存

```
帮我封装一个 Redis 缓存工具类 (src/lib/cache.ts)，要求:

1. get<T>(key) — 获取缓存，反序列化为 T 类型
2. set(key, value, ttl) — 设置缓存，带过期时间
3. del(pattern) — 删除缓存，支持通配符模式
4. getOrSet<T>(key, fetcher, ttl) — 先查缓存，miss 时调用 fetcher 并写入缓存
5. 使用 ioredis 客户端
6. 所有方法都是 async/await

然后帮我改造 stats.service.ts 的 getStats 方法，使用 getOrSet 缓存 5 分钟。
书籍增删改时需要清除该用户的 stats 缓存。
```

### OSS 上传

```
帮我实现书籍封面上传功能:

1. Multer 中间件配置: 内存存储、只允许 JPG/PNG/WebP、最大 5MB
2. 阿里云 OSS 上传: 使用 ali-oss SDK，上传到 covers/ 目录
3. API: POST /api/v1/books/:id/cover (需要认证)
4. 上传新封面时自动删除旧封面
5. 更新 book.coverUrl 字段
6. 清除相关缓存
```

### WebSocket

```
帮我集成 Socket.IO 实时通知:

后端:
1. JWT 认证的 WebSocket 连接
2. 每个用户加入 user:<userId> 房间
3. 提供 notifyUser(userId, event, data) 方法
4. 书籍 CRUD 时发送通知

前端:
1. useSocket() hook — 管理连接和接收通知
2. NotificationToast 组件 — 右上角弹出通知，5秒后自动消失
3. 在 Layout 组件中渲染 NotificationToast
```

### 调试

```
我的 Redis 缓存似乎没有生效，每次请求都还是查数据库。

排查步骤:
1. redis-cli ping → PONG (连接正常)
2. 后端日志显示 "Redis connected"
3. 手动执行 redis-cli keys '*' → 返回空

可能原因: TTL 设置过短、缓存键不匹配、序列化问题。

帮我添加调试日志来定位问题。
```

---

## 每日回顾

Day 6 结束前，回答以下问题：

1. **Cache-Aside 模式是什么？如果缓存和数据库数据不一致了怎么办？**
2. **Redis 缓存的 TTL 应该怎么设置？不同的数据应该有不同的 TTL 吗？为什么？**
3. **WebSocket 和 HTTP 轮询相比有什么优势？什么场景下应该用 WebSocket？**
4. **文件上传为什么不能直接存在服务器磁盘上？OSS 解决了什么问题？**
5. **接口限流的原理是什么？如果你来设计，登录接口应该怎么限制？**
