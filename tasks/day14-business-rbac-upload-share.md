# Day 14：Book CRUD + Workspace/RBAC + 上传 + 分享完整迁移


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

今天要把小程序从“能登录、能请求”推进到“业务闭环可演示”。核心是迁移 Web 端已有的 BookNest 能力：书籍列表、搜索、分类、详情、创建、编辑、删除、评论、Workspace 切换、RBAC 权限展示、封面上传和小程序分享。

**今天的目标**：小程序端完成 BookNest 主业务 MVP，能够在真实 Workspace 中管理书籍，上传封面，按权限显示操作按钮，并支持分享书籍详情页。

---

## 学习目标

完成今天后，你将掌握：

1. Taro 小程序中实现 CRUD 页面和移动端表单。
2. 小程序分页、下拉刷新、触底加载。
3. Workspace 切换与 `X-Workspace-Id` 请求头联动。
4. RBAC 前端展示与后端强校验的分工。
5. `Taro.chooseMedia` + `Taro.uploadFile` 文件上传。
6. OSS 封面上传在小程序场景下的处理。
7. `onShareAppMessage` 分享详情页和登录 redirect。
8. 小程序业务页面的 Loading / Empty / Error / Forbidden 状态设计。

---

## 技术栈

| 技术 | 用途 |
|---|---|
| Taro React | 页面和组件 |
| React Query | Book/Category/Workspace 数据缓存 |
| Zustand | activeWorkspaceId、登录态、UI 偏好 |
| Taro.chooseMedia | 选择封面图片 |
| Taro.uploadFile | 上传封面到后端 |
| OSS | 存储封面图片 |
| Workspace/RBAC | 团队书架与权限隔离 |
| onShareAppMessage | 分享书籍详情 |
| Prisma + Express | 继续复用现有后端 |

---

## 技术路线

```txt
小程序页面
  ↓
Book hooks / Workspace hooks / Upload service
  ↓
Taro request adapter / Taro upload adapter
  ↓
Express API
  ↓
Workspace middleware + RBAC middleware
  ↓
Prisma + OSS + AuditLog
```

今天必须坚持两条规则：

1. 前端可以隐藏无权限按钮，但后端必须继续拦截越权请求。
2. 小程序端不能绕过后端直接写 OSS；学习阶段统一通过后端上传接口，方便鉴权、审计和内容安全扩展。

---

## 功能清单

### Must-Have

| # | 功能 | 说明 |
|---|---|---|
| 1 | 书籍列表 | 分页、搜索、状态筛选、分类筛选 |
| 2 | 书籍详情 | 展示封面、标题、作者、状态、分类、描述、评论 |
| 3 | 创建书籍 | 移动端表单 + 校验 + 防重复提交 |
| 4 | 编辑书籍 | 回填数据 + 保存后刷新详情 |
| 5 | 删除书籍 | 二次确认 + 权限判断 + 列表刷新 |
| 6 | 分类选择 | 分类列表、选择、空状态 |
| 7 | WorkspaceSwitcher | 切换团队书架并刷新数据 |
| 8 | RBAC 展示 | 根据角色显示/隐藏创建、编辑、删除按钮 |
| 9 | 上传封面 | chooseMedia + uploadFile + OSS URL 回显 |
| 10 | 分享详情 | 分享 bookId，进入后可打开详情 |

### Nice-to-Have

| # | 功能 | 说明 |
|---|---|---|
| 1 | 评论创建 | 小程序详情页添加评论 |
| 2 | 阅读进度 | currentPage / totalPages 进度条 |
| 3 | 乐观更新 | 创建/编辑后先更新本地缓存 |
| 4 | 分享海报 | 后续可做 canvas 海报，今天不强求 |

---

## Step 1：实现 Workspace store 和 hooks

`stores/workspace-store.ts`：

```ts
import Taro from '@tarojs/taro'
import { create } from 'zustand'

interface WorkspaceState {
  activeWorkspaceId: string | null
  setActiveWorkspaceId: (id: string) => void
  hydrate: () => void
}

const KEY = 'booknest_active_workspace_id'

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeWorkspaceId: null,
  setActiveWorkspaceId: (id) => {
    Taro.setStorageSync(KEY, id)
    set({ activeWorkspaceId: id })
  },
  hydrate: () => {
    const id = Taro.getStorageSync<string>(KEY) || null
    set({ activeWorkspaceId: id })
  },
}))
```

`services/workspaces.ts`：

```ts
import { request } from './request'
import type { Workspace } from '@booknest/domain'

export function listWorkspaces() {
  return request<Workspace[]>({ url: '/api/v1/workspaces' })
}
```

`components/WorkspaceSwitcher/index.tsx`：

```tsx
import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useQuery } from '@tanstack/react-query'
import { listWorkspaces } from '@/services/workspaces'
import { useWorkspaceStore } from '@/stores/workspace-store'

export function WorkspaceSwitcher() {
  const { data = [] } = useQuery({ queryKey: ['workspaces'], queryFn: listWorkspaces })
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId)

  const active = data.find((item) => item.id === activeWorkspaceId) || data[0]

  const handleSwitch = async () => {
    const res = await Taro.showActionSheet({
      itemList: data.map((item) => `${item.name}（${item.role}）`),
    })
    const target = data[res.tapIndex]
    if (target) setActiveWorkspaceId(target.id)
  }

  return (
    <View className="workspace-switcher" onClick={handleSwitch}>
      <Text>{active?.name || '选择 Workspace'}</Text>
    </View>
  )
}
```

---

## Step 2：定义 RBAC 前端 helper

`packages/permissions/src/index.ts`：

```ts
import type { WorkspaceRole } from '@booknest/domain'

const rank: Record<WorkspaceRole, number> = {
  VIEWER: 1,
  MEMBER: 2,
  ADMIN: 3,
  OWNER: 4,
}

export function canCreateBook(role?: WorkspaceRole | null) {
  return Boolean(role && rank[role] >= rank.MEMBER)
}

export function canEditBook(role?: WorkspaceRole | null) {
  return Boolean(role && rank[role] >= rank.MEMBER)
}

// 后端 canEditOwnResource 允许 MEMBER 删除自己的资源；
// 前端无法判断"是否是资源 owner"，所以统一要求 ADMIN 及以上才显示删除按钮。
// MEMBER 如需删除自己创建的书，由后端在删除接口中额外判断 owner 身份。
export function canDeleteBook(role?: WorkspaceRole | null) {
  return Boolean(role && rank[role] >= rank.ADMIN)
}

// 如果前端能获取资源 owner 信息，可增加此函数：
export function canDeleteOwnBook(role?: WorkspaceRole | null, isOwner?: boolean) {
  if (!role) return false
  if (rank[role] >= rank.ADMIN) return true
  if (role === 'MEMBER' && isOwner) return true
  return false
}

export function canManageMembers(role?: WorkspaceRole | null) {
  return role === 'OWNER' || role === 'ADMIN'
}
```

小程序端使用：

```tsx
{canCreateBook(activeRole) && (
  <View className="fab" onClick={openCreate}>+</View>
)}
```

> 注意：这只是前端体验优化。真正的权限判断必须继续在后端 Workspace middleware / RBAC middleware 中完成。后端 `canEditOwnResource` 允许 MEMBER 操作自己的资源，即使前端隐藏了按钮。

---

## Step 3：实现 Book CRUD services

`services/books.ts`：

```ts
import { request } from './request'
import type { Book } from '@booknest/domain'

// 字段与 Prisma Book 模型对齐：pageCount（不是 totalPages），无 currentPage
export interface BookFormInput {
  title: string
  author: string
  description?: string
  status: string
  categoryId?: string
  isbn?: string
  pageCount?: number
  publishedDate?: string
}

export function getBook(id: string) {
  return request<Book>({ url: `/api/v1/books/${id}` })
}

export function createBook(data: BookFormInput) {
  return request<Book, BookFormInput>({
    url: '/api/v1/books',
    method: 'POST',
    data,
  })
}

export function updateBook(id: string, data: Partial<BookFormInput>) {
  return request<Book, Partial<BookFormInput>>({
    url: `/api/v1/books/${id}`,
    method: 'PATCH',
    data,
  })
}

export function deleteBook(id: string) {
  return request<{ id: string }>({
    url: `/api/v1/books/${id}`,
    method: 'DELETE',
  })
}
```

---

## Step 4：列表页接入分页、筛选和刷新

核心状态：

```ts
const [keyword, setKeyword] = useState('')
const [status, setStatus] = useState<string>('')
const [categoryId, setCategoryId] = useState<string>('')
const [page, setPage] = useState(1)
const [items, setItems] = useState<Book[]>([])
const [hasMore, setHasMore] = useState(true)
```

下拉刷新：

```ts
usePullDownRefresh(async () => {
  setPage(1)
  await refetch()
  Taro.stopPullDownRefresh()
})
```

触底加载：

```ts
useReachBottom(() => {
  if (hasMore && !isFetching) {
    setPage((prev) => prev + 1)
  }
})
```

页面验收重点：

- 搜索时重置 page 为 1。
- 切换 Workspace 时清空旧数据并重新拉取。
- Query Key 必须包含 `activeWorkspaceId` 和筛选参数。
- Loading、Empty、Error 不要互相覆盖。

---

## Step 5：移动端表单实现

表单字段建议：

| 字段 | 类型 | 校验 |
|---|---|---|
| title | Input | 必填，1-200 字 |
| author | Input | 必填，1-100 字 |
| status | Picker | 必填 |
| categoryId | Picker | 可选 |
| isbn | Input | 可选，13位 |
| pageCount | Input number | 可选，正整数 |
| publishedDate | Picker date | 可选 |
| description | Textarea | 可选，最多 1000 字 |
| 封面图片 | 先选图，创建后上传 | 可选，≤3MB |

简化校验函数：

```ts
function validateBookForm(input: BookFormInput) {
  if (!input.title.trim()) return '请输入书名'
  if (!input.author.trim()) return '请输入作者'
  if (input.pageCount && input.pageCount < 0) return '页数不能为负数'
  return null
}
```

提交时防重复：

```ts
const [submitting, setSubmitting] = useState(false)

async function handleSubmit() {
  const error = validateBookForm(form)
  if (error) return Taro.showToast({ title: error, icon: 'none' })
  if (submitting) return

  setSubmitting(true)
  try {
    const book = isEdit ? await updateBook(id, form) : await createBook(form)
    Taro.showToast({ title: '保存成功', icon: 'success' })
    Taro.redirectTo({ url: `/pages/books/detail/index?id=${book.id}` })
  } finally {
    setSubmitting(false)
  }
}
```

---

## Step 6：实现封面上传

`services/upload.ts`：

> **注意**：后端封面上传接口是 `POST /api/v1/books/:id/cover`（绑定到具体书籍），参数名为 `cover`。
> 不是独立的 `/api/v1/uploads/book-cover`。需要先创建书籍拿到 bookId，再上传封面。
> 如果新建书籍时需要先选图再创建，可以先暂存本地临时路径，创建成功后再上传。

```ts
import Taro from '@tarojs/taro'
import { API_BASE_URL } from '@/config/env'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'

interface UploadResponse {
  code: number
  message: string
  data: { url: string; key: string }
}

// 先选图，返回本地临时路径
export async function chooseCoverImage() {
  const chooseRes = await Taro.chooseMedia({
    count: 1,
    mediaType: ['image'],
    sourceType: ['album', 'camera'],
    sizeType: ['compressed'],
  })

  const file = chooseRes.tempFiles[0]
  if (!file) throw new Error('未选择图片')

  if (file.size > 3 * 1024 * 1024) {
    throw new Error('图片不能超过 3MB')
  }

  return file.tempFilePath
}

// 上传封面到后端（需要先有 bookId）
export async function uploadCover(bookId: string, filePath: string) {
  const token = useAuthStore.getState().token
  const workspaceId = useWorkspaceStore.getState().activeWorkspaceId

  const res = await Taro.uploadFile({
    url: `${API_BASE_URL}/api/v1/books/${bookId}/cover`,
    filePath,
    name: 'cover',
    header: {
      Authorization: token ? `Bearer ${token}` : '',
      'X-Workspace-Id': workspaceId || '',
    },
  })

  const body = JSON.parse(res.data) as UploadResponse
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error(body.message || '上传失败')
  }

  return body.data
}
```

上传按钮使用流程（创建书籍场景）：

```tsx
const [tempCoverPath, setTempCoverPath] = useState<string>('')

async function handleChooseCover() {
  const path = await chooseCoverImage()
  setTempCoverPath(path)
}

async function handleSubmit() {
  const error = validateBookForm(form)
  if (error) return Taro.showToast({ title: error, icon: 'none' })
  if (submitting) return

  setSubmitting(true)
  try {
    // Step 1: 创建书籍（不含封面）
    const book = isEdit ? await updateBook(id, form) : await createBook(form)
    // Step 2: 如果选了封面，上传到后端
    if (tempCoverPath) {
      await uploadCover(book.id, tempCoverPath)
    }
    Taro.showToast({ title: '保存成功', icon: 'success' })
    Taro.redirectTo({ url: `/pages/books/detail/index?id=${book.id}` })
  } finally {
    setSubmitting(false)
  }
}

// 渲染
<View className="cover-uploader" onClick={handleChooseCover}>
  {tempCoverPath ? (
    <Image src={tempCoverPath} mode="aspectFill" />
  ) : (
    <Text>选择封面</Text>
  )}
</View>
```

---

## Step 7：实现书籍详情分享

`pages/books/detail/index.tsx`：

```tsx
import { useShareAppMessage, useRouter } from '@tarojs/taro'

export default function BookDetailPage() {
  const router = useRouter()
  const id = router.params.id!
  const { data: book } = useBookDetail(id)

  useShareAppMessage(() => ({
    title: book ? `推荐一本书：${book.title}` : 'BookNest 书籍详情',
    path: `/pages/books/detail/index?id=${id}`,
    imageUrl: book?.coverUrl || undefined,
  }))

  return (...)
}
```

从分享进入时：

- 如果未登录，跳转登录页并带 redirect。
- 登录后回到详情页。
- 如果没有权限访问该 Workspace 的书籍，显示 Forbidden 页面。

---

## Step 8：后端确认点

今天后端不应大改，但要确认：

- [ ] Book API 必须按 Workspace 隔离。
- [ ] Book API 必须校验 RBAC。
- [ ] 上传接口必须鉴权。
- [ ] 上传接口必须校验文件大小和类型。
- [ ] 删除书籍必须写 AuditLog。
- [ ] 分享进入详情时，后端返回 403 不要泄露其他 Workspace 数据。

---

## Day 14 验收标准 Checklist

### 业务闭环

- [ ] 小程序首页展示真实书籍列表。
- [ ] 支持搜索、状态筛选、分类筛选。
- [ ] 支持下拉刷新。
- [ ] 支持触底分页加载。
- [ ] 点击书籍进入详情。
- [ ] 创建书籍成功后进入详情。
- [ ] 编辑书籍成功后详情刷新。
- [ ] 删除书籍有二次确认。

### Workspace / RBAC

- [ ] 可以切换 Workspace。
- [ ] 切换后书籍列表隔离。
- [ ] VIEWER 看不到创建/编辑/删除按钮。
- [ ] MEMBER 可以创建/编辑，但不能做管理员操作。
- [ ] ADMIN/OWNER 权限正常。
- [ ] 后端能拦截越权请求。

### 上传 / 分享

- [ ] 可以选择相册或拍照上传封面。
- [ ] 上传前限制大小。
- [ ] 上传成功后表单回显封面。
- [ ] OSS 中能看到文件。
- [ ] 分享详情页能带 bookId。
- [ ] 未登录从分享进入时能登录后返回目标页。

---

## Day 14 Git Commit 示例

```bash
git add .
git commit -m "feat(mini): migrate book CRUD workspace upload and share"
```

---

## Day 14 Prompt 模板

### Book CRUD 页面

```txt
你是资深 Taro + React Query 工程师。
请为 BookNest Mini 实现书籍创建/编辑表单。
要求：Taro 组件；移动端布局；表单校验；防重复提交；上传封面；保存成功后跳转详情页；TypeScript 类型完整。
```

### Workspace 权限

```txt
请审查我的小程序 WorkspaceSwitcher 和 RBAC helper。
要求：检查 X-Workspace-Id 是否正确注入；Query Key 是否包含 workspaceId；切换 Workspace 是否会导致旧缓存串数据；VIEWER 是否隐藏操作按钮。
```

### 上传封面

```txt
请帮我实现 Taro.chooseMedia + Taro.uploadFile 上传封面。
要求：带 Authorization 和 X-Workspace-Id；限制 3MB；解析后端统一响应；失败 Toast；成功返回 OSS URL。
```

---

## Day 14 每日反馈

### 今日完成

- [ ] Book CRUD 完成。
- [ ] Workspace/RBAC 完成。
- [ ] 上传完成。
- [ ] 分享完成。

### 今日卡点

1. 
2. 
3. 

### Vibe Coding 反馈

| 提示词 | 结果 | 人工修正 |
|---|---|---|
| CRUD 页面 |  |  |
| 上传封面 |  |  |
| 分享详情 |  |  |
| RBAC 显示 |  |  |

### 明日准备

- [ ] Day 15 需要使用 Order / Activity / Ticket 模型，确认后端可用。
- [ ] 确认是否已有微信支付商户号。
- [ ] 即使没有商户号，也要准备 mock pay 模式。

---

## 参考资料

- Taro 页面组件：`https://docs.taro.zone/docs/react-page`
- 微信小程序分享：`https://developers.weixin.qq.com/miniprogram/dev/reference/api/Page.html#onShareAppMessage-Object-object`
- 微信上传文件：`https://developers.weixin.qq.com/miniprogram/dev/api/network/upload/wx.uploadFile.html`
