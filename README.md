# BookNest — 全栈学习项目

个人藏书管理全栈应用，通过 3 天循序渐进的实战练习，掌握现代 Web 开发的核心技能。

## 项目概述

BookNest 是一个完整的全栈应用，用户可以管理自己的书籍收藏，包括书籍的增删改查、分类管理、阅读状态追踪、评论等功能。

## 三天学习路线

### Day 1: 前端基础 — React + Tailwind + Zustand

搭建前端 UI，使用 React + TypeScript + Tailwind CSS + Zustand 技术栈，数据暂存 localStorage。

**学习内容**:
- Vite + React + TypeScript 项目搭建
- Tailwind CSS 实用优先样式 + CVA 组件变体模式
- Zustand 状态管理 + localStorage 持久化
- React Hook Form + Zod 表单验证
- React Router v6 客户端路由
- Vitest 组件测试

**技术栈**: React 18 / TypeScript 5 / Vite 7 / Tailwind CSS 3 / Zustand / React Hook Form / Zod / React Router v6 / Lucide React / Vitest

### Day 2: 后端 API — Express + Prisma + PostgreSQL

搭建 RESTful 后端 API，提供认证、书籍 CRUD、分类管理、评论等接口。

**学习内容**:
- Express + TypeScript 项目结构
- Prisma ORM Schema 设计、迁移、种子数据
- PostgreSQL 关系型数据库操作
- RESTful API 设计（分页、过滤、排序、错误处理）
- JWT 认证（注册、登录、token 验证）
- Controller-Service 分层架构
- Jest + Supertest 自动化测试

**技术栈**: Express 4 / TypeScript 5 / Prisma 5 / PostgreSQL 16 / JWT / bcrypt / express-validator / helmet / Jest / Supertest

### Day 3: 前后端联调 — React Query + 全栈集成

连接前端与后端，替换 localStorage 为真实 API，实现完整的全栈应用。

**学习内容**:
- Axios API 客户端（拦截器、token 注入、响应解包）
- TanStack React Query 服务端状态管理
- Query Key Factory 缓存键管理
- JWT 认证流程（登录/注册/路由守卫）
- Loading skeleton、Error boundary、Empty state 状态模式
- MSW (Mock Service Worker) API 模拟测试
- Docker Compose 容器化部署

**技术栈**: Axios / TanStack React Query 5 / MSW 2 / Docker Compose

## 技术架构

```
数据流: UI 组件 → React Query Hooks → Axios Client → Express API → PostgreSQL

前端架构:
  Component (UI) → Page (页面) → Hook (数据) → API Client (通信)

后端架构:
  Route → Controller (处理请求) → Service (业务逻辑) → Prisma (数据访问)
```

## 端口规划

| 服务 | 端口 | 说明 |
|------|------|------|
| 前端 (Vite) | 4001 | http://localhost:4001 |
| 后端 (Express) | 4000 | http://localhost:4000 |
| PostgreSQL | 5433 | localhost:5433 → 容器内 5432 |

## 项目结构

```
booknest/
├── frontend/                # Day 1-3 前端
│   └── src/
│       ├── components/ui/     # 基础 UI 组件 (Button, Input, Card, Badge, Modal, Toast)
│       ├── components/book/   # 书籍业务组件 (BookCard, BookList, ReviewForm)
│       ├── pages/             # 页面组件 (BookList, BookDetail, Login, Register)
│       ├── stores/            # Zustand stores (useAuthStore, useThemeStore)
│       ├── hooks/             # React Query hooks (useBooks, useCategories, useReviews)
│       ├── lib/               # 工具 (api-client, query-client, utils, schemas)
│       ├── mocks/             # MSW mock handlers
│       └── types/             # TypeScript 类型定义
├── backend/                 # Day 2 后端
│   ├── prisma/
│   │   ├── schema.prisma      # 数据模型定义
│   │   ├── seed.ts            # 种子数据
│   │   └── migrations/        # 数据库迁移
│   └── src/
│       ├── controllers/       # 请求处理层
│       ├── services/          # 业务逻辑层
│       ├── routes/            # 路由定义
│       ├── middleware/        # 中间件 (auth, validate, errorHandler)
│       ├── lib/               # Prisma 单例
│       └── utils/             # 工具 (response, errors)
├── docker-compose.yml       # Day 3 全栈部署
├── CLAUDE.md                # Claude Code 项目上下文
└── README.md
```

## 数据模型

```
User 1 ──→ N Book       (一个用户有多本书)
User 1 ──→ N Category   (一个用户有多个分类)
User 1 ──→ N Review     (一个用户写多条评论)
Book 1 ──→ N Review     (一本书有多条评论)
Category 1 ──→ N Book   (一个分类下有多本书)
```

## API 接口一览

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/v1/auth/register` | 注册 | 无 |
| POST | `/api/v1/auth/login` | 登录，返回 JWT | 无 |
| GET | `/api/v1/auth/me` | 获取当前用户 | JWT |
| GET | `/api/v1/books` | 书籍列表（分页+过滤+排序） | JWT |
| GET | `/api/v1/books/:id` | 书籍详情（含评论） | JWT |
| POST | `/api/v1/books` | 创建书籍 | JWT |
| PUT | `/api/v1/books/:id` | 更新书籍 | JWT |
| DELETE | `/api/v1/books/:id` | 删除书籍 | JWT |
| GET | `/api/v1/categories` | 分类列表 | JWT |
| POST | `/api/v1/categories` | 创建分类 | JWT |
| GET | `/api/v1/books/:bookId/reviews` | 评论列表 | JWT |
| POST | `/api/v1/books/:bookId/reviews` | 创建评论 | JWT |
| GET | `/health` | 健康检查 | 无 |

## 快速开始

```bash
# 1. 克隆项目
git clone <repo-url>
cd booknest

# 2. 启动 PostgreSQL (Docker)
docker run -d --name booknest-pg \
  -e POSTGRES_USER=booknest \
  -e POSTGRES_PASSWORD=booknest123 \
  -e POSTGRES_DB=booknest \
  -p 5433:5432 \
  postgres:16-alpine

# 3. 启动后端
cd backend
npm install
cp .env.example .env
npx prisma migrate dev
npm run prisma:seed
npm run dev

# 4. 启动前端
cd ../frontend
npm install
npm run dev

# 5. 访问应用
# 前端: http://localhost:4001
# 后端: http://localhost:4000/health
# 测试账号: test@booknest.com / password123
```

## 学习任务

详细的学习任务指南位于 `tasks/` 目录：

| 文件 | 内容 |
|------|------|
| `tasks/day1-frontend.md` | Day 1 前端开发完整指南 |
| `tasks/day2-backend.md` | Day 2 后端开发完整指南 |
| `tasks/day3-integration.md` | Day 3 前后端联调完整指南 |

每个文件包含：学习目标、技术栈说明、功能清单、数据模型、分步实施指南、验收标准、Git 规范、Prompt 模板、调试技巧。
