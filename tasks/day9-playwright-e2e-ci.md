# Day 9：Playwright E2E 自动化测试 + CI 回归

> BookNest 第二阶段：工程化与真实业务复杂度训练。
> 本阶段承接 Day 1-7 的完整全栈应用：继续使用 React + TypeScript + Tailwind + React Query 前端、Express + Prisma + PostgreSQL 后端、Redis / OSS / Socket.IO、Docker Compose 与 GitHub Actions。
> 这一版为独立单日任务文档，每一天都可以单独发给学员执行。

## 本阶段统一项目约定

| 项目 | 约定 |
|---|---|
| Repo 根目录 | `booknest/` |
| 前端目录 | `booknest/frontend` |
| 后端目录 | `booknest/backend` |
| 前端端口 | `http://localhost:4001` |
| 后端端口 | `http://localhost:4000` |
| PostgreSQL | `localhost:5433` |
| Redis | `localhost:6379` |
| API 前缀 | `/api/v1` |

## 开始前检查

- [ ] Day 1-7 的 BookNest 项目可以本地启动。
- [ ] `cd backend && npm run dev` 正常。
- [ ] `cd frontend && npm run dev` 正常。
- [ ] 登录、书籍 CRUD、评论、上传、Redis、健康检查功能可用。
- [ ] 当前分支干净：`git status` 没有未提交的重要改动。

建议当天开始前新建分支，例如：

```bash
git checkout -b feat/day9-e2e-ci
```

---

## 项目简介

今天要建立“上线前我敢不敢点发布”的信心。单元测试和接口测试只能证明局部逻辑正确，E2E 测试验证的是用户真实路径：打开页面、登录、创建书籍、编辑、上传、评论、删除。

**今天的目标**：用 Playwright 写出核心业务路径测试，并接入 GitHub Actions，让每次提交都自动回归。

---

## 学习目标

完成今天后，你将掌握：

1. Playwright 项目初始化和配置。
2. 如何为组件添加 `data-testid`。
3. 如何管理测试用户和测试数据。
4. 如何写登录、CRUD、评论、上传、权限类 E2E。
5. 如何保存 trace、截图和失败视频。
6. 如何把 E2E 测试接入 CI。
7. 如何用 E2E 复现和定位线上 bug。

---

## 技术栈

| 技术 | 用途 |
|---|---|
| Playwright | 浏览器自动化 E2E 测试 |
| @playwright/test | 测试运行器和断言 |
| GitHub Actions | CI 回归 |
| Docker Compose | 启动测试依赖 PostgreSQL / Redis |
| Prisma seed | 初始化测试数据 |

---

## 功能清单

### Must-Have

| # | 功能 | 说明 |
|---|---|---|
| 1 | Playwright 初始化 | 前端项目中配置 E2E |
| 2 | 测试数据准备 | 创建测试用户、测试 workspace / book |
| 3 | 登录 E2E | 登录成功、错误密码、退出登录 |
| 4 | Book CRUD E2E | 创建、搜索、编辑、删除书籍 |
| 5 | 评论 E2E | 详情页提交评论并刷新 |
| 6 | 上传 E2E | 上传封面，显示图片 |
| 7 | 权限 E2E/API 测试 | 用户不能访问他人数据 |
| 8 | CI 接入 | Pull Request 自动跑 E2E |

### Nice-to-Have

| # | 功能 | 说明 |
|---|---|---|
| 9 | 并发浏览器测试 | Chromium + Firefox |
| 10 | 测试报告上传 | CI artifacts 保存 report |
| 11 | visual snapshot | 关键页面截图对比 |

---

## Step 1：安装和初始化 Playwright

```bash
cd booknest/frontend
npm install -D @playwright/test
npx playwright install chromium
```

创建目录：

```bash
mkdir -p e2e e2e/fixtures e2e/helpers
```

---

## Step 2：创建 Playwright 配置

路径：`frontend/playwright.config.ts`

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:4001',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'cd ../backend && npm run dev',
      url: 'http://localhost:4000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npm run dev -- --host 0.0.0.0',
      url: 'http://localhost:4001',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})
```

更新 `frontend/package.json`：

```json
{
  "scripts": {
    "e2e": "playwright test",
    "e2e:ui": "playwright test --ui",
    "e2e:debug": "playwright test --debug",
    "e2e:report": "playwright show-report"
  }
}
```

---

## Step 3：准备 E2E 环境变量

前端 `.env.e2e`：

```bash
VITE_API_URL=http://localhost:4000/api/v1
VITE_SOCKET_URL=http://localhost:4000
```

后端 `.env.e2e`：

```bash
DATABASE_URL="postgresql://booknest:booknest123@localhost:5433/booknest_e2e"
JWT_SECRET="booknest-e2e-secret"
PORT=4000
NODE_ENV=test
REDIS_HOST=localhost
REDIS_PORT=6379
```

建议创建独立的 E2E 数据库：

```bash
docker exec -it booknest-pg psql -U booknest -c "CREATE DATABASE booknest_e2e;"
```

如果数据库已存在，命令会报错，可以忽略或先检查。

---

## Step 4：后端增加 E2E seed 脚本

路径：`backend/prisma/seed-e2e.ts`

```ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  await prisma.review.deleteMany()
  await prisma.book.deleteMany()
  await prisma.category.deleteMany()
  await prisma.user.deleteMany()

  const passwordHash = await bcrypt.hash('password123', 10)

  const userA = await prisma.user.create({
    data: {
      email: 'e2e-a@booknest.com',
      passwordHash,
      name: 'E2E User A',
    },
  })

  const userB = await prisma.user.create({
    data: {
      email: 'e2e-b@booknest.com',
      passwordHash,
      name: 'E2E User B',
    },
  })

  const category = await prisma.category.create({
    data: {
      name: '技术',
      color: '#3B82F6',
      userId: userA.id,
    },
  })

  await prisma.book.create({
    data: {
      title: 'E2E Seed Book',
      author: 'BookNest Tester',
      status: 'READING',
      pageCount: 300,
      categoryId: category.id,
      userId: userA.id,
    },
  })

  await prisma.book.create({
    data: {
      title: 'Private Book B',
      author: 'Another User',
      status: 'OWNED',
      userId: userB.id,
    },
  })

  console.log('E2E seed completed')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

后端 `package.json`：

```json
{
  "scripts": {
    "prisma:seed:e2e": "tsx prisma/seed-e2e.ts"
  }
}
```

运行：

```bash
cd backend
DATABASE_URL="postgresql://booknest:booknest123@localhost:5433/booknest_e2e" npx prisma migrate deploy
DATABASE_URL="postgresql://booknest:booknest123@localhost:5433/booknest_e2e" npm run prisma:seed:e2e
```

---

## Step 5：给前端关键元素加 `data-testid`

E2E 测试不要过度依赖 CSS class 或中文文案，因为 UI 改动会让测试不稳定。给关键元素加稳定选择器。

### 5.1 登录页

路径：`frontend/src/pages/Login.tsx`

```tsx
<Input data-testid="login-email" name="email" />
<Input data-testid="login-password" name="password" type="password" />
<Button data-testid="login-submit" type="submit">登录</Button>
```

### 5.2 书籍列表页

```tsx
<input data-testid="book-search" />
<div data-testid="book-list">
  {books.map((book) => (
    <BookCard key={book.id} book={book} data-testid={`book-card-${book.id}`} />
  ))}
</div>
<a data-testid="create-book-link" href="/books/new">添加书籍</a>
```

### 5.3 书籍表单

```tsx
<Input data-testid="book-title" name="title" />
<Input data-testid="book-author" name="author" />
<Input data-testid="book-page-count" name="pageCount" />
<select data-testid="book-status" name="status" />
<Button data-testid="book-submit" type="submit">保存</Button>
```

### 5.4 详情页

```tsx
<button data-testid="edit-book">编辑</button>
<button data-testid="delete-book">删除</button>
<button data-testid="confirm-delete-book">确认删除</button>
<textarea data-testid="review-text" />
<button data-testid="submit-review">提交评论</button>
```

---

## Step 6：创建 E2E helper

路径：`frontend/e2e/helpers/auth.ts`

```ts
import { Page, expect } from '@playwright/test'

export async function login(page: Page, email = 'e2e-a@booknest.com', password = 'password123') {
  await page.goto('/login')
  await page.getByTestId('login-email').fill(email)
  await page.getByTestId('login-password').fill(password)
  await page.getByTestId('login-submit').click()
  await expect(page).toHaveURL(/\/$/)
}
```

路径：`frontend/e2e/helpers/api.ts`

```ts
import { APIRequestContext } from '@playwright/test'

export async function apiLogin(request: APIRequestContext, email: string, password: string) {
  const res = await request.post('http://localhost:4000/api/v1/auth/login', {
    data: { email, password },
  })
  const body = await res.json()
  return body.data.token as string
}
```

---

## Step 7：编写登录测试

路径：`frontend/e2e/auth.spec.ts`

```ts
import { test, expect } from '@playwright/test'

test.describe('Auth', () => {
  test('用户可以登录并退出', async ({ page }) => {
    await page.goto('/login')

    await page.getByTestId('login-email').fill('e2e-a@booknest.com')
    await page.getByTestId('login-password').fill('password123')
    await page.getByTestId('login-submit').click()

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText('E2E Seed Book')).toBeVisible()

    await page.getByTestId('logout-button').click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('错误密码会显示错误提示', async ({ page }) => {
    await page.goto('/login')

    await page.getByTestId('login-email').fill('e2e-a@booknest.com')
    await page.getByTestId('login-password').fill('wrong-password')
    await page.getByTestId('login-submit').click()

    await expect(page.getByText(/密码|登录失败|认证失败/)).toBeVisible()
  })
})
```

如果当前项目没有 `logout-button`，在 Layout 中给退出按钮加上：

```tsx
<button data-testid="logout-button" onClick={logout}>退出</button>
```

---

## Step 8：编写 Book CRUD 测试

路径：`frontend/e2e/book-crud.spec.ts`

```ts
import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test.describe('Book CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('创建、搜索、编辑、删除书籍', async ({ page }) => {
    const uniqueTitle = `E2E Book ${Date.now()}`

    // 创建
    await page.getByTestId('create-book-link').click()
    await page.getByTestId('book-title').fill(uniqueTitle)
    await page.getByTestId('book-author').fill('Playwright Author')
    await page.getByTestId('book-page-count').fill('256')
    await page.getByTestId('book-status').selectOption('READING')
    await page.getByTestId('book-submit').click()

    await expect(page.getByText(uniqueTitle)).toBeVisible()

    // 返回列表并搜索
    await page.goto('/')
    await page.getByTestId('book-search').fill(uniqueTitle)
    await expect(page.getByText(uniqueTitle)).toBeVisible()

    // 进入详情
    await page.getByText(uniqueTitle).click()
    await expect(page.getByText('Playwright Author')).toBeVisible()

    // 编辑
    await page.getByTestId('edit-book').click()
    await page.getByTestId('book-title').fill(`${uniqueTitle} Updated`)
    await page.getByTestId('book-submit').click()
    await expect(page.getByText(`${uniqueTitle} Updated`)).toBeVisible()

    // 删除
    await page.getByTestId('delete-book').click()
    await page.getByTestId('confirm-delete-book').click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText(`${uniqueTitle} Updated`)).not.toBeVisible()
  })
})
```

---

## Step 9：编写评论测试

路径：`frontend/e2e/review.spec.ts`

```ts
import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test('用户可以在书籍详情页提交评论', async ({ page }) => {
  await login(page)

  await page.getByText('E2E Seed Book').click()

  const reviewText = `E2E Review ${Date.now()}`
  await page.getByTestId('review-rating-5').click()
  await page.getByTestId('review-text').fill(reviewText)
  await page.getByTestId('submit-review').click()

  await expect(page.getByText(reviewText)).toBeVisible()
})
```

如果当前 StarRating 没有 `data-testid`，给每颗星加上：

```tsx
<button data-testid={`review-rating-${value}`} type="button">★</button>
```

---

## Step 10：编写上传测试

### 10.1 准备测试图片

路径：`frontend/e2e/fixtures/cover.png`

可以放一张很小的 PNG 测试图片。

### 10.2 编写测试

路径：`frontend/e2e/upload.spec.ts`

```ts
import { test, expect } from '@playwright/test'
import path from 'path'
import { login } from './helpers/auth'

test('用户可以上传书籍封面', async ({ page }) => {
  await login(page)

  await page.getByText('E2E Seed Book').click()

  const filePath = path.join(__dirname, 'fixtures/cover.png')
  await page.getByTestId('cover-upload-input').setInputFiles(filePath)
  await page.getByTestId('cover-upload-submit').click()

  await expect(page.getByTestId('book-cover-image')).toBeVisible()
})
```

如果测试环境不想真的调用 OSS，可以在后端 `NODE_ENV=test` 时把上传逻辑替换为本地 mock：

```ts
if (process.env.NODE_ENV === 'test') {
  return `http://localhost:4000/mock-uploads/${filename}`
}
```

这样 E2E 不依赖阿里云 OSS，更稳定。

---

## Step 11：编写权限测试

权限测试可以先用 Playwright 的 APIRequestContext，不一定必须通过 UI。

路径：`frontend/e2e/permission.spec.ts`

```ts
import { test, expect } from '@playwright/test'
import { apiLogin } from './helpers/api'

test('用户不能访问其他用户的书籍', async ({ request }) => {
  const tokenA = await apiLogin(request, 'e2e-a@booknest.com', 'password123')
  const tokenB = await apiLogin(request, 'e2e-b@booknest.com', 'password123')

  const createRes = await request.post('http://localhost:4000/api/v1/books', {
    headers: { Authorization: `Bearer ${tokenA}` },
    data: {
      title: `Private ${Date.now()}`,
      author: 'User A',
      status: 'OWNED',
    },
  })

  const created = await createRes.json()
  const bookId = created.data.id

  const res = await request.get(`http://localhost:4000/api/v1/books/${bookId}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  })

  expect([403, 404]).toContain(res.status())
})
```

建议后端对于“无权访问的资源”返回 `404`，避免泄露资源是否存在。

---

## Step 12：本地运行 E2E

先启动依赖：

```bash
cd booknest
docker compose up -d postgres redis
```

迁移和 seed：

```bash
cd backend
DATABASE_URL="postgresql://booknest:booknest123@localhost:5433/booknest_e2e" npx prisma migrate deploy
DATABASE_URL="postgresql://booknest:booknest123@localhost:5433/booknest_e2e" npm run prisma:seed:e2e
```

运行 E2E：

```bash
cd ../frontend
npm run e2e
```

打开报告：

```bash
npm run e2e:report
```

**正反馈时刻**：Playwright 打开浏览器，自动登录、创建书籍、编辑、删除，最后出现绿色 PASS。

---

## Step 13：接入 GitHub Actions

创建 `.github/workflows/e2e.yml`

```yaml
name: E2E Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: booknest
          POSTGRES_PASSWORD: booknest123
          POSTGRES_DB: booknest_e2e
        ports:
          - 5433:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: |
            backend/package-lock.json
            frontend/package-lock.json

      - name: Install backend dependencies
        run: |
          cd backend
          npm ci
          npx prisma generate

      - name: Migrate and seed e2e database
        run: |
          cd backend
          npx prisma migrate deploy
          npm run prisma:seed:e2e
        env:
          DATABASE_URL: postgresql://booknest:booknest123@localhost:5433/booknest_e2e
          JWT_SECRET: booknest-e2e-secret

      - name: Install frontend dependencies
        run: |
          cd frontend
          npm ci
          npx playwright install --with-deps chromium

      - name: Run Playwright tests
        run: |
          cd frontend
          npm run e2e
        env:
          DATABASE_URL: postgresql://booknest:booknest123@localhost:5433/booknest_e2e
          JWT_SECRET: booknest-e2e-secret
          NODE_ENV: test
          VITE_API_URL: http://localhost:4000/api/v1
          VITE_SOCKET_URL: http://localhost:4000

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: frontend/playwright-report/
          retention-days: 7
```

---

## Day 9 验收标准 Checklist

- [ ] `frontend/playwright.config.ts` 已配置。
- [ ] `npm run e2e` 可以本地运行。
- [ ] 登录成功测试通过。
- [ ] 错误密码测试通过。
- [ ] 创建 / 搜索 / 编辑 / 删除书籍测试通过。
- [ ] 评论测试通过。
- [ ] 上传封面测试通过或 test 环境 mock 上传通过。
- [ ] 用户不能访问其他用户数据的权限测试通过。
- [ ] 失败时能生成 trace、screenshot 或 video。
- [ ] GitHub Actions 中 E2E job 能运行。
- [ ] CI artifacts 中能下载 Playwright report。

---

## Day 9 Git Commit 示例

```bash
git commit -m "test: add Playwright configuration"
git commit -m "test: add e2e seed data"
git commit -m "test: add auth e2e tests"
git commit -m "test: add book CRUD e2e tests"
git commit -m "test: add review and upload e2e tests"
git commit -m "ci: add Playwright e2e workflow"
```

---

## Day 9 Prompt 模板

### Playwright 初始化

```txt
帮我在 BookNest 前端项目中配置 Playwright。

要求：
1. baseURL 是 http://localhost:4001
2. 自动启动后端 http://localhost:4000/health 和前端 http://localhost:4001
3. 失败时保留 trace、screenshot、video
4. 只跑 chromium
5. 增加 npm scripts：e2e、e2e:ui、e2e:debug、e2e:report
```

### E2E 测试

```txt
帮我写一个 Playwright 测试：
用户登录后创建一本书，搜索这本书，进入详情，编辑标题，然后删除。

已知 test id：
- login-email
- login-password
- login-submit
- create-book-link
- book-title
- book-author
- book-status
- book-submit
- book-search
- edit-book
- delete-book
- confirm-delete-book
```

### CI 接入

```txt
帮我写 GitHub Actions e2e.yml。

要求：
1. 启动 PostgreSQL 16 和 Redis 7 service container
2. 后端 npm ci、prisma generate、migrate deploy、seed e2e
3. 前端 npm ci、安装 Playwright chromium
4. 运行 npm run e2e
5. 失败也上传 playwright-report artifact
```

---

## Day 9 每日回顾

1. E2E 测试和组件测试有什么区别？
2. 为什么 E2E 要用独立数据库？
3. `data-testid` 的好处是什么？
4. 哪一条 E2E 最有价值？为什么？
5. 如果 CI 里 E2E 偶现失败，你会怎么排查？

---
