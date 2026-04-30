# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BookNest is a full-stack book collection management app, structured as a 3-day progressive learning project. The detailed task guides in `tasks/` are the source of truth for what to build each day.

- **Day 1** (`tasks/day1-frontend.md`): Frontend UI with React + TypeScript + Tailwind CSS + Zustand, data in localStorage
- **Day 2** (`tasks/day2-backend.md`): RESTful API with Express + Prisma + PostgreSQL, JWT auth, Controller-Service layered architecture
- **Day 3** (`tasks/day3-integration.md`): Full-stack integration — replace localStorage with real API via Axios + TanStack React Query, Docker Compose deployment

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

## Current State

Frontend scaffolded with Vite defaults. Backend Day 2 completed (Express 5 + Prisma 7 + PostgreSQL). Task guides in `tasks/` — next: Day 3 full-stack integration.
