# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BookNest is a full-stack book collection management app, structured as a 7-day progressive learning project. The detailed task guides in `tasks/` are the source of truth for what to build each day.

- **Day 1** (`tasks/day1-frontend.md`): Frontend UI with React + TypeScript + Tailwind CSS + Zustand, data in localStorage
- **Day 2** (`tasks/day2-backend.md`): RESTful API with Express + Prisma + PostgreSQL, JWT auth, Controller-Service layered architecture
- **Day 3** (`tasks/day3-integration.md`): Full-stack integration — replace localStorage with real API via Axios + TanStack React Query, Docker Compose deployment
- **Day 4** (`tasks/day4-deploy.md`): CI/CD + 阿里云 ECS 部署 + Nginx 反向代理 + HTTPS + 域名 DNS
- **Day 5** (`tasks/day5-security.md`): 云服务器网络安全 — 安全组 + SSH 加固 + fail2ban + 系统加固 + 备份恢复
- **Day 6** (`tasks/day6-advanced-backend.md`): Redis 缓存 + 文件上传 (阿里云 OSS) + WebSocket 实时通知 + 接口限流
- **Day 7** (`tasks/day7-observability.md`): Winston 结构化日志 + 错误追踪 + 健康检查 + React 性能优化 + Lighthouse

## Development Commands

### Frontend (`booknest/frontend/`)

```bash
npm run dev       # Start dev server on port 4001 (needs vite.config.ts server.port)
npm run build     # Type-check (tsc -b) then build (vite build)
npm run lint      # ESLint
```

Testing uses Vitest — run with `npx vitest` or `npx vitest run path/to/test.tsx`.

### Backend (`booknest/backend/`)

```bash
npm run dev           # Start dev server on port 4000
npm run build         # TypeScript compile
npm test              # Jest + Supertest
npm run prisma:seed   # Seed test data
npx prisma migrate dev  # Run DB migrations
npx prisma studio       # Open DB visual editor
```

### Docker

PostgreSQL runs in Docker on host port 5433 → container port 5432:
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
```

## Key Conventions

- Frontend source: `booknest/frontend/src/` with subdirs `components/ui/`, `components/book/`, `pages/`, `stores/`, `hooks/`, `lib/`, `mocks/`, `types/`
- Backend source: `booknest/backend/src/` with subdirs `controllers/`, `services/`, `routes/`, `middleware/`, `lib/`, `utils/`
- Prisma schema: `booknest/backend/prisma/schema.prisma`
- TypeScript strict mode enabled (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`)
- API prefix: `/api/v1/`
- Test account: `test@booknest.com` / `password123`

## Data Model

```
User 1→N Book, User 1→N Category, User 1→N Review
Book 1→N Review, Category 1→N Book
```

## 后端 (backend/)

### 技术栈
- Express 5 + TypeScript 6
- Prisma 7 ORM + PostgreSQL 16
- JWT 认证
- Jest 30 + Supertest 测试

### API 基础路径
- `/api/v1` — 业务接口
- `/health` — 健康检查

### 代码架构
- Controller → Service → Prisma
- 所有响应使用 ResponseUtil 统一格式 `{code, message, data}`
- 错误使用 ApiError 类 + errorHandler 中间件
- 路由使用 express-validator + validate 中间件

### 数据库
- PostgreSQL 16, Docker 运行, 宿主机端口 5433
- Prisma 迁移: `cd backend && npx prisma migrate dev`
- 种子数据: `cd backend && npm run prisma:seed`

### 端口说明
- 前端: http://localhost:4001
- 后端: http://localhost:4000
- PostgreSQL: localhost:5433

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

## Day 3: API 集成

### 数据流
UI → React Query Hooks → Axios Client → Express API → PostgreSQL

### 关键文件 (frontend/src/)
- lib/api-client.ts — Axios 实例 + 拦截器 (token 注入、响应解包)
- lib/query-client.ts — QueryClient 配置 (staleTime 5min, gcTime 30min)
- hooks/query-keys.ts — 缓存键工厂 (bookKeys, categoryKeys, reviewKeys, statsKeys)
- hooks/useBooks.ts — 书籍 React Query hooks (含乐观删除)
- hooks/useCategories.ts — 分类 hooks (CRUD + invalidate)
- hooks/useReviews.ts — 评论 hooks
- hooks/useStats.ts — 统计数据 hook
- stores/useAuthStore.ts — 认证状态 (Zustand, token 持久化 localStorage)
- mocks/ — MSW 2 mock handlers + server

### 认证
- JWT token 存在 localStorage (auth_token)
- Axios 请求拦截器自动注入 Bearer token
- 401 响应自动清除 token 并跳转 /login
- ProtectedRoute 包裹所有需要认证的页面

### 测试
- 6 个测试文件、27 个测试用例，全部通过
- MSW mock API，不需要启动真实后端
- 测试文件放在 src/test/ 目录

### Docker Compose
- docker-compose.yml — PostgreSQL + Backend + Frontend 一键启动
- frontend/Dockerfile — 多阶段构建 (node → nginx 反向代理)
- backend/Dockerfile — Prisma migrate deploy + Node 启动

## Current State

Day 3 全栈集成已完成。前后端通过 Axios + React Query 连接，Docker Compose 一键部署。所有验收项通过。

Day 4-7 进阶阶段任务文档已创建 (tasks/day4-deploy.md, day5-security.md, day6-advanced-backend.md, day7-observability.md)，待实施。
