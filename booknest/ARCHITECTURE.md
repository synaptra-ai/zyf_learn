# BookNest Architecture

### 1. 系统概览

BookNest 是一个全栈藏书管理系统，包含：

- frontend：React + TypeScript + Vite
- backend：Express + TypeScript + Prisma
- database：PostgreSQL
- cache：Redis
- storage：阿里云 OSS
- realtime：Socket.IO
- deployment：Docker Compose + Nginx + GitHub Actions

### 2. 数据流

```
用户操作 UI
  → React Query hook
  → Axios API client
  → Express route
  → Controller
  → Service
  → Prisma / Redis / OSS
  → 返回响应
  → React Query 更新缓存
  → UI 重新渲染
```

### 3. 认证流程

1. 用户登录，后端返回 JWT
2. 前端将 token 存入 Zustand auth store（持久化到 localStorage）
3. Axios 请求拦截器将 token 注入 `Authorization: Bearer <token>` header
4. 后端 `authenticate` middleware 校验 token
5. 401 响应自动清除 token 并跳转登录页

### 4. 服务端分层

```
backend/src/
├── routes/        路径和中间件组合
├── controllers/   解析请求，调用 service，返回响应
├── services/      业务逻辑，事务编排
├── schemas/       Zod 请求/响应 schema 定义
├── middleware/     认证、校验、错误处理、限流
├── lib/           基础设施：prisma、redis、oss、logger、openapi
└── utils/         工具函数
```

### 5. 接口契约

- 接口 schema 使用 **Zod** 定义，同时用于运行时校验和文档生成
- OpenAPI 文档通过 **zod-to-openapi** 自动生成
- 后端暴露 `/openapi.json` 和 `/api-docs`（Swagger UI）
- 前端通过 **openapi-typescript** 从 OpenAPI 生成 TypeScript 类型
- 所有响应使用统一格式 `{ code, message, data }`

### 6. 缓存策略

采用 **Cache-Aside** 模式：

- 读取：先查 Redis → miss 后查数据库 → 写入缓存
- 写入：操作数据库后清理相关缓存键
- 缓存覆盖：Book 列表、Book 详情、Category 列表、统计数据

### 7. 部署架构

```
用户请求 HTTPS 域名
  → Nginx（反向代理 + SSL 终止）
    → 前端静态资源（/）
    → 后端 API 反向代理（/api/v1）
  → Docker Compose
    → frontend（Nginx 容器）
    → backend（Node.js 容器）
    → postgres（PostgreSQL 容器）
    → redis（Redis 容器）
```

### 8. 端口说明

| 服务 | 端口 |
|------|------|
| 前端 | 4001 |
| 后端 | 4000 |
| PostgreSQL | 5433（宿主机）→ 5432（容器） |
| Redis | 6379 |
