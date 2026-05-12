# BookNest 学习指南 — 每一步在这个项目里怎么运作的

---

## Day 1：前端 UI

### 1.1 页面路由（React Router）

**做了什么**：定义 URL 和页面的对应关系

```
用户访问 /login        → 渲染 Login 组件（登录页）
用户访问 /register     → 渲染 Register 组件（注册页）
用户访问 /             → 渲染 BookList 组件（书籍列表，需要登录）
用户访问 /books/new    → 渲染 BookCreate 组件（添加书籍）
用户访问 /books/:id    → 渲染 BookDetail 组件（书籍详情）
用户访问 /books/:id/edit → 渲染 BookEdit 组件（编辑书籍）
用户访问 /categories   → 渲染 CategoryManager（分类管理）
用户访问 /stats        → 渲染 Stats（统计页面）
用户访问 /members      → 渲染 WorkspaceMembers（成员管理）
用户访问 /activities   → 渲染 Activities（读书会活动）
用户访问 /data-tools   → 渲染 DataTools（CSV 导入导出）
```

**怎么运作的**：
- 所有需要登录的页面被 `ProtectedRoute` 包裹，未登录自动跳转 `/login`
- `Layout` 组件提供顶部导航栏和侧边栏，子页面渲染在中间区域

### 1.2 组件化开发（React）

**做了什么**：把页面拆成可复用的小块

```
页面（Page）
├── 布局组件（Layout）→ 导航栏 + 侧边栏 + 内容区
├── 业务组件（BookCard、BookForm、CategoryManager）
└── 基础 UI 组件（Button、Input、Select、Toast、Skeleton）
```

**举个例子 — 添加书籍页面**：
1. `BookCreate` 页面用 `React Hook Form` 创建表单
2. 用户填写书名、作者、ISBN 等，`Zod` 实时校验格式
3. 点提交 → 调用 `useCreateBook` 这个 Hook
4. Hook 里用 `apiClient.post('/books', data)` 发请求到后端
5. 成功后 `React Query` 自动刷新书籍列表缓存
6. `useNavigate` 跳转到书籍列表页

### 1.3 状态管理（Zustand）

**做了什么**：管理不需要存在数据库的全局状态

| Store | 存了什么 | 谁在用 |
|-------|---------|--------|
| `useAuthStore` | token、用户信息、是否已登录 | 登录页、API 拦截器、路由守卫 |
| `useWorkspaceStore` | 当前活跃的工作区 ID | API 拦截器、书籍/分类等所有数据请求 |
| `useThemeStore` | 是否暗色模式 | 顶部导航栏的主题切换按钮 |

**怎么运作的**：
- `useAuthStore`：登录成功后把 token 存到 `localStorage`，刷新页面不丢失
- `useWorkspaceStore`：用户切换工作区时，后续所有 API 请求自动带上新的 `X-Workspace-Id`
- `useThemeStore`：切换暗色模式，Tailwind 的 `dark:` 类名自动生效

### 1.4 样式（Tailwind CSS）

**做了什么**：用 class 写样式，不用写 CSS 文件

**举个例子 — 一个按钮**：
```html
<button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
  添加书籍
</button>
```
- `bg-blue-600` → 蓝色背景
- `hover:bg-blue-700` → 鼠标悬停变深蓝
- `text-white` → 白色文字
- `px-4 py-2` → 上下 8px 左右 16px 内边距
- `rounded-lg` → 圆角

暗色模式加 `dark:` 前缀：`dark:bg-gray-800 dark:text-white`

---

## Day 2：后端 API

### 2.1 分层架构（Controller → Service → Prisma）

**做了什么**：代码按职责分三层，每层只做自己的事

**以"创建书籍"为例，请求的完整链路**：

```
前端发请求：POST /api/v1/books  {title: "三体", author: "刘慈欣"}
    │
    ▼
Express 路由（book.routes.ts）
    │  先过三个中间件：
    │  1. authenticate        → 检查 JWT token，提取用户信息
    │  2. resolveWorkspace    → 从请求头读 X-Workspace-Id，验证用户是该工作区成员
    │  3. requireWorkspaceRole('MEMBER') → 检查角色权限 ≥ MEMBER
    │  4. validateBody(createBookBodySchema) → 用 Zod 校验请求体格式
    │
    ▼
Controller（book.controller.ts）
    │  从 req 取出：用户 ID、工作区 ID、请求体
    │  调用 bookService.create(userId, workspaceId, body)
    │  用 ResponseUtil.success(res, book, '创建成功', 201) 返回统一格式
    │
    ▼
Service（book.service.ts）
    │  调用 prisma.book.create() 写入数据库
    │  写审计日志：谁在什么时间创建了什么
    │  清除 Redis 缓存：cache.del('books:${workspaceId}*')
    │  发 WebSocket 通知：notifyUser(userId, 'book:created', ...)
    │
    ▼
Prisma ORM
    │  把 TypeScript 调用翻译成 SQL：
    │  INSERT INTO books (title, author, user_id, workspace_id, ...) VALUES (...)
    │
    ▼
PostgreSQL 数据库
```

### 2.2 Zod Schema 校验

**做了什么**：定义 API 请求的数据格式，不合法的直接拒绝

```typescript
// book.schema.ts
createBookBodySchema = z.object({
  title: z.string().min(1, '书名不能为空').max(200),
  author: z.string().min(1, '作者不能为空').max(100),
  isbn: z.string().max(13).optional(),
  status: z.enum(['OWNED', 'READING', 'FINISHED', 'WISHLIST']).default('WISHLIST'),
  categoryId: z.string().uuid().optional(),
})
```

**怎么运作的**：
- 请求进来 → `validateBody` 中间件用 Schema 校验 → 不合法返回 400 错误
- 合法后 `req.body` 被替换为校验后的数据，后续代码放心使用
- 同一个 Schema 还能自动生成 OpenAPI 文档（一石三鸟）

### 2.3 JWT 认证

**做了什么**：让后端知道"这个请求是谁发的"

```
用户注册/登录流程：
1. 用户输入邮箱密码 → POST /auth/register 或 /auth/login
2. 后端用 bcrypt.compare() 验证密码
3. 验证通过 → jwt.sign({id, email, role}, secret, {expiresIn: '7d'}) 生成 token
4. 返回给前端 → 前端存到 localStorage

后续每个请求：
1. 前端 apiClient 拦截器从 localStorage 读 token
2. 加到请求头：Authorization: Bearer <token>
3. 后端 authenticate 中间件用 jwt.verify() 解析 token
4. 解析出 {id, email, role} 挂到 req.user
5. 后续代码就知道"是谁在操作"
```

### 2.4 统一响应格式

**做了什么**：所有 API 返回相同结构，前端好处理

```json
// 成功
{"code": 200, "message": "创建成功", "data": {"id": "xxx", "title": "三体"}}

// 分页列表
{"code": 200, "message": "获取成功", "data": {"items": [...], "total": 25, "page": 1, "pageSize": 10}}

// 失败
{"code": 401, "message": "邮箱或密码错误"}
```

前端 `apiClient` 响应拦截器自动解包：`response.data.data` → 直接拿到业务数据

### 2.5 错误处理

**做了什么**：所有错误走同一个出口

```
任何地方 throw new ApiError(404, '书籍不存在')
    │
    ▼
errorHandler 中间件统一捕获
    │
    ▼
返回 {code: 404, message: '书籍不存在'}
```

---

## Day 3：前后端集成

### 3.1 Axios 拦截器

**做了什么**：自动给每个请求加上认证信息，自动处理错误

```
请求拦截器（发请求前自动执行）：
  1. 从 localStorage 读 auth_token
  2. 加到请求头 Authorization: Bearer <token>
  3. 从 useWorkspaceStore 读当前工作区 ID
  4. 加到请求头 X-Workspace-Id: <workspaceId>

响应拦截器（收到响应后自动执行）：
  1. 解包响应：response.data.data → 直接返回业务数据
  2. 遇到 401 → 清除 token，跳转登录页
  3. 遇到 403 且是工作区问题 → 清除工作区，刷新页面
```

### 3.2 React Query 数据管理

**做了什么**：管理从后端获取的数据，自动缓存、自动刷新

**以书籍列表为例**：

```
useBooks Hook 做了什么：
1. 用 useQuery 发 GET /books 请求
2. 缓存键：['books', workspaceId, 'list', {status, categoryId, page}]
3. 拿到数据后 React Query 自动缓存，5 分钟内不重复请求
4. 切换页面再回来，直接读缓存，瞬间显示

useCreateBook Hook 做了什么：
1. 用 useMutation 发 POST /books 请求
2. 成功后 invalidateQueries → 标记书籍列表缓存为过期
3. React Query 自动重新请求最新数据
4. 页面自动更新，显示新添加的书

useDeleteBook Hook 做了什么：
1. 乐观更新：先从缓存里删掉这本书（不等服务器响应）
2. 页面立刻更新，用户感觉"秒删"
3. 如果服务器返回失败 → 回滚缓存，恢复原来的列表
```

**缓存键工厂**（query-keys.ts）：
```typescript
bookKeys.list(workspaceId, {status, categoryId, page})
// 生成：['books', 'ws-123', 'list', {status: 'READING', categoryId: 'cat-1', page: 1}]
// 不同筛选条件 → 不同缓存 → 切换筛选不丢失数据
```

### 3.3 Docker Compose 一键启动

**做了什么**：一条命令启动完整开发环境

```
docker compose up -d 启动 4 个容器：

postgres 容器（端口 5433）
  → PostgreSQL 数据库，数据存在 pgdata volume 里

redis 容器（端口 6379）
  → Redis 缓存服务，数据存在 redisdata volume 里

backend 容器（端口 4000）
  → 启动时先 prisma db push 同步表结构，再 node dist/index.js
  → 连接 postgres 和 redis

frontend 容器（端口 4001）
  → Nginx 提供编译好的静态文件
  → /api/ 请求代理到 backend:4000
```

---

## Day 4：部署上线

### 4.1 Docker 多阶段构建

**做了什么**：减小镜像体积，生产镜像不包含源代码

```
后端 Dockerfile 两阶段：

第一阶段（builder）— 编译
  安装依赖(npm ci) → 生成 Prisma 客户端 → 编译 TypeScript(npm run build)

第二阶段（production）— 运行
  只复制编译产物(dist/)、依赖(node_modules)、Prisma 文件
  不包含：源代码、TypeScript 编译器、开发依赖

结果：镜像从 ~1GB → ~200MB
```

### 4.2 Nginx 反向代理

**做了什么**：Nginx 作为统一入口，分发请求到不同服务

```
用户请求 https://zyfcloud.cn/
    │
    ▼
阿里云 ECS（139.224.246.39）
    │
    ▼
Nginx（监听 80 和 443）
    │
    ├─ HTTP 80 → 301 重定向到 HTTPS 443
    │
    └─ HTTPS 443
         ├─ /           → proxy_pass http://127.0.0.1:3000（前端容器）
         ├─ /api/*      → proxy_pass http://127.0.0.1:4000（后端容器）
         └─ /health     → proxy_pass http://127.0.0.1:4000（健康检查）
```

### 4.3 GitHub Actions CI/CD

**做了什么**：推送代码后自动测试、自动部署

```
git push origin main 触发两个 Workflow：

Workflow 1 — deploy.yml：
  Job 1（test）：
    → 启动 PostgreSQL + Redis 测试容器
    → 安装后端依赖 → prisma migrate → seed 测试数据 → 跑后端测试
    → 后端 lint + 生成 OpenAPI 文档
    → 安装前端依赖 → lint → 生成 API 类型 → 构建 → 跑前端测试
  
  Job 2（deploy，仅 main 分支 push 触发）：
    → SSH 到 ECS
    → git pull 拉取最新代码
    → 写入 .env（从 GitHub Secrets 注入密码、密钥等）
    → docker compose down + up --build 重新构建部署
    → 健康检查确认服务正常

Workflow 2 — e2e.yml：
    → 启动完整环境（数据库 + Redis + 后端 + 前端）
    → 跑 Playwright E2E 测试（登录、CRUD、评论、权限等）
```

---

## Day 6：Redis 缓存 + OSS 上传 + WebSocket + 限流

### 6.1 Redis 缓存

**做了什么**：把频繁查询的数据存在内存里，减少数据库压力

```
获取书籍列表的流程：

1. bookService.list() 被调用
2. 先用 cache.getOrSet() 查 Redis：
   - 缓存键：books:${workspaceId}:${page}:${pageSize}:${status}:${categoryId}
   - Redis 里有 → 直接返回（快 10-100 倍）
   - Redis 里没有 → 查 PostgreSQL → 结果写入 Redis（TTL 5 分钟）
3. 返回数据给前端

什么时候清缓存：
  创建书籍 → cache.del('books:${workspaceId}*')
  更新书籍 → cache.del('books:${workspaceId}*')
  删除书籍 → cache.del('books:${workspaceId}*')
  上传封面 → cache.del('books:${workspaceId}*')
```

### 6.2 封面上传（Multer + OSS）

**做了什么**：用户上传封面图片，存到阿里云 OSS

```
前端：
  用户选图片 → FormData.append('cover', file) → POST /books/:id/cover

后端处理链路：
  路由：upload.single('cover') → Multer 把文件读到内存（最大 5MB，只允许 JPG/PNG/WebP）
    │
    ▼
  upload.controller.ts：取出 file 和 bookId
    │
    ▼
  upload.service.ts：
    1. 查数据库确认这本书存在且属于该用户
    2. 如果书已有封面 → deleteFromOSS 删旧的
    3. uploadToOSS(file.originalname, file.buffer, file.mimetype)
       → 调用阿里云 SDK：client.put('covers/时间戳-文件名', buffer)
       → 返回 URL：https://booknest-covers.oss-cn-shanghai.aliyuncs.com/covers/xxx.jpg
    4. 更新数据库：prisma.book.update({coverUrl: 新URL})
    5. 清除缓存
    │
    ▼
  返回更新后的书籍数据给前端
```

### 6.3 WebSocket 实时通知

**做了什么**：后端主动推送消息给前端，不需要前端轮询

```
连接建立：
  前端 useSocket Hook：
    → const socket = io(SOCKET_URL, {auth: {token}})
    → 连接时带上 JWT token
  
  后端 socket.ts：
    → 用 jwt.verify 验证 token
    → 解析出 userId
    → socket.join('user:${userId}') 加入个人房间

发送通知：
  bookService.create() 创建书籍后 →
    notifyUser(userId, 'book:created', {message: '《三体》已添加到书架'})

前端接收：
  useSocket Hook 监听 'book:created' 事件 →
    setNotifications(prev => [...prev, data]) →
    页面右上角弹出通知 → 5 秒后自动消失
```

### 6.4 接口限流

**做了什么**：限制单个 IP 的请求频率，防止恶意刷接口

```
express-rate-limit 配置：
  登录接口：authLimiter → 每个 IP 每 15 分钟最多 5 次
  上传接口：uploadLimiter → 每个 IP 每 15 分钟最多 20 次
  通用接口：100 次每 15 分钟

超出限制返回：429 Too Many Requests
```

---

## Day 7：日志 + 健康检查 + 性能优化

### 7.1 Winston 结构化日志

**做了什么**：每条日志都是 JSON 格式，方便检索和分析

```json
{"level":"error","message":"邮箱或密码错误","method":"POST","path":"/api/v1/auth/login","statusCode":401,"timestamp":"2026-05-12T01:28:34"}
{"level":"info","message":"Book created","bookId":"xxx","userId":"yyy","workspaceId":"zzz"}
```

### 7.2 健康检查

**做了什么**：让监控系统知道服务是否正常

```
GET /health → {"status":"ok","timestamp":"..."}
  简单检查，确认 Node.js 进程活着

GET /health/detailed → 检查 PostgreSQL 连接 + Redis 连接
  详细检查，用于排查具体哪个组件出了问题
```

### 7.3 React 性能优化

**做了什么**：减少首屏加载时间

```
React.lazy 懒加载：
  const Stats = lazy(() => import('./pages/Stats'))
  const Activities = lazy(() => import('./pages/Activities'))

用户访问 /stats 时才加载统计页面的代码
首页只加载书籍列表的代码，首屏更快

React Query 缓存：
  staleTime: 5 分钟 → 5 分钟内相同请求直接读缓存
  gcTime: 30 分钟 → 30 分钟不用的缓存才清理
```

---

## Day 8：工程化

### 8.1 ESLint + Prettier

**做了什么**：统一代码风格，自动检查错误

```
ESLint 检查：
  - 未使用的变量/导入（noUnusedLocals）
  - TypeScript 类型错误
  - React Hooks 使用规范
  - 代码质量问题

Prettier 格式化：
  - 统一缩进（2 空格）
  - 统一引号（单引号）
  - 统一行宽（80 或 120 字符）
  - 统一分号、逗号风格
```

### 8.2 Zod → OpenAPI → TypeScript 类型生成

**做了什么**：后端写一次 Schema，自动生成文档和前端类型

```
完整链路：

1. 后端定义 Zod Schema（book.schema.ts）：
   createBookBodySchema = z.object({title: z.string(), author: z.string(), ...})

2. 注册到 OpenAPI：
   registry.registerPath({method: 'post', path: '/books', request: {body: createBookBodySchema}})

3. 生成 OpenAPI JSON：
   npm run openapi:generate → 输出 generated/openapi.json

4. 前端生成 TypeScript 类型：
   npm run api:types → 读取 openapi.json → 生成 types/api.generated.ts

5. 前端代码直接用：
   const {data}: BookListResponse = await apiClient.get('/books')
   // 类型完全匹配后端定义，传错参数编译就报错
```

---

## Day 9：E2E 自动化测试

### 9.1 Playwright 测试

**做了什么**：模拟真实用户操作，验证功能正常

```
以登录测试为例：
1. 打开浏览器，访问 /login
2. 在邮箱输入框填入 e2e-a@booknest.com
3. 在密码输入框填入 password123
4. 点击登录按钮
5. 断言：URL 变成了 /（首页）
6. 断言：页面显示 "E2E Seed Book"（说明书籍列表加载成功）
7. 关闭欢迎弹窗
8. 点击退出按钮
9. 断言：URL 变回 /login

E2E 测试覆盖的流程：
  - 认证：注册、登录、退出
  - 书籍 CRUD：添加、编辑、删除、搜索
  - 评论：添加评论、查看评论
  - 文件上传：封面上传
  - 权限：普通用户不能删别人的书
```

---

## Day 10：多租户 + RBAC

### 10.1 Workspace 多租户

**做了什么**：不同团队的数据互相隔离

```
数据隔离实现：

每张表都有 workspaceId 字段：
  Book → workspaceId
  Category → workspaceId
  Activity → workspaceId

查询时自动过滤：
  prisma.book.findMany({where: {workspaceId: req.workspace.id}})
  → 只返回当前工作区的书，看不到别人的

前端配合：
  apiClient 拦截器自动在每个请求头加 X-Workspace-Id
  → 后端 resolveWorkspace 中间件读取并验证
```

### 10.2 RBAC 角色权限

**做了什么**：不同角色能做不同的事

```
角色权重：OWNER(4) > ADMIN(3) > MEMBER(2) > VIEWER(1)

权限矩阵：
  查看书籍：VIEWER 以上 ✓
  添加/编辑书籍：MEMBER 以上 ✓
  删除书籍：ADMIN 以上 ✓
  管理成员：ADMIN 以上 ✓
  删除工作区：仅 OWNER ✓

中间件实现：
  requireWorkspaceRole('ADMIN')
  → 读 req.workspace.role
  → 比较 roleWeight['MEMBER'] = 2 < roleWeight['ADMIN'] = 3
  → 权限不足，返回 403
```

### 10.3 审计日志

**做了什么**：记录所有重要操作

```
创建书籍时自动记录：
  writeAuditLog({
    workspaceId,
    actorId: userId,
    action: 'book.created',
    entityType: 'Book',
    entityId: book.id,
    metadata: {title: book.title}
  })

效果：数据库里保存了一条记录
  "用户 xxx 在 2026-05-12 创建了书籍《三体》"
  → 出问题可以追溯
```

---

## Day 11：订单 + 队列 + 并发

### 11.1 订单状态机

**做了什么**：订单状态按规则流转，不能乱跳

```
状态流转：
  PENDING（待支付）
    → 用户支付 → PAID（已支付）
    → 30 分钟没付 → EXPIRED（已过期）
    → 用户取消 → CANCELLED（已取消）

代码实现：
  创建订单 → status = 'PENDING'，expiresAt = now + 30分钟
  同时往 BullMQ 队列里加一个延时任务：30 分钟后执行 expire-order
```

### 11.2 BullMQ 消息队列

**做了什么**：把耗时任务放到后台异步处理

```
两个队列：

order 队列：
  创建订单时 → orderQueue.add('expire-order', {orderId}, {delay: 30分钟})
  30 分钟后 Worker 执行：
    → 查数据库，订单还是 PENDING？→ 改成 EXPIRED
    → 订单已经付了？→ 跳过

import 队列：
  用户上传 CSV 文件 → importQueue.add('book-import', {csvText, userId, workspaceId})
  Worker 异步执行：
    → 逐行解析 CSV
    → 每成功/失败一行，更新 ImportJob 的进度
    → 全部完成 → status 改为 SUCCESS 或 FAILED
```

### 11.3 CSV 导入导出

**做了什么**：批量导入书籍数据，导出为 CSV 文件

```
导入流程：
  1. 前端上传 CSV 文件 → POST /imports
  2. 后端创建 ImportJob 记录（status: PENDING）
  3. CSV 内容发到 BullMQ 队列异步处理
  4. Worker 逐行解析，创建书籍，更新进度
  5. 前端轮询 ImportJob 状态，显示进度条

导出流程：
  1. 前端点导出 → GET /exports/books
  2. 后端查询当前工作区所有书籍
  3. 转成 CSV 格式返回
  4. 前端触发下载
```

### 11.4 并发防超卖

**做了什么**：多人同时抢票，保证不出错

```
场景：活动只剩 1 个名额，两个人同时购买

数据库层面保证：
  prisma.$transaction([
    prisma.ticket.count({where: {activityId}}),  // 查已售数量
    prisma.ticket.create({data: {...}})           // 创建新票
  ])
  → 事务内加行锁，第二个请求会等第一个完成
  → 第一个买了，剩余 0，第二个检查发现满了，拒绝
```

---

## Day 12：Taro 小程序工程搭建 + UI 迁移

### 12.1 Taro 工程初始化

**做了什么**：从零搭建 Taro 4 小程序工程，手动创建（非 taro init）

```
技术选型：
  Taro 4.2 + React 18（非 19，Taro 4.2 不兼容 React 19）
  + TypeScript + Sass + Zustand + pnpm workspace

踩坑记录：
  1. React 19 内部 API 变更 → ReactCurrentBatchConfig 报错 → 降级 React 18 解决
  2. webpack 5.106 ProgressPlugin 不兼容 → 锁定 webpack 5.91.0
  3. @/ 别名用相对路径会双重拼接 → 改用 resolve(__dirname) 绝对路径
  4. Sass @import 已废弃 → 全部改为 @use ... as *
```

### 12.2 小程序组件迁移规则

```
DOM 标签替换：
  div → View, span/p → Text, img → Image, button → Button
  input → Input, textarea → Textarea, a → 无（用 Taro.navigateTo）

路由替换：
  react-router-dom → Taro.navigateTo / navigateBack / switchTab
  注意：TabBar 页面必须用 switchTab，不能 redirectTo

存储替换：
  window.localStorage → Taro.getStorageSync / setStorageSync / removeStorageSync
```

### 12.3 小程序页面结构

```
6 个页面 + 3 个 TabBar：
  pages/index/index        — 书架首页 (TabBar)
  pages/categories/index   — 分类管理 (TabBar)
  pages/me/index           — 我的 (TabBar)
  pages/login/index        — 登录
  pages/books/detail/index — 书籍详情
  pages/books/form/index   — 添加/编辑书籍

5 个迁移组件：
  BookCard — 书籍卡片（封面 + 标题 + 作者 + 状态徽章）
  StatusBadge — 状态标签（OWNED=蓝/READING=黄/FINISHED=绿/WISHLIST=紫）
  EmptyState — 空状态占位
  LoadingState — 加载状态
  SafeAreaButton — 底部安全区按钮
```

---

## Day 13：API Client + 微信登录 + UnionID

### 13.1 Taro request adapter

**做了什么**：封装 Taro.request，替代 Web 端的 Axios

```
request<T>(options) 函数：
  自动注入：
    - Authorization: Bearer <token>（从 auth store 读取）
    - X-Workspace-Id（从 workspace store 读取）
    - GET 请求参数转 query string（不用 URL 构造函数，兼容小程序运行时）

  错误处理：
    - 401 → 清除 token + 跳转登录页（带 redirect 参数）
    - 非 2xx → showToast 提示错误信息
    - 网络异常 → showToast "网络请求失败"

  关键区别 vs Web Axios：
    - 不用 Axios，用 Taro.request（小程序网络 API）
    - 不用 localStorage，用 Taro.getStorageSync
    - 不用 URL 构造函数（小程序运行时可能不兼容）
    - header 不是 headers（Taro 用单数）
```

### 13.2 微信登录流程

```
小程序端：
  Taro.login() → 拿到临时 code
  → POST /api/v1/wechat/login {code}
  → 后端返回 {token, user}
  → 存到 auth store（Taro.setStorageSync）

后端处理：
  code2Session(code) → 调微信 API 换取 openid + session_key
    → mock 模式：返回 mock-openid-{code}（本地开发用）
    → real 模式：调 https://api.weixin.qq.com/sns/jscode2session

  upsert 用户：
    → 用 wechatOpenId 匹配已有用户
    → 没有则创建新用户（虚拟邮箱 wechat_xxx@mini.booknest.local）
    → 签发系统 JWT（复用 generateToken）

安全要点：
  - session_key 只存后端（SHA256 哈希），不下发前端
  - openid 是小程序内唯一标识，unionid 需要开放平台绑定才返回
```

### 13.3 账号绑定

```
POST /api/v1/wechat/bind（需要 authenticate 中间件）：
  1. 用 code 换 openid
  2. 检查这个 openid 是否已绑定其他账号 → 409 冲突
  3. 绑定到当前用户，记录 wechatBoundAt 时间
```

---

## Day 14：Book CRUD + Workspace/RBAC + 上传 + 分享

### 14.1 Workspace 切换

**做了什么**：首页支持切换团队书架，数据按 workspace 隔离

```
流程：
  1. 登录后自动调 GET /api/v1/workspaces 获取用户的 workspace 列表
  2. 如果没有 activeWorkspaceId → 自动选第一个
  3. WorkspaceSwitcher 组件显示当前 workspace 名称
  4. 点击 → ActionSheet 选择其他 workspace
  5. 切换后清空书籍列表，重新请求

数据隔离：
  useBooks hook 的 queryKey 包含 activeWorkspaceId
  → 切换 workspace 后 queryKey 变了 → 自动触发新请求
  → 旧 workspace 的缓存还在，切回去秒显示
```

### 14.2 RBAC 前端权限控制

```
角色权重：OWNER(4) > ADMIN(3) > MEMBER(2) > VIEWER(1)

前端控制（体验优化）：
  canCreateBook(role) → MEMBER 及以上 → 显示 "+" FAB 按钮
  canEditBook(role) → MEMBER 及以上 → 显示编辑按钮
  canDeleteBook(role) → ADMIN 及以上 → 显示删除按钮

重要原则：
  前端只隐藏按钮，不拦截请求
  真正的权限校验在后端 requireWorkspaceRole 中间件
  即使绕过前端，后端也会返回 403
```

### 14.3 Book CRUD 表单

```
创建/编辑共用一个页面：
  URL 不带 id → 创建模式
  URL 带 id 参数 → 编辑模式（用 useQuery 回填数据）

表单字段：
  书名*、作者*、状态（Chip 选择）、分类（从 API 获取）、
  ISBN、页数、简介

校验规则：
  title 必填、author 必填、pageCount 不能为负数

防重复提交：
  submitting 状态锁，提交中不响应再次点击
```

### 14.4 列表页分页与筛选

```
分页：
  page 从 1 开始，pageSize = 10
  触底加载下一页（useReachBottom）
  数据累加：items = [...prev, ...newItems]

筛选：
  关键词搜索 → keyword 参数
  状态筛选 → status 参数（OWNED/READING/FINISHED/WISHLIST）
  切换筛选 → 重置 page 为 1

下拉刷新：
  usePullDownRefresh → page = 1 → refetch → stopPullDownRefresh
```

---

## 完整数据流总结

### 用户登录后浏览书籍的完整链路

```
1. 用户打开 https://zyfcloud.cn
2. Nginx 收到 HTTPS 请求 → 解密 → 转发到前端容器(3000)
3. 前端 React 路由发现未登录 → 跳转 /login
4. 用户输入邮箱密码 → 点击登录
5. apiClient.post('/auth/login') → Nginx → 后端容器(4000)
6. 后端：路由 → Zod 校验 → authController.login → authService.login
7. authService：查数据库找到用户 → bcrypt.compare 验证密码 → jwt.sign 生成 token
8. 返回 {token, user} → 前端存 localStorage + useAuthStore
9. 跳转到首页 / → BookList 组件渲染
10. useBooks Hook 发 GET /books → apiClient 自动加 Authorization 和 X-Workspace-Id
11. 后端：authenticate 验证 token → resolveWorkspace 验证工作区 → bookController.list
12. bookService.list → 先查 Redis 缓存
    → 有缓存：直接返回
    → 无缓存：prisma.book.findMany() 查 PostgreSQL → 结果写入 Redis(TTL 5分钟)
13. 返回书籍列表 → React Query 缓存 → 渲染页面
14. 同时 useSocket 建立 WebSocket 连接，等待实时通知
```
