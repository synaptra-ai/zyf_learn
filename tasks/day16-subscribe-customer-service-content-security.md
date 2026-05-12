# Day 16：订阅消息 + 客服消息 + 内容安全风控


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

小程序项目进入准生产阶段后，不能只关注 CRUD 和支付。真实微信小程序通常还需要用户触达、用户支持和内容风控。今天集中完成三类微信生态能力：订阅消息、客服消息、内容安全。

**今天的目标**：用户可以订阅读书会提醒；支付失败或审核问题可以进入客服；书籍标题、评论、活动描述、封面图片都经过内容安全检测，并能进入人工复核流程。

---

## 学习目标

完成今天后，你将掌握：

1. 小程序订阅消息的授权、模板、发送和业务事件绑定。
2. 订阅消息“一次授权一次触达”的产品设计思路。
3. 客服入口在小程序中的接入方式和上下文传递。
4. 内容安全检测在文本、图片上传、评论发布中的接入位置。
5. 微信 access_token 缓存与刷新。
6. 风险内容的拦截、人工复核、审计日志。
7. 如何把消息、客服、内容安全做成可扩展的后端服务。

---

## 技术栈

| 技术 | 用途 |
|---|---|
| Taro.requestSubscribeMessage | 小程序订阅消息授权 |
| 微信订阅消息接口 | 后端发送订阅消息 |
| open-type=contact / openCustomerServiceChat | 客服入口 |
| 微信内容安全接口 | 文本、图片安全检测 |
| Redis | access_token 缓存、检测结果缓存 |
| BullMQ | 异步发送消息、异步图片检测 |
| Prisma | Subscription、ContentSecurityCheck、CustomerServiceEvent |
| AuditLog | 记录风控和消息事件 |

---

## 技术路线

```txt
用户操作
  ├─ 点击订阅提醒
  │   ↓ requestSubscribeMessage
  │   ↓ POST /api/v1/subscriptions/record
  │   ↓ 业务事件触发 BullMQ
  │   ↓ 后端发送订阅消息
  │
  ├─ 点击客服
  │   ↓ open-type=contact / openCustomerServiceChat
  │   ↓ 记录客服上下文
  │
  └─ 发布内容 / 上传图片
      ↓ 后端内容安全检测
      ↓ PASS / REJECT / REVIEW
      ↓ 允许发布或进入人工复核
```

今天的核心设计原则：

- 内容安全必须在后端做最终判断，不能只依赖前端。
- 图片安全检测可以异步，但内容状态必须有 `PENDING_REVIEW`。
- 订阅消息不能滥发，必须记录用户授权和业务场景。
- 客服入口要带上下文，方便定位支付订单、活动、书籍或审核问题。

---

## 功能清单

### Must-Have

| # | 功能 | 说明 |
|---|---|---|
| 1 | 订阅消息模板配置 | 活动开始提醒、报名成功提醒至少一个 |
| 2 | 小程序订阅授权 | `requestSubscribeMessage` |
| 3 | 订阅记录 | 后端保存用户、模板、场景、授权结果 |
| 4 | 消息发送 service | 后端可 mock / real 发送订阅消息 |
| 5 | 客服入口 | 支付结果页、我的页、审核失败页可进客服 |
| 6 | 客服上下文 | 记录 orderId / bookId / activityId / reason |
| 7 | 文本安全 | 书名、评论、活动描述检测 |
| 8 | 图片安全 | 封面上传后检测，不通过则隐藏或复核 |
| 9 | 人工复核 | 管理员可查看风险内容列表 |

### Nice-to-Have

| # | 功能 | 说明 |
|---|---|---|
| 1 | 消息重试 | BullMQ 失败重试 |
| 2 | 风险等级 | PASS / REVIEW / REJECT / ERROR |
| 3 | 敏感词本地兜底 | 微信接口异常时做基础拦截 |
| 4 | 管理员处理记录 | 通过、驳回、删除都写 AuditLog |

---

## Step 1：新增 Prisma 模型

```prisma
model SubscriptionRecord {
  id           String   @id @default(cuid())
  userId       String   @map("user_id")
  workspaceId  String?  @map("workspace_id")
  templateId   String   @map("template_id")
  scene        String
  status       String   // ACCEPTED / REJECTED / BANNED
  rawResult    Json?    @map("raw_result")
  createdAt    DateTime @default(now()) @map("created_at")

  @@index([userId, templateId, scene])
  @@map("subscription_records")
}

model ContentSecurityCheck {
  id            String   @id @default(cuid())
  workspaceId   String?  @map("workspace_id")
  userId        String?  @map("user_id")
  targetType    String   @map("target_type") // BOOK / REVIEW / ACTIVITY / IMAGE
  targetId      String?  @map("target_id")
  contentType   String   @map("content_type") // TEXT / IMAGE
  contentHash   String   @map("content_hash")
  status        String   // PASS / REVIEW / REJECT / ERROR
  provider      String   @default("WECHAT")
  rawResult     Json?    @map("raw_result")
  createdAt     DateTime @default(now()) @map("created_at")

  @@index([targetType, targetId])
  @@index([status])
  @@map("content_security_checks")
}

model CustomerServiceEvent {
  id           String   @id @default(cuid())
  userId       String   @map("user_id")
  workspaceId  String?  @map("workspace_id")
  scene        String
  refType      String?  @map("ref_type")
  refId        String?  @map("ref_id")
  payload      Json?
  createdAt    DateTime @default(now()) @map("created_at")

  @@index([userId, scene])
  @@map("customer_service_events")
}
```

迁移：

```bash
cd backend
npx prisma migrate dev --name add_wechat_message_and_content_security
```

---

## Step 2：微信 access_token service

`backend/src/services/wechat/wechat-token.service.ts`：

```ts
import redis from '@/lib/redis'  // 默认导出，不是 { redis }

const KEY = 'wechat:access_token'

export async function getWechatAccessToken() {
  const cached = await redis.get(KEY)
  if (cached) return cached

  const url = new URL('https://api.weixin.qq.com/cgi-bin/token')
  url.searchParams.set('grant_type', 'client_credential')
  url.searchParams.set('appid', process.env.WECHAT_APP_ID!)
  url.searchParams.set('secret', process.env.WECHAT_APP_SECRET!)

  const res = await fetch(url)
  const data = await res.json() as { access_token?: string; expires_in?: number; errcode?: number; errmsg?: string }

  if (!data.access_token) {
    throw new Error(`获取微信 access_token 失败：${data.errmsg || data.errcode}`)
  }

  await redis.set(KEY, data.access_token, 'EX', Math.max((data.expires_in || 7200) - 300, 60))
  return data.access_token
}
```

---

## Step 3：小程序端请求订阅消息

`apps/mini-taro/src/services/subscription.ts`：

```ts
import Taro from '@tarojs/taro'
import { request } from './request'

const TEMPLATE_IDS = {
  activityReminder: 'your-template-id',
  signupSuccess: 'your-template-id',
}

export async function subscribeActivityReminder(activityId: string) {
  const tmplId = TEMPLATE_IDS.activityReminder
  const result = await Taro.requestSubscribeMessage({
    tmplIds: [tmplId],
  })

  await request({
    url: '/api/v1/subscriptions/record',
    method: 'POST',
    data: {
      templateId: tmplId,
      scene: 'ACTIVITY_REMINDER',
      refType: 'ACTIVITY',
      refId: activityId,
      result,
    },
  })

  return result[tmplId]
}
```

按钮：

```tsx
<Button onClick={() => subscribeActivityReminder(activity.id)}>
  订阅活动提醒
</Button>
```

---

## Step 4：后端记录订阅授权

`backend/src/routes/subscription.routes.ts`：

```ts
import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '@/middleware/auth'    // 单数 middleware，文件名 auth.ts
import prisma from '@/lib/prisma'                   // 默认导出

export const subscriptionRouter = Router()

const recordSchema = z.object({
  templateId: z.string(),
  scene: z.string(),
  refType: z.string().optional(),
  refId: z.string().optional(),
  result: z.record(z.string(), z.string()),
})

subscriptionRouter.post('/record', authenticate, async (req, res, next) => {
  try {
    const input = recordSchema.parse(req.body)
    const status = input.result[input.templateId]?.toUpperCase() || 'UNKNOWN'

    await prisma.subscriptionRecord.create({
      data: {
        userId: req.user!.id,
        workspaceId: req.workspace?.id,
        templateId: input.templateId,
        scene: input.scene,
        status,
        rawResult: input.result,
      },
    })

    res.json({ code: 0, message: 'ok', data: { status } })
  } catch (error) {
    next(error)
  }
})
```

在 `backend/src/routes/index.ts` 注册路由：

```ts
import subscriptionRouter from './subscription.routes'
router.use('/subscriptions', subscriptionRouter)
```

`backend/src/services/wechat/subscribe-message.service.ts`：

```ts
import { getWechatAccessToken } from './wechat-token.service'

interface SendSubscribeMessageInput {
  openid: string
  templateId: string
  page: string
  data: Record<string, { value: string }>
}

export async function sendSubscribeMessage(input: SendSubscribeMessageInput) {
  if (process.env.WECHAT_MESSAGE_MODE === 'mock') {
    console.log('[mock-subscribe-message]', input)
    return { mock: true }
  }

  const token = await getWechatAccessToken()
  const res = await fetch(`https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      touser: input.openid,
      template_id: input.templateId,
      page: input.page,
      data: input.data,
    }),
  })

  const result = await res.json()
  if (result.errcode !== 0) {
    throw new Error(`发送订阅消息失败：${result.errmsg || result.errcode}`)
  }
  return result
}
```

触发场景示例：

```txt
支付成功 → 发送报名成功通知
活动开始前 24h → BullMQ 定时任务发送活动提醒
CSV 导入完成 → 发送导入完成通知
内容审核完成 → 发送审核结果通知
```

---

## Step 6：客服入口和上下文记录

小程序客服按钮：

```tsx
<Button openType="contact" sessionFrom={`order:${orderId}`}>
  联系客服
</Button>
```

或企业微信客服能力：

```ts
Taro.openCustomerServiceChat({
  extInfo: { url: 'your-customer-service-url' },
  corpId: 'your-corp-id',
})
```

记录客服上下文：

```ts
await request({
  url: '/api/v1/customer-service/events',
  method: 'POST',
  data: {
    scene: 'PAYMENT_FAILED',
    refType: 'ORDER',
    refId: orderId,
    payload: { status: order.status },
  },
})
```

客服上下文后端路由注册（在 `routes/index.ts`）：

```ts
import { Router } from 'express'
import { authenticate } from '@/middleware/auth'
import prisma from '@/lib/prisma'

export const customerServiceRouter = Router()

customerServiceRouter.post('/events', authenticate, async (req, res, next) => {
  try {
    const { scene, refType, refId, payload } = req.body
    await prisma.customerServiceEvent.create({
      data: {
        userId: req.user!.id,
        workspaceId: req.workspace?.id,
        scene,
        refType,
        refId,
        payload,
      },
    })
    res.json({ code: 0, message: 'ok', data: null })
  } catch (error) {
    next(error)
  }
})
```

在 `routes/index.ts` 注册：

```ts
import customerServiceRouter from './customer-service.routes'
router.use('/customer-service', customerServiceRouter)
```

检测入口：

| 内容 | 检测时机 |
|---|---|
| 书籍标题 | 创建/编辑前 |
| 书籍描述 | 创建/编辑前 |
| 评论内容 | 发布前 |
| 活动标题 | 创建/编辑前 |
| 活动描述 | 创建/编辑前 |

`backend/src/services/content-security/text-security.service.ts`：

```ts
import crypto from 'node:crypto'
import { getWechatAccessToken } from '@/services/wechat/wechat-token.service'
import prisma from '@/lib/prisma'  // 默认导出

export async function checkTextSecurity(input: {
  content: string
  userId: string
  workspaceId?: string
  targetType: string
  targetId?: string
  openid?: string  // 用户的微信 openid，建议传入以提升检测准确度
}) {
  const contentHash = crypto.createHash('sha256').update(input.content).digest('hex')

  if (process.env.CONTENT_SECURITY_MODE === 'mock') {
    const risky = /敏感|违法|spam/i.test(input.content)
    return saveCheck(input, contentHash, risky ? 'REJECT' : 'PASS', { mock: true })
  }

  const token = await getWechatAccessToken()
  const res = await fetch(`https://api.weixin.qq.com/wxa/msg_sec_check?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: input.content,
      version: 2,
      scene: 1,           // 1=资料，2=评论，3=论坛，4=社交日志
      openid: input.openid, // 建议传入，提升检测准确度；可空则不传
    }),
  })

  const result = await res.json()
  const status = normalizeWechatSecurityResult(result)
  return saveCheck(input, contentHash, status, result)
}

function normalizeWechatSecurityResult(result: any) {
  if (result.errcode === 0 && result.result?.suggest === 'pass') return 'PASS'
  if (result.result?.suggest === 'review') return 'REVIEW'
  if (result.result?.suggest === 'risky') return 'REJECT'
  return 'ERROR'
}

async function saveCheck(input: any, contentHash: string, status: string, rawResult: any) {
  return prisma.contentSecurityCheck.create({
    data: {
      userId: input.userId,
      workspaceId: input.workspaceId,
      targetType: input.targetType,
      targetId: input.targetId,
      contentType: 'TEXT',
      contentHash,
      status,
      rawResult,
    },
  })
}
```

---

## Step 8：图片内容安全检测

图片策略：

```txt
上传封面
  ↓
先保存 OSS
  ↓
创建 ContentSecurityCheck = PENDING
  ↓
BullMQ 异步检测图片
  ↓
PASS：封面可展示
REVIEW：管理员复核
REJECT：隐藏封面并提示用户重新上传
```

图片检测任务：

```ts
await contentSecurityQueue.add('image-check', {
  userId,
  workspaceId,
  targetType: 'BOOK',
  targetId: bookId,
  imageUrl: coverUrl,
})
```

---

## Step 9：人工复核页面

小程序端可以放在 admin 分包，今天先实现基础列表：

```txt
pages/admin/content-security/index
```

功能：

- 查看 REVIEW / REJECT 内容。
- 查看 targetType、targetId、提交用户、时间。
- 点击通过。
- 点击驳回。
- 所有处理写 AuditLog。

后端接口：

```txt
GET  /api/v1/admin/content-security?status=REVIEW
POST /api/v1/admin/content-security/:id/approve
POST /api/v1/admin/content-security/:id/reject
```

RBAC：

- 只有 ADMIN / OWNER 能进入。
- 后端必须强制校验。

在 `routes/index.ts` 注册 admin 路由：

```ts
import adminRouter from './admin.routes'
router.use('/admin', adminRouter)
```

---

## Day 16 验收标准 Checklist

### 订阅消息

- [ ] 小程序端能调用 `requestSubscribeMessage`。
- [ ] 后端能记录订阅授权结果。
- [ ] mock 模式能打印发送内容。
- [ ] 支付成功或活动提醒能触发消息发送任务。
- [ ] 拒绝授权时不会继续发送。

### 客服消息

- [ ] 我的页有客服入口。
- [ ] 支付失败页有客服入口。
- [ ] 内容审核失败页有客服入口。
- [ ] 客服上下文能记录到后端。
- [ ] 不同场景能带 orderId / bookId / activityId。

### 内容安全

- [ ] 书籍标题敏感内容会被拦截。
- [ ] 评论敏感内容会被拦截。
- [ ] 活动描述敏感内容会被拦截。
- [ ] 图片上传后能进入检测流程。
- [ ] REVIEW 内容可以人工处理。
- [ ] REJECT 内容不会展示给普通用户。
- [ ] 检测和人工处理写 AuditLog。

---

## Day 16 Git Commit 示例

```bash
git add .
git commit -m "feat(mini): add subscription messages customer service and content safety"
```

---

## Day 16 Prompt 模板

### 订阅消息

```txt
你是微信小程序订阅消息专家。
请帮我实现 BookNest 的订阅消息流程：小程序 requestSubscribeMessage、后端记录授权、BullMQ 业务事件触发、mock/real 发送。要求给出数据库模型、接口和错误处理。
```

### 内容安全

```txt
你是微信小程序内容安全和后端风控工程师。
请设计文本和图片内容安全流程。
要求：文本同步拦截；图片异步检测；PASS/REVIEW/REJECT 状态；管理员复核；AuditLog；接口失败时的降级策略。
```

### 客服入口

```txt
请为小程序支付失败、内容审核失败、我的页面设计客服入口。
要求：open-type=contact 或 openCustomerServiceChat；后端记录上下文；带 orderId/bookId/activityId；用户体验友好。
```

---

## Day 16 每日反馈

### 今日完成

- [ ] 订阅消息完成。
- [ ] 客服入口完成。
- [ ] 内容安全完成。
- [ ] 人工复核完成。

### 今日卡点

1. 
2. 
3. 

### Vibe Coding 反馈

| 提示词 | 结果 | 人工修正 |
|---|---|---|
| 订阅消息 |  |  |
| 客服入口 |  |  |
| 文本安全 |  |  |
| 图片安全 |  |  |

### 明日准备

- [ ] 统计当前小程序主包和页面体积。
- [ ] 准备将 orders、workspace、admin 拆成分包。
- [ ] 准备性能测试数据：1000 本书、100 条评论、多个活动。

---

## 参考资料

- 订阅消息：`https://developers.weixin.qq.com/miniprogram/dev/api/open-api/subscribe-message/wx.requestSubscribeMessage.html`
- 客服会话：`https://developers.weixin.qq.com/miniprogram/dev/api/open-api/customer-service/wx.openCustomerServiceChat.html`
- 文本安全检测：`https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/sec-center/sec-check/msgSecCheck.html`
- 图片安全检测：`https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/sec-center/sec-check/mediaCheckAsync.html`
