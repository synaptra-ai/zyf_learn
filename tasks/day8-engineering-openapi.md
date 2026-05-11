# Day 8：工程化重构 + OpenAPI 接口契约


> 本文档是 BookNest Day 8-11 阶段的独立任务文档之一。  
> 这一阶段仍然采用前 7 天的“带着跑”模式：给出明确技术栈、文件路径、实现步骤、核心代码、验收标准、Git 提交建议和 Prompt 模板。  
> 阶段目标：把 BookNest 从“能上线的全栈应用”继续推进到“具备工程化、自动回归、多租户权限、订单状态机、异步任务和数据库一致性能力的准生产级应用”。

## 本阶段统一前置条件

开始前请确保：

- [ ] Day 1-7 的 BookNest 项目可以本地运行。
- [ ] 前端端口仍为 `http://localhost:4001`。
- [ ] 后端端口仍为 `http://localhost:4000`。
- [ ] PostgreSQL 仍使用宿主机端口 `5433`。
- [ ] Redis 可通过 Docker 启动，端口为 `6379`。
- [ ] `docker-compose.yml` 能启动 PostgreSQL / Redis。
- [ ] 后端已有 JWT 认证、Book / Category / Review CRUD、Redis 缓存、OSS 上传、Socket.IO、日志和健康检查。
- [ ] GitHub Actions 已有基础测试与部署流程（ECS Self-hosted Runner 版）。

建议在进入本阶段时先创建分支：

```bash
git checkout -b feat/day8-11-engineering-stage
```

---

## 项目简介

前 7 天已经完成了完整全栈链路，但真实团队协作中，仅仅“功能能跑”还不够。今天要把项目从“能跑”升级到“可维护、可协作、可生成文档、可自动检查”。

**今天的目标**：完成一次系统性工程化补强，引入 ESLint / Prettier / OpenAPI / 前端类型生成，并写出项目架构说明。

---

## 学习目标

完成今天后，你将掌握：

1. 如何整理全栈项目目录和边界。
2. 如何建立统一代码风格和静态检查。
3. 如何用 Zod 描述接口输入输出。
4. 如何把 Zod schema 注册成 OpenAPI 文档。
5. 如何用 Swagger UI 查看和调试接口。
6. 如何从 OpenAPI 自动生成前端 TypeScript 类型。
7. 如何编写 `ARCHITECTURE.md`，让别人快速理解项目。

---

## 技术栈

| 技术 | 用途 |
|---|---|
| ESLint | 静态代码检查 |
| Prettier | 代码格式化 |
| Zod | 请求 / 响应 schema |
| @asteasolutions/zod-to-openapi | Zod → OpenAPI |
| swagger-ui-express | 后端暴露 Swagger 文档 |
| openapi-typescript | 前端生成 API 类型 |
| tsx | 运行 TypeScript 脚本 |

---

## 功能清单

### Must-Have

| # | 功能 | 说明 |
|---|---|---|
| 1 | 前后端 ESLint / Prettier | 统一格式和基础质量规则 |
| 2 | 后端 Zod schema | Auth / Book / Category / Review 的核心 schema |
| 3 | OpenAPI 文档 | `/api-docs` 和 `/openapi.json` 可访问 |
| 4 | 前端类型生成 | 基于 OpenAPI 生成 `src/types/api.generated.ts` |
| 5 | API client 类型化 | 至少 Book 列表 / 创建 / 更新使用生成类型 |
| 6 | 架构文档 | `ARCHITECTURE.md` 说明模块职责和数据流 |
| 7 | CI 检查 | lint / build / openapi 生成能在 CI 中跑 |

### Nice-to-Have

| # | 功能 | 说明 |
|---|---|---|
| 8 | 统一 DTO 目录 | `schemas/`、`dto/`、`types/` 职责清晰 |
| 9 | API 版本文档 | OpenAPI 中标明 `v1` |
| 10 | 自动校验 OpenAPI diff | 接口变更时提醒前端类型更新 |

---

## Step 1：安装代码质量依赖

### 1.1 后端安装

```bash
cd booknest/backend
npm install zod @asteasolutions/zod-to-openapi swagger-ui-express
npm install -D @types/swagger-ui-express tsx eslint prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-config-prettier
```

### 1.2 前端安装

```bash
cd booknest/frontend
npm install -D eslint prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-config-prettier openapi-typescript
```

### 1.3 根目录创建 `.prettierrc`

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

### 1.4 根目录创建 `.prettierignore`

```txt
node_modules
dist
coverage
logs
backend/generated
frontend/src/types/api.generated.ts
```

### 1.5 后端创建 `eslint.config.js`

路径：`backend/eslint.config.js`

```js
const tsParser = require('@typescript-eslint/parser')
const tsPlugin = require('@typescript-eslint/eslint-plugin')

module.exports = [
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off'
    },
  },
]
```

### 1.6 前端创建 `eslint.config.js`

路径：`frontend/eslint.config.js`

```js
const tsParser = require('@typescript-eslint/parser')
const tsPlugin = require('@typescript-eslint/eslint-plugin')

module.exports = [
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
]
```

### 1.7 更新 package scripts

后端 `backend/package.json`：

```json
{
  "scripts": {
    "lint": "eslint src tests",
    "format": "prettier --write \"src/**/*.ts\" \"tests/**/*.ts\" \"prisma/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\" \"tests/**/*.ts\" \"prisma/**/*.ts\""
  }
}
```

前端 `frontend/package.json`：

```json
{
  "scripts": {
    "lint": "eslint src",
    "format": "prettier --write \"src/**/*.{ts,tsx}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx}\""
  }
}
```

**正反馈时刻**：

```bash
cd backend && npm run lint
cd ../frontend && npm run lint
```

即使有 warning，也不要慌。先让检查跑起来，后面逐步修。

---

## Step 2：整理后端 schema 目录

### 2.1 创建目录

```bash
cd booknest/backend
mkdir -p src/schemas src/lib/openapi scripts generated
```

建议结构：

```txt
backend/src/
├── schemas/
│   ├── common.schema.ts
│   ├── auth.schema.ts
│   ├── book.schema.ts
│   ├── category.schema.ts
│   └── review.schema.ts
├── lib/
│   └── openapi.ts
└── middleware/
    └── zodValidate.ts
```

### 2.2 创建通用 schema

路径：`backend/src/schemas/common.schema.ts`

```ts
import { z } from 'zod'

export const uuidSchema = z.string().uuid()

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
})

export const errorResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  details: z.unknown().optional(),
})

export const successResponse = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    code: z.number(),
    message: z.string(),
    data,
  })

export const paginatedResponse = <T extends z.ZodTypeAny>(item: T) =>
  successResponse(
    z.object({
      items: z.array(item),
      total: z.number(),
      page: z.number(),
      pageSize: z.number(),
      totalPages: z.number(),
    }),
  )
```

### 2.3 创建 Book schema

路径：`backend/src/schemas/book.schema.ts`

```ts
import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const bookStatusSchema = z.enum(['OWNED', 'READING', 'FINISHED', 'WISHLIST'])

export const bookSchema = z.object({
  id: z.string().uuid().openapi({ example: '4e8311a0-8f32-4e9d-a17b-0e9f12345678' }),
  title: z.string().openapi({ example: 'Clean Code' }),
  author: z.string().openapi({ example: 'Robert C. Martin' }),
  isbn: z.string().nullable().optional(),
  pageCount: z.number().nullable().optional(),
  description: z.string().nullable().optional(),
  coverUrl: z.string().nullable().optional(),
  status: bookStatusSchema,
  categoryId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const createBookBodySchema = z.object({
  title: z.string().min(1, '书名不能为空').max(200),
  author: z.string().min(1, '作者不能为空').max(100),
  isbn: z.string().max(13).optional(),
  pageCount: z.number().int().positive().optional(),
  description: z.string().max(2000).optional(),
  coverUrl: z.string().url().optional(),
  status: bookStatusSchema.default('WISHLIST'),
  categoryId: z.string().uuid().optional(),
})

export const updateBookBodySchema = createBookBodySchema.partial()

export const listBooksQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  status: bookStatusSchema.optional(),
  categoryId: z.string().uuid().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type CreateBookBody = z.infer<typeof createBookBodySchema>
export type UpdateBookBody = z.infer<typeof updateBookBodySchema>
export type ListBooksQuery = z.infer<typeof listBooksQuerySchema>
```

### 2.4 创建 Auth schema

路径：`backend/src/schemas/auth.schema.ts`

```ts
import { z } from 'zod'

export const userPublicSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  createdAt: z.string().datetime().optional(),
})

export const registerBodySchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少 6 位'),
  name: z.string().min(1, '姓名不能为空').max(50),
})

export const loginBodySchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(1, '密码不能为空'),
})

export const authResponseSchema = z.object({
  token: z.string(),
  user: userPublicSchema,
})
```

---

## Step 3：用 Zod 替换部分请求校验

### 3.1 创建 Zod 校验中间件

路径：`backend/src/middleware/zodValidate.ts`

```ts
import { NextFunction, Request, Response } from 'express'
import { ZodSchema } from 'zod'
import { ApiError } from '@/utils/errors'

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      return next(new ApiError(400, 'Validation failed', result.error.flatten()))
    }
    req.body = result.data
    next()
  }
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query)
    if (!result.success) {
      return next(new ApiError(400, 'Validation failed', result.error.flatten()))
    }
    req.query = result.data as any
    next()
  }
}
```

### 3.2 在 Book 路由中使用

路径：`backend/src/routes/book.routes.ts`

```ts
import { Router } from 'express'
import { authenticate } from '@/middleware/auth'
import { validateBody, validateQuery } from '@/middleware/zodValidate'
import {
  createBookBodySchema,
  updateBookBodySchema,
  listBooksQuerySchema,
} from '@/schemas/book.schema'
import * as bookController from '@/controllers/book.controller'

const router = Router()

router.get('/', authenticate, validateQuery(listBooksQuerySchema), bookController.list)
router.post('/', authenticate, validateBody(createBookBodySchema), bookController.create)
router.put('/:id', authenticate, validateBody(updateBookBodySchema), bookController.update)
router.delete('/:id', authenticate, bookController.remove)

export default router
```

**正反馈时刻**：故意传一个空标题：

```bash
curl -X POST http://localhost:4000/api/v1/books \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"","author":"Tom"}'
```

应该返回 `400 Validation failed`，并带有字段错误信息。

---

## Step 4：创建 OpenAPI 注册器

### 4.1 创建 `openapi.ts`

路径：`backend/src/lib/openapi.ts`

```ts
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { bookSchema, createBookBodySchema, listBooksQuerySchema } from '@/schemas/book.schema'
import { authResponseSchema, loginBodySchema, registerBodySchema } from '@/schemas/auth.schema'
import { errorResponseSchema, paginatedResponse, successResponse } from '@/schemas/common.schema'

extendZodWithOpenApi(z)

export const registry = new OpenAPIRegistry()

registry.register('Book', bookSchema)
registry.register('CreateBookBody', createBookBodySchema)
registry.register('LoginBody', loginBodySchema)
registry.register('RegisterBody', registerBodySchema)
registry.register('AuthResponse', authResponseSchema)
registry.register('ErrorResponse', errorResponseSchema)

registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/login',
  summary: '用户登录',
  request: {
    body: {
      content: {
        'application/json': {
          schema: loginBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: '登录成功',
      content: {
        'application/json': {
          schema: successResponse(authResponseSchema),
        },
      },
    },
    400: {
      description: '参数错误',
      content: {
        'application/json': { schema: errorResponseSchema },
      },
    },
  },
})

registry.registerPath({
  method: 'get',
  path: '/api/v1/books',
  summary: '书籍列表',
  security: [{ bearerAuth: [] }],
  request: {
    query: listBooksQuerySchema,
  },
  responses: {
    200: {
      description: '书籍分页列表',
      content: {
        'application/json': {
          schema: paginatedResponse(bookSchema),
        },
      },
    },
  },
})

registry.registerPath({
  method: 'post',
  path: '/api/v1/books',
  summary: '创建书籍',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: createBookBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: '创建成功',
      content: {
        'application/json': {
          schema: successResponse(bookSchema),
        },
      },
    },
  },
})

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions)

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'BookNest API',
      version: '1.0.0',
      description: 'BookNest 全栈藏书管理系统 API 文档',
    },
    servers: [
      { url: 'http://localhost:4000', description: 'Local development' },
      { url: 'https://booknest.yourdomain.com', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  })
}
```

---

## Step 5：后端暴露 Swagger 文档

### 5.1 修改 `server.ts`

路径：`backend/src/server.ts`

```ts
import swaggerUi from 'swagger-ui-express'
import { generateOpenApiDocument } from '@/lib/openapi'

const openApiDocument = generateOpenApiDocument()

app.get('/openapi.json', (_req, res) => {
  res.json(openApiDocument)
})

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument))
```

注意：这段代码放在业务路由注册之前或之后都可以，但建议放在 `/api/v1` 路由之前，方便调试。

### 5.2 验证

```bash
cd backend
npm run dev
```

浏览器打开：

```txt
http://localhost:4000/api-docs
http://localhost:4000/openapi.json
```

**正反馈时刻**：Swagger UI 页面能看到 `POST /api/v1/auth/login` 和 `GET /api/v1/books`，并能点击展开查看请求参数和响应格式。

---

## Step 6：生成前端 API 类型

### 6.1 启动后端

```bash
cd booknest/backend
npm run dev
```

### 6.2 前端生成类型

```bash
cd booknest/frontend
npx openapi-typescript http://localhost:4000/openapi.json -o src/types/api.generated.ts
```

### 6.3 增加脚本

前端 `package.json`：

```json
{
  "scripts": {
    "api:types": "openapi-typescript http://localhost:4000/openapi.json -o src/types/api.generated.ts"
  }
}
```

### 6.4 在 hooks 中使用生成类型

路径：`frontend/src/hooks/useBooks.ts`

```ts
import type { paths } from '@/types/api.generated'

type ListBooksResponse =
  paths['/api/v1/books']['get']['responses']['200']['content']['application/json']['data']

type CreateBookBody =
  paths['/api/v1/books']['post']['requestBody']['content']['application/json']

export function useBooks(filters: BookFilters) {
  return useQuery<ListBooksResponse>({
    queryKey: bookKeys.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get('/books', { params: filters })
      return data
    },
  })
}

export function useCreateBook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: CreateBookBody) => {
      const { data } = await apiClient.post('/books', body)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookKeys.lists() })
    },
  })
}
```

**正反馈时刻**：如果你把 `title` 写成 `bookTitle`，TypeScript 应该能提示类型不匹配。

---

## Step 7：创建 OpenAPI 生成脚本

上面是从正在运行的服务读取 OpenAPI。为了 CI 更稳定，可以直接从代码生成本地 JSON。

### 7.1 创建脚本

路径：`backend/scripts/generate-openapi.ts`

```ts
import fs from 'fs'
import path from 'path'
import { generateOpenApiDocument } from '../src/lib/openapi'

const document = generateOpenApiDocument()
const outputPath = path.resolve(__dirname, '../generated/openapi.json')

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, JSON.stringify(document, null, 2))

console.log(`OpenAPI generated: ${outputPath}`)
```

### 7.2 后端 package script

```json
{
  "scripts": {
    "openapi:generate": "tsx scripts/generate-openapi.ts"
  }
}
```

### 7.3 前端从本地文件生成类型

把 `backend/generated/openapi.json` 复制或引用到前端：

```bash
cd booknest/backend
npm run openapi:generate

cd ../frontend
npx openapi-typescript ../backend/generated/openapi.json -o src/types/api.generated.ts
```

前端脚本：

```json
{
  "scripts": {
    "api:types:local": "openapi-typescript ../backend/generated/openapi.json -o src/types/api.generated.ts"
  }
}
```

---

## Step 8：编写架构文档

路径：`booknest/ARCHITECTURE.md`

建议内容：

```md
# BookNest Architecture

### 1. 系统概览

BookNest 是一个全栈藏书管理系统，包含：

- frontend：React + TypeScript + Vite
- backend：Express + TypeScript + Prisma
- database：PostgreSQL
- cache：Redis
- storage：阿里云 OSS
- realtime：Socket.IO
- deployment：Docker Compose + Nginx + GitHub Actions

### 2. 数据流

用户操作 UI
→ React Query hook
→ Axios API client
→ Express route
→ Controller
→ Service
→ Prisma / Redis / OSS
→ 返回响应
→ React Query 更新缓存
→ UI 重新渲染

### 3. 认证流程

登录成功后，后端返回 JWT。
前端将 token 存入 auth store。
Axios 拦截器将 token 注入 Authorization header。
后端 authenticate middleware 校验 token。

### 4. 服务端分层

- routes：路径和中间件
- controllers：解析请求，返回响应
- services：业务逻辑
- schemas：请求和响应 schema
- lib：基础设施，如 prisma、redis、oss、logger
- middleware：认证、校验、错误处理、限流

### 5. 接口契约

接口 schema 使用 Zod 定义。
OpenAPI 文档通过 zod-to-openapi 生成。
前端通过 openapi-typescript 生成 API 类型。

### 6. 缓存策略

采用 Cache-Aside 模式。
读取时先查 Redis，miss 后查数据库并写缓存。
写入 Book / Category / Review 后清理相关缓存。

### 7. 部署架构

用户请求 HTTPS 域名
→ Nginx
→ 前端静态资源 / 后端 API 反向代理
→ Docker Compose 中的 frontend/backend/postgres/redis
```

---

## Step 9：更新 CI

路径：`.github/workflows/deploy.yml`

> **前提**：本项目已切换为 ECS Self-hosted Runner 方案（参见 `tasks/day4-deploy-v2-self-hosted-runner.md`）。
> CI 中的 `runs-on` 为 `[self-hosted, linux, x64]`，路径前缀为 `booknest/`。

在 test job 中增加以下步骤（注意路径前缀是 `booknest/`）：

```yaml
# 在已有的 "Test Backend" 步骤之后添加
- name: Backend lint and OpenAPI
  run: |
    cd booknest/backend
    npm run lint
    npm run openapi:generate

# 在已有的 "Test Frontend" 步骤之后添加
- name: Frontend lint and API types
  run: |
    cd booknest/frontend
    npm run lint
    npm run api:types:local
    npm run build
```

注意：
- `npm ci` 已在前面的步骤中执行过，这里不需要重复。
- 如果 CI 中前端无法访问后端运行中的 `/openapi.json`，就使用本地 `../backend/generated/openapi.json` 方案（`api:types:local` 脚本已处理）。
- 这些步骤运行在 ECS Self-hosted Runner 上，不需要额外安装依赖。

---

## Day 8 验收标准 Checklist

- [ ] 后端 `npm run lint` 可运行。
- [ ] 前端 `npm run lint` 可运行。
- [ ] `npm run format:check` 可检查格式。
- [ ] 后端存在 `src/schemas/` 目录。
- [ ] Book / Auth 至少 2 个模块已使用 Zod schema。
- [ ] `GET /openapi.json` 返回 OpenAPI JSON。
- [ ] `GET /api-docs` 可以打开 Swagger UI。
- [ ] 前端可以生成 `src/types/api.generated.ts`。
- [ ] `useBooks` 或 `useCreateBook` 至少一个 hook 使用生成类型。
- [ ] `ARCHITECTURE.md` 已完成。
- [ ] CI 中包含 lint、OpenAPI 生成、前端类型生成。
- [ ] `npm run build` 前后端均通过。

---

## Day 8 Git Commit 示例

```bash
git add .
git commit -m "chore: add eslint and prettier checks"
git commit -m "feat: add zod schemas for auth and books"
git commit -m "feat: generate OpenAPI document from zod schemas"
git commit -m "feat: add Swagger UI and openapi.json endpoint"
git commit -m "feat: generate frontend API types from OpenAPI"
git commit -m "docs: add architecture overview"
```

---

## Day 8 Prompt 模板

### OpenAPI schema

```txt
帮我为 BookNest 的 Book 模块创建 Zod schema 和 OpenAPI 注册代码。

要求：
1. 定义 bookSchema、createBookBodySchema、updateBookBodySchema、listBooksQuerySchema
2. BookStatus 枚举为 OWNED / READING / FINISHED / WISHLIST
3. 注册 GET /api/v1/books 和 POST /api/v1/books 到 OpenAPI
4. 响应格式遵循 { code, message, data }
5. 使用 @asteasolutions/zod-to-openapi
```

### 前端类型生成

```txt
我已经有后端 OpenAPI JSON，路径是 ../backend/generated/openapi.json。
请帮我在前端配置 openapi-typescript，并修改 useBooks hook，让它使用生成的 paths 类型。
要求保留 React Query 的 query key 和缓存失效逻辑。
```

### 代码审查

```txt
请帮我 review 当前 BookNest 项目的目录结构。
重点看：
1. routes / controllers / services / schemas 是否职责清晰
2. 是否有重复类型定义
3. 前后端接口类型是否一致
4. 有哪些代码可以抽取或简化
```

---

## Day 8 每日回顾

1. OpenAPI 和 Swagger UI 分别解决了什么问题？
2. 为什么要从接口文档生成前端类型，而不是手写类型？
3. Zod schema 和 TypeScript type 有什么区别？
4. 哪些代码你觉得比前 7 天更清晰了？
5. 如果一个字段后端改名了，今天的工程化体系如何帮助你发现问题？

---
