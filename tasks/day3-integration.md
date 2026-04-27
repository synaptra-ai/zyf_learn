# Day 3: BookNest 前后端联调 — React Query + 全栈集成

## 项目简介

今天是 BookNest 三天项目的第三天，也是最激动人心的一天。你将把 Day 1 的前端和 Day 2 的后端连接起来，完成一个真正的全栈应用。今天的工作重点是：替换 localStorage 为真实 API、实现用户认证、用 React Query 管理服务端状态。

**今天的目标**: 完成一个可登录、可 CRUD、可演示的完整全栈应用。

---

## 学习目标

完成今天的工作后，你将掌握：

1. **Axios API 客户端** — 拦截器、token 注入、响应解包
2. **TanStack React Query** — 服务端状态管理、缓存、自动刷新
3. **Query Key Factory** — 系统化的缓存键管理
4. **认证流程** — 登录/注册页、token 存储、路由守卫
5. **状态模式** — Loading skeleton、Error boundary、Empty state
6. **MSW** — Mock Service Worker，在测试中模拟 API
7. **全栈调试** — Network 面板、后端日志、数据一致性排查

---

## 技术栈

| 技术 | 用途 |
|------|------|
| Axios | HTTP 客户端 (替代 fetch) |
| TanStack React Query 5 | 服务端状态管理 |
| Zustand | 客户端状态 (token、UI 偏好) |
| React Hook Form + Zod | 表单验证 |
| MSW 2 | API Mock (测试用) |
| Vitest + Testing Library | 组件测试 |

---

## 前置条件

确保以下内容已就绪：

- [ ] Day 2 的后端 API 正常运行在 `http://localhost:4000`
- [ ] Day 1 的前端项目正常启动在 `http://localhost:4001`
- [ ] 后端种子数据已加载 (`cd backend && npm run prisma:seed`)
- [ ] 确认以下 curl 命令可正常返回：
  ```bash
  curl http://localhost:4000/health
  curl -X POST http://localhost:4000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@booknest.com","password":"password123"}'
  ```

---

## 功能清单

### Must-Have (必做)

| # | 功能 | 说明 |
|---|------|------|
| 1 | API 客户端 | Axios 实例 + 拦截器 (token 注入、响应解包) |
| 2 | 认证流程 | 登录/注册页 + token 管理 + 路由守卫 |
| 3 | Query Key Factory | books, categories, reviews 的缓存键工厂 |
| 4 | React Query Hooks | useBooks, useBook, useCategories, mutations |
| 5 | 书籍列表重构 | 对接 API + Loading skeleton + Error 重试 |
| 6 | 书籍详情页 | 评论列表 + 提交评论 |
| 7 | 创建/编辑页 | 表单对接 API |
| 8 | 乐观更新 | 删除时先移 UI，失败回滚 |
| 9 | MSW 测试 | 3+ 组件测试 |

### Nice-to-Have (加量)

| # | 功能 | 说明 |
|---|------|------|
| 10 | 书籍封面上传 | Multer 对接 |
| 11 | 统计仪表盘 | 真实 API 数据 + 图表 |
| 12 | 批量导入 | POST /books/batch 对接 |
| 13 | 全局 Toast | 成功/失败通知 |
| 14 | Docker Compose | 一键启动前后端 |
| 15 | 响应式打磨 | 移动端最终适配 |

---

## 架构变更概览

Day 1 到 Day 3 的核心变化：

```
Day 1:  UI 组件 → Zustand Store → localStorage
Day 3:  UI 组件 → React Query Hooks → Axios Client → Express API → PostgreSQL
```

**需要移除/替换的部分：**
- 移除 `useBookStore` 中的 localStorage 逻辑
- 移除 `useCategoryStore` 中的 localStorage 逻辑
- 保留 `useThemeStore` (UI 偏好仍存本地)

**需要新增的部分：**
- API 客户端层 (`src/lib/api-client.ts`)
- Query key factory (`src/hooks/query-keys.ts`)
- React Query hooks (`src/hooks/useBooks.ts`, etc.)
- 认证 store (`src/stores/useAuthStore.ts`)
- 认证页面 (`src/pages/Login.tsx`, `src/pages/Register.tsx`)

---

## 分步实施指南

### Step 1: API 客户端 (45 分钟)

**目标**: 搭建与后端通信的基础设施

1. **安装新依赖**:
   ```bash
   cd booknest/frontend
   npm install axios @tanstack/react-query
   npm install -D msw
   ```

2. **`src/lib/api-client.ts`** — Axios 实例
   ```typescript
   import axios from 'axios'

   const apiClient = axios.create({
     baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1',
     timeout: 10000,
     headers: { 'Content-Type': 'application/json' },
   })

   // 请求拦截器: 注入 JWT token
   apiClient.interceptors.request.use((config) => {
     const token = localStorage.getItem('auth_token')
     if (token) {
       config.headers.Authorization = `Bearer ${token}`
     }
     return config
   })

   // 响应拦截器: 解包 {code, message, data} → data
   apiClient.interceptors.response.use(
     (response) => {
       if (response.data && typeof response.data === 'object' && 'data' in response.data) {
         return { ...response, data: response.data.data }
       }
       return response
     },
     (error) => {
       if (error.response?.status === 401) {
         localStorage.removeItem('auth_token')
         window.location.href = '/login'
       }
       return Promise.reject(error)
     }
   )

   export default apiClient
   ```

3. **配置 Vite 代理** — `vite.config.ts`:
   ```typescript
   export default defineConfig({
     server: {
       port: 4001,
       proxy: {
         '/api': {
           target: 'http://localhost:4000',
           changeOrigin: true,
         }
       }
     }
   })
   ```
   配置后可以将 `baseURL` 改为 `/api/v1`，避免跨域问题。

4. **环境变量** — `.env.development`:
   ```
   VITE_API_URL=http://localhost:4000/api/v1
   ```

**正反馈时刻**: 在浏览器控制台执行：
```javascript
const res = await fetch('http://localhost:4000/health')
console.log(await res.json())
```
看到 `{"status":"ok"}`，前后端网络通了。

---

### Step 2: 认证 Store + 页面 (1 小时)

**目标**: 实现登录注册流程

1. **`src/stores/useAuthStore.ts`** — 认证状态
   ```typescript
   interface AuthState {
     token: string | null
     user: User | null
     isAuthenticated: boolean
     login: (email: string, password: string) => Promise<void>
     register: (email: string, password: string, name: string) => Promise<void>
     logout: () => void
     loadFromStorage: () => void
   }
   ```

2. **`src/pages/Login.tsx`** — 登录页
   - email + password 表单 (React Hook Form + Zod)
   - 提交调用 `useAuthStore.login()`
   - 成功后跳转到首页
   - 错误显示红色提示
   - 底部 "没有账号？去注册" 链接

3. **`src/pages/Register.tsx`** — 注册页
   - email + password + name 表单
   - 成功后自动登录并跳转首页

4. **`src/components/ProtectedRoute.tsx`** — 路由守卫
   ```typescript
   function ProtectedRoute({ children }) {
     const { isAuthenticated } = useAuthStore()
     if (!isAuthenticated) return <Navigate to="/login" />
     return children
   }
   ```

5. **更新路由配置**:
   ```tsx
   <Routes>
     <Route path="/login" element={<Login />} />
     <Route path="/register" element={<Register />} />
     <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
       <Route index element={<BookList />} />
       {/* ... 其他受保护路由 */}
     </Route>
   </Routes>
   ```

**正反馈时刻**: 登录页输入 test@booknest.com / password123，点击登录，成功跳转到书籍列表页，看到真实数据从后端加载。

---

### Step 3: React Query 配置 + Query Key Factory (30 分钟)

1. **`src/hooks/query-keys.ts`** — 缓存键工厂
   ```typescript
   export const bookKeys = {
     all: ['books'] as const,
     lists: () => [...bookKeys.all, 'list'] as const,
     list: (filters: BookFilters) => [...bookKeys.lists(), filters] as const,
     details: () => [...bookKeys.all, 'detail'] as const,
     detail: (id: string) => [...bookKeys.details(), id] as const,
   }

   export const categoryKeys = {
     all: ['categories'] as const,
     list: () => [...categoryKeys.all, 'list'] as const,
   }

   export const reviewKeys = {
     all: ['reviews'] as const,
     byBook: (bookId: string) => [...reviewKeys.all, 'book', bookId] as const,
   }
   ```

2. **`src/lib/query-client.ts`** — QueryClient 配置
   ```typescript
   import { QueryClient } from '@tanstack/react-query'

   export const queryClient = new QueryClient({
     defaultOptions: {
       queries: {
         staleTime: 5 * 60 * 1000,      // 5 分钟内不重新请求
         gcTime: 30 * 60 * 1000,         // 30 分钟缓存
         retry: 2,                        // 失败重试 2 次
         refetchOnWindowFocus: false,     // 切回窗口不自动刷新
       },
     },
   })
   ```

3. **`src/App.tsx`** — 包裹 QueryClientProvider
   ```tsx
   import { QueryClientProvider } from '@tanstack/react-query'
   import { queryClient } from './lib/query-client'

   function App() {
     return (
       <QueryClientProvider client={queryClient}>
         <BrowserRouter>
           <Routes>...</Routes>
         </BrowserRouter>
       </QueryClientProvider>
     )
   }
   ```

---

### Step 4: React Query Hooks (1 小时)

**目标**: 封装所有 API 调用为 hooks

1. **`src/hooks/useBooks.ts`** — 书籍相关 hooks
   ```typescript
   // 查询: 书籍列表
   export function useBooks(filters: BookFilters) {
     return useQuery({
       queryKey: bookKeys.list(filters),
       queryFn: async () => {
         const { data } = await apiClient.get('/books', { params: filters })
         return data
       },
     })
   }

   // 查询: 书籍详情
   export function useBook(id: string) {
     return useQuery({
       queryKey: bookKeys.detail(id),
       queryFn: async () => {
         const { data } = await apiClient.get(`/books/${id}`)
         return data
       },
       enabled: !!id,
     })
   }

   // 变更: 创建书籍
   export function useCreateBook() {
     const queryClient = useQueryClient()
     return useMutation({
       mutationFn: async (bookData) => {
         const { data } = await apiClient.post('/books', bookData)
         return data
       },
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: bookKeys.lists() })
       },
     })
   }

   // 变更: 更新书籍
   export function useUpdateBook() {
     const queryClient = useQueryClient()
     return useMutation({
       mutationFn: async ({ id, ...data }) => {
         const { data: updated } = await apiClient.put(`/books/${id}`, data)
         return updated
       },
       onSuccess: (_, variables) => {
         queryClient.invalidateQueries({ queryKey: bookKeys.detail(variables.id) })
         queryClient.invalidateQueries({ queryKey: bookKeys.lists() })
       },
     })
   }

   // 变更: 删除书籍 (乐观更新)
   export function useDeleteBook() {
     const queryClient = useQueryClient()
     return useMutation({
       mutationFn: async (id: string) => {
         await apiClient.delete(`/books/${id}`)
       },
       onMutate: async (id) => {
         await queryClient.cancelQueries({ queryKey: bookKeys.lists() })
         const previousLists = queryClient.getQueriesData({ queryKey: bookKeys.lists() })
         queryClient.setQueriesData({ queryKey: bookKeys.lists() }, (old: any) => ({
           ...old,
           items: old.items.filter((b: any) => b.id !== id),
         }))
         return { previousLists }
       },
       onError: (_err, _id, context) => {
         if (context?.previousLists) {
           context.previousLists.forEach(([key, data]) => {
             queryClient.setQueryData(key, data)
           })
         }
       },
       onSettled: () => {
         queryClient.invalidateQueries({ queryKey: bookKeys.lists() })
       },
     })
   }
   ```

2. **`src/hooks/useCategories.ts`** — 分类 hooks
   ```typescript
   export function useCategories() { ... }
   export function useCreateCategory() { ... }
   export function useDeleteCategory() { ... }
   ```

3. **`src/hooks/useReviews.ts`** — 评论 hooks
   ```typescript
   export function useReviews(bookId: string) { ... }
   export function useCreateReview() { ... }
   ```

---

### Step 5: 书籍列表页重构 (1 小时)

**目标**: 替换 Zustand store 为 React Query hooks

1. **`src/pages/BookList.tsx`** — 使用 `useBooks` hook
   ```tsx
   function BookList() {
     const [filters, setFilters] = useState<BookFilters>({ page: 1, pageSize: 12 })
     const { data, isLoading, isError, error, refetch } = useBooks(filters)

     if (isLoading) return <BookListSkeleton />
     if (isError) return <ErrorState message={error.message} onRetry={refetch} />
     if (!data?.items?.length) return <EmptyState />

     return (
       <div>
         {/* 搜索栏 + 过滤 Tab */}
         {/* 卡片网格 */}
         {/* 分页控件 */}
       </div>
     )
   }
   ```

2. **`src/components/ui/Skeleton.tsx`** — Loading 骨架屏
   ```tsx
   function BookListSkeleton() {
     return (
       <div className="grid grid-cols-4 gap-4">
         {Array.from({ length: 12 }).map((_, i) => (
           <div key={i} className="animate-pulse">
             <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-48" />
             <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded h-4 w-3/4" />
             <div className="mt-1 bg-gray-200 dark:bg-gray-700 rounded h-3 w-1/2" />
           </div>
         ))}
       </div>
     )
   }
   ```

3. **`src/components/ui/ErrorState.tsx`** — 错误状态
   ```tsx
   function ErrorState({ message, onRetry }) {
     return (
       <div className="text-center py-12">
         <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
         <p className="mt-4 text-gray-600">{message || '加载失败'}</p>
         <Button onClick={onRetry} className="mt-4">重试</Button>
       </div>
     )
   }
   ```

4. **分页控件**: 使用 `data.total` 和 `data.totalPages` 渲染

**正反馈时刻**: 打开页面，看到 Loading skeleton 闪烁 0.5 秒后，真实书籍数据从数据库加载出来。

---

### Step 6: 书籍详情页 + 评论 (1 小时)

1. **`src/pages/BookDetail.tsx`** — 使用 `useBook` + `useReviews`
   ```tsx
   function BookDetail() {
     const { id } = useParams()
     const { data: book, isLoading } = useBook(id!)
     const { data: reviews } = useReviews(id!)

     if (isLoading) return <Skeleton />

     return (
       <div>
         <BookInfo book={book} />
         <ReviewList reviews={reviews?.items || []} />
         <ReviewForm bookId={id!} />
       </div>
     )
   }
   ```

2. **`src/components/book/ReviewForm.tsx`** — 评论表单
   ```tsx
   function ReviewForm({ bookId }) {
     const createReview = useCreateReview()

     const onSubmit = (data) => {
       createReview.mutate(
         { bookId, ...data },
         { onSuccess: () => { form.reset(); toast.success('评论成功') } }
       )
     }

     return (
       <form onSubmit={handleSubmit(onSubmit)}>
         <StarRating name="rating" />
         <textarea name="text" />
         <Button type="submit" isLoading={createReview.isPending}>提交评论</Button>
       </form>
     )
   }
   ```

**正反馈时刻**: 提交评论后，评论列表即时刷新，新评论出现在最上方。

---

### Step 7: 创建/编辑页对接 (45 分钟)

1. **`src/pages/BookCreate.tsx`** — 使用 `useCreateBook`
   ```tsx
   function BookCreate() {
     const createBook = useCreateBook()
     const navigate = useNavigate()

     const onSubmit = (data) => {
       createBook.mutate(data, {
         onSuccess: (newBook) => {
           toast.success('添加成功')
           navigate(`/books/${newBook.id}`)
         },
       })
     }
   }
   ```

2. **`src/pages/BookEdit.tsx`** — 使用 `useBook` + `useUpdateBook`
   - 用 `useBook(id)` 获取现有数据预填表单
   - 提交用 `useUpdateBook`

---

### Step 8: MSW 测试 (1 小时)

**目标**: 在测试中模拟后端 API

1. **`src/mocks/handlers.ts`** — MSW 请求处理器
   ```typescript
   import { http, HttpResponse } from 'msw'

   export const handlers = [
     http.get('*/api/v1/books', () => {
       return HttpResponse.json({
         code: 200,
         message: 'success',
         data: {
           items: [
             { id: '1', title: 'Clean Code', author: 'Robert C. Martin', status: 'READING' },
             { id: '2', title: 'Design Patterns', author: 'Gang of Four', status: 'OWNED' },
           ],
           total: 2, page: 1, pageSize: 10, totalPages: 1,
         }
       })
     }),

     http.post('*/api/v1/books', async ({ request }) => {
       const body = await request.json()
       return HttpResponse.json({
         code: 201, message: 'success',
         data: { id: '3', ...body, createdAt: new Date().toISOString() }
       }, { status: 201 })
     }),
   ]
   ```

2. **`src/mocks/server.ts`** — MSW 服务器
   ```typescript
   import { setupServer } from 'msw/node'
   import { handlers } from './handlers'
   export const server = setupServer(...handlers)
   ```

3. **`src/test-setup.ts`** — 测试初始化
   ```typescript
   import { server } from './mocks/server'
   beforeAll(() => server.listen())
   afterEach(() => server.resetHandlers())
   afterAll(() => server.close())
   ```

4. **测试用例**:
   - **BookList 渲染测试**: mock GET /books 返回 2 本书，验证 DOM 中显示 2 个 BookCard
   - **BookCreate 表单测试**: 填写表单提交，验证 POST /books 被调用
   - **Error 状态测试**: mock 返回 500，验证显示错误信息和重试按钮

---

### Step 9: Docker Compose 一键启动 (30 分钟)

在 repo 根目录创建 `docker-compose.yml`:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: booknest
      POSTGRES_PASSWORD: booknest123
      POSTGRES_DB: booknest
    ports:
      # 注意: 使用 5433 避免与其他项目冲突
      - "5433:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "4000:4000"
    environment:
      DATABASE_URL: postgresql://booknest:booknest123@postgres:5432/booknest
      JWT_SECRET: booknest-dev-secret
      PORT: 4000
    depends_on:
      - postgres

  frontend:
    build: ./frontend
    ports:
      - "4001:4001"
    depends_on:
      - backend

volumes:
  pgdata:
```

**正反馈时刻**: 运行 `docker-compose up`，一个命令同时启动数据库 + 后端 + 前端。

---

## 验收标准 Checklist

- [ ] 登录页输入正确邮箱密码可登录，跳转到首页
- [ ] 注册页可创建新用户并自动登录
- [ ] 未登录访问首页自动跳转到登录页
- [ ] 书籍列表从 API 加载，显示 Loading skeleton
- [ ] 状态过滤 Tab 可用（全部/在读/已读/想读/已拥有）
- [ ] 分页控件可用，翻页数据正确
- [ ] 创建书籍成功后列表即时刷新
- [ ] 编辑书籍保存后详情页数据更新
- [ ] 删除书籍后列表即时移除（乐观更新）
- [ ] 提交评论后评论列表即时刷新
- [ ] 后端停止时列表页显示 Error 状态 + 重试按钮
- [ ] 列表为空时显示 Empty State
- [ ] 统计仪表盘显示后端真实数据
- [ ] 登出功能正常，清空 token 跳转登录页
- [ ] 至少 3 个 MSW 测试通过
- [ ] `npm run build` 零 TypeScript 错误
- [ ] Docker Compose 可一键启动前后端 + 数据库

---

## Git 工作规范

### 分支策略

```bash
cd booknest   # repo 根目录
git checkout -b feat/day3-integration

# 在 frontend/ 目录下工作
cd frontend
```

### Commit 示例

```bash
git commit -m "feat: add axios API client with interceptors"
git commit -m "feat: implement login and register pages"
git commit -m "feat: add React Query hooks for books, categories, reviews"
git commit -m "feat: integrate book list with API, add loading and error states"
git commit -m "feat: implement optimistic delete for books"
git commit -m "feat: add review form with API integration"
git commit -m "test: add MSW-based component tests"
git commit -m "feat: add Docker Compose for full-stack deployment"
```

### PR 规范

Day 3 结束时创建 PR，描述模板：

```markdown
## Summary
- 完成前后端联调，替换 localStorage 为真实 API
- 实现登录注册认证流程
- 使用 React Query 管理服务端状态
- 添加 MSW 测试
- 添加 Docker Compose 一键部署

## Test Plan
- [ ] 登录/注册流程正常
- [ ] 书籍 CRUD 全流程正常
- [ ] 评论提交和展示正常
- [ ] Loading/Error/Empty 状态正常
- [ ] `npm run build` 无错误
- [ ] `npm run test` 全部通过
- [ ] Docker Compose 一键启动正常

## 端口
- 前端: http://localhost:4001
- 后端: http://localhost:4000
- PostgreSQL: localhost:5433
```

---

## Prompt 模板

### API 客户端

```
帮我创建一个 Axios API 客户端 (src/lib/api-client.ts)，要求:

1. baseURL 从环境变量 VITE_API_URL 读取，默认 http://localhost:4000/api/v1
2. 请求拦截器: 从 localStorage 读取 auth_token，添加到 Authorization header
3. 响应拦截器: 后端返回格式是 {code, message, data}，解包后只返回 data
4. 错误拦截器: 401 时清除 token 并跳转到 /login
5. 超时 10 秒
```

### React Query Hooks

```
帮我创建书籍相关的 React Query hooks (src/hooks/useBooks.ts)，要求:

1. useBooks(filters) — 查询书籍列表，支持分页和过滤，staleTime 5分钟
2. useBook(id) — 查询单本书详情(含分类和评论)，enabled: !!id
3. useCreateBook() — mutation，成功后 invalidate 所有书籍列表查询
4. useUpdateBook() — mutation，成功后 invalidate 详情和列表
5. useDeleteBook() — mutation，乐观更新：先从缓存中删除，失败回滚

使用 query key factory:
bookKeys = { all, lists, list(filters), details, detail(id) }

API 客户端已定义在 src/lib/api-client.ts，解包后的数据直接是 payload。
```

### 认证流程

```
帮我实现认证流程:

1. useAuthStore (Zustand) — 管理 token 和 user 状态，token 持久化到 localStorage
2. Login 页面 — email + password 表单，调用 POST /auth/login，成功存 token 跳转首页
3. Register 页面 — email + password + name 表单，调用 POST /auth/register
4. ProtectedRoute — 未登录重定向到 /login
5. 登出按钮 — 清除 token，跳转 /login

API 响应格式:
POST /auth/login → { code: 200, message: "success", data: { token, user: { id, email, name } } }
POST /auth/register → { code: 201, message: "success", data: { token, user: { id, email, name } } }
```

### MSW 测试

```
帮我写 Vitest 测试，使用 MSW mock 后端 API:

1. 测试 BookList 组件渲染: mock GET /books 返回 2 本书，验证 DOM 中显示 2 个 BookCard
2. 测试 BookCreate 表单: 填写 title="New Book", author="Author"，提交后验证
   mock POST /books 被调用且参数正确
3. 测试 Error 状态: mock GET /books 返回 500，验证显示错误信息

MSW handlers 已定义在 src/mocks/handlers.ts。
测试 setup 文件在 src/test-setup.ts，已启动 MSW server。
使用 @testing-library/react 渲染组件，需要包裹 QueryClientProvider 和 BrowserRouter。
```

### 调试

```
我的 React Query 列表页面一直显示 loading 状态，数据没有渲染。

Network 面板显示 GET /api/v1/books 返回了 200，数据格式是:
{ "code": 200, "message": "success", "data": { "items": [...], "total": 25, "page": 1 } }

我的 hook:
[粘贴 useBooks hook 代码]

我的组件:
[粘贴 BookList 组件代码]

帮我排查为什么 queryFn 的返回值没有被正确缓存。
```

---

## Claude Code 使用指南

### 更新 CLAUDE.md

在 repo 根目录的 `CLAUDE.md` 中追加 Day 3 的内容：

```markdown
## Day 3: API 集成

### 数据流
UI → React Query Hooks → Axios Client → Express API → PostgreSQL

### 关键文件 (frontend/src/)
- lib/api-client.ts — Axios 实例 + 拦截器
- hooks/query-keys.ts — 缓存键工厂
- hooks/useBooks.ts — 书籍 React Query hooks
- hooks/useCategories.ts — 分类 hooks
- hooks/useReviews.ts — 评论 hooks
- stores/useAuthStore.ts — 认证状态 (Zustand)
- mocks/ — MSW mock handlers

### 认证
- JWT token 存在 localStorage (auth_token)
- Axios 请求拦截器自动注入 token
- 401 响应自动清除 token 并跳转 /login
- ProtectedRoute 包裹需要认证的页面

### 测试
- MSW mock API，不需要启动真实后端
- 测试文件放在 src/ 目录下，与组件同目录

### 端口
- 前端: http://localhost:4001
- 后端: http://localhost:4000
- PostgreSQL: localhost:5433
```

### 日常使用

| 时机 | 命令/动作 | 目的 |
|------|----------|------|
| 开始工作 | `/init` 更新 CLAUDE.md | 让 Claude 理解项目最新状态 |
| 完成功能 | `simplify` | 检查代码质量和重复 |
| 遇到 Bug | 直接描述问题 + 贴代码 | Claude Code 帮你调试 |
| 写完测试 | `npm run test` | 验证测试通过 |
| 一天结束 | `/review` | 代码审查 |

---

## 全栈调试技巧

### 1. Network 面板是你的好朋友

浏览器 F12 → Network:
- 查看请求 URL、状态码、响应体
- 检查 Request Headers 里是否有 `Authorization: Bearer xxx`
- 检查 Response 是否是预期的 `{code, message, data}` 格式

### 2. React Query Devtools

```bash
npm install -D @tanstack/react-query-devtools
```

```tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

<QueryClientProvider client={queryClient}>
  {/* ... */}
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

Devtools 可以看到：
- 哪些 query 正在请求/已缓存/已过期
- 每个 query 的数据和状态
- 缓存失效和重新请求的时机

### 3. 后端日志

在 Express 中间件添加请求日志：
```typescript
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`)
  next()
})
```

### 4. 数据一致性排查

如果前端数据和数据库不一致：
1. 先查 Network 面板的响应数据
2. 再查 Prisma Studio 的数据库数据
3. 检查 React Query 的缓存键是否匹配
4. 检查 Axios 拦截器是否正确解包数据

---

## 每日回顾

Day 3 结束前，回答以下问题：

1. **React Query 和直接用 useState + useEffect + fetch 有什么区别？为什么要用 React Query？**
2. **乐观更新是什么？为什么删除操作适合用乐观更新，而创建操作不适合？**
3. **Axios 拦截器解决了什么问题？如果没有拦截器，你的代码会变成什么样？**
4. **MSW mock 测试和直接调真实 API 测试各有什么优缺点？**
5. **如果让你给这三天的学习体验打分 (1-10)，你会打几分？为什么？**

---

## 三天总结

完成这三天的工作后，你已经有了一个完整的全栈项目经验：

| 天数 | 完成了什么 | 掌握了什么 |
|------|-----------|-----------|
| Day 1 | React 前端应用 | 组件化、状态管理、表单验证、样式 |
| Day 2 | Express 后端 API | 数据库设计、REST API、认证、测试 |
| Day 3 | 前后端联调 | API 集成、缓存管理、全栈调试 |

### 最终项目结构

```
booknest/
├── frontend/              ← Day 1-3
│   └── src/
│       ├── components/ui/   # Button, Input, Card, Badge, Modal...
│       ├── components/book/ # BookCard, BookList, ReviewForm...
│       ├── pages/           # BookList, BookDetail, Login, Register...
│       ├── stores/          # useAuthStore, useThemeStore
│       ├── hooks/           # useBooks, useCategories, useReviews
│       ├── lib/             # api-client, query-client, utils, schemas
│       ├── mocks/           # MSW handlers + server
│       └── types/           # TypeScript 类型定义
├── backend/               ← Day 2
│   └── src/
│       ├── controllers/     # auth, book, category, review
│       ├── services/        # auth, book, category, review
│       ├── routes/          # auth, book, category, review
│       ├── middleware/      # auth, validate, errorHandler
│       ├── lib/             # prisma singleton
│       └── utils/           # response, errors
│   └── prisma/
│       ├── schema.prisma
│       ├── seed.ts
│       └── migrations/
├── docker-compose.yml     ← Day 3
├── CLAUDE.md              ← Claude Code 项目上下文
├── README.md              ← 项目说明
└── .gitignore
```

### 端口一览

| 服务 | 端口 | 说明 |
|------|------|------|
| 前端 (Vite) | 4001 | http://localhost:4001 |
| 后端 (Express) | 4000 | http://localhost:4000 |
| PostgreSQL | 5433 | localhost:5433 → 容器内 5432 |

**这些技能直接对应我们真实项目的技术栈和代码模式。** 下一步你就可以开始参与真实项目的开发了！
