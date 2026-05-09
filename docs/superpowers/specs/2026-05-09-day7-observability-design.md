# Day 7: BookNest 可观测性 & 性能优化设计

## 概述

方案 B — 可观测性先行，再优化性能。先搭建完整可观测性管道（Winston + Morgan + 错误追踪 + 健康检查），建立基线指标后，再基于数据驱动做前端性能优化。

## 1. 后端日志架构（Winston + Morgan）

### Winston 配置 — `src/utils/logger.ts`

创建统一 logger 实例，根据环境切换行为：

| | 开发环境 | 生产环境 |
|---|---|---|
| Console | colorize + simple 格式 | JSON 格式 |
| File | 不写文件 | winston-daily-rotate-file，按天轮转，保留 14 天 |
| Level | debug | info |

日志格式统一包含：`timestamp`、`level`、`message`、`meta`（请求 ID、用户 ID 等上下文）。

### Morgan 集成 — 接入 `server.ts`

- 在路由挂载之前插入 Morgan 中间件
- 自定义 format 记录：method、url、status、responseTime、contentLength
- Morgan 输出流式写入 Winston 的 http 级别，所有日志走同一管道

### 改造点

| 文件 | 现状 | 改为 |
|---|---|---|
| middleware/errorHandler.ts | console.error | logger.error(err, { requestId, path, method }) |
| index.ts（启动） | console.log | logger.info |
| server.ts | 无请求日志 | Morgan → Winston 流 |

### 不做

- 不引入 ELK / Loki 等外部日志聚合
- 不做日志传输到远程服务
- 不给每个请求生成 UUID 作为 requestId（除非后续需要）

## 2. 错误追踪 & 健康检查

### 全局错误捕获 — `index.ts`

注册进程级异常处理器：

- `process.on('uncaughtException')` → logger.error + 优雅退出
- `process.on('unhandledRejection')` → logger.error + 优雅退出

### 增强 errorHandler 中间件

现有 ApiError + errorHandler 不改变 API 响应格式，只增强日志侧：

- 结构化日志：每次错误记录 statusCode、errorClass、stack、path、method、userId（如有）
- 错误分类标签（日志 meta 中 type 字段）：
  - validation — 请求校验失败（400）
  - auth — 认证/授权失败（401/403）
  - database — Prisma 错误（如唯一约束冲突 409）
  - internal — 未知错误（500）

### 深度健康检查

`GET /health` — 轻量探针（给负载均衡器用）：
```json
{ "status": "ok", "timestamp": "..." }
```

`GET /health/detailed` — 深度检查（给运维看）：
```json
{
  "status": "ok",
  "uptime": 86400,
  "version": "1.0.0",
  "checks": {
    "database": { "status": "ok", "responseTime": "3ms" },
    "redis": { "status": "ok", "responseTime": "1ms" }
  }
}
```

- 数据库检查：`prisma.$queryRaw\`SELECT 1\``
- Redis 检查：`redis.ping()`
- 任一依赖失败则整体 status 变为 degraded，HTTP 状态码 503

### 不做

- 不加告警通知（邮件/钉钉/Slack webhook）
- 不做 metrics 端点（Prometheus 格式）

## 3. 前端性能优化

### 路由级代码分割 — 改造 `App.tsx`

将 8 个直接 import 全部改为 `React.lazy()`：
```ts
const BookList = lazy(() => import('@/pages/BookList'))
```

- 路由外层包裹 `<Suspense fallback={<PageSkeleton />}>`
- PageSkeleton 是简单的骨架屏组件，复用现有 UI 风格
- Login 和 Register 也做懒加载

效果：首屏 JS 从全量 bundle 拆分为 ~8 个 chunk，首屏只加载当前路由 + 共享依赖。

### 虚拟滚动 — react-window 用于表格视图

仅对 BookTable 表格视图集成 react-window 的 FixedSizeList，将 pageSize 提升到 50 条。网格视图保持现有分页不变（CSS Grid 布局不适合行式虚拟化）。

### Bundle 分析 — rollup-plugin-visualizer

在 vite.config.ts 中添加 visualizer 插件，构建后自动生成 stats.html，可视化各 chunk 的依赖体积。用于验证代码分割效果和发现意外的大依赖。

### 不做

- 不引入 React.memo / useMemo 优化——当前组件数量少、渲染压力小
- 不引入 Service Worker / PWA
- 不做图片懒加载（封面图通过 OSS CDN 加载）

## 4. Lighthouse 审计 & 验收流程

### 审计流程

先测基线 → 实施所有优化 → 再测对比：

1. 基线审计：npm run build → 本地启动生产构建 → 运行 Lighthouse 记录分数 → Bundle 分析生成 stats.html
2. 实施所有优化（第 1-3 段设计的改动）
3. 最终审计：重新构建 → 再次运行 Lighthouse → 对比前后分数

### 验收标准

| 指标 | 目标 |
|---|---|
| Lighthouse Performance | ≥ 90 |
| Lighthouse Accessibility | ≥ 90 |
| 首屏 JS 体积 | 代码分割后显著减小 |
| 页面路由切换 | 无全量重载，按需加载 chunk |
| /health | 返回 ok |
| /health/detailed | 包含 database + redis 检查结果 |
| Winston 日志 | JSON 格式、按天轮转、包含上下文字段 |

### 不做

- 不在 CI 中集成 Lighthouse CI
- 不设 Core Web Vitals 硬性指标阈值（本地测试环境网络条件不稳定）
- 不做 SEO 审计——BookNest 是登录后应用

## 实施顺序

1. 后端日志（Winston + Morgan）— 基础设施，其他改动依赖它
2. 错误追踪 + 健康检查 — 依赖 logger
3. 前端代码分割 + 虚拟滚动 + bundle 分析
4. Lighthouse 基线审计 → 优化 → 最终审计
