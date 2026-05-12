# Day 13：API Client + OpenAPI 类型 + 微信登录 + UnionID / 账号绑定


> BookNest Mini Pro 阶段：Web 功能迁移 + Taro 微信小程序 + 微信生态准生产能力训练。  
> 本阶段承接 Day 1-11：继续复用 Express + Prisma + PostgreSQL + Redis + OSS + JWT + OpenAPI + Workspace/RBAC + Order/Ticket/BullMQ，并把 Web 端能力迁移到 Taro 小程序端。  
> 本阶段已按你的要求去掉 `uni-app 对照实验`，保留 Taro 主线与微信小程序底层能力。

## 本阶段统一项目约定

| 项目 | 约定 |
|---|---|
| Repo 根目录 | `booknest/` |
| Web 前端 | `booknest/apps/web` 或原 `booknest/frontend` |
| Taro 小程序 | `booknest/apps/mini-taro` |
| 后端目录 | `booknest/backend` |
| 共享包目录 | `booknest/packages/*` |
| 后端端口 | `http://localhost:4000` |
| Web 前端端口 | `http://localhost:4001` |
| PostgreSQL | `localhost:5433` |
| Redis | `localhost:6379` |
| API 前缀 | `/api/v1` |
| 小程序运行端 | 微信小程序 `weapp`，可选构建 H5 用于调试 |
| 线上后端 | 阿里云 ECS + Nginx + HTTPS 域名 |

## 本阶段开始前检查

- [ ] Day 1-11 的 BookNest 项目可以本地运行。
- [ ] 后端登录、Book CRUD、Category、Review、上传、Workspace/RBAC、Order/Ticket、BullMQ 可用。
- [ ] OpenAPI 文档可以访问，例如 `http://localhost:4000/api-docs`。
- [ ] GitHub Actions 基础测试与部署流程仍然可用。
- [ ] 已拥有微信小程序 AppID，并能打开微信开发者工具。
- [ ] 阿里云 ECS、域名、HTTPS 证书已经准备好。
- [ ] 当前分支干净：`git status` 没有未提交的重要改动。

建议阶段开始前新建分支：

```bash
git checkout -b feat/day12-18-mini-pro
```

## 本阶段统一学习产出

每天结束时至少产出 4 类内容：

1. 可运行代码：当天核心功能必须能在微信开发者工具中跑通。
2. 验收截图：关键页面、接口、数据库或 CI 结果截图。
3. 文档沉淀：当天对应的架构说明、排错记录或检查清单。
4. 反馈复盘：记录遇到的问题、vibe coding 提示词、人工修正点。


---

## 项目简介

昨天完成了 Taro 小程序工程和静态页面。今天要让小程序接入真实后端：把 Web 端的 Axios + React Query + JWT 体系迁移为 Taro request adapter + React Query + JWT，并新增微信登录、OpenID、UnionID、账号绑定能力。

**今天的目标**：小程序能调用真实 `/api/v1/books`，能通过 `Taro.login()` 完成微信登录，后端能用 code 换取 OpenID，系统能签发自己的 JWT，并支持已有账号绑定微信身份。

---

## 学习目标

完成今天后，你将掌握：

1. 小程序请求和 Web 请求的差异。
2. 如何封装 `Taro.request`，实现 token 注入、响应解包、错误处理。
3. 如何在 Taro 端复用 OpenAPI 生成的 TypeScript 类型。
4. 如何在小程序中接入 TanStack React Query。
5. 微信登录流程：`Taro.login()` → 后端 `code2Session` → OpenID → 本系统 JWT。
6. OpenID、UnionID、session_key 的区别。
7. 账号绑定：邮箱账号和微信身份绑定。
8. 小程序端登录态恢复、退出、401 重新登录。

---

## 技术栈

| 技术 | 用途 |
|---|---|
| Taro.request | 小程序 HTTP 请求 |
| Taro.login | 获取微信登录临时 code |
| TanStack React Query | 服务端状态管理 |
| Zustand | token、user、activeWorkspaceId |
| openapi-typescript | 从后端 OpenAPI 生成类型 |
| Express | 新增微信登录接口 |
| Prisma | User 表新增微信身份字段 |
| JWT | 继续作为业务登录态 |
| Redis | 缓存微信 access_token，后续 Day 16 使用 |

---

## 技术路线

```txt
Taro 页面
  ↓ useBooks / useMe / useLogin
React Query
  ↓ request<T>()
Taro.request adapter
  ↓ Authorization + X-Workspace-Id
Express API
  ↓ Prisma / Redis
PostgreSQL
```

微信登录链路：

```txt
小程序 Taro.login()
  ↓ code
POST /api/v1/wechat/login
  ↓ 后端请求 code2Session
openid / unionid? / session_key
  ↓ 查找或创建 User
签发 BookNest JWT
  ↓
小程序保存 token
```

关键原则：

- `session_key` 只保存在服务端，不下发给小程序。
- `openid` 是用户在当前小程序 AppID 下的唯一标识。
- `unionid` 只有在满足开放平台绑定等条件时才可能返回，不能假设一定存在。
- 小程序端支付、订阅消息、客服、内容安全都应基于后端签发的业务用户身份。

---

## 功能清单

### Must-Have

| # | 功能 | 说明 |
|---|---|---|
| 1 | OpenAPI 类型生成 | 小程序端能使用后端生成类型 |
| 2 | request adapter | 封装 `request<T>()`，统一处理 token、错误、响应 |
| 3 | React Query Provider | 小程序端接入 query client |
| 4 | Book API 联调 | 首页真实展示后端书籍 |
| 5 | 微信登录接口 | `POST /api/v1/wechat/login` |
| 6 | User 微信字段 | `wechatOpenId`、`wechatUnionId`、`wechatSessionKeyHash` 可选 |
| 7 | JWT 登录态 | 微信登录后返回系统 JWT |
| 8 | 账号绑定 | 已有邮箱账号可以绑定微信 |
| 9 | 401 处理 | token 失效后清理本地登录态并跳转登录 |

### Nice-to-Have

| # | 功能 | 说明 |
|---|---|---|
| 1 | 登录态静默恢复 | App 启动时校验 token |
| 2 | 登录 redirect | 未登录访问目标页，登录后返回 |
| 3 | Mock code2Session | 本地无 AppSecret 时可使用 mock 模式 |
| 4 | 安全审计日志 | 登录、绑定、解绑写入 AuditLog |

---

## Step 1：小程序端生成 OpenAPI 类型

在 `packages/api-contract` 创建生成脚本。

```bash
mkdir -p packages/api-contract/src
cat > packages/api-contract/package.json <<'EOF'
{
  "name": "@booknest/api-contract",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "generate": "openapi-typescript ../../backend/generated/openapi.json -o src/openapi.ts"
  },
  "devDependencies": {
    "openapi-typescript": "latest"
  }
}
EOF
```

后端先导出 OpenAPI JSON：

```bash
cd backend
npm run openapi:generate
```

生成类型：

```bash
cd packages/api-contract
pnpm generate
```

小程序引入：

```json
{
  "dependencies": {
    "@booknest/api-contract": "workspace:*"
  }
}
```

---

## Step 2：封装小程序 request adapter

创建 `apps/mini-taro/src/services/request.ts`：

```ts
import Taro from '@tarojs/taro'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { API_BASE_URL } from '@/config/env'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface RequestOptions<TBody = unknown> {
  url: string
  method?: HttpMethod
  data?: TBody
  auth?: boolean
  showErrorToast?: boolean
}

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export async function request<T, TBody = unknown>(options: RequestOptions<TBody>): Promise<T> {
  const token = useAuthStore.getState().token
  const activeWorkspaceId = useWorkspaceStore.getState().activeWorkspaceId

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (options.auth !== false && token) {
    headers.Authorization = `Bearer ${token}`
  }

  if (activeWorkspaceId) {
    headers['X-Workspace-Id'] = activeWorkspaceId
  }

  // url 已含 /api/v1 前缀，API_BASE_URL 只含域名部分
  const fullUrl = options.method === 'GET' && options.data
    ? buildUrlWithQuery(`${API_BASE_URL}${options.url}`, options.data as Record<string, unknown>)
    : `${API_BASE_URL}${options.url}`

  try {
    const res = await Taro.request<ApiResponse<T>>({
      url: fullUrl,
      method: options.method || 'GET',
      data: options.method !== 'GET' ? options.data : undefined,
      header: headers,
    })

    if (res.statusCode === 401) {
      useAuthStore.getState().logout()
      Taro.navigateTo({ url: `/pages/login/index?redirect=${encodeURIComponent(getCurrentPath())}` })
      throw new Error('登录已失效，请重新登录')
    }

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw new Error(res.data?.message || `请求失败：${res.statusCode}`)
    }

    return res.data.data
  } catch (error) {
    const message = error instanceof Error ? error.message : '网络请求失败'
    if (options.showErrorToast !== false) {
      Taro.showToast({ title: message, icon: 'none' })
    }
    throw error
  }
}

// 不使用 URL 构造函数，避免小程序运行时兼容性问题
function buildUrlWithQuery(baseUrl: string, params: Record<string, unknown>) {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')
  return qs ? `${baseUrl}?${qs}` : baseUrl
}

function getCurrentPath() {
  const pages = Taro.getCurrentPages()
  const current = pages[pages.length - 1]
  if (!current) return '/pages/index/index'
  return `/${current.route}`
}
```

---

## Step 3：创建 auth store 和 storage adapter

`apps/mini-taro/src/stores/auth-store.ts`：

```ts
import Taro from '@tarojs/taro'
import { create } from 'zustand'

interface MiniUser {
  id: string
  email?: string | null
  nickname?: string | null
  avatarUrl?: string | null
}

interface AuthState {
  token: string | null
  user: MiniUser | null
  hydrate: () => void
  setSession: (payload: { token: string; user: MiniUser }) => void
  logout: () => void
}

const TOKEN_KEY = 'booknest_token'
const USER_KEY = 'booknest_user'

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  hydrate: () => {
    const token = Taro.getStorageSync<string>(TOKEN_KEY) || null
    const user = Taro.getStorageSync<MiniUser>(USER_KEY) || null
    set({ token, user })
  },
  setSession: (payload) => {
    Taro.setStorageSync(TOKEN_KEY, payload.token)
    Taro.setStorageSync(USER_KEY, payload.user)
    set(payload)
  },
  logout: () => {
    Taro.removeStorageSync(TOKEN_KEY)
    Taro.removeStorageSync(USER_KEY)
    set({ token: null, user: null })
  },
}))
```

在 `app.tsx` 初始化：

```tsx
import { PropsWithChildren, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import './app.scss'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

function App({ children }: PropsWithChildren) {
  useEffect(() => {
    useAuthStore.getState().hydrate()
  }, [])

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

export default App
```

---

## Step 4：创建 Book hooks

`apps/mini-taro/src/services/books.ts`：

```ts
import { request } from './request'
import type { Book } from '@booknest/domain'

export interface ListBooksParams {
  page?: number
  pageSize?: number
  keyword?: string
  status?: string
  categoryId?: string
}

export interface PageResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export function listBooks(params: ListBooksParams) {
  return request<PageResult<Book>>({
    url: '/api/v1/books',
    method: 'GET',
    data: params,
  })
}
```

`apps/mini-taro/src/hooks/use-books.ts`：

```ts
import { useQuery } from '@tanstack/react-query'
import { listBooks, type ListBooksParams } from '@/services/books'

export const bookKeys = {
  all: ['books'] as const,
  list: (workspaceId: string | null, params: ListBooksParams) =>
    ['books', 'list', workspaceId, params] as const,
}

export function useBooks(workspaceId: string | null, params: ListBooksParams) {
  return useQuery({
    queryKey: bookKeys.list(workspaceId, params),
    queryFn: () => listBooks(params),
    enabled: Boolean(workspaceId),
  })
}
```

> 注意：Step 2 的 request adapter 已处理 GET 参数到 query string 的转换，无需额外处理。

---

## Step 5：后端 Prisma 增加微信字段

在现有 User 模型中**新增**以下字段（不要替换整个模型）：

修改 `backend/prisma/schema.prisma`，在 User 模型中添加：

```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  name         String
  role         UserRole @default(USER)

  // —— 以下为新增的微信身份字段 ——
  wechatOpenId          String?  @unique @map("wechat_open_id")
  wechatUnionId         String?  @map("wechat_union_id")
  wechatSessionKeyHash  String?  @map("wechat_session_key_hash")
  wechatBoundAt         DateTime? @map("wechat_bound_at")
  // —— 新增字段结束 ——

  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  books          Book[]
  categories     Category[]
  reviews        Review[]
  memberships    WorkspaceMember[]
  invitationsSent Invitation[] @relation("InvitedBy")
  auditLogs      AuditLog[]
  activitiesCreated Activity[]
  orders            Order[]
  tickets           Ticket[]
  importJobs        ImportJob[]

  @@map("users")
}
```

关键说明：

- `email` 和 `passwordHash` 保持**必填**——不改为可空，避免破坏现有注册登录。
- 微信登录时，如果用户通过 `wechatOpenId` 匹配不到已有账号，会创建一条 `email` 为自动生成的虚拟邮箱的新 User。后续可通过「账号绑定」功能关联邮箱。
- 虚拟邮箱生成策略：`wechat_{openid的sha256前12位}@mini.booknest.local`，带 `@unique` 约束确保唯一。

迁移：

```bash
cd backend
npx prisma migrate dev --name add_wechat_identity
```

---

## Step 6：后端实现 code2Session client

环境变量：

```bash
WECHAT_APP_ID=your-mini-program-appid
WECHAT_APP_SECRET=your-mini-program-secret
WECHAT_LOGIN_MODE=real # real | mock
```

`backend/src/services/wechat/wechat-auth.service.ts`：

```ts
import crypto from 'node:crypto'

interface Code2SessionResult {
  openid: string
  session_key: string
  unionid?: string
  errcode?: number
  errmsg?: string
}

export async function code2Session(code: string): Promise<Code2SessionResult> {
  if (process.env.WECHAT_LOGIN_MODE === 'mock') {
    return {
      openid: `mock-openid-${code}`,
      session_key: 'mock-session-key',
      unionid: `mock-unionid-${code}`,
    }
  }

  const url = new URL('https://api.weixin.qq.com/sns/jscode2session')
  url.searchParams.set('appid', process.env.WECHAT_APP_ID!)
  url.searchParams.set('secret', process.env.WECHAT_APP_SECRET!)
  url.searchParams.set('js_code', code)
  url.searchParams.set('grant_type', 'authorization_code')

  const res = await fetch(url)
  const data = (await res.json()) as Code2SessionResult

  if (data.errcode) {
    throw new Error(`微信登录失败：${data.errmsg || data.errcode}`)
  }

  return data
}

export function hashSessionKey(sessionKey: string) {
  return crypto.createHash('sha256').update(sessionKey).digest('hex')
}
```

> 注意：本文件没有引用 `prisma` 或其他项目模块，不需要修改 import 风格。

---

## Step 7：后端新增微信登录接口

`backend/src/routes/wechat.routes.ts`：

```ts
import crypto from 'node:crypto'
import { Router } from 'express'
import { z } from 'zod'
import prisma from '@/lib/prisma'                       // 默认导出
import { code2Session, hashSessionKey } from '@/services/wechat/wechat-auth.service'
import { generateToken } from '@/services/auth.service'  // 复用现有 JWT 签发函数，需在 auth.service.ts 中 export
import { authenticate } from '@/middleware/auth'        // 注意：单数 middleware，文件名 auth.ts
import { ResponseUtil } from '@/utils/response'

export const wechatRouter = Router()

const loginSchema = z.object({
  code: z.string().min(1),
})

wechatRouter.post('/login', async (req, res, next) => {
  try {
    const { code } = loginSchema.parse(req.body)
    const session = await code2Session(code)

    // upsert：匹配 wechatOpenId，找不到则新建（使用虚拟邮箱满足 email 必填约束）
    // 用 openid 完整哈希确保唯一，避免前缀截断碰撞
    const virtualEmail = `wechat_${crypto.createHash('sha256').update(session.openid).digest('hex').slice(0, 12)}@mini.booknest.local`

    const user = await prisma.user.upsert({
      where: { wechatOpenId: session.openid },
      update: {
        wechatUnionId: session.unionid,
        wechatSessionKeyHash: hashSessionKey(session.session_key),
      },
      create: {
        email: virtualEmail,
        passwordHash: await import('bcrypt').then((b) => b.hash(crypto.randomUUID(), 10)),
        name: '微信用户',
        wechatOpenId: session.openid,
        wechatUnionId: session.unionid,
        wechatSessionKeyHash: hashSessionKey(session.session_key),
      },
    })

    const token = generateToken({ id: user.id, email: user.email, role: user.role })

    res.json({
      code: 0,
      message: 'ok',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          nickname: user.name,
          hasWechat: Boolean(user.wechatOpenId),
        },
      },
    })
  } catch (error) {
    next(error)
  }
})

wechatRouter.post('/bind', authenticate, async (req, res, next) => {
  try {
    if (!req.user?.id) throw new Error('未登录')

    const { code } = loginSchema.parse(req.body)
    const session = await code2Session(code)

    const existed = await prisma.user.findUnique({
      where: { wechatOpenId: session.openid },
    })

    if (existed && existed.id !== req.user.id) {
      res.status(409).json({ code: 409, message: '该微信已绑定其他账号', data: null })
      return
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        wechatOpenId: session.openid,
        wechatUnionId: session.unionid,
        wechatSessionKeyHash: hashSessionKey(session.session_key),
        wechatBoundAt: new Date(),
      },
    })

    ResponseUtil.success(res, { userId: user.id })
  } catch (error) {
    next(error)
  }
})
```

> import 路径说明：
> - `@/lib/prisma` → 默认导出 `export default prisma`，使用 `import prisma from ...`
> - `@/services/auth.service` → 需要将现有的 `generateToken` 函数从 `function` 改为 `export function`
> - `@/middleware/auth` → 单数 `middleware`，文件名 `auth.ts`，导出 `authenticate`
> - `@/utils/response` → 导出 `ResponseUtil`
> - JWT 签发复用 `auth.service.ts` 中的 `generateToken`（相同 secret、相同 payload 结构 `{ id, email, role }`、相同 `expiresIn: '7d'`），避免重复定义

在 `backend/src/routes/index.ts` 注册：

```ts
import wechatRoutes from './wechat.routes'

// 在已有路由后面添加
router.use('/wechat', wechatRoutes)
```

> 不要在 `server.ts` 中直接注册，保持现有路由组织方式（所有 `/api/v1` 下的路由统一在 `routes/index.ts` 中管理）。

---

## Step 8：小程序端实现登录页

`apps/mini-taro/src/services/auth.ts`：

```ts
import Taro from '@tarojs/taro'
import { request } from './request'
import { useAuthStore } from '@/stores/auth-store'

interface LoginResponse {
  token: string
  user: {
    id: string
    email?: string | null
    nickname?: string | null
    avatarUrl?: string | null
  }
}

export async function loginByWechat() {
  const loginRes = await Taro.login()
  if (!loginRes.code) throw new Error('未获取到微信登录 code')

  const session = await request<LoginResponse>({
    url: '/api/v1/wechat/login',
    method: 'POST',
    data: { code: loginRes.code },
    auth: false,
  })

  useAuthStore.getState().setSession(session)
  return session
}
```

`pages/login/index.tsx`：

```tsx
import { Button, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { loginByWechat } from '@/services/auth'
import './index.scss'

export default function LoginPage() {
  const router = useRouter()

  const handleLogin = async () => {
    await loginByWechat()
    const redirect = router.params.redirect
    Taro.redirectTo({ url: redirect ? decodeURIComponent(redirect) : '/pages/index/index' })
  }

  return (
    <View className="login-page">
      <Text className="login-page__title">登录 BookNest Mini</Text>
      <Text className="login-page__desc">使用微信身份进入你的团队书架</Text>
      <Button type="primary" onClick={handleLogin}>微信一键登录</Button>
    </View>
  )
}
```

---

## Step 9：配置合法域名与本地调试

本地开发可以使用：

- 微信开发者工具：勾选“不校验合法域名”进行本地调试。
- 线上体验版：必须使用 HTTPS 域名，并在小程序后台配置 request 合法域名。

需要配置：

| 域名类型 | 示例 | 用途 |
|---|---|---|
| request 合法域名 | `https://api.yourdomain.com` | API 请求 |
| uploadFile 合法域名 | `https://api.yourdomain.com` | Day 14 上传 |
| downloadFile 合法域名 | `https://oss.yourdomain.com` | 图片下载，可选 |
| socket 合法域名 | `wss://api.yourdomain.com` | 如后续使用 WebSocket |

---

## Step 10：测试微信登录

本地 mock 测试：

```bash
WECHAT_LOGIN_MODE=mock npm run dev
```

真实登录测试：

```bash
WECHAT_LOGIN_MODE=real npm run dev
```

数据库检查：

```sql
select id, email, name, wechat_open_id, wechat_union_id, wechat_bound_at
from users
order by created_at desc
limit 5;
```

---

## Day 13 验收标准 Checklist

### OpenAPI / 请求

- [ ] `@booknest/api-contract` 生成成功。
- [ ] 小程序端能引用 OpenAPI 类型。
- [ ] `request<T>()` 能自动注入 `Authorization`。
- [ ] `request<T>()` 能自动注入 `X-Workspace-Id`。
- [ ] 401 能清理 token 并跳转登录页。
- [ ] 首页能展示真实 `/api/v1/books` 数据。

### 微信登录

- [ ] 小程序端调用 `Taro.login()` 成功。
- [ ] 后端 `/api/v1/wechat/login` 可用。
- [ ] 数据库 users 表能看到 `wechat_open_id`。
- [ ] 后端返回 BookNest JWT。
- [ ] 小程序保存 token，刷新后能恢复登录态。
- [ ] `session_key` 没有返回给前端。

### UnionID / 账号绑定

- [ ] User 表支持 `wechatUnionId` 可空字段。
- [ ] 代码中不假设 UnionID 一定存在。
- [ ] 已登录邮箱账号能绑定微信。
- [ ] 一个微信不能绑定多个系统账号。
- [ ] 绑定失败有明确错误提示。

---

## Day 13 Git Commit 示例

```bash
git add .
git commit -m "feat(mini): add Taro request adapter and WeChat login"
```

---

## Day 13 Prompt 模板

### Taro Request Adapter

```txt
你是资深 Taro + React Query 工程师。
请帮我审查这个 Taro.request adapter：
要求检查 token 注入、X-Workspace-Id、GET query 参数、401 处理、Toast 错误提示、TypeScript 泛型、微信小程序兼容性。
```

### 微信登录后端

```txt
你是资深 Express + Prisma + 微信小程序后端工程师。
请基于 wx.login code2Session 流程实现 /api/v1/wechat/login。
要求：session_key 不下发前端；openid 唯一；unionid 可空；返回系统 JWT；支持 mock 模式；包含错误处理和测试建议。
```

### 账号绑定

```txt
请帮我设计邮箱账号绑定微信身份的接口。
要求：同一 openid 只能绑定一个用户；已绑定其他账号返回 409；操作写审计日志；给出 Prisma 事务实现。
```

---

## Day 13 每日反馈

### 今日完成

- [ ] OpenAPI 类型迁移完成。
- [ ] request adapter 完成。
- [ ] 微信登录完成。
- [ ] 账号绑定完成。

### 今日卡点

1. 
2. 
3. 

### Vibe Coding 反馈

| 提示词 | 生成质量 | 人工修正点 |
|---|---|---|
| request adapter |  |  |
| 微信登录接口 |  |  |
| UnionID 处理 |  |  |

### 明日准备

- [ ] 确认 Workspace/RBAC 后端接口仍可用。
- [ ] 确认 OSS 上传接口可用。
- [ ] 准备迁移 Book CRUD、Workspace 切换、上传和分享。

---

## 参考资料

- 微信小程序登录：`https://developers.weixin.qq.com/miniprogram/dev/api/open-api/login/wx.login.html`
- code2Session：`https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/user-login/code2Session.html`
- UnionID 机制：`https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/union-id.html`
- Taro 页面组件：`https://docs.taro.zone/docs/react-page`
