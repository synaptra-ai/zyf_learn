# Day 12：Taro 工程搭建 + Web 功能迁移盘点 + 核心 UI 迁移


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

今天正式进入微信小程序阶段。你不再从零写一个 Demo，而是把现有 BookNest Web 的功能迁移到 Taro 小程序。今天的重点不是接口联调，而是建立迁移框架：项目结构、页面结构、组件迁移规则、样式适配规则、H5/weapp 构建规则，以及第一批核心页面的 mock 版本。

**今天的目标**：创建 `apps/mini-taro`，完成 Taro + React + TypeScript 工程，迁移首页、书籍详情、创建/编辑表单、我的页面的静态版本，并输出 `WEB_TO_MINI_MIGRATION_MAP.md`。

---

## 学习目标

完成今天后，你将掌握：

1. Taro + React + TypeScript 项目初始化。
2. Taro 与微信小程序页面配置、生命周期、路由栈的关系。
3. Web 组件迁移到 Taro 组件的规则。
4. `View / Text / Image / ScrollView / Button / Input` 等小程序组件的使用方式。
5. `rpx`、安全区、底部固定操作栏、移动端滚动布局。
6. 如何从现有 Web 页面中拆出可复用的业务逻辑、类型、常量和权限规则。
7. 如何用 mock 数据先完成小程序页面闭环。

---

## 技术栈

| 技术 | 用途 |
|---|---|
| Taro 4.x | 多端开发框架，主线用于微信小程序 |
| React 19 | 继续复用 Web 端 React 思维 |
| TypeScript 6 | 类型安全 |
| Taro React Hooks | 页面生命周期、路由、分享等 |
| Zustand | 客户端状态管理，后续复用 Web 端 store 思路 |
| NutUI React (@nutui/nutui-react-taro) | Taro 生态组件库，与 React 集成好 |
| Sass / CSS Modules | 样式组织 |
| pnpm workspace | 多应用、多共享包管理 |

---

## 技术路线

今天的技术路线是：

```txt
现有 Web 项目
  ↓ 盘点页面、组件、hooks、types、store
packages/domain        复用业务实体类型
packages/permissions   复用 RBAC 权限矩阵
packages/shared-utils  复用日期、格式化、常量
  ↓
apps/mini-taro         Taro 小程序主线
  ↓
微信开发者工具预览
```

迁移原则：

| Web 内容 | 迁移方式 |
|---|---|
| 领域类型 `Book / Category / Workspace / Order` | 放到 `packages/domain` 共享 |
| 权限判断 `canCreateBook / canDeleteBook` | 放到 `packages/permissions` 共享 |
| Web UI 组件 | 只迁移业务结构，不直接复用 DOM 标签 |
| React Router | 改为 Taro 页面路由和页面栈 |
| Tailwind class | 可参考设计 token，但不要强行照搬所有 class |
| Axios Client | 今天先不做，Day 13 改成 Taro request adapter |
| React Query hooks | 今天只保留 query key 设计，Day 13 再接入真实 API |

---

## 功能清单

### Must-Have

| # | 功能 | 说明 |
|---|---|---|
| 1 | Taro 工程初始化 | `apps/mini-taro` 可运行到微信开发者工具 |
| 2 | 项目结构 | pages、components、services、stores、hooks、types、config |
| 3 | 页面配置 | 首页、详情、表单、分类、我的、登录占位页 |
| 4 | TabBar | 首页、分类、我的 |
| 5 | 核心组件迁移 | BookCard、EmptyState、LoadingState、StatusBadge、SafeAreaButton |
| 6 | Mock 数据 | 本地 mock 书籍、分类、Workspace、用户 |
| 7 | 静态页面闭环 | 首页 → 详情 → 编辑 → 返回 |
| 8 | 迁移地图 | 输出 `docs/WEB_TO_MINI_MIGRATION_MAP.md` |

### Nice-to-Have

| # | 功能 | 说明 |
|---|---|---|
| 1 | H5 构建 | `pnpm dev:h5` 能跑，便于调试样式 |
| 2 | 设计 token | 抽出颜色、间距、圆角、阴影变量 |
| 3 | Story 页面 | 建一个组件预览页，用于检查组件状态 |
| 4 | 原生组件实验 | 记录哪些高频组件未来可能改成原生小程序组件 |

---

## Step 1：调整 Repo 结构

如果当前项目还是 `frontend/ backend/` 平铺结构，可以先逐步迁移，不要求一天内完成 monorepo 大重构。

推荐目标结构：

```txt
booknest/
├── apps/
│   ├── web/                 # 原 Web 前端，可从 frontend 迁移
│   └── mini-taro/           # 今日新增
├── packages/
│   ├── domain/              # 领域类型
│   ├── permissions/         # RBAC 权限矩阵
│   ├── shared-utils/        # format/date/constants
│   └── api-contract/        # OpenAPI 生成类型，Day 13 补齐
├── backend/
├── docs/
└── package.json
```

如果不想今天迁移 Web 目录，可以先保留：

```txt
booknest/
├── frontend/
├── backend/
├── apps/
│   └── mini-taro/
├── packages/
└── docs/
```

创建 workspace：

```bash
# repo 根目录
pnpm init
mkdir -p apps packages docs
cat > pnpm-workspace.yaml <<'EOF'
packages:
  - "apps/*"
  - "packages/*"
  # backend 和 frontend 暂不加入 pnpm workspace，继续用 npm
EOF
```

> **npm 到 pnpm 迁移说明**：Day 1-11 的 backend 和 frontend 使用 npm，本阶段引入 pnpm workspace 管理 mini-taro 和 packages。
> 如果不想把 backend/frontend 也迁移到 pnpm，可以在 pnpm-workspace.yaml 中只包含 `apps/*` 和 `packages/*`，backend/frontend 继续用 npm 独立管理。
> 如果决定统一用 pnpm，需要：
> 1. 删除 backend/ 和 frontend/ 的 `node_modules` 和 `package-lock.json`
> 2. 在项目根目录运行 `pnpm install` 生成 `pnpm-lock.yaml`
> 3. 把 `npm run dev` 改为 `pnpm --filter backend dev` 等
>
> 建议方案：**backend/frontend 暂时不加入 pnpm workspace**，只让 mini-taro 和 packages 受 pnpm 管理。等本阶段稳定后再考虑统一。

---

## Step 2：初始化 Taro 项目

安装 Taro CLI：

```bash
pnpm add -g @tarojs/cli
```

初始化项目：

```bash
cd apps
taro init mini-taro
```

初始化时建议选择：

| 选项 | 推荐 |
|---|---|
| 框架 | React |
| 语言 | TypeScript |
| CSS 预处理 | Sass |
| 模板 | 默认模板即可 |
| 包管理器 | pnpm |

进入项目并启动：

```bash
cd apps/mini-taro
pnpm install
pnpm dev:weapp
```

用微信开发者工具导入：

```txt
导入目录：booknest/apps/mini-taro/dist
AppID：使用你的小程序 AppID
```

---

## Step 3：配置页面和 TabBar

创建页面目录：

```txt
src/
├── app.config.ts
├── app.tsx
├── app.scss
├── pages/
│   ├── index/index.tsx
│   ├── categories/index.tsx
│   ├── me/index.tsx
│   ├── login/index.tsx
│   └── books/
│       ├── detail/index.tsx
│       └── form/index.tsx
├── components/
├── services/
├── stores/
├── hooks/
├── types/
├── config/
└── utils/
```

`src/app.config.ts` 示例：

```ts
export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/categories/index',
    'pages/me/index',
    'pages/login/index',
    'pages/books/detail/index',
    'pages/books/form/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: 'BookNest',
    navigationBarTextStyle: 'black',
  },
  tabBar: {
    color: '#64748b',
    selectedColor: '#2563eb',
    backgroundColor: '#ffffff',
    list: [
      { pagePath: 'pages/index/index', text: '书架' },
      { pagePath: 'pages/categories/index', text: '分类' },
      { pagePath: 'pages/me/index', text: '我的' },
    ],
  },
})
```

---

## Step 4：建立共享领域类型

创建 `packages/domain`：

```bash
mkdir -p packages/domain/src
cat > packages/domain/package.json <<'EOF'
{
  "name": "@booknest/domain",
  "version": "0.0.1",
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts"
}
EOF
```

`packages/domain/src/index.ts`：

```ts
export type BookStatus = 'OWNED' | 'READING' | 'FINISHED' | 'WISHLIST'

export interface Category {
  id: string
  name: string
  color: string
}

// 与 Prisma schema 中的 Book 模型对齐：
// - pageCount 对应 Prisma pageCount (Int?)
// - 没有 rating 字段（rating 在 Review 模型中）
// - isbn / publishedDate 为可选字段
export interface Book {
  id: string
  title: string
  author: string
  isbn?: string | null
  publishedDate?: string | null
  pageCount?: number | null
  description?: string | null
  coverUrl?: string | null
  status: BookStatus
  categoryId?: string | null
  category?: Category | null
  createdAt: string
  updatedAt: string
}

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'

export interface Workspace {
  id: string
  name: string
  role: WorkspaceRole
}
```

在 `apps/mini-taro/package.json` 中引入：

```json
{
  "dependencies": {
    "@booknest/domain": "workspace:*"
  }
}
```

---

## Step 5：迁移核心组件

组件迁移规则：

| Web React | Taro 小程序 |
|---|---|
| `div` | `View` |
| `span/p` | `Text` |
| `img` | `Image` |
| `button` | `Button` 或 `View + onClick` |
| `input` | `Input` |
| `textarea` | `Textarea` |
| `onClick` | `onClick`，编译到小程序事件 |
| CSS px | 优先 rpx |
| fixed bottom | 注意安全区 |

创建 `components/BookCard/index.tsx`：

```tsx
import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { Book } from '@booknest/domain'
import './index.scss'

interface BookCardProps {
  book: Book
}

export function BookCard({ book }: BookCardProps) {
  const handleOpen = () => {
    Taro.navigateTo({ url: `/pages/books/detail/index?id=${book.id}` })
  }

  return (
    <View className="book-card" onClick={handleOpen}>
      <Image
        className="book-card__cover"
        src={book.coverUrl || '/assets/default-cover.png'}
        mode="aspectFill"
        lazyLoad
      />
      <View className="book-card__body">
        <Text className="book-card__title">{book.title}</Text>
        <Text className="book-card__author">{book.author}</Text>
        <Text className="book-card__status">{book.status}</Text>
      </View>
    </View>
  )
}
```

`components/BookCard/index.scss`：

```scss
.book-card {
  display: flex;
  padding: 24rpx;
  border-radius: 24rpx;
  background: #fff;
  box-shadow: 0 8rpx 24rpx rgba(15, 23, 42, 0.06);
}

.book-card__cover {
  width: 128rpx;
  height: 176rpx;
  border-radius: 16rpx;
  background: #f1f5f9;
}

.book-card__body {
  flex: 1;
  margin-left: 24rpx;
  min-width: 0;
}

.book-card__title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #0f172a;
}

.book-card__author {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  color: #64748b;
}
```

---

## Step 6：准备 mock 数据和静态页面

创建 `src/mocks/books.ts`：

```ts
import type { Book, Category, Workspace } from '@booknest/domain'

export const mockCategories: Category[] = [
  { id: 'cat-1', name: '技术', color: '#2563eb' },
  { id: 'cat-2', name: '文学', color: '#db2777' },
]

export const mockWorkspaces: Workspace[] = [
  { id: 'ws-1', name: '我的书架', role: 'OWNER' },
]

export const mockBooks: Book[] = [
  {
    id: 'book-1',
    title: '深入理解 TypeScript',
    author: 'BookNest Demo',
    status: 'READING',
    coverUrl: '',
    categoryId: 'cat-1',
    category: mockCategories[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]
```

首页 `pages/index/index.tsx`：

```tsx
import { ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { BookCard } from '@/components/BookCard'
import { mockBooks } from '@/mocks/books'
import './index.scss'

export default function IndexPage() {
  return (
    <View className="page">
      <View className="page__header">
        <Text className="page__title">BookNest Mini</Text>
        <Text className="page__subtitle">从 Web 迁移到微信小程序</Text>
      </View>

      <ScrollView scrollY className="book-list">
        {mockBooks.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </ScrollView>

      <View
        className="fab"
        onClick={() => Taro.navigateTo({ url: '/pages/books/form/index' })}
      >
        +
      </View>
    </View>
  )
}
```

---

## Step 7：编写 Web 到小程序迁移地图

创建 `docs/WEB_TO_MINI_MIGRATION_MAP.md`：

```md
# Web to Mini Migration Map

## 页面迁移

| Web 页面 | 小程序页面 | 优先级 | 迁移策略 | 状态 |
|---|---|---|---|---|
| `/books` | `pages/index/index` | P0 | Taro 重写 UI，复用类型和 API | Doing |
| `/books/:id` | `pages/books/detail/index` | P0 | Taro 重写 UI，复用 detail hook | Todo |
| `/books/new` | `pages/books/form/index` | P0 | 表单重写，校验逻辑复用 | Todo |
| `/categories` | `pages/categories/index` | P1 | 移动端简化 | Todo |
| `/workspaces` | 分包 workspace | P1 | Day 14 迁移 | Todo |
| `/orders` | 分包 orders | P1 | Day 15 迁移 | Todo |

## 组件迁移

| Web 组件 | 小程序组件 | 是否直接复用 | 说明 |
|---|---|---|---|
| BookCard | BookCard | 否 | JSX 结构可参考，DOM 标签重写 |
| Modal | Taro Modal / 自定义 | 否 | 小程序弹层交互不同 |
| Toast | Taro.showToast | 否 | 使用平台能力 |
| EmptyState | EmptyState | 部分 | 样式重写 |

## 状态迁移

| Web 状态 | 小程序状态 | 说明 |
|---|---|---|
| token store | auth store | storage adapter 改为 Taro storage |
| activeWorkspaceId | workspace store | 请求头继续带 X-Workspace-Id |
| React Query cache | React Query cache | Day 13 接入 |
```

---

## Step 8：构建与预览

```bash
cd apps/mini-taro
pnpm dev:weapp
```

检查：

- [ ] 微信开发者工具能打开 `dist`。
- [ ] 首页无报错。
- [ ] 详情页能通过 `navigateTo` 打开。
- [ ] 表单页能打开。
- [ ] 我的页、分类页能通过 TabBar 切换。

可选 H5 调试：

```bash
pnpm dev:h5
```

---

## Day 12 验收标准 Checklist

### 工程

- [ ] `apps/mini-taro` 创建完成。
- [ ] `pnpm dev:weapp` 成功生成 `dist`。
- [ ] 微信开发者工具能导入并预览。
- [ ] TypeScript 无明显类型错误。
- [ ] 基础路径别名 `@/` 可用。

### 页面

- [ ] 首页、详情、表单、分类、我的、登录占位页存在。
- [ ] 首页显示 mock 书籍列表。
- [ ] 点击书籍可以进入详情页。
- [ ] 创建按钮可以进入表单页。
- [ ] TabBar 可以切换。
- [ ] 样式在手机尺寸下不明显错乱。

### 迁移

- [ ] 至少 5 个 Web 组件被迁移或重写成 Taro 组件。
- [ ] `packages/domain` 创建并被小程序引用。
- [ ] `docs/WEB_TO_MINI_MIGRATION_MAP.md` 完成。
- [ ] 明确哪些代码可复用、哪些必须重写。

---

## Day 12 Git Commit 示例

```bash
git add .
git commit -m "feat(mini): initialize Taro app and migrate core UI shell"
```

---

## Day 12 Prompt 模板

### 组件迁移

```txt
你是资深 Taro + React 微信小程序工程师。
请把下面这个 Web React 组件迁移成 Taro 组件：
要求：
1. div/span/img/button 改成 Taro 组件。
2. 不使用 window/document/localStorage。
3. 样式使用 rpx 和 BEM class。
4. 保留 TypeScript props 类型。
5. 给出 index.tsx 和 index.scss。
```

### 页面布局

```txt
请帮我设计一个适合微信小程序的书籍列表页。
约束：Taro + React + TypeScript；移动端优先；支持 ScrollView；底部有固定新增按钮；需要 Loading/Empty/Error 三种状态。
```

### 迁移评审

```txt
请审查这份 WEB_TO_MINI_MIGRATION_MAP.md，判断哪些 Web 端代码可以复用，哪些在小程序中必须重写，并给出原因。
```

---

## Day 12 每日反馈

### 今日完成

- [ ] 工程搭建完成。
- [ ] 核心页面静态版完成。
- [ ] 迁移地图完成。

### 今日卡点

记录至少 3 个：

1. 
2. 
3. 

### Vibe Coding 反馈

| 提示词 | 结果 | 人工修正 |
|---|---|---|
| 组件迁移 |  |  |
| 页面布局 |  |  |
| 样式适配 |  |  |

### 明日准备

- [ ] 后端 OpenAPI 文档可访问。
- [ ] 小程序 AppID、AppSecret 已保存到后端 `.env`，不要提交 Git。
- [ ] 准备 Day 13 微信登录和 request adapter。

---

## 参考资料

- Taro 官方文档：`https://docs.taro.zone/docs/`
- Taro 页面组件与生命周期：`https://docs.taro.zone/docs/react-page`
