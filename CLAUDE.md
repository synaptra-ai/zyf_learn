# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BookNest is a full-stack book collection management app, structured as an 11-day progressive learning project. The detailed task guides in `tasks/` are the source of truth for what to build each day.

- **Day 1** (`tasks/day1-frontend.md`): Frontend UI with React + TypeScript + Tailwind CSS + Zustand, data in localStorage
- **Day 2** (`tasks/day2-backend.md`): RESTful API with Express + Prisma + PostgreSQL, JWT auth, Controller-Service layered architecture
- **Day 3** (`tasks/day3-integration.md`): Full-stack integration — replace localStorage with real API via Axios + TanStack React Query, Docker Compose deployment
- **Day 4** (`tasks/day4-deploy.md`): CI/CD + 阿里云 ECS 部署 + Nginx 反向代理 + HTTPS + 域名 DNS
- **Day 5** (`tasks/day5-security.md`): 云服务器网络安全 — 安全组 + SSH 加固 + fail2ban + 系统加固 + 备份恢复
- **Day 6** (`tasks/day6-advanced-backend.md`): Redis 缓存 + 文件上传 (阿里云 OSS) + WebSocket 实时通知 + 接口限流
- **Day 7** (`tasks/day7-observability.md`): Winston 结构化日志 + 错误追踪 + 健康检查 + React 性能优化 + Lighthouse
- **Day 8** (`tasks/day8-engineering-openapi.md`): 工程化重构 — ESLint/Prettier + Zod schema + OpenAPI 接口契约 + 前端类型生成 + 架构文档
- **Day 9** (`tasks/day9-playwright-e2e-ci.md`): Playwright E2E 自动化测试 — 登录/CRUD/评论/上传/权限测试 + CI 回归
- **Day 10** (`tasks/day10-multitenancy-rbac.md`): 多租户 SaaS — Workspace/RBAC/成员邀请/审计日志
- **Day 11** (`tasks/day11-orders-queue-db.md`): 订单状态机 + 模拟支付 + BullMQ 队列 + 数据库并发
- **Day 12** (`tasks/day12-taro-web-migration.md`): Taro 工程搭建 + Web 功能迁移 + 核心 UI 迁移 (微信小程序)
- **Day 13** (`tasks/day13-api-wechat-login-unionid.md`): 微信登录 + UnionID + Taro request adapter
- **Day 14** (`tasks/day14-business-rbac-upload-share.md`): 业务迁移 (RBAC/上传/分享)
- **Day 15** (`tasks/day15-wechat-pay-order-ticket.md`): 微信支付 + 订单 + 票务
- **Day 16** (`tasks/day16-subscribe-customer-service-content-security.md`): 订阅消息 + 客服 + 内容安全
- **Day 17** (`tasks/day17-subpackages-performance.md`): 分包优化 + 性能调优
- **Day 18** (`tasks/day18-mini-ci-review-release.md`): CI/CD + 代码审查 + 发布上线

## Development Commands

### Frontend (`booknest/frontend/`)

```bash
npm run dev          # Start dev server on port 4001
npm run build        # Type-check (tsc -b) then build (vite build)
npm run lint         # ESLint
npm run format       # Prettier format
npm run e2e          # Playwright E2E tests
npm run e2e:ui       # Playwright UI mode
npm run e2e:report   # Show Playwright report
npm run api:types    # Generate TypeScript types from OpenAPI
```

Testing uses Vitest — run with `npx vitest` or `npx vitest run path/to/test.tsx`.

### Backend (`booknest/backend/`)

```bash
npm run dev              # Start dev server on port 4000
npm run build            # TypeScript compile
npm test                 # Jest + Supertest
npm run lint             # ESLint
npm run format           # Prettier format
npm run prisma:seed      # Seed test data
npm run prisma:seed:e2e  # Seed E2E test data
npm run openapi:generate # Generate OpenAPI JSON from Zod schemas
npx prisma migrate dev   # Run DB migrations
npx prisma studio        # Open DB visual editor
```

### Docker

```bash
# Development
docker compose up -d                    # PostgreSQL + Redis + Backend + Frontend

# Production
docker compose -f docker-compose.prod.yml up -d --build
```

### 小程序 (`booknest/apps/mini-taro/`)

```bash
pnpm dev:weapp       # 构建 + watch 微信小程序
pnpm dev:h5          # 构建 + watch H5 (浏览器调试)
pnpm build:weapp     # 生产构建微信小程序
```

根目录快捷命令：`pnpm dev:mini` / `pnpm dev:mini:h5` / `pnpm build:mini`

依赖管理使用 pnpm workspace，后端和 Web 前端继续用 npm。

PostgreSQL 也可单独运行：host port 5433 → container port 5432:
```bash
docker run -d --name booknest-pg \
  -e POSTGRES_USER=booknest -e POSTGRES_PASSWORD=booknest123 \
  -e POSTGRES_DB=booknest -p 5433:5432 postgres:16-alpine
```

## Architecture

```
Data flow: UI → React Query Hooks → Axios Client → Express API → PostgreSQL

Frontend:
  Component (UI) → Page (route) → Hook (data) → API Client (HTTP)
  State: Zustand stores (useAuthStore, useThemeStore) + React Query cache

Backend:
  Route → Controller (request handling) → Service (business logic) → Prisma (DB access)
  Schema: Zod schemas define request/response validation + OpenAPI registration

Mini Program (Taro):
  Component (Taro UI) → Page (Taro route) → Hook (data) → Taro.request (HTTP)
  State: Zustand stores + React Query cache
  Shared: packages/domain (领域类型), packages/permissions (RBAC)
```

## Key Conventions

- Frontend source: `booknest/frontend/src/` with subdirs `components/ui/`, `components/book/`, `pages/`, `stores/`, `hooks/`, `lib/`, `mocks/`, `types/`, `test/`
- Frontend E2E: `booknest/frontend/e2e/` with `helpers/` and `fixtures/`
- Backend source: `booknest/backend/src/` with subdirs `controllers/`, `services/`, `routes/`, `middleware/`, `schemas/`, `lib/`, `utils/`
- Backend workers: `booknest/backend/src/workers/`
- Backend scripts: `booknest/backend/scripts/`
- Mini Program source: `booknest/apps/mini-taro/src/` with subdirs `pages/`, `components/`, `services/`, `stores/`, `hooks/`, `types/`, `config/`, `mocks/`, `utils/`, `assets/`
- Shared packages: `booknest/packages/domain/` (领域类型), `booknest/packages/permissions/` (RBAC)
- Prisma schema: `booknest/backend/prisma/schema.prisma`
- OpenAPI generated: `booknest/backend/generated/openapi.json`
- TypeScript strict mode enabled (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`)
- API prefix: `/api/v1/`
- Test account: `test@booknest.com` / `password123`
- E2E test account: `e2e-a@booknest.com` / `password123`

## Data Model

```
User 1→N Book, User 1→N Category, User 1→N Review
Book 1→N Review, Category 1→N Book
```

Prisma enums: `BookStatus` (OWNED, READING, FINISHED, WISHLIST), `UserRole` (USER, ADMIN)

## 后端 (backend/)

### 技术栈
- Express 5 + TypeScript 6
- Prisma 7 ORM + PostgreSQL 16
- JWT 认证 + bcrypt
- Redis 7 (ioredis) 缓存
- 阿里云 OSS 文件上传
- Socket.IO 实时通知
- express-rate-limit 接口限流
- Winston 结构化日志 + Morgan HTTP 日志
- Zod + @asteasolutions/zod-to-openapi + swagger-ui-express
- Jest 30 + Supertest 测试
- ESLint + Prettier 代码规范

### API 端点
- `/api/v1` — 业务接口
- `/api/v1/workspaces` — Workspace 管理 (RBAC)
- `/api/v1/activities` — 读书会活动 CRUD
- `/api/v1/orders` — 订单创建/查询
- `/api/v1/payments` — 模拟支付回调
- `/api/v1/imports` — CSV 异步导入
- `/api/v1/exports/books` — CSV 导出
- `/health` — 健康检查
- `/health/detailed` — 详细健康检查 (DB + Redis)
- `/api-docs` — Swagger UI
- `/openapi.json` — OpenAPI JSON

### 代码架构
- Controller → Service → Prisma
- Zod schemas 定义请求/响应校验 + OpenAPI 注册
- 所有响应使用 ResponseUtil 统一格式 `{code, message, data}`
- 错误使用 ApiError 类 + errorHandler 中间件
- 路由使用 zodValidate 中间件 (Zod) 或 express-validator + validate 中间件
- Workspace RBAC: resolveWorkspace + requireWorkspaceRole 中间件，角色权重 OWNER=4 > ADMIN=3 > MEMBER=2 > VIEWER=1

### 数据库
- PostgreSQL 16, Docker 运行, 宿主机端口 5433
- Prisma 迁移: `cd backend && npx prisma migrate dev`
- 种子数据: `cd backend && npm run prisma:seed`

### 端口说明
- 前端: http://localhost:4001
- 后端: http://localhost:4000
- PostgreSQL: localhost:5433
- Redis: localhost:6379

## 前端 (frontend/)

### 技术栈
- React 19 + TypeScript 6 + Vite 8
- Tailwind CSS 3 + 暗色模式
- Zustand 状态管理 (useAuthStore, useThemeStore, useWorkspaceStore)
- TanStack React Query 5 数据获取
- React Hook Form + Zod 表单校验
- React Router v7 路由
- Axios HTTP 客户端
- MSW 2 mock (单元测试)
- Playwright (E2E 测试)
- openapi-typescript (API 类型生成)
- Socket.IO Client
- ESLint + Prettier

### 关键文件 (src/)
- `lib/api-client.ts` — Axios 实例 + 拦截器 (token 注入、响应解包)
- `lib/query-client.ts` — QueryClient 配置 (staleTime 5min, gcTime 30min)
- `hooks/query-keys.ts` — 缓存键工厂
- `hooks/useBooks.ts` — 书籍 React Query hooks (含封面上传)
- `hooks/useCategories.ts` — 分类 hooks
- `hooks/useReviews.ts` — 评论 hooks
- `hooks/useStats.ts` — 统计数据 hook
- `hooks/useSocket.ts` — WebSocket hook
- `hooks/useWorkspaces.ts` — Workspace hooks (列表、成员、邀请)
- `hooks/useActivities.ts` — 活动 + 订单 + 支付 hooks
- `hooks/useImports.ts` — CSV 导入/导出 hooks
- `stores/useAuthStore.ts` — 认证状态 (Zustand, token 持久化 localStorage)
- `stores/useWorkspaceStore.ts` — 当前活跃 Workspace (Zustand persist)
- `stores/useThemeStore.ts` — 暗色模式切换
- `types/api.generated.ts` — 从 OpenAPI 自动生成的 TypeScript 类型
- `mocks/` — MSW 2 mock handlers + server

### 页面路由
- `/login` — 登录
- `/register` — 注册
- `/` — 书籍列表 (BookList) — 含欢迎弹窗
- `/books/new` — 添加书籍
- `/books/:id` — 书籍详情
- `/books/:id/edit` — 编辑书籍
- `/categories` — 分类管理
- `/stats` — 统计
- `/members` — 成员管理 (邀请、角色)
- `/activities` — 读书会活动 (报名、模拟支付)
- `/data-tools` — 数据工具 (CSV 导入/导出)

### 认证
- JWT token 存在 localStorage (auth_token)
- Axios 请求拦截器自动注入 Bearer token + X-Workspace-Id header
- 401 响应自动清除 token 并跳转 /login
- ProtectedRoute 包裹所有需要认证的页面

### 测试
- **单元测试**: 6 个 Vitest 测试文件，MSW mock API，不需要启动真实后端
- **E2E 测试**: Playwright 测试覆盖登录、书籍 CRUD、评论、上传、权限

## 小程序 (mini-taro/)

### 技术栈
- Taro 4 + React 19 + TypeScript
- Zustand 状态管理
- Sass (rpx + SCSS variables)
- NutUI React (Taro 组件库，后续引入)
- pnpm workspace 管理

### 页面路由
- `pages/index/index` — 书架首页 (TabBar)
- `pages/categories/index` — 分类管理 (TabBar)
- `pages/me/index` — 我的 (TabBar)
- `pages/login/index` — 登录 (占位页)
- `pages/books/detail/index` — 书籍详情 (navigateTo, params: id)
- `pages/books/form/index` — 添加/编辑书籍 (navigateTo, params: id 可选)

### 迁移组件
- BookCard、StatusBadge、EmptyState、LoadingState、SafeAreaButton

### 项目结构
```
booknest/
├── apps/mini-taro/    # Taro 小程序 (pnpm)
├── packages/domain/   # 共享领域类型 (@booknest/domain)
├── frontend/          # Web 前端 (npm)
├── backend/           # 后端 (npm)
└── docs/              # 文档 (含迁移地图)
```

### 构建产物
- `apps/mini-taro/dist/` — 微信开发者工具导入此目录
- 当前使用 mock 数据，未接入真实 API (Day 13)

## Tech Stack by Day

| Day | Stack |
|-----|-------|
| 1 | React 19 / TypeScript 6 / Vite 8 / Tailwind CSS 3 / Zustand / React Hook Form / Zod / React Router v7 / Lucide React / Vitest |
| 2 | Express 5 / TypeScript 6 / Prisma 7 / PostgreSQL 16 / JWT / bcrypt / express-validator / Jest 30 / Supertest |
| 3 | Axios / TanStack React Query 5 / MSW 2 / Docker Compose |
| 4 | GitHub Actions / 阿里云 ECS / Nginx / Let's Encrypt / Certbot |
| 5 | 阿里云安全组 / VPC / fail2ban / WAF / 自动备份 / Lynis |
| 6 | Redis 7 (ioredis) / 阿里云 OSS / Socket.IO / Multer / express-rate-limit |
| 7 | Winston / Morgan / rollup-plugin-visualizer / Lighthouse / React.lazy |
| 8 | ESLint / Prettier / Zod / @asteasolutions/zod-to-openapi / swagger-ui-express / openapi-typescript |
| 9 | Playwright / @playwright/test / GitHub Actions E2E |
| 10 | Prisma 多租户 / RBAC / Workspace / Invitation / AuditLog |
| 11 | BullMQ / 订单状态机 / 模拟支付 / CSV 导入导出 / 并发防超卖 |
| 12 | Taro 4 / React 19 / TypeScript / Sass / pnpm workspace / Zustand |

## 部署

### 生产环境
- 阿里云 ECS (Ubuntu 22.04, 2核2G)
- Docker Compose 容器化部署
- Nginx 反向代理 + SSL 终止
- GitHub Actions CI/CD

### 部署命令
- `git push origin main` — 触发自动部署
- `docker compose -f docker-compose.prod.yml up -d --build` — 手动部署
- `docker compose -f docker-compose.prod.yml logs -f` — 查看日志

### 关键文件
- `.github/workflows/deploy.yml` — CI/CD 流水线
- `docker-compose.prod.yml` — 生产环境配置
- `frontend/Dockerfile` — 前端容器 (node → nginx)
- `backend/Dockerfile` — 后端容器 (Prisma migrate + Node)
- `frontend/nginx.conf` — SPA 路由 + API 反向代理
- `deploy/nginx.conf` — 宿主机 Nginx 全局配置
- `deploy/booknest.conf` — ECS Nginx 站点配置 (HTTPS + 反向代理)
- `deploy/.env.production.example` — 生产环境变量模板
- `ARCHITECTURE.md` — 项目架构文档

### 域名 & HTTPS
- 域名: zyfcloud.cn (阿里云 DNS 解析 → 139.224.246.39)
- SSL: Let's Encrypt + Certbot 自动续期
- Nginx 配置: /etc/nginx/sites-available/booknest

## Current State

### 已完成

| Day | 内容 | 状态 |
|-----|------|------|
| Day 1 | 前端 UI | 已完成 |
| Day 2 | 后端 RESTful API | 已完成 |
| Day 3 | 全栈集成 + Docker Compose | 已完成 |
| Day 4 | CI/CD + ECS 部署 | 部分完成 (已部署到 ECS，CI/CD 流程待完善) |
| Day 5 | 云服务器安全加固 (安全组/SSH/fail2ban/系统加固/备份) | 已完成 |
| Day 6 | Redis 缓存 + OSS 上传 + WebSocket + 限流 | 已完成 |
| Day 7 | Winston 日志 + 健康检查 | 已完成 |
| Day 8 | ESLint/Prettier + Zod schema + OpenAPI + 前端类型生成 + 架构文档 | 已完成 |
| Day 9 | Playwright E2E 测试 (auth, book-crud, review, upload, permission) | 已完成 |
| Day 10 | 多租户 SaaS (Workspace/RBAC/Invitation/AuditLog) | 已完成 |
| Day 11 | 订单状态机 + 模拟支付 + BullMQ 队列 + CSV 导入导出 | 已完成 |
| Day 12 | Taro 工程搭建 + 核心 UI 迁移 (mock 数据) | 已完成 |

### 待实施

| Day | 内容 | 状态 |
|-----|------|------|
| Day 13 | 微信登录 + UnionID + Taro request adapter | 待实施 |
| Day 14 | 业务迁移 (RBAC/上传/分享) | 待实施 |
| Day 15 | 微信支付 + 订单 + 票务 | 待实施 |
| Day 16 | 订阅消息 + 客服 + 内容安全 | 待实施 |
| Day 17 | 分包优化 + 性能调优 | 待实施 |
| Day 18 | CI/CD + 代码审查 + 发布上线 | 待实施 |
