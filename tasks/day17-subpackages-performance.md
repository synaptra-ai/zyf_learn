# Day 17：复杂分包 + 性能极限优化 + Taro 多端适配治理


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

小程序功能已经很丰富：书籍、Workspace、支付、订阅消息、客服、内容安全。如果继续把所有页面和依赖都塞进主包，首屏会变慢，包体积会失控，审核和发布风险也会升高。今天要做架构治理：复杂分包、预加载、主包瘦身、长列表优化、图片优化、Taro 性能专项和多端适配治理。

**今天的目标**：将 BookNest Mini 拆成合理的主包和业务分包，完成性能基线测试与优化，输出 `PACKAGE_STRATEGY.md` 和 `PERFORMANCE_REPORT.md`。

---

## 学习目标

完成今天后，你将掌握：

1. 微信小程序主包、普通分包、独立分包的设计思路。
2. Taro 中如何配置 `subPackages` 和分包页面。
3. 业务分包如何避免污染主包。
4. 分包预加载策略和页面跳转体验优化。
5. Taro 性能瓶颈：运行时、setData、模板、节点数量。
6. 长列表、图片、缓存、首屏请求、组件拆分优化。
7. Taro Prerender、CompileMode、虚拟列表的使用场景。
8. Taro 多端适配：weapp / h5 差异隔离，而不是引入 uni-app。

---

## 技术栈

| 技术 | 用途 |
|---|---|
| Taro subPackages | 分包配置 |
| Taro independent subpackage | 独立分包实验，谨慎使用 |
| Taro preloadRule | 分包预加载 |
| Taro Prerender | 首屏预渲染实验 |
| Taro CompileMode | 长列表高频节点优化 |
| Virtual List | 长列表渲染优化 |
| OSS 图片参数 | 缩略图、压缩、裁剪 |
| React memo/useMemo | 减少无效渲染 |
| 微信开发者工具性能面板 | 启动、渲染、网络分析 |

---

## 技术路线

```txt
先测量
  ↓ 包体积、首屏耗时、请求数、长列表帧率
再拆包
  ↓ main / books / workspace / orders / admin
再优化
  ↓ 图片、长列表、请求、缓存、组件、预渲染
再复测
  ↓ PERFORMANCE_REPORT.md
```

今天不追求“所有指标完美”，而是训练真实工程方法：

1. 有基线数据。
2. 有优化动作。
3. 有复测结果。
4. 能解释取舍。

---

## 推荐分包设计

```txt
主包 main：
- pages/index/index
- pages/login/index
- pages/me/index
- pages/categories/index
- 基础 layout
- auth store
- request adapter
- workspace store

books 分包：
- books/detail
- books/form
- books/reviews

workspace 分包：
- workspace/switch
- workspace/members
- workspace/invitations
- workspace/audit-logs

orders 分包：
- activities/index
- activities/detail
- orders/detail
- orders/pay
- orders/result
- tickets/index

admin 分包：
- admin/content-security
- admin/import-jobs
- admin/audit-logs
```

是否使用独立分包：

| 分包 | 是否建议独立分包 | 原因 |
|---|---|---|
| books | 不建议 | 依赖主包登录态和 request client |
| workspace | 不建议 | 依赖主包权限与 Workspace store |
| orders | 不建议 | 支付链路依赖登录和订单上下文 |
| admin | 可实验，但默认不建议 | 独立分包不能随意依赖主包资源，学习阶段先保持普通分包 |

---

## 功能清单

### Must-Have

| # | 功能 | 说明 |
|---|---|---|
| 1 | 包体积基线 | 记录主包、分包、总包体积 |
| 2 | subPackages | 拆 books/workspace/orders/admin |
| 3 | 页面迁移 | 对应页面移动到分包目录 |
| 4 | 路由修正 | 所有 navigateTo 路径正确 |
| 5 | preloadRule | 首页预加载 books，活动页预加载 orders |
| 6 | 主包瘦身 | 主包只保留核心入口和公共基础能力 |
| 7 | 长列表优化 | 1000 本书可滚动，不明显卡顿 |
| 8 | 图片优化 | 封面 lazyLoad、缩略图、占位图 |
| 9 | 首屏优化 | 首页请求数和渲染耗时可解释 |
| 10 | 性能报告 | 输出 `PERFORMANCE_REPORT.md` |

### Nice-to-Have

| # | 功能 | 说明 |
|---|---|---|
| 1 | CompileMode | 对长列表 item 实验半编译模式 |
| 2 | Prerender | 对首页骨架屏或静态区域实验预渲染 |
| 3 | H5 构建 | 保持 `pnpm build:h5` 可用 |
| 4 | 原生组件混合 | 高频列表 item 尝试原生组件 |

---

## Step 1：包体积基线

构建：

```bash
cd apps/mini-taro
pnpm build:weapp
```

查看体积：

```bash
du -sh dist/*
find dist -type f -name "*.js" -o -name "*.wxml" -o -name "*.wxss" | xargs du -h | sort -h | tail -30
```

创建 `docs/PERFORMANCE_REPORT.md` 初稿：

```md
# Performance Report

## Baseline

| 指标 | 优化前 | 优化后 | 说明 |
|---|---:|---:|---|
| 主包体积 |  |  | 以开发者工具上传提示为准 |
| 总包体积 |  |  | 以开发者工具上传提示为准 |
| 首页首屏请求数 |  |  | Network 面板统计 |
| 首页首屏时间 |  |  | 开发者工具性能面板 |
| 1000 条列表滚动 |  |  | 主观 + 性能面板 |
| 图片平均大小 |  |  | OSS/Network 统计 |

## Findings

1. 
2. 
3. 
```

> 包体积限制可能随平台政策调整，以微信开发者工具上传提示和小程序后台当前规则为准。学习阶段建议主包预算控制在 1.5MB 左右，给审核和后续功能留余量。

---

## Step 2：配置 subPackages

调整目录：

```txt
src/
├── pages/
│   ├── index/index.tsx
│   ├── login/index.tsx
│   ├── me/index.tsx
│   └── categories/index.tsx
├── sub/                       # 注意：用 sub 而非 packages，避免与 monorepo 根目录的 packages/ 混淆
│   ├── books/pages/detail/index.tsx
│   ├── books/pages/form/index.tsx
│   ├── workspace/pages/members/index.tsx
│   ├── workspace/pages/audit-logs/index.tsx
│   ├── orders/pages/pay/index.tsx
│   ├── orders/pages/result/index.tsx
│   └── admin/pages/content-security/index.tsx
```

`app.config.ts`：

```ts
export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/login/index',
    'pages/me/index',
    'pages/categories/index',
  ],
  subPackages: [
    {
      root: 'sub/books',
      pages: ['pages/detail/index', 'pages/form/index', 'pages/reviews/index'],
    },
    {
      root: 'sub/workspace',
      pages: ['pages/members/index', 'pages/invitations/index', 'pages/audit-logs/index'],
    },
    {
      root: 'sub/orders',
      pages: ['pages/activities/index', 'pages/pay/index', 'pages/result/index', 'pages/tickets/index'],
    },
    {
      root: 'sub/admin',
      pages: ['pages/content-security/index', 'pages/import-jobs/index'],
    },
  ],
})
```

跳转路径修正：

```ts
Taro.navigateTo({ url: `/sub/books/pages/detail/index?id=${book.id}` })
Taro.navigateTo({ url: `/sub/orders/pages/pay/index?orderId=${order.id}` })
```

---

## Step 3：配置分包预加载

`app.config.ts` 增加：

```ts
preloadRule: {
  'pages/index/index': {
    network: 'all',
    packages: ['sub/books'],
  },
  'sub/orders/pages/activities/index': {
    network: 'all',
    packages: ['sub/orders'],
  },
},
```

预加载策略：

| 当前页面 | 预加载 | 原因 |
|---|---|---|
| 首页 | books | 用户大概率点击详情 |
| 活动列表 | orders | 用户可能支付 |
| 我的页 | workspace | 用户可能管理成员 |
| 管理入口 | admin | 只有管理员使用，不放主包 |

---

## Step 4：主包瘦身清单

检查并处理：

- [ ] 大图片不要放主包，改 OSS 或远程 URL。
- [ ] 支付页面、内容安全页面不要放主包。
- [ ] admin 组件不要被主包 import。
- [ ] 组件库按需引入，不要全量引入。
- [ ] icon 尽量使用小体积 SVG 或远程资源。
- [ ] mock 数据不要进入生产构建。
- [ ] H5-only 代码用环境判断隔离。
- [ ] 调试日志生产环境移除。

---

## Step 5：长列表优化

列表性能问题来源：

```txt
大量节点
  + 图片加载
  + React runtime
  + Taro setData
  + 频繁状态更新
```

优化动作：

1. 分页加载，不一次性渲染全部数据。
2. BookCard 使用 `React.memo`。
3. 列表 item 不内联创建大量函数。
4. Image 开启 `lazyLoad`。
5. OSS 返回缩略图 URL。
6. 搜索输入加 debounce。
7. 大列表考虑虚拟列表。
8. 高频 item 尝试 `compileMode`。

BookCard：

```tsx
import React from 'react'

export const BookCard = React.memo(function BookCard({ book, onOpen }: Props) {
  return (...)
})
```

Debounce：

```ts
const [inputKeyword, setInputKeyword] = useState('')
const debouncedKeyword = useDebounce(inputKeyword, 300)
```

---

## Step 6：图片优化

封面 URL 生成规则：

```ts
export function getCoverThumbUrl(url?: string | null) {
  if (!url) return '/assets/default-cover.png'
  if (!url.includes('aliyuncs.com') && !url.includes('your-oss-domain.com')) return url
  return `${url}?x-oss-process=image/resize,w_240/quality,q_80/format,webp`
}
```

组件使用：

```tsx
<Image
  className="book-cover"
  src={getCoverThumbUrl(book.coverUrl)}
  mode="aspectFill"
  lazyLoad
/>
```

图片验收：

- [ ] 列表页使用缩略图。
- [ ] 详情页使用较大图。
- [ ] 上传前压缩。
- [ ] 失败时显示占位图。
- [ ] 图片域名已配置到 downloadFile 合法域名或可作为 image 资源访问。

---

## Step 7：Taro Prerender 实验

适合场景：

- 首页静态骨架。
- 我的页静态布局。
- 不依赖实时数据的首屏框架。

配置示例：

```ts
// config/index.ts
const config = {
  mini: {
    prerender: {
      include: ['pages/index/index'],
      mock: {
        PRERENDER: true,
      },
    },
  },
}

export default config
```

验收：

- [ ] 启用前记录首页白屏时间。
- [ ] 启用后复测。
- [ ] 如果收益不明显，保留实验记录但不强行上线。

---

## Step 8：CompileMode 实验

适合场景：

- 长列表 item。
- 重复渲染结构稳定的卡片。
- 节点很多且交互简单的组件。

配置：

```ts
// config/index.ts
const config = {
  mini: {
    experimental: {
      compileMode: true,
    },
  },
}
```

组件：

```tsx
function BookCardCompiled({ book }: Props) {
  return (
    <View compileMode className="book-card">
      <Image src={book.coverUrl || ''} />
      <Text>{book.title}</Text>
    </View>
  )
}
```

注意：

- CompileMode 是空间换时间，可能增加包体积。
- 只能优化部分 Taro 基础组件语法。
- 必须复测，不要盲目使用。

---

## Step 9：Taro 多端适配治理

虽然本阶段去掉 uni-app，但 Taro 仍然是多端框架。今天只做 Taro 内部适配治理：

```txt
weapp：主目标，必须完整可用
h5：辅助调试，允许少量差异
其他小程序：暂不支持，只保留扩展空间
```

建立平台适配文件：

```txt
src/platform/
├── index.ts
├── weapp.ts
└── h5.ts
```

`src/platform/index.ts`：

```ts
import Taro from '@tarojs/taro'

export function isWeapp() {
  return Taro.getEnv() === Taro.ENV_TYPE.WEAPP
}

export function isH5() {
  return Taro.getEnv() === Taro.ENV_TYPE.WEB
}
```

平台差异放这里，不要散落在页面里：

| 能力 | weapp | h5 |
|---|---|---|
| login | Taro.login | mock login |
| requestPayment | Taro.requestPayment | mock pay |
| subscribeMessage | requestSubscribeMessage | no-op |
| customerService | contact/open chat | link |
| contentSecurity | 后端统一 | 后端统一 |

---

## Step 10：输出分包策略文档

`docs/PACKAGE_STRATEGY.md`：

```md
# Package Strategy

## Goals

- 主包只保留启动必需能力。
- 书籍、订单、Workspace、Admin 分业务分包。
- 支付和内容安全不污染主包。
- 所有分包跳转路径可维护。

## Package Map

| Package | Pages | Why |
|---|---|---|
| main | index/login/me/categories | 启动入口 |
| sub/books | detail/form/reviews | 高频但非启动必需 |
| sub/workspace | members/invitations/audit | 团队管理 |
| sub/orders | activities/pay/result/tickets | 支付链路 |
| sub/admin | content-security/import-jobs | 管理能力 |

## Budgets

| Package | Budget | Current | Action |
|---|---:|---:|---|
| main | <= 1.5MB |  |  |
| books | <= 1.5MB |  |  |
| workspace | <= 1.5MB |  |  |
| orders | <= 1.5MB |  |  |
| admin | <= 1.5MB |  |  |
```

---

## Day 17 验收标准 Checklist

### 分包

- [ ] app.config.ts 已配置 subPackages。
- [ ] books/workspace/orders/admin 页面进入对应分包。
- [ ] 所有路由跳转路径修正。
- [ ] 首页能进入书籍详情。
- [ ] 支付页能从活动页进入。
- [ ] Admin 页只有 ADMIN/OWNER 可进入。
- [ ] `PACKAGE_STRATEGY.md` 完成。

### 性能

- [ ] 记录优化前包体积。
- [ ] 记录优化后包体积。
- [ ] 首页首屏请求数量可解释。
- [ ] 1000 本书列表可滚动。
- [ ] 图片使用缩略图和 lazyLoad。
- [ ] 搜索输入有 debounce。
- [ ] 至少实验一个 Prerender 或 CompileMode。
- [ ] `PERFORMANCE_REPORT.md` 完成。

### 多端适配

- [ ] weapp 构建可用。
- [ ] h5 构建可用或明确记录不可用原因。
- [ ] 平台差异集中在 `src/platform`。
- [ ] 页面中没有大量散落的 `if (weapp)` 判断。

---

## Day 17 Git Commit 示例

```bash
git add .
git commit -m "perf(mini): add subpackages and optimize startup performance"
```

---

## Day 17 Prompt 模板

### 分包设计

```txt
你是资深 Taro 微信小程序架构师。
请审查我的 app.config.ts 分包设计。
要求：主包瘦身；books/workspace/orders/admin 分包合理；路由路径正确；公共依赖不会错误进入主包；给出优化建议。
```

### 性能优化

```txt
请基于我的 BookNest Mini 性能报告提出优化建议。
输入包括：主包体积、总包体积、首页请求数、首屏耗时、1000 条列表滚动表现。
要求：按收益/风险/实现成本排序。
```

### Taro CompileMode

```txt
请帮我判断这个 BookCard 是否适合使用 Taro CompileMode。
要求：分析节点数量、动态逻辑、包体积影响、可能回退的 JSX 写法，并给出改造代码。
```

---

## Day 17 每日反馈

### 今日完成

- [ ] 分包完成。
- [ ] 性能基线完成。
- [ ] 优化复测完成。
- [ ] 多端适配治理完成。

### 今日卡点

1. 
2. 
3. 

### Vibe Coding 反馈

| 提示词 | 结果 | 人工修正 |
|---|---|---|
| 分包设计 |  |  |
| 路由修正 |  |  |
| 性能报告 |  |  |
| CompileMode |  |  |

### 明日准备

- [ ] 准备小程序上传密钥。
- [ ] 准备 GitHub Secrets。
- [ ] 准备隐私协议、用户协议、审核测试账号。
- [ ] 准备体验版完整验收路径。

---

## 参考资料

- Taro 微信小程序独立分包：`https://docs.taro.zone/docs/independent-subpackage`
- Taro 小程序性能优化指南：`https://docs.taro.zone/docs/optimized`
- Taro Prerender：`https://docs.taro.zone/docs/prerender`
- Taro CompileMode：`https://docs.taro.zone/docs/compile-mode`
