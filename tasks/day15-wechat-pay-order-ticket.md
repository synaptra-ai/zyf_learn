# Day 15：微信支付 + 订单状态机 + 支付回调幂等 + Ticket 发放


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

Day 11 已经完成订单状态机、模拟支付、BullMQ、数据库并发控制。今天要把这些能力迁移到微信小程序真实业务场景：用户在读书会活动中报名，后端创建订单，调用微信支付预下单，小程序拉起支付，支付回调成功后创建 Ticket。

**今天的目标**：完成微信支付架构和小程序支付链路。学习环境必须能用 mock pay 完整跑通；如果你已经拥有微信支付商户号，则接入真实微信支付 JSAPI/小程序支付。

---

## 学习目标

完成今天后，你将掌握：

1. 微信支付 JSAPI / 小程序支付整体链路。
2. 商户订单号、预支付交易会话、支付参数签名的关系。
3. 小程序端 `Taro.requestPayment` 的使用方式。
4. 为什么不能只相信前端支付成功回调。
5. 支付结果通知验签、解密、幂等处理。
6. 支付回调与 Order 状态机、Ticket 发放的事务设计。
7. 支付失败、取消、超时、重复回调的处理。
8. Mock pay 与真实 WeChat Pay 的环境隔离。

---

## 技术栈

| 技术 | 用途 |
|---|---|
| Taro.requestPayment | 小程序端拉起微信支付 |
| 微信支付 API v3 | 服务端预下单、查单、回调通知 |
| Express | 支付接口、回调接口 |
| Prisma transaction | 支付成功后事务处理 |
| Redis / BullMQ | 订单过期、补偿查单 |
| Order 状态机 | PENDING / PAID / CANCELLED / EXPIRED / FAILED（需先在 Prisma 添加 FAILED） |
| PaymentEvent | 记录支付事件与幂等键 |
| Ticket | 支付成功后发放报名票据 |
| Mock Pay | 学习阶段无商户号时完整演练 |

---

## 技术路线

```txt
小程序活动页
  ↓ 创建订单
POST /api/v1/orders
  ↓ 创建 PENDING 订单
POST /api/v1/wechat-pay/prepay
  ↓ 后端调用微信支付预下单或 mock prepay
返回支付参数
  ↓
Taro.requestPayment
  ↓
微信支付收银台
  ↓
异步支付结果通知 / mock callback
  ↓
验签 + 解密 + 幂等 + 事务
  ↓
Order = PAID + Ticket created
```

核心原则：

- 前端 `requestPayment` 成功只代表用户侧流程完成，不是最终发放权益的唯一依据。
- 最终订单状态以后端支付回调或主动查单为准。
- 支付回调可能重复到达，必须幂等。
- 支付回调处理前要检查订单状态，并使用事务和锁避免并发发放多个 Ticket。

---

## 功能清单

### Must-Have

| # | 功能 | 说明 |
|---|---|---|
| 1 | 支付配置 | mock / real 两套模式隔离 |
| 2 | 创建订单 | 复用 Day 11 Order / Activity / Ticket 模型 |
| 3 | 预支付接口 | `POST /api/v1/wechat-pay/prepay` |
| 4 | 小程序拉起支付 | `Taro.requestPayment` |
| 5 | 支付回调接口 | `POST /api/v1/wechat-pay/notify` |
| 6 | 回调幂等 | 重复通知不会重复发 Ticket |
| 7 | 支付事务 | Order paid + Ticket created 原子完成 |
| 8 | 订单查单 | 回调缺失时主动确认订单状态 |
| 9 | 支付状态页 | 展示待支付、成功、失败、取消 |

### Nice-to-Have

| # | 功能 | 说明 |
|---|---|---|
| 1 | 退款模型 | 只设计表结构，不强求真实退款 |
| 2 | 支付告警 | 回调验签失败或金额不一致写错误日志 |
| 3 | 对账任务 | 每日扫描 PENDING 订单并查单 |
| 4 | 真实商户接入 | 如果商户号和证书准备完毕则完成真实支付 |

---

## Step 0：Prisma 迁移——给 OrderStatus 添加 FAILED

现有 `OrderStatus` 只有 `PENDING | PAID | CANCELLED | EXPIRED`，缺少 `FAILED`。

修改 `backend/prisma/schema.prisma`：

```prisma
enum OrderStatus {
  PENDING
  PAID
  CANCELLED
  EXPIRED
  FAILED       // 新增：支付失败
}
```

迁移：

```bash
cd backend
npx prisma migrate dev --name add_order_status_failed
```

同时，现有 `Ticket` 模型没有 `status` 字段，如果需要在支付事务中判断 Ticket 状态，可按需添加。当前方案直接使用 Ticket 的唯一约束 `@@unique([activityId, userId])` 来防止重复发放。

---

## Step 1：后端支付环境变量

`.env`：

```bash
WECHAT_PAY_MODE=mock # mock | real

# 小程序和商户配置
WECHAT_APP_ID=your-mini-program-appid
WECHAT_MCH_ID=your-mch-id
WECHAT_PAY_SERIAL_NO=your-merchant-cert-serial-no
WECHAT_PAY_API_V3_KEY=your-api-v3-key
WECHAT_PAY_PRIVATE_KEY_PATH=./certs/apiclient_key.pem
WECHAT_PAY_NOTIFY_URL=https://api.yourdomain.com/api/v1/wechat-pay/notify
```

安全要求：

- [ ] 证书、私钥、API v3 Key 不进入 Git。
- [ ] GitHub Secrets 只保存密钥，不保存到代码。
- [ ] mock 模式和 real 模式必须显式区分。
- [ ] 生产环境禁止使用 mock callback 直接改订单。

---

## Step 2：扩展支付配置和类型

`backend/src/config/wechat-pay.config.ts`：

```ts
export const wechatPayConfig = {
  mode: process.env.WECHAT_PAY_MODE || 'mock',
  appId: process.env.WECHAT_APP_ID!,
  mchId: process.env.WECHAT_MCH_ID!,
  serialNo: process.env.WECHAT_PAY_SERIAL_NO!,
  apiV3Key: process.env.WECHAT_PAY_API_V3_KEY!,
  privateKeyPath: process.env.WECHAT_PAY_PRIVATE_KEY_PATH!,
  notifyUrl: process.env.WECHAT_PAY_NOTIFY_URL!,
}

export type WechatPayMode = 'mock' | 'real'
```

支付参数类型：

```ts
export interface MiniProgramPayParams {
  timeStamp: string
  nonceStr: string
  package: string
  signType: 'RSA' | 'MD5'
  paySign: string
}
```

---

## Step 3：预支付接口

`backend/src/routes/wechat-pay.routes.ts`：

```ts
import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '@/middleware/auth'          // 单数 middleware，文件名 auth.ts
import { resolveWorkspace } from '@/middleware/workspace'  // 不是 requireWorkspace
import { createWechatPrepay } from '@/services/wechat-pay/wechat-pay.service'

export const wechatPayRouter = Router()

const prepaySchema = z.object({
  orderId: z.string().min(1),
})

wechatPayRouter.post('/prepay', authenticate, resolveWorkspace, async (req, res, next) => {
  try {
    const { orderId } = prepaySchema.parse(req.body)
    const result = await createWechatPrepay({
      orderId,
      userId: req.user!.id,
      workspaceId: req.workspace!.id,  // resolveWorkspace 中间件设置 req.workspace
    })

    res.json({ code: 0, message: 'ok', data: result })
  } catch (error) {
    next(error)
  }
})
```

---

## Step 4：Mock prepay 实现

`backend/src/services/wechat-pay/mock-pay.service.ts`：

```ts
import crypto from 'node:crypto'
import type { MiniProgramPayParams } from './types'

export function createMockPayParams(orderId: string): MiniProgramPayParams & { mock: true } {
  return {
    mock: true,
    timeStamp: String(Math.floor(Date.now() / 1000)),
    nonceStr: crypto.randomUUID().replace(/-/g, ''),
    package: `prepay_id=mock_${orderId}`,
    signType: 'RSA',
    paySign: 'mock-pay-sign',
  }
}
```

Mock callback route 仅限开发环境：

```ts
wechatPayRouter.post('/mock-callback', authenticate, async (req, res, next) => {
  // 双重检查：必须是非生产环境 AND mock 模式
  if (process.env.NODE_ENV === 'production' || process.env.WECHAT_PAY_MODE !== 'mock') {
    res.status(403).json({ code: 403, message: 'production disabled', data: null })
    return
  }
  // 调用同一套支付成功处理 service，不能另写一套绕过事务
})
```

---

## Step 5：真实微信支付 service 设计

`createWechatPrepay` 逻辑：

```txt
1. 查询订单，确认 userId、workspaceId、状态 PENDING。
2. 查询用户 wechatOpenId。
3. 校验订单金额、活动是否仍可报名。
4. 如果 WECHAT_PAY_MODE=mock，返回 mock pay params。
5. 如果 WECHAT_PAY_MODE=real：
   - 调用微信支付 JSAPI/小程序下单接口。
   - 获取 prepay_id。
   - 生成小程序端 requestPayment 所需参数。
   - 保存 prepay_id 和 outTradeNo。
6. 返回 payParams。
```

伪代码：

```ts
export async function createWechatPrepay(input: {
  orderId: string
  userId: string
  workspaceId: string
}) {
  // 注意：prisma 使用默认导出 → import prisma from '@/lib/prisma'
  const order = await prisma.order.findFirst({
    where: { id: input.orderId, userId: input.userId, workspaceId: input.workspaceId },
    include: { user: true, activity: true },
  })

  if (!order) throw new Error('订单不存在')
  if (order.status !== 'PENDING') throw new Error('订单状态不可支付')
  if (!order.user.wechatOpenId) throw new Error('用户未绑定微信身份')

  if (wechatPayConfig.mode === 'mock') {
    return createMockPayParams(order.id)
  }

  return createRealWechatPayParams(order)
}
```

真实支付实现时必须包含：

- 请求签名。
- `notify_url`。
- `openid`。
- 金额单位使用“分”。
- 商户订单号唯一。
- 返回给小程序的支付参数重新签名。

---

## Step 6：小程序端拉起支付

`apps/mini-taro/src/services/pay.ts`：

```ts
import Taro from '@tarojs/taro'
import { request } from './request'

interface PayParams {
  timeStamp: string
  nonceStr: string
  package: string
  signType: 'RSA' | 'MD5'
  paySign: string
  mock?: boolean
}

export async function createPrepay(orderId: string) {
  return request<PayParams>({
    url: '/api/v1/wechat-pay/prepay',
    method: 'POST',
    data: { orderId },
  })
}

export async function payOrder(orderId: string) {
  const params = await createPrepay(orderId)

  if (params.mock) {
    await Taro.showModal({ title: '模拟支付', content: '学习环境模拟支付成功' })
    await request({
      url: '/api/v1/wechat-pay/mock-callback',
      method: 'POST',
      data: { orderId, success: true },
    })
    return { status: 'MOCK_PAID' }
  }

  await Taro.requestPayment({
    timeStamp: params.timeStamp,
    nonceStr: params.nonceStr,
    package: params.package,
    signType: params.signType,
    paySign: params.paySign,
  })

  // 不直接发 Ticket，只跳转支付结果页轮询后端订单状态
  return { status: 'PAYMENT_CLIENT_FINISHED' }
}
```

支付按钮：

```tsx
async function handlePay() {
  try {
    await payOrder(orderId)
    Taro.redirectTo({ url: `/pages/orders/result/index?orderId=${orderId}` })
  } catch (error) {
    Taro.showToast({ title: '支付已取消或失败', icon: 'none' })
  }
}
```

---

## Step 7：支付回调处理

回调处理步骤：

```txt
1. 验证微信支付回调签名。
2. 解密 resource 得到支付结果。
3. 校验 outTradeNo、amount、mchId、appid。
4. 插入 PaymentEvent，使用 eventId / transactionId 做唯一约束。
5. 开启 Prisma transaction。
6. 查询订单并加并发保护。
7. 如果订单已 PAID，直接返回成功。
8. 如果订单 PENDING，更新为 PAID。
9. 创建 Ticket，唯一约束防止重复发放。
10. 写 AuditLog。
11. 返回 200/204。
```

`PaymentEvent` 唯一约束建议——在现有模型基础上**只添加以下字段**（不要替换整个模型）：

在 `schema.prisma` 的 `PaymentEvent` 模型中，`rawPayload` 后面添加以下字段：

```prisma
// —— 在 PaymentEvent 模型的 rawPayload 字段后面添加 ——
  transactionId   String?  @map("transaction_id")        // 新增：微信支付单号
  outTradeNo      String?  @map("out_trade_no")           // 新增：商户订单号
  eventType       String?  @map("event_type")             // 新增：事件类型
// —— 新增字段结束 ——

// 同时在模型底部添加联合唯一约束（与已有 @@index 并列）：
  @@unique([provider, transactionId])
```

迁移：
```bash
cd backend
npx prisma migrate dev --name extend_payment_event_for_wechat
```

---

## Step 8：支付成功事务

`handlePaymentSuccess` 伪代码：

```ts
await prisma.$transaction(async (tx) => {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { activity: true },
  })

  if (!order) throw new Error('订单不存在')

  if (order.status === 'PAID') return  // 幂等：已支付直接返回成功
  if (order.status !== 'PENDING') throw new Error(`订单状态异常：${order.status}`)

  // 注意：金额字段是 amountCents（分），不是 amount
  if (paidAmountCents !== order.amountCents) throw new Error('支付金额不一致')

  // 并发防超卖：利用 Ticket 的 @@unique([activityId, userId]) 约束
  const existingTicket = await tx.ticket.findUnique({
    where: { activityId_userId: { activityId: order.activityId, userId: order.userId } },
  })
  if (existingTicket) return  // 已有 Ticket，幂等返回

  const ticketCount = await tx.ticket.count({
    where: { activityId: order.activityId },
  })

  if (ticketCount >= order.activity.capacity) {
    throw new Error('活动名额已满，需要退款或人工处理')
  }

  await tx.order.update({
    where: { id: order.id },
    data: { status: 'PAID', paidAt: new Date() },
  })

  // Ticket 没有 status 字段，创建即表示有效；orderId 的 @unique 约束防止重复发放
  await tx.ticket.create({
    data: {
      code: `TK-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      orderId: order.id,
      activityId: order.activityId,
      userId: order.userId,
      workspaceId: order.workspaceId,
    },
  })
})
```

---

## Step 9：订单结果页轮询

`pages/orders/result/index.tsx`：

```tsx
const { data: order } = useQuery({
  queryKey: ['order', orderId],
  queryFn: () => getOrder(orderId),
  refetchInterval: (query) => {
    const status = query.state.data?.status
    return status === 'PENDING' ? 2000 : false
  },
})
```

展示：

| 状态 | 页面文案 |
|---|---|
| PENDING | 支付确认中，请稍候 |
| PAID | 报名成功，Ticket 已生成 |
| FAILED | 支付失败，请重新支付 |
| CANCELLED | 支付已取消 |
| EXPIRED | 订单已过期，请重新报名 |

---

## Step 10：补偿查单任务

使用 BullMQ：

```txt
每 5 分钟扫描 PENDING 且 createdAt 超过 3 分钟的订单。
如果 real 模式：调用微信支付查单。
如果查到已支付：进入 handlePaymentSuccess。
如果超时未支付：标记 EXPIRED。
```

---

## Day 15 验收标准 Checklist

### 支付链路

- [ ] 用户可以在小程序中创建活动订单。
- [ ] `POST /api/v1/wechat-pay/prepay` 可用。
- [ ] mock pay 模式能完整支付成功。
- [ ] 小程序能进入支付结果页。
- [ ] 支付成功后订单状态为 `PAID`。
- [ ] 支付成功后创建 Ticket。
- [ ] 前端支付成功不会直接发放权益。

### 幂等和安全

- [ ] 重复回调不会重复创建 Ticket。
- [ ] 金额不一致不会更新订单为 PAID。
- [ ] 订单不属于当前用户不能支付。
- [ ] 订单不属于当前 Workspace 不能支付。
- [ ] 支付回调验签失败会拒绝处理。
- [ ] 生产环境不能调用 mock callback。

### 数据库和并发

- [ ] Ticket 对 orderId 有唯一约束。
- [ ] 并发支付不会超卖活动名额。
- [ ] PaymentEvent 记录原始事件。
- [ ] 订单过期任务正常。
- [ ] 查单补偿任务有日志。

---

## Day 15 Git Commit 示例

```bash
git add .
git commit -m "feat(mini): integrate WeChat pay flow with order state machine"
```

---

## Day 15 Prompt 模板

### 微信支付架构

```txt
你是资深微信支付 API v3 + Express 后端工程师。
请审查我的小程序支付架构：订单创建、prepay、requestPayment、notify callback、幂等、查单补偿、Ticket 发放。
要求指出资金安全风险和数据库一致性问题。
```

### 支付回调幂等

```txt
请实现一个支付回调处理 service。
要求：验签之后处理；PaymentEvent 唯一约束；重复回调直接返回成功；Order PAID + Ticket create 在同一个事务；金额校验；并发防超卖。
```

### 小程序支付页

```txt
请用 Taro + React 实现一个订单支付页和支付结果页。
要求：点击支付调用 prepay；真实模式 requestPayment；mock 模式模拟支付；结果页轮询订单状态；不要在前端直接发 Ticket。
```

---

## Day 15 每日反馈

### 今日完成

- [ ] mock pay 跑通。
- [ ] 真实支付架构完成。
- [ ] 回调幂等完成。
- [ ] Ticket 发放完成。

### 今日卡点

1. 
2. 
3. 

### Vibe Coding 反馈

| 提示词 | 结果 | 人工修正 |
|---|---|---|
| prepay service |  |  |
| callback 幂等 |  |  |
| requestPayment 页面 |  |  |
| 查单任务 |  |  |

### 明日准备

- [ ] 准备订阅消息模板 ID。
- [ ] 准备客服入口页面。
- [ ] 准备内容安全检测场景：书名、评论、封面。

---

## 参考资料

- 微信支付商户文档中心：`https://pay.wechatpay.cn/doc/v3/merchant/4012164514`
- 小程序支付 API：`https://developers.weixin.qq.com/miniprogram/dev/api/payment/wx.requestPayment.html`
