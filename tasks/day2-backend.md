# Day 2: BookNest 后端 API — Express + Prisma + PostgreSQL

## 项目简介

今天是 BookNest 三天项目的第二天。你将搭建一个完整的 RESTful 后端 API，使用 Express + TypeScript + Prisma ORM + PostgreSQL 技术栈，为昨天的前端提供真实的数据服务。

**今天的目标**: 完成一个有认证、有权限、有测试的生产级后端 API。

---

## 学习目标

完成今天的工作后，你将掌握：

1. **Express + TypeScript** 后端项目结构和最佳实践
2. **Prisma ORM** Schema 设计、迁移、种子数据、CRUD 操作
3. **PostgreSQL** 关系型数据库操作 (通过 Prisma)
4. **RESTful API** 设计规范：分页、过滤、排序、错误处理
5. **JWT 认证** 注册、登录、token 验证
6. **Controller-Service 分层** 架构模式
7. **Jest + Supertest** 自动化 API 测试

---

## 技术栈

| 技术 | 用途 |
|------|------|
| Express 4 | Web 框架 |
| TypeScript 5 | 类型安全 |
| Prisma 5 | ORM (对象关系映射) |
| PostgreSQL 16 | 关系型数据库 |
| JWT (jsonwebtoken) | 认证 |
| bcrypt | 密码加密 |
| express-validator | 输入验证 |
| helmet | 安全头 |
| cors | 跨域 |
| dotenv | 环境变量 |
| Jest | 测试框架 |
| ts-jest | TypeScript 测试支持 |
| supertest | HTTP 测试 |
| @faker-js/faker | 模拟数据生成 |
| ts-node-dev | 热重载开发 |

---

## 功能清单

### Must-Have (必做)

| # | 功能 | 说明 |
|---|------|------|
| 1 | 项目脚手架 | Express + TS + ts-node-dev + 路径别名 `@/` |
| 2 | Prisma Schema | 4 个模型 + 关系 + 种子脚本 |
| 3 | 基础设施 | Prisma 单例、统一响应格式、错误中间件、健康检查 |
| 4 | Auth 接口 | 注册、登录(返回JWT)、获取当前用户 |
| 5 | Book CRUD | 分页 + 过滤 + 排序 + 权限校验 |
| 6 | Category CRUD | 基础 CRUD + 权限校验 |
| 7 | Review 接口 | 创建评论 + 按书籍列表 |
| 8 | 输入验证 | express-validator 所有写接口 |
| 9 | 自动化测试 | 10+ 测试 (5 单元 + 5 集成) |

### Nice-to-Have (加量)

| # | 功能 | 说明 |
|---|------|------|
| 10 | 统计接口 | GET /stats 书架概览 |
| 11 | Redis 缓存 | ioredis 缓存热门接口 |
| 12 | 文件上传 | Multer 上传书籍封面 |
| 13 | 批量导入 | POST /books/batch |
| 14 | API 限流 | express-rate-limit |

---

## 数据模型设计

### Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum BookStatus {
  OWNED
  READING
  FINISHED
  WISHLIST
}

enum UserRole {
  USER
  ADMIN
}

model User {
  id           String     @id @default(uuid())
  email        String     @unique
  passwordHash String     @map("password_hash")
  name         String
  role         UserRole   @default(USER)
  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt @map("updated_at")

  books     Book[]
  categories Category[]
  reviews   Review[]

  @@map("users")
}

model Book {
  id            String     @id @default(uuid())
  title         String     @db.VarChar(200)
  author        String     @db.VarChar(100)
  isbn          String?    @db.VarChar(13)
  publishedDate DateTime?  @map("published_date")
  pageCount     Int?       @map("page_count")
  description   String?    @db.Text
  coverUrl      String?    @map("cover_url")
  status        BookStatus @default(WISHLIST)
  createdAt     DateTime   @default(now()) @map("created_at")
  updatedAt     DateTime   @updatedAt @map("updated_at")

  userId     String    @map("user_id")
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  categoryId String?   @map("category_id")
  category   Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  reviews    Review[]

  @@map("books")
}

model Category {
  id        String   @id @default(uuid())
  name      String   @db.VarChar(50)
  color     String   @db.VarChar(7) // hex color like #3B82F6
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  userId String @map("user_id")
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  books  Book[]

  @@unique([userId, name])
  @@map("categories")
}

model Review {
  id        String   @id @default(uuid())
  rating    Int      // 1-5
  text      String?  @db.Text
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  bookId String @map("book_id")
  book   Book   @relation(fields: [bookId], references: [id], onDelete: Cascade)
  userId String @map("user_id")
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("reviews")
}
```

### 关系说明

```
User 1 ──→ N Book       (一个用户有多本书)
User 1 ──→ N Category   (一个用户有多个分类)
User 1 ──→ N Review     (一个用户写多条评论)
Book 1 ──→ N Review     (一本书有多条评论)
Category 1 ──→ N Book   (一个分类下有多本书)
```

---

## API 接口设计

### 认证接口

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/v1/auth/register` | 注册 | 无 |
| POST | `/api/v1/auth/login` | 登录，返回 JWT | 无 |
| GET | `/api/v1/auth/me` | 获取当前用户 | JWT |

### 书籍接口

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/v1/books` | 书籍列表(分页+过滤+排序) | JWT |
| GET | `/api/v1/books/:id` | 书籍详情(含评论) | JWT |
| POST | `/api/v1/books` | 创建书籍 | JWT |
| PUT | `/api/v1/books/:id` | 更新书籍 | JWT (仅自己的) |
| DELETE | `/api/v1/books/:id` | 删除书籍 | JWT (仅自己的) |

### 分类接口

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/v1/categories` | 分类列表 | JWT |
| POST | `/api/v1/categories` | 创建分类 | JWT |
| PUT | `/api/v1/categories/:id` | 更新分类 | JWT (仅自己的) |
| DELETE | `/api/v1/categories/:id` | 删除分类 | JWT (仅自己的) |

### 评论接口

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/v1/books/:bookId/reviews` | 书籍的评论列表 | JWT |
| POST | `/api/v1/books/:bookId/reviews` | 创建评论 | JWT |

### 其他接口

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/health` | 健康检查 | 无 |
| GET | `/api/v1/stats` | 统计数据 | JWT |

### 请求/响应格式

**成功响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

**分页响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [...],
    "total": 42,
    "page": 1,
    "pageSize": 10,
    "totalPages": 5
  }
}
```

**错误响应**:
```json
{
  "code": 400,
  "message": "Validation failed",
  "details": [
    { "field": "title", "message": "Title is required" }
  ]
}
```

---

## 分步实施指南

### Step 1: 项目初始化 + 数据库 (45 分钟)

1. 在你的 booknest repo 中创建后端项目：
   ```bash
   cd booknest    # 进入你的 repo 根目录
   mkdir backend && cd backend
   npm init -y
   ```

2. 安装依赖：
   ```bash
   # 运行时依赖
   npm install express cors helmet dotenv prisma @prisma/client jsonwebtoken bcrypt express-validator

   # 开发依赖
   npm install -D typescript ts-node-dev @types/express @types/cors @types/jsonwebtoken @types/bcrypt jest ts-jest supertest @types/jest @types/supertest @types/node @faker-js/faker
   ```

3. 初始化 TypeScript：
   ```bash
   npx tsc --init
   ```
   配置 `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "module": "commonjs",
       "lib": ["ES2020"],
       "outDir": "./dist",
       "rootDir": "./src",
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true,
       "resolveJsonModule": true,
       "declaration": true,
       "baseUrl": ".",
       "paths": { "@/*": ["./src/*"] }
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules", "dist"]
   }
   ```

4. 初始化 Prisma：
   ```bash
   npx prisma init
   ```
   把上面的 Schema 写入 `prisma/schema.prisma`

5. 启动 PostgreSQL（**使用 5433 端口，避免与其他项目冲突**）：
   ```bash
   docker run -d \
     --name booknest-pg \
     -e POSTGRES_USER=booknest \
     -e POSTGRES_PASSWORD=booknest123 \
     -e POSTGRES_DB=booknest \
     -p 5433:5432 \
     postgres:16-alpine
   ```

6. 配置 `.env`：
   ```
   DATABASE_URL="postgresql://booknest:booknest123@localhost:5433/booknest"
   JWT_SECRET="booknest-dev-secret-change-in-production"
   PORT=4000
   ```
   > 注意：DATABASE_URL 用 5433 端口（映射到容器内的 5432）

7. 确保 `.env` 在 `.gitignore` 中，然后运行第一次迁移：
   ```bash
   npx prisma migrate dev --name init
   ```

8. 添加 npm scripts：
   ```json
   {
     "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
     "build": "tsc",
     "start": "node dist/index.js",
     "test": "jest",
     "prisma:seed": "ts-node --transpile-only prisma/seed.ts",
     "prisma:studio": "npx prisma studio"
   }
   ```

**正反馈时刻**: 运行 `npx prisma studio`，浏览器打开可视化数据库管理界面，看到你定义的表结构。

---

### Step 2: 服务器基础架构 (30 分钟)

1. **`src/lib/prisma.ts`** — Prisma 单例
   ```typescript
   import { PrismaClient } from '@prisma/client'

   const prisma = new PrismaClient()
   export default prisma
   ```

2. **`src/utils/response.ts`** — 统一响应工具
   ```typescript
   export const ResponseUtil = {
     success(res, data, message = 'success', code = 200) { ... },
     paginated(res, items, total, page, pageSize) { ... },
     error(res, message, code = 400, details?) { ... },
   }
   ```

3. **`src/utils/errors.ts`** — 自定义错误类
   ```typescript
   export class ApiError extends Error {
     constructor(public statusCode: number, message: string, public details?: any) {
       super(message)
     }
   }
   ```

4. **`src/middleware/auth.ts`** — JWT 认证中间件
   ```typescript
   export const authenticate = (req, res, next) => {
     const token = req.headers.authorization?.replace('Bearer ', '')
     if (!token) throw new ApiError(401, '未提供认证令牌')
     const decoded = jwt.verify(token, process.env.JWT_SECRET)
     req.user = decoded
     next()
   }
   ```

5. **`src/middleware/validate.ts`** — 验证中间件
   ```typescript
   export const validate = (req, res, next) => {
     const errors = validationResult(req)
     if (!errors.isEmpty()) {
       return ResponseUtil.error(res, 'Validation failed', 400, errors.array())
     }
     next()
   }
   ```

6. **`src/middleware/errorHandler.ts`** — 全局错误处理

7. **`src/server.ts`** — Express 服务器配置
   ```typescript
   import express from 'express'
   import cors from 'cors'
   import helmet from 'helmet'
   import { errorHandler } from './middleware/errorHandler'
   import routes from './routes'

   const app = express()
   app.use(helmet())
   app.use(cors())
   app.use(express.json())
   app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))
   app.use('/api/v1', routes)
   app.use(errorHandler)
   export default app
   ```

8. **`src/index.ts`** — 入口文件
   ```typescript
   import dotenv from 'dotenv'
   dotenv.config()
   import app from './server'
   const PORT = process.env.PORT || 4000
   app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
   ```

**正反馈时刻**: `npm run dev` 启动服务器，`curl http://localhost:4000/health` 返回 `{"status":"ok"}`。

---

### Step 3: 种子数据 (30 分钟)

**`prisma/seed.ts`**:

```typescript
import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // 清空数据
  await prisma.review.deleteMany()
  await prisma.book.deleteMany()
  await prisma.category.deleteMany()
  await prisma.user.deleteMany()

  // 创建测试用户 (密码: password123)
  const passwordHash = await bcrypt.hash('password123', 10)
  const user = await prisma.user.create({
    data: { email: 'test@booknest.com', passwordHash, name: '测试用户' }
  })

  // 创建分类
  const categories = await Promise.all([
    prisma.category.create({ data: { name: '科幻', color: '#3B82F6', userId: user.id } }),
    prisma.category.create({ data: { name: '文学', color: '#EF4444', userId: user.id } }),
    prisma.category.create({ data: { name: '技术', color: '#10B981', userId: user.id } }),
    prisma.category.create({ data: { name: '历史', color: '#F59E0B', userId: user.id } }),
    prisma.category.create({ data: { name: '哲学', color: '#8B5CF6', userId: user.id } }),
  ])

  // 创建 20+ 本书
  const statuses = ['OWNED', 'READING', 'FINISHED', 'WISHLIST']
  for (let i = 0; i < 25; i++) {
    const book = await prisma.book.create({
      data: {
        title: faker.lorem.words(3),
        author: faker.person.fullName(),
        isbn: faker.string.numeric(13),
        pageCount: faker.number.int({ min: 100, max: 800 }),
        description: faker.lorem.paragraph(),
        status: statuses[faker.number.int({ min: 0, max: 3 })],
        categoryId: categories[faker.number.int({ min: 0, max: 4 })].id,
        userId: user.id,
      }
    })

    // 每本书随机 0-3 条评论
    const reviewCount = faker.number.int({ min: 0, max: 3 })
    for (let j = 0; j < reviewCount; j++) {
      await prisma.review.create({
        data: {
          rating: faker.number.int({ min: 1, max: 5 }),
          text: faker.lorem.sentences(2),
          bookId: book.id,
          userId: user.id,
        }
      })
    }
  }

  console.log('Seed data created successfully!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

运行种子: `npm run prisma:seed`

**正反馈时刻**: 重新打开 `npx prisma studio`，看到 25 本书、5 个分类、各种评论。

---

### Step 4: Auth 接口 (1 小时)

1. **`src/services/auth.service.ts`**
   ```typescript
   - register(email, password, name) → 创建用户
   - login(email, password) → 验证密码，返回 JWT
   - getMe(userId) → 返回用户信息
   ```

2. **`src/controllers/auth.controller.ts`**
   - register: 验证 email 唯一性，bcrypt 加密密码
   - login: bcrypt 比对密码，jwt.sign 生成 token
   - me: 通过 req.user.id 查询用户

3. **`src/routes/auth.routes.ts`**
   ```typescript
   router.post('/register', validate(registerRules), authController.register)
   router.post('/login', validate(loginRules), authController.login)
   router.get('/me', authenticate, authController.me)
   ```

4. **验证规则**:
   - register: email (valid email), password (min 6), name (notEmpty)
   - login: email (valid email), password (notEmpty)

**测试命令**:
```bash
# 注册
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test2@booknest.com","password":"pass123","name":"New User"}'

# 登录
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test2@booknest.com","password":"pass123"}'

# 获取当前用户
curl http://localhost:4000/api/v1/auth/me \
  -H "Authorization: Bearer <token>"
```

**正反馈时刻**: 登录成功返回 JWT token，用 token 调 /me 返回用户信息。

---

### Step 5: Book CRUD (1.5 小时)

1. **`src/services/book.service.ts`**
   ```typescript
   - list(userId, { page, pageSize, status, categoryId, sortBy, sortOrder })
     → Prisma findMany + count, 返回分页数据
   - getById(userId, bookId)
     → Prisma findUnique, include category + reviews, 校验 userId
   - create(userId, data)
     → Prisma create
   - update(userId, bookId, data)
     → 校验所有权, Prisma update
   - delete(userId, bookId)
     → 校验所有权, Prisma delete
   ```

2. **`src/controllers/book.controller.ts`**
3. **`src/routes/book.routes.ts`**

**测试命令**:
```bash
# 书籍列表 (带分页和过滤)
curl "http://localhost:4000/api/v1/books?page=1&pageSize=5&status=READING" \
  -H "Authorization: Bearer <token>"

# 创建书籍
curl -X POST http://localhost:4000/api/v1/books \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Clean Code","author":"Robert C. Martin","pageCount":464,"status":"READING"}'

# 获取详情
curl http://localhost:4000/api/v1/books/<book-id> \
  -H "Authorization: Bearer <token>"
```

**正反馈时刻**: 分页查询返回精确的数据切片，过滤只返回匹配的书。

---

### Step 6: Category CRUD (45 分钟)

同样的 Controller-Service-Route 模式：

1. `src/services/category.service.ts` — list, create, update, delete
2. `src/controllers/category.controller.ts`
3. `src/routes/category.routes.ts`

---

### Step 7: Review 接口 (45 分钟)

1. `src/services/review.service.ts` — create, listByBook
2. `src/controllers/review.controller.ts`
3. `src/routes/review.routes.ts`

挂载到 book routes 下:
```typescript
router.post('/:bookId/reviews', authenticate, validate(createReviewRules), reviewController.create)
router.get('/:bookId/reviews', authenticate, reviewController.listByBook)
```

---

### Step 8: 路由注册 (15 分钟)

**`src/routes/index.ts`**:
```typescript
import { Router } from 'express'
import authRoutes from './auth.routes'
import bookRoutes from './book.routes'
import categoryRoutes from './category.routes'

const router = Router()
router.use('/auth', authRoutes)
router.use('/books', bookRoutes)
router.use('/categories', categoryRoutes)
export default router
```

---

### Step 9: 测试 (1.5 小时)

**Jest 配置** — `jest.config.js`:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  setupFilesAfterSetup: ['<rootDir>/tests/setup.ts'],
}
```

**单元测试** (5 个):

1. **`tests/unit/book.service.test.ts`**
   - 测试 list: 正确计算分页
   - 测试过滤: status 过滤返回正确数据
   - 测试权限: 不属于自己的书抛出错误

2. **`tests/unit/auth.service.test.ts`**
   - 测试注册: email 已存在时抛出错误
   - 测试登录: 密码错误时返回 null

**集成测试** (5 个):

1. **`tests/integration/auth.test.ts`**
   - POST /auth/register 成功返回 201
   - POST /auth/register 重复 email 返回 409
   - POST /auth/login 成功返回 JWT

2. **`tests/integration/books.test.ts`**
   - GET /books 无 token 返回 401
   - GET /books 有 token 返回 200 + 分页数据

**正反馈时刻**: 运行 `npm test`，看到 10+ 绿色 PASS，0 个 FAIL。

---

### Step 10: 加量内容 (剩余时间)

**统计接口** `GET /api/v1/stats`:
```typescript
- totalBooks: 总书数
- statusBreakdown: { owned: N, reading: N, finished: N, wishlist: N }
- averageRating: 平均评分
- recentBooks: 最近添加的 5 本
- readingProgress: 本月读完的书数
```

**Redis 缓存**:
```typescript
npm install ioredis

// 用法 (热门书籍缓存 5 分钟)
const cached = await redis.get('stats:popular')
if (cached) return JSON.parse(cached)
const data = await bookService.getPopular()
await redis.setex('stats:popular', 300, JSON.stringify(data))
```

---

## 验收标准 Checklist

- [ ] `npm run dev` 启动在 **4000** 端口无报错
- [ ] `GET /health` 返回 `{"status":"ok","timestamp":"..."}`
- [ ] `POST /auth/register` 创建用户成功返回 201
- [ ] `POST /auth/login` 成功返回 JWT token
- [ ] `GET /auth/me` 无 token 返回 401
- [ ] `GET /books?page=1&pageSize=5` 返回分页数据含 `items`, `total`, `page`, `pageSize`, `totalPages`
- [ ] `GET /books?status=READING` 只返回状态为 READING 的书
- [ ] `POST /books` 无 token 返回 401，空标题返回 400
- [ ] `GET /books/:id` 返回书籍详情含分类和评论
- [ ] `POST /books/:bookId/reviews` rating > 5 返回 400
- [ ] 只能操作自己的数据，操作他人数据返回 403
- [ ] `npm test` 10+ 测试全绿
- [ ] 所有响应遵循 `{code, message, data}` 格式
- [ ] `npx prisma studio` 可打开并浏览数据
- [ ] `.env` 文件已添加到 `.gitignore`

---

## 项目目录结构

```
booknest/
├── frontend/             ← Day 1 创建
├── backend/              ← 今天创建
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── migrations/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── book.controller.ts
│   │   │   ├── category.controller.ts
│   │   │   └── review.controller.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── book.service.ts
│   │   │   ├── category.service.ts
│   │   │   └── review.service.ts
│   │   ├── routes/
│   │   │   ├── index.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── book.routes.ts
│   │   │   ├── category.routes.ts
│   │   │   └── review.routes.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── validate.ts
│   │   │   └── errorHandler.ts
│   │   ├── lib/
│   │   │   └── prisma.ts
│   │   ├── utils/
│   │   │   ├── response.ts
│   │   │   └── errors.ts
│   │   ├── types/
│   │   │   └── express.d.ts
│   │   ├── server.ts
│   │   └── index.ts
│   ├── tests/
│   │   ├── setup.ts
│   │   ├── unit/
│   │   └── integration/
│   ├── .env
│   ├── .gitignore
│   ├── package.json
│   ├── tsconfig.json
│   └── jest.config.js
├── CLAUDE.md
└── .gitignore
```

---

## Git 工作规范

### 分支策略

```bash
cd booknest   # repo 根目录
git checkout -b feat/day2-backend

# 在 backend/ 目录下工作
cd backend
```

### .gitignore (backend)

```
node_modules/
dist/
.env
*.env.local
coverage/
```

### Commit 示例

```bash
git commit -m "feat: add Prisma schema with User, Book, Category, Review models"
git commit -m "feat: add seed script with faker-generated test data"
git commit -m "feat: implement auth endpoints (register, login, me)"
git commit -m "feat: implement book CRUD with pagination and filtering"
git commit -m "feat: add JWT authentication middleware"
git commit -m "test: add unit tests for book service"
git commit -m "test: add integration tests for auth and book endpoints"
git commit -m "feat: add /stats endpoint for bookshelf statistics"
```

### 提交节奏
- 每完成一个接口的完整链路 (route → controller → service → prisma) 就 commit
- 测试写完单独 commit
- 种子数据单独 commit

---

## Prompt 模板

### Prisma Schema

```
帮我设计一个藏书管理应用的 Prisma schema，需要以下模型:

1. User: email(唯一), passwordHash, name, role(USER/ADMIN)
2. Book: title, author, isbn(可选), publishedDate(可选), pageCount(可选),
   description(可选), coverUrl(可选), status(枚举: OWNED/READING/FINISHED/WISHLIST),
   关联 User 和 Category
3. Category: name, color(hex颜色), 关联 User, 同一用户下名称唯一
4. Review: rating(1-5整数), text(可选), 关联 Book 和 User

要求:
- 所有模型有 id(UUID), createdAt, updatedAt
- 使用 @@map 映射到蛇形命名表名
- 使用 @map 映射到蛇形命名列名
- 适当的级联删除策略
- 数据库为 PostgreSQL
```

### Express 服务器

```
帮我创建一个 Express + TypeScript 服务器 (src/server.ts)，需要:
1. 使用 helmet 安全头
2. 使用 cors 跨域
3. JSON body parser
4. 健康检查 GET /health
5. API 路由挂载到 /api/v1
6. 全局错误处理中间件
```

### 分页查询

```
帮我实现书籍列表的 Service 方法，支持:
1. 分页: page (默认1), pageSize (默认10)
2. 过滤: status (可选), categoryId (可选)
3. 排序: sortBy (默认createdAt), sortOrder (asc/desc)
4. 返回格式: { items, total, page, pageSize, totalPages }
5. 只返回当前用户的书 (userId 参数)

使用 Prisma ORM，返回 Promise。
```

### 测试

```
帮我写 Jest 集成测试，测试书籍列表接口 GET /api/v1/books:

测试场景:
1. 无 token 时返回 401
2. 有 token 时返回 200 + 分页数据结构 { code, message, data: { items, total, page, pageSize } }
3. status=READING 过滤只返回阅读中的书

使用 supertest 发送请求。
需要在 beforeAll 中创建测试用户并获取 token。
在 afterAll 中清理测试数据并关闭数据库连接。
```

### 调试

```
我的 Prisma 查询返回空数组，但数据库里有数据。

代码:
const books = await prisma.book.findMany({
  where: { userId, status: 'READING' }
})

数据库截图显示有 5 条 READING 状态的记录。

帮我排查:
1. userId 是否正确
2. status 枚举值是否匹配
3. Prisma client 是否需要重新生成
```

---

## Claude Code 使用指南

### 更新 CLAUDE.md

在 repo 根目录的 `CLAUDE.md` 中追加：

```markdown
## 后端 (backend/)

### 技术栈
- Express 4 + TypeScript
- Prisma 5 ORM + PostgreSQL 16
- JWT 认证
- Jest + Supertest 测试

### 开发命令
- cd backend && npm run dev — 启动开发服务器 http://localhost:4000
- cd backend && npm run build — TypeScript 编译
- cd backend && npm test — 运行测试
- cd backend && npm run prisma:seed — 填充种子数据
- cd backend && npm run prisma:studio — 打开数据库可视化界面

### API 基础路径
- /api/v1 — 业务接口
- /health — 健康检查

### 代码架构
- Controller → Service → Prisma
- 所有响应使用 ResponseUtil 统一格式
- 错误使用 ApiError 类 + errorHandler 中间件
- 路由使用 express-validator + validate 中间件

### 数据库
- PostgreSQL 16, Docker 运行, 宿主机端口 5433
- Prisma 迁移: cd backend && npx prisma migrate dev
- 种子数据: cd backend && npm run prisma:seed

### 端口说明
- 前端: http://localhost:4001
- 后端: http://localhost:4000
- PostgreSQL: localhost:5433
```

### 推荐工作流

1. 开始新功能前，用 Claude Code 讨论 schema 设计
2. 写完 service 后立即写单元测试验证逻辑
3. 写完 controller + route 后写集成测试验证接口
4. 每完成一个接口，用 `curl` 手动验证
5. 遇到 Prisma 查询问题，用 `npx prisma studio` 看实际数据
6. 一天结束前用 `/review` 做代码审查

---

## 每日回顾

Day 2 结束前，回答以下问题：

1. **Prisma ORM 和你之前用的数据库访问方式有什么不同？** (比如 Java 的 MyBatis/JPA)
2. **Controller-Service 分层有什么好处？为什么不直接在 Controller 里写逻辑？**
3. **JWT 认证的流程你能画出来吗？** (用户注册 → 登录 → 拿 token → 带 token 请求)
4. **写测试和手动 curl 测试有什么区别？为什么自动化测试更重要？**
5. **今天最卡壳的地方在哪里？**
