# Day 1: BookNest 前端基础 — React + Tailwind + Zustand

## 项目简介

这是 BookNest 三天项目的第一天。你将从零搭建一个个人藏书管理应用的前端，使用 React + TypeScript + Tailwind CSS + Zustand 技术栈。数据暂时存在浏览器 localStorage 中，Day 3 会替换为真实后端 API。

**今天的目标**: 完成一个可以创建、浏览、搜索、管理书籍的完整前端应用，拥有漂亮的 UI 和流畅的交互。

---

## 学习目标

完成今天的工作后，你将掌握：

1. **Vite + React + TypeScript** 项目搭建和配置
2. **Tailwind CSS** 实用优先的 CSS 框架 + CVA (class-variance-authority) 组件变体模式
3. **Zustand** 轻量级状态管理 + localStorage 持久化
4. **React Hook Form + Zod** 声明式表单验证
5. **React Router v6** 客户端路由
6. **Vitest** 组件单元测试

---

## 技术栈

| 技术 | 用途 |
|------|------|
| React 18 | UI 框架 |
| TypeScript 5 | 类型安全 |
| Vite 7 | 构建工具 (极快的热更新) |
| Tailwind CSS 3 | 样式 |
| class-variance-authority (CVA) | 组件样式变体 |
| Zustand | 状态管理 |
| React Hook Form | 表单管理 |
| Zod | 数据验证 |
| React Router v6 | 路由 |
| Lucide React | 图标库 |
| Vitest | 测试 |
| @testing-library/react | 组件测试 |

---

## 功能清单

### Must-Have (必做)

| # | 功能 | 说明 |
|---|------|------|
| 1 | 项目脚手架 | Vite + React + TS + Tailwind + 路径别名 `@/` |
| 2 | UI 组件库 | Button(CVA), Input, Card, Badge, Modal, Toast |
| 3 | 书籍列表页 | 卡片网格/表格视图切换，状态过滤 Tab，搜索框 |
| 4 | 创建/编辑书籍 | React Hook Form + Zod 验证 |
| 5 | 书籍详情页 | 完整信息展示 + 删除确认弹窗 |
| 6 | Zustand Store | 书籍/分类 CRUD + localStorage 持久化 |
| 7 | 分类管理 | 创建分类(名称+颜色)，书籍关联分类 |

### Nice-to-Have (加量)

| # | 功能 | 说明 |
|---|------|------|
| 8 | 统计仪表盘 | 书籍状态分布、阅读进度、最近添加 |
| 9 | 暗色模式 | Zustand 存偏好 + Tailwind dark mode |
| 10 | 响应式布局 | 移动端适配 |
| 11 | JSON 导入/导出 | 导出书库 + 导入恢复 |
| 12 | Vitest 测试 | 至少 3 个组件测试 |

---

## 数据模型

先在代码中定义类型，不需要数据库：

```typescript
// 书籍状态
type BookStatus = 'OWNED' | 'READING' | 'FINISHED' | 'WISHLIST'

// 书籍
interface Book {
  id: string          // crypto.randomUUID()
  title: string       // 书名，必填
  author: string      // 作者，必填
  isbn?: string       // ISBN，选填
  pageCount?: number  // 页数，正整数
  description?: string
  coverUrl?: string   // 封面图 URL
  status: BookStatus  // 默认 WISHLIST
  categoryId?: string
  createdAt: string   // ISO date string
  updatedAt: string
}

// 分类
interface Category {
  id: string
  name: string        // 必填
  color: string       // hex 颜色值，如 #3B82F6
  createdAt: string
}

// 书籍阅读记录 (Nice-to-have, 用于统计)
interface ReadingRecord {
  id: string
  bookId: string
  startDate: string
  endDate?: string    // 未完成为 undefined
  notes?: string
}
```

---

## 页面结构

```
/                      → 书籍列表页 (首页)
/books/new             → 创建书籍
/books/:id             → 书籍详情
/books/:id/edit        → 编辑书籍
/categories            → 分类管理
/stats                 → 统计仪表盘 (Nice-to-have)
/settings              → 设置 (暗色模式、导入导出)
```

---

## 分步实施指南

### Step 1: 项目初始化 (30 分钟)

**目标**: 跑起来一个 Vite + React + Tailwind 项目

1. 创建你自己的独立 repo（在工作目录下）：
   ```bash
   mkdir booknest && cd booknest
   git init
   ```

2. 在 repo 中创建前端项目：
   ```bash
   npm create vite@latest frontend -- --template react-ts
   cd frontend
   ```

3. 安装核心依赖：
   ```bash
   npm install zustand react-router-dom react-hook-form @hookform/resolvers zod class-variance-authority clsx tailwind-merge lucide-react
   ```

4. 安装开发依赖：
   ```bash
   npm install -D tailwindcss postcss autoprefixer @testing-library/react @testing-library/jest-dom @testing-library/user-event vitest jsdom
   ```

5. 初始化 Tailwind：
   ```bash
   npx tailwindcss init -p
   ```

6. 配置 `tailwind.config.js`：
   ```js
   /** @type {import('tailwindcss').Config} */
   export default {
     content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
     darkMode: 'class',
     theme: {
       extend: {
         colors: {
           primary: {
             50: '#eff6ff',
             100: '#dbeafe',
             200: '#bfdbfe',
             300: '#93c5fd',
             400: '#60a5fa',
             500: '#3b82f6',
             600: '#2563eb',
             700: '#1d4ed8',
             800: '#1e40af',
             900: '#1e3a8a',
           },
         },
       },
     },
     plugins: [],
   }
   ```

7. 在 `tsconfig.json` 和 `vite.config.ts` 中配置路径别名 `@/` → `./src/*`

8. 创建基本目录结构：
   ```
   frontend/src/
   ├── components/ui/    # 基础 UI 组件
   ├── components/book/  # 书籍相关组件
   ├── pages/            # 页面组件
   ├── stores/           # Zustand stores
   ├── hooks/            # 自定义 hooks
   ├── types/            # TypeScript 类型
   ├── lib/              # 工具函数
   └── App.tsx           # 根组件
   ```

9. **配置前端端口为 4001**（避免与其他项目冲突），在 `vite.config.ts` 中：
   ```typescript
   export default defineConfig({
     server: {
       port: 4001,
     },
     // ... 其他配置
   })
   ```

**正反馈时刻**: 运行 `npm run dev`，浏览器打开 `http://localhost:4001`，看到 Vite + React 欢迎页，且热更新生效（修改 App.tsx 保存后自动刷新）。

---

### Step 2: UI 组件库 (1 小时)

**目标**: 搭建一套可复用的基础 UI 组件

**需要创建的组件**:

1. **`src/components/ui/Button.tsx`** — 使用 CVA 模式
   - 变体 (variant): `default`, `destructive`, `outline`, `ghost`, `link`
   - 尺寸 (size): `sm`, `md`, `lg`
   - 属性: `isLoading` (显示旋转图标), `disabled`
   - 使用 `forwardRef` 转发 ref

2. **`src/components/ui/Input.tsx`** — 输入框
   - 支持 label, error message, placeholder
   - 聚焦时边框高亮

3. **`src/components/ui/Card.tsx`** — 卡片容器
   - CardHeader, CardTitle, CardContent 子组件

4. **`src/components/ui/Badge.tsx`** — 状态标签
   - 不同颜色对应不同书籍状态
   - 变体: `owned`, `reading`, `finished`, `wishlist`

5. **`src/components/ui/Modal.tsx`** — 模态弹窗
   - 标题、内容、确认/取消按钮
   - 点击遮罩关闭

6. **`src/components/ui/Toast.tsx`** — 提示通知
   - 成功(绿)、错误(红)、信息(蓝)
   - 自动消失

7. **`src/lib/utils.ts`** — 工具函数
   ```typescript
   import { clsx, type ClassValue } from 'clsx'
   import { twMerge } from 'tailwind-merge'

   export function cn(...inputs: ClassValue[]) {
     return twMerge(clsx(inputs))
   }
   ```

**正反馈时刻**: 创建一个临时展示页，把所有组件渲染出来看效果，像一个迷你 Storybook。

---

### Step 3: 类型定义 + Zustand Store (45 分钟)

**目标**: 定义数据类型，建立状态管理层

1. **`src/types/index.ts`** — 定义上面的数据模型接口

2. **`src/stores/useBookStore.ts`** — 书籍状态管理
   ```typescript
   // 核心方法
   - addBook(book): void
   - updateBook(id, updates): void
   - deleteBook(id): void
   - getBooksByStatus(status): Book[]
   - searchBooks(query): Book[]
   ```
   - 使用 Zustand 的 `persist` 中间件自动存 localStorage

3. **`src/stores/useCategoryStore.ts`** — 分类状态管理
   ```typescript
   - addCategory(category): void
   - updateCategory(id, updates): void
   - deleteCategory(id): void
   ```

4. **`src/stores/useThemeStore.ts`** — 暗色模式 (Nice-to-have)
   ```typescript
   - toggleTheme(): void
   - isDark: boolean
   ```

**正反馈时刻**: 打开浏览器 DevTools → Application → Local Storage，看到数据正确写入和读取。

---

### Step 4: 路由 + 布局 (30 分钟)

**目标**: 搭建页面骨架和导航

1. **`src/App.tsx`** — 配置 React Router
   ```tsx
   <BrowserRouter>
     <Routes>
       <Route path="/" element={<Layout />}>
         <Route index element={<BookList />} />
         <Route path="books/new" element={<BookCreate />} />
         <Route path="books/:id" element={<BookDetail />} />
         <Route path="books/:id/edit" element={<BookEdit />} />
         <Route path="categories" element={<CategoryManager />} />
         <Route path="stats" element={<Stats />} />
       </Route>
     </Routes>
   </BrowserRouter>
   ```

2. **`src/components/Layout.tsx`** — 应用布局
   - 顶部导航栏: Logo + 导航链接 + 暗色模式切换
   - `<Outlet />` 渲染子页面
   - 底部状态栏 (可选)

**正反馈时刻**: 点击导航链接，页面切换无刷新，URL 正确变化。

---

### Step 5: 书籍列表页 (1.5 小时)

**目标**: 构建核心页面，展示书籍列表

1. **`src/components/book/BookCard.tsx`** — 单本书籍卡片
   - 封面图 (无图时显示默认图标)
   - 书名、作者
   - 状态 Badge
   - 分类标签
   - 点击进入详情

2. **`src/components/book/BookList.tsx`** — 书籍列表
   - 顶部搜索栏
   - 状态过滤 Tab: 全部 | 已拥有 | 在读 | 已读 | 想读
   - 分类过滤下拉框
   - 卡片网格/表格 视图切换按钮
   - 每个卡片显示基本信息

3. **`src/components/book/BookTable.tsx`** — 表格视图 (Nice-to-have)
   - 表头: 书名、作者、状态、分类、添加时间
   - 点击行进入详情

4. **空状态组件**: "还没有书籍，点击添加你的第一本书"

**正反馈时刻**: 手动往 Zustand store 里添加几条测试数据，看到列表页正确渲染。搜索和过滤即时生效。

---

### Step 6: 创建/编辑书籍表单 (1 小时)

**目标**: 完整的表单体验，带验证

1. **`src/lib/schemas.ts`** — Zod 验证规则
   ```typescript
   export const bookSchema = z.object({
     title: z.string().min(1, '书名不能为空').max(200, '书名不超过200字'),
     author: z.string().min(1, '作者不能为空').max(100),
     isbn: z.string().regex(/^(?:\d{10}|\d{13})$/, 'ISBN格式不正确').optional().or(z.literal('')),
     pageCount: z.number().positive('页数必须大于0').optional(),
     description: z.string().max(2000).optional(),
     status: z.enum(['OWNED', 'READING', 'FINISHED', 'WISHLIST']),
     categoryId: z.string().optional(),
   })
   ```

2. **`src/pages/BookCreate.tsx`**
   - React Hook Form + Zod resolver
   - 表单字段: 书名, 作者, ISBN, 页数, 描述, 状态选择, 分类选择
   - 提交成功后跳转到书籍详情页
   - 显示 Toast "添加成功"

3. **`src/pages/BookEdit.tsx`**
   - 表单预填已有数据
   - 保存后返回详情页

**正反馈时刻**: 提交空表单看到红色验证错误提示；填写完整后提交，书籍立刻出现在列表中。

---

### Step 7: 书籍详情页 + 删除 (45 分钟)

**目标**: 完整的 CRUD 闭环

1. **`src/pages/BookDetail.tsx`**
   - 展示书籍所有信息
   - 编辑按钮 → 跳转编辑页
   - 删除按钮 → 弹出确认 Modal
   - 确认后从 store 删除，跳转列表页

**正反馈时刻**: 完整 CRUD 闭环跑通：创建 → 浏览 → 搜索 → 编辑 → 删除。

---

### Step 8: 分类管理 (30 分钟)

**目标**: 分类 CRUD

1. **`src/pages/CategoryManager.tsx`**
   - 分类列表 (带颜色预览)
   - 添加分类表单 (名称 + 颜色选择器)
   - 编辑/删除

**正反馈时刻**: 创建一个蓝色"科幻"分类，创建书籍时可以选择它。

---

### Step 9: 加量内容 — 统计仪表盘 (45 分钟)

**目标**: 数据可视化

1. **`src/pages/Stats.tsx`**
   - 书籍总数、各状态数量
   - 用纯 CSS/div 实现简单的柱状图或进度条
   - 最近添加的 5 本书
   - 阅读完成率

**正反馈时刻**: 随着书籍数据增加，统计页面的图表实时变化。

---

### Step 10: 加量内容 — 暗色模式 + 导入导出 (30 分钟)

1. 暗色模式:
   - `useThemeStore` 切换 `dark` class
   - Tailwind `dark:` 前缀适配各组件

2. JSON 导入导出:
   - 导出: 将 Zustand store 数据序列化为 JSON 下载
   - 导入: 选择 JSON 文件，解析后覆盖 store

**正反馈时刻**: 点击暗色模式切换，整个应用瞬间变暗，视觉冲击力强。

---

### Step 11: 测试 (45 分钟)

写至少 3 个测试：

1. **Zustand Store 测试** — 验证 addBook, deleteBook, searchBooks 逻辑
2. **Zod Schema 测试** — 验证有效/无效数据通过/拒绝
3. **组件渲染测试** — BookCard 正确显示书籍信息

---

## 验收标准 Checklist

完成以下所有项即为 Day 1 达标：

- [ ] `npm run dev` 无报错启动在 `http://localhost:4001`
- [ ] 可创建书籍，标题为空时 Zod 验证拦截并显示错误信息
- [ ] 列表页支持状态过滤 Tab (全部/在读/已读/想读/已拥有)
- [ ] 搜索框可按书名或作者搜索
- [ ] 编辑表单预填已有数据，保存成功后更新
- [ ] 删除有确认弹窗，确认后列表更新
- [ ] 刷新浏览器后数据不丢失 (localStorage)
- [ ] 暗色模式可切换，刷新后保持偏好
- [ ] 至少 3 个 Vitest 测试通过
- [ ] `npm run build` 零 TypeScript 错误
- [ ] 所有页面响应式布局正常 (手机/平板/桌面)

---

## Git 工作规范

### Repo 结构

建议的 repo 结构：

```
booknest/                  ← 你的独立 repo
├── frontend/              ← Day 1-3 前端 (今天创建)
├── backend/               ← Day 2 后端 (明天创建)
├── docker-compose.yml     ← Day 3 全栈部署 (后天创建)
├── README.md              ← 项目说明
└── CLAUDE.md              ← Claude Code 项目上下文
```

### 初始化

```bash
mkdir booknest && cd booknest
git init

# 创建 .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
coverage/
EOF

git add .
git commit -m "chore: init booknest project"
```

### 分支策略

```bash
# 今天的工作分支
git checkout -b feat/day1-frontend

# 在 frontend/ 目录下工作
cd frontend
```

### Commit 规范

```
feat: 新功能
fix: 修复 bug
refactor: 重构
test: 测试
docs: 文档
chore: 构建/工具/配置
style: 样式调整
```

**示例**:
```bash
git commit -m "feat: add BookCard component with status badge"
git commit -m "feat: implement book list page with search and filter"
git commit -m "feat: add book create form with Zod validation"
git commit -m "feat: implement dark mode toggle"
git commit -m "test: add Zustand store and Zod schema tests"
```

### 提交节奏
- **每完成一个功能点就 commit**，不要积攒
- 每次 commit 前用 `git diff` 检查变更
- 一天结束时推送到远端并创建 PR

---

## Prompt 模板

以下是针对 Day 1 各阶段的推荐 Prompt 模板。**用中文自然语言描述需求**，越具体越好。

### 项目初始化

```
帮我创建一个 Vite + React + TypeScript 项目，项目名叫 frontend，在当前目录下。
需要配置:
1. Tailwind CSS，支持暗色模式 (darkMode: 'class')
2. 路径别名 @/ 指向 src/
3. 开发服务器端口设为 4001
4. 以下依赖: zustand, react-router-dom, react-hook-form, @hookform/resolvers, zod,
   class-variance-authority, clsx, tailwind-merge, lucide-react
5. 开发依赖: vitest, jsdom, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event
6. 创建目录结构: components/ui, components/book, pages, stores, hooks, types, lib
```

### UI 组件

```
帮我创建一个 Button 组件 (src/components/ui/Button.tsx)，要求:
1. 使用 class-variance-authority (CVA) 管理样式变体
2. variant: default(蓝), destructive(红), outline(边框), ghost(透明), link(下划线)
3. size: sm, md, lg
4. 支持 isLoading 属性，loading 时显示旋转的 Loader 图标并禁用按钮
5. 使用 forwardRef 转发 ref
6. 用 tailwind-merge 的 cn() 函数合并 className
```

### 表单

```
帮我创建书籍创建表单页面 (src/pages/BookCreate.tsx)，要求:
1. 使用 React Hook Form + Zod 验证
2. 字段: title(必填), author(必填), isbn(选填,格式校验), pageCount(选填,正整数),
   description(选填), status(下拉选择), categoryId(下拉选择)
3. 提交后调用 useBookStore 的 addBook 方法
4. 成功后显示 Toast 提示并跳转到书籍详情页
5. 表单样式用 Tailwind，输入框聚焦时蓝色边框
6. 验证错误显示在输入框下方，红色文字
```

### 调试

```
我的搜索功能不工作，输入文字后列表没有变化。
我的代码如下:

[粘贴相关代码]

期望: 输入 "React" 后只显示标题或作者包含 "React" 的书
实际: 列表没有变化

帮我排查问题。
```

### 通用技巧

- **描述 WHAT 而不是 HOW**: "我需要一个显示书籍状态的标签，不同状态用不同颜色" 比 "写一个 span 加 className" 效果好
- **提供上下文**: 粘贴相关的类型定义和已有代码，让 AI 理解你的项目结构
- **分步推进**: 不要一次要整个页面，先要组件，再要组合，最后要页面
- **遇到报错先贴报错**: 完整的错误信息比描述更有用

---

## Claude Code 使用指南

### CLAUDE.md

在 repo 根目录创建 `CLAUDE.md`（可以使用 `/init` 命令自动生成）：

```markdown
# BookNest

个人藏书管理全栈应用。

## 项目结构
- frontend/ — React 前端 (Vite + Tailwind + Zustand)
- backend/  — Express 后端 (Day 2 创建)

## 开发命令
- cd frontend && npm run dev — 启动前端 (http://localhost:4001)
- cd frontend && npm run build — 生产构建
- cd frontend && npm run test — 运行测试

## 技术栈
- React 18 + TypeScript + Vite
- Tailwind CSS + CVA
- Zustand (状态管理)
- React Hook Form + Zod (表单验证)
- React Router v6 (路由)
- Vitest (测试)

## 代码规范
- 使用函数式组件 + hooks
- 组件使用 forwardRef
- 样式使用 Tailwind + cn() 工具函数
- 状态管理使用 Zustand
- 表单使用 React Hook Form + Zod
```

### 常用技能

| 命令 | 用途 | 何时使用 |
|------|------|----------|
| `/init` | 创建 CLAUDE.md | 项目开始时 |
| `/review` | 代码审查 | 每天结束前 |
| `simplify` | 代码质量检查 | 完成功能后 |

### 使用技巧

1. **`/init` 是第一步** — 创建项目后立即运行，让 Claude 理解你的项目
2. **`/review` 做每日回顾** — 把今天的改动让 Claude 审查一遍
3. **`simplify` 检查代码质量** — 完成复杂功能后运行，找重复代码和优化点
4. **遇到问题直接描述** — 不需要特殊命令，用自然语言对话即可

---

## 每日回顾

Day 1 结束前，回答以下问题：

1. **哪些概念最让你困惑？** (比如 CVA 模式、Zustand persist、React Hook Form)
2. **你写的最满意的组件是哪个？为什么？**
3. **如果重新来过，你会改变哪一步的做法？**
4. **明天你期待学到什么？**

把回答记录下来，明天开始前回顾。
