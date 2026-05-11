# Day 11：订单状态机 + 模拟支付 + BullMQ 队列 + 数据库并发


> 本文档是 BookNest Day 8-11 阶段的独立任务文档之一。  
> 这一阶段仍然采用前 7 天的“带着跑”模式：给出明确技术栈、文件路径、实现步骤、核心代码、验收标准、Git 提交建议和 Prompt 模板。  
> 阶段目标：把 BookNest 从“能上线的全栈应用”继续推进到“具备工程化、自动回归、多租户权限、订单状态机、异步任务和数据库一致性能力的准生产级应用”。

## 本阶段统一前置条件

开始前请确保：

- [ ] Day 1-7 的 BookNest 项目可以本地运行。
- [ ] 前端端口仍为 `http://localhost:4001`。
- [ ] 后端端口仍为 `http://localhost:4000`。
- [ ] PostgreSQL 仍使用宿主机端口 `5433`。
- [ ] Redis 可通过 Docker 启动，端口为 `6379`。
- [ ] `docker-compose.yml` 能启动 PostgreSQL / Redis。
- [ ] 后端已有 JWT 认证、Book / Category / Review CRUD、Redis 缓存、OSS 上传、Socket.IO、日志和健康检查。
- [ ] GitHub Actions 已有基础测试与部署流程（ECS Self-hosted Runner 版）。

建议在进入本阶段时先创建分支：

```bash
git checkout -b feat/day8-11-engineering-stage
```

---

## 项目简介

今天把多个真实业务难点压缩到一个完整场景中：**读书会活动报名**。用户可以在 Workspace 中创建读书会活动，成员可以报名并生成订单，模拟支付成功后创建报名票据。系统需要处理重复支付回调、订单过期、活动名额并发抢占、CSV 批量导入书籍。

**今天的目标**：完成一个具备订单状态机、支付回调幂等、后台任务队列、事务和并发控制的业务闭环。

---

## 学习目标

完成今天后，你将掌握：

1. 订单状态机设计。
2. 模拟支付回调和签名校验。
3. 幂等性处理：重复回调不重复发放权益。
4. BullMQ 队列和 worker 分离。
5. 订单过期任务。
6. CSV 异步导入任务。
7. Prisma transaction 的使用。
8. 并发报名时如何避免超卖。
9. 索引和唯一约束如何保护数据一致性。

---

## 技术栈

| 技术 | 用途 |
|---|---|
| BullMQ | 后台任务队列 |
| Redis | BullMQ 存储和任务分发 |
| Prisma transaction | 订单支付事务 |
| PostgreSQL unique constraint / index | 幂等和查询性能 |
| crypto HMAC | 模拟支付签名 |
| multer | CSV 文件上传 |
| csv-parse | CSV 解析 |
| React Query | 前端订单、活动、任务进度 |

---

## 业务场景

新增一个模块：**读书会活动报名**。

流程：

```txt
ADMIN 创建活动
→ MEMBER/VIEWER 查看活动
→ 用户点击报名
→ 后端创建 PENDING 订单
→ 前端点击“模拟支付”
→ 后端生成 mock payment callback
→ 回调验签
→ 幂等检查 paymentEvent.eventId
→ 事务中更新订单为 PAID
→ 活动 registeredCount + 1
→ 创建 Ticket
→ 写 AuditLog
→ 前端显示报名成功
```

同时：

```txt
订单创建后 15 分钟未支付
→ BullMQ delayed job 触发
→ 如果订单仍是 PENDING
→ 标记为 EXPIRED
```

另一个异步场景：

```txt
上传 CSV 导入书籍
→ 立即返回 importJobId
→ Worker 后台解析 CSV
→ 每导入一行更新进度
→ 前端轮询 job 状态
→ 成功后刷新书籍列表
```

---

## 功能清单

### Must-Have

| # | 功能 | 说明 |
|---|---|---|
| 1 | Activity 模型 | 读书会活动、容量、价格、报名数 |
| 2 | Order 模型 | PENDING / PAID / CANCELLED / EXPIRED |
| 3 | PaymentEvent 模型 | 支付回调事件，eventId 唯一 |
| 4 | Ticket 模型 | 支付成功后的报名凭证 |
| 5 | 创建订单 API | 用户报名活动，生成待支付订单 |
| 6 | 模拟支付 API | 模拟支付平台回调 |
| 7 | 回调签名校验 | HMAC-SHA256 |
| 8 | 回调幂等 | 重复 eventId 不重复处理 |
| 9 | 并发防超卖 | 活动名额不能超过 capacity |
| 10 | BullMQ worker | 订单过期任务、CSV 导入任务 |
| 11 | CSV 导入书籍 | 上传文件后异步处理 |
| 12 | 任务进度查询 | 前端显示导入进度 |
| 13 | 数据库索引 | 常用查询和唯一约束 |

### Nice-to-Have

| # | 功能 | 说明 |
|---|---|---|
| 14 | 导出 CSV | 导出当前 Workspace 书籍 |
| 15 | 邮件通知 | 支付成功后发送模拟邮件 |
| 16 | 订单列表页 | 查看我的订单 |
| 17 | 并发压测脚本 | 同时 50 个请求抢活动名额 |

---

## Step 1：安装依赖

```bash
cd booknest/backend
npm install bullmq csv-parse
npm install -D concurrently
```

如果没有安装 multer：

```bash
npm install multer
npm install -D @types/multer
```

---

## Step 2：新增 Prisma 模型

路径：`backend/prisma/schema.prisma`

### 2.1 新增枚举

```prisma
enum ActivityStatus {
  DRAFT
  PUBLISHED
  CANCELLED
}

enum OrderStatus {
  PENDING
  PAID
  CANCELLED
  EXPIRED
}

enum ImportJobStatus {
  PENDING
  RUNNING
  SUCCESS
  FAILED
}
```

### 2.2 Activity

```prisma
model Activity {
  id              String         @id @default(uuid())
  title           String         @db.VarChar(200)
  description     String?        @db.Text
  capacity        Int
  registeredCount Int            @default(0) @map("registered_count")
  priceCents      Int            @default(0) @map("price_cents")
  status          ActivityStatus @default(DRAFT)
  startsAt        DateTime       @map("starts_at")
  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")

  workspaceId String    @map("workspace_id")
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  createdById String @map("created_by_id")
  createdBy   User   @relation(fields: [createdById], references: [id], onDelete: Cascade)

  orders  Order[]
  tickets Ticket[]

  @@index([workspaceId, status])
  @@index([startsAt])
  @@map("activities")
}
```

### 2.3 Order

```prisma
model Order {
  id          String      @id @default(uuid())
  orderNo     String      @unique @map("order_no")
  amountCents Int         @map("amount_cents")
  status      OrderStatus @default(PENDING)
  expiresAt   DateTime    @map("expires_at")
  paidAt      DateTime?   @map("paid_at")
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")

  workspaceId String    @map("workspace_id")
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  userId String @map("user_id")
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  activityId String   @map("activity_id")
  activity   Activity @relation(fields: [activityId], references: [id], onDelete: Cascade)

  paymentEvents PaymentEvent[]
  ticket        Ticket?

  @@index([workspaceId, userId])
  @@index([status, expiresAt])
  @@map("orders")
}
```

### 2.4 PaymentEvent

```prisma
model PaymentEvent {
  id        String   @id @default(uuid())
  provider  String   @db.VarChar(50)
  eventId   String   @unique @map("event_id")
  rawPayload Json    @map("raw_payload")
  createdAt DateTime @default(now()) @map("created_at")

  orderId String @map("order_id")
  order   Order  @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([orderId])
  @@map("payment_events")
}
```

### 2.5 Ticket

```prisma
model Ticket {
  id        String   @id @default(uuid())
  code      String   @unique
  createdAt DateTime @default(now()) @map("created_at")

  workspaceId String    @map("workspace_id")
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  userId String @map("user_id")
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  activityId String   @map("activity_id")
  activity   Activity @relation(fields: [activityId], references: [id], onDelete: Cascade)

  orderId String @unique @map("order_id")
  order   Order  @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@unique([activityId, userId])
  @@index([workspaceId, userId])
  @@map("tickets")
}
```

### 2.6 ImportJob

```prisma
model ImportJob {
  id           String          @id @default(uuid())
  status       ImportJobStatus @default(PENDING)
  total        Int             @default(0)
  processed    Int             @default(0)
  successCount Int             @default(0) @map("success_count")
  failedCount  Int             @default(0) @map("failed_count")
  error        String?         @db.Text
  createdAt    DateTime        @default(now()) @map("created_at")
  updatedAt    DateTime        @updatedAt @map("updated_at")

  workspaceId String    @map("workspace_id")
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  userId String @map("user_id")
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([workspaceId, createdAt])
  @@map("import_jobs")
}
```

### 2.7 更新关联

需要给 `Workspace`、`User` 增加关联字段：

```prisma
model Workspace {
  // ... existing fields
  activities Activity[]
  orders     Order[]
  tickets    Ticket[]
  importJobs ImportJob[]
}

model User {
  // ... existing fields
  activitiesCreated Activity[]
  orders            Order[]
  tickets           Ticket[]
  importJobs        ImportJob[]
}
```

运行迁移：

```bash
cd backend
npx prisma migrate dev --name add_activity_order_queue_models
```

---

## Step 3：创建队列基础设施

### 3.1 Redis connection for BullMQ

路径：`backend/src/lib/queue.ts`

```ts
import { Queue, Worker, QueueEvents } from 'bullmq'
import IORedis from 'ioredis'

export const queueConnection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
})

export const orderQueue = new Queue('order', { connection: queueConnection })
export const importQueue = new Queue('import', { connection: queueConnection })

export const orderQueueEvents = new QueueEvents('order', { connection: queueConnection })
export const importQueueEvents = new QueueEvents('import', { connection: queueConnection })

export { Worker }
```

### 3.2 创建 worker 入口

路径：`backend/src/workers/index.ts`

```ts
import dotenv from 'dotenv'
dotenv.config()

import logger from '@/lib/logger'
import { Worker, queueConnection } from '@/lib/queue'
import { handleExpireOrderJob } from './order.worker'
import { handleBookImportJob } from './import.worker'

new Worker(
  'order',
  async (job) => {
    if (job.name === 'expire-order') {
      await handleExpireOrderJob(job.data)
    }
  },
  { connection: queueConnection },
)

new Worker(
  'import',
  async (job) => {
    if (job.name === 'book-import') {
      await handleBookImportJob(job.data)
    }
  },
  { connection: queueConnection },
)

logger.info('BullMQ workers started')
```

### 3.3 package scripts

```json
{
  "scripts": {
    "worker:dev": "ts-node-dev --respawn --transpile-only src/workers/index.ts",
    "dev:all": "concurrently \"npm run dev\" \"npm run worker:dev\""
  }
}
```

运行：

```bash
cd backend
npm run dev:all
```

**正反馈时刻**：控制台同时出现 API server 和 `BullMQ workers started`。

---

## Step 4：Activity API

### 4.1 Schema

路径：`backend/src/schemas/activity.schema.ts`

```ts
import { z } from 'zod'

export const createActivityBodySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  capacity: z.number().int().positive().max(10000),
  priceCents: z.number().int().min(0),
  startsAt: z.string().datetime(),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('PUBLISHED'),
})

export const updateActivityBodySchema = createActivityBodySchema.partial()
```

### 4.2 Service

路径：`backend/src/services/activity.service.ts`

```ts
import prisma from '@/lib/prisma'
import { writeAuditLog } from './audit.service'
import { ApiError } from '@/utils/errors'

export async function listActivities(workspaceId: string) {
  return prisma.activity.findMany({
    where: { workspaceId },
    orderBy: { startsAt: 'asc' },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  })
}

export async function createActivity(userId: string, workspaceId: string, data: any) {
  const activity = await prisma.activity.create({
    data: {
      ...data,
      startsAt: new Date(data.startsAt),
      workspaceId,
      createdById: userId,
    },
  })

  await writeAuditLog({
    workspaceId,
    actorId: userId,
    action: 'activity.created',
    entityType: 'Activity',
    entityId: activity.id,
    metadata: { title: activity.title },
  })

  return activity
}

export async function getActivity(workspaceId: string, id: string) {
  const activity = await prisma.activity.findFirst({
    where: { id, workspaceId },
    include: { tickets: true },
  })

  if (!activity) throw new ApiError(404, '活动不存在')
  return activity
}
```

### 4.3 Controller + Routes

路径：`backend/src/routes/activity.routes.ts`

```ts
import { Router } from 'express'
import { authenticate } from '@/middleware/auth'
import { resolveWorkspace, requireWorkspaceRole } from '@/middleware/workspace'
import { validateBody } from '@/middleware/zodValidate'
import { createActivityBodySchema } from '@/schemas/activity.schema'
import * as activityController from '@/controllers/activity.controller'

const router = Router()

router.use(authenticate, resolveWorkspace)
router.get('/', activityController.list)
router.get('/:id', activityController.getById)
router.post(
  '/',
  requireWorkspaceRole('ADMIN'),
  validateBody(createActivityBodySchema),
  activityController.create,
)

export default router
```

注册：

```ts
router.use('/activities', activityRoutes)
```

---

## Step 5：订单创建 API

### 5.1 工具函数

路径：`backend/src/utils/orderNo.ts`

```ts
export function generateOrderNo() {
  const date = new Date()
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.random().toString(36).slice(2, 10).toUpperCase()
  return `BN${ymd}${random}`
}
```

### 5.2 Order service

路径：`backend/src/services/order.service.ts`

```ts
import prisma from '@/lib/prisma'
import { orderQueue } from '@/lib/queue'
import { ApiError } from '@/utils/errors'
import { generateOrderNo } from '@/utils/orderNo'
import { writeAuditLog } from './audit.service'

const ORDER_EXPIRE_MINUTES = 15

export async function createOrder(userId: string, workspaceId: string, activityId: string) {
  const activity = await prisma.activity.findFirst({
    where: { id: activityId, workspaceId, status: 'PUBLISHED' },
  })

  if (!activity) throw new ApiError(404, '活动不存在或未发布')
  if (activity.registeredCount >= activity.capacity) throw new ApiError(400, '活动名额已满')

  const existingPaid = await prisma.order.findFirst({
    where: { userId, workspaceId, activityId, status: 'PAID' },
  })
  if (existingPaid) throw new ApiError(400, '你已报名该活动')

  const expiresAt = new Date(Date.now() + ORDER_EXPIRE_MINUTES * 60 * 1000)

  const order = await prisma.order.create({
    data: {
      orderNo: generateOrderNo(),
      amountCents: activity.priceCents,
      expiresAt,
      userId,
      workspaceId,
      activityId,
    },
  })

  await orderQueue.add(
    'expire-order',
    { orderId: order.id },
    { delay: ORDER_EXPIRE_MINUTES * 60 * 1000, attempts: 3 },
  )

  await writeAuditLog({
    workspaceId,
    actorId: userId,
    action: 'order.created',
    entityType: 'Order',
    entityId: order.id,
    metadata: { activityId, amountCents: order.amountCents },
  })

  return order
}

export async function listMyOrders(userId: string, workspaceId: string) {
  return prisma.order.findMany({
    where: { userId, workspaceId },
    include: {
      activity: true,
      ticket: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}
```

### 5.3 Order route

路径：`backend/src/routes/order.routes.ts`

```ts
import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '@/middleware/auth'
import { resolveWorkspace } from '@/middleware/workspace'
import { validateBody } from '@/middleware/zodValidate'
import * as orderController from '@/controllers/order.controller'

const router = Router()

router.use(authenticate, resolveWorkspace)

router.get('/my', orderController.listMyOrders)
router.post(
  '/',
  validateBody(z.object({ activityId: z.string().uuid() })),
  orderController.create,
)

export default router
```

---

## Step 6：订单过期 Worker

路径：`backend/src/workers/order.worker.ts`

```ts
import prisma from '@/lib/prisma'
import logger from '@/lib/logger'

export async function handleExpireOrderJob(data: { orderId: string }) {
  const order = await prisma.order.findUnique({ where: { id: data.orderId } })

  if (!order) {
    logger.warn('Expire order job skipped: order not found', data)
    return
  }

  if (order.status !== 'PENDING') {
    logger.info('Expire order job skipped: order not pending', {
      orderId: order.id,
      status: order.status,
    })
    return
  }

  if (order.expiresAt > new Date()) {
    logger.info('Expire order job skipped: not expired yet', { orderId: order.id })
    return
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { status: 'EXPIRED' },
  })

  logger.info('Order expired', { orderId: order.id, orderNo: order.orderNo })
}
```

测试时可以临时把过期时间改成 30 秒，便于观察。

---

## Step 7：模拟支付签名与回调

### 7.1 配置环境变量

后端 `.env`：

```bash
MOCK_PAYMENT_SECRET="booknest-mock-payment-secret"
```

### 7.2 签名工具

路径：`backend/src/lib/mockPayment.ts`

```ts
import crypto from 'crypto'

export interface MockPaymentPayload {
  eventId: string
  orderNo: string
  amountCents: number
  paidAt: string
  status: 'SUCCESS'
}

export function signPaymentPayload(payload: MockPaymentPayload) {
  const secret = process.env.MOCK_PAYMENT_SECRET!
  const content = `${payload.eventId}|${payload.orderNo}|${payload.amountCents}|${payload.paidAt}|${payload.status}`
  return crypto.createHmac('sha256', secret).update(content).digest('hex')
}

export function verifyPaymentSignature(payload: MockPaymentPayload, signature: string) {
  const expected = signPaymentPayload(payload)
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}
```

---

## Step 8：支付回调 service：幂等 + 事务 + 防超卖

路径：`backend/src/services/payment.service.ts`

```ts
import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { ApiError } from '@/utils/errors'
import { verifyPaymentSignature, MockPaymentPayload, signPaymentPayload } from '@/lib/mockPayment'
import { writeAuditLog } from './audit.service'

export async function createMockPaymentCallback(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  })

  if (!order) throw new ApiError(404, '订单不存在')

  const payload: MockPaymentPayload = {
    eventId: `evt_${crypto.randomUUID()}`,
    orderNo: order.orderNo,
    amountCents: order.amountCents,
    paidAt: new Date().toISOString(),
    status: 'SUCCESS',
  }

  const signature = signPaymentPayload(payload)

  return handlePaymentCallback(payload, signature)
}

export async function handlePaymentCallback(payload: MockPaymentPayload, signature: string) {
  if (!verifyPaymentSignature(payload, signature)) {
    throw new ApiError(400, '支付签名无效')
  }

  return prisma.$transaction(async (tx) => {
    // 幂等检查：同一个 eventId 只处理一次
    const existingEvent = await tx.paymentEvent.findUnique({
      where: { eventId: payload.eventId },
      include: { order: { include: { ticket: true } } },
    })

    if (existingEvent) {
      return {
        idempotent: true,
        order: existingEvent.order,
      }
    }

    const order = await tx.order.findUnique({
      where: { orderNo: payload.orderNo },
      include: { activity: true, ticket: true },
    })

    if (!order) throw new ApiError(404, '订单不存在')
    if (order.amountCents !== payload.amountCents) throw new ApiError(400, '支付金额不匹配')

    await tx.paymentEvent.create({
      data: {
        provider: 'mockpay',
        eventId: payload.eventId,
        orderId: order.id,
        rawPayload: payload as any,
      },
    })

    if (order.status === 'PAID') {
      return { idempotent: true, order }
    }

    if (order.status !== 'PENDING') {
      throw new ApiError(400, `订单状态不可支付: ${order.status}`)
    }

    if (order.expiresAt < new Date()) {
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'EXPIRED' },
      })
      throw new ApiError(400, '订单已过期')
    }

    const existingTicket = await tx.ticket.findFirst({
      where: {
        activityId: order.activityId,
        userId: order.userId,
      },
    })

    if (existingTicket) {
      throw new ApiError(400, '你已报名该活动')
    }

    // 并发防超卖：只有 registeredCount < capacity 时才能 +1
    const activityUpdate = await tx.activity.updateMany({
      where: {
        id: order.activityId,
        registeredCount: { lt: order.activity.capacity },
      },
      data: {
        registeredCount: { increment: 1 },
      },
    })

    if (activityUpdate.count !== 1) {
      throw new ApiError(400, '活动名额已满')
    }

    const paidOrder = await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        paidAt: new Date(payload.paidAt),
      },
    })

    const ticket = await tx.ticket.create({
      data: {
        code: `TICKET-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        workspaceId: order.workspaceId,
        userId: order.userId,
        activityId: order.activityId,
        orderId: order.id,
      },
    })

    await tx.auditLog.create({
      data: {
        workspaceId: order.workspaceId,
        actorId: order.userId,
        action: 'order.paid',
        entityType: 'Order',
        entityId: order.id,
        metadata: {
          orderNo: order.orderNo,
          ticketCode: ticket.code,
          amountCents: order.amountCents,
        },
      },
    })

    return {
      idempotent: false,
      order: paidOrder,
      ticket,
    }
  })
}
```

关键点：

- `PaymentEvent.eventId` 唯一，防止同一个回调重复处理。
- `Ticket.orderId` 唯一，防止一个订单创建多个票据。
- `Ticket(activityId, userId)` 唯一，防止同一个用户对同一个活动重复出票。
- `activity.updateMany({ registeredCount: { lt: capacity } })` 防止并发超卖。
- 所有状态变更在一个事务里完成。

---

## Step 9：支付路由

路径：`backend/src/routes/payment.routes.ts`

```ts
import { Router } from 'express'
import { authenticate } from '@/middleware/auth'
import { resolveWorkspace } from '@/middleware/workspace'
import * as paymentController from '@/controllers/payment.controller'

const router = Router()

router.use(authenticate, resolveWorkspace)

// 前端点击“模拟支付”调用这个接口
router.post('/mock/pay/:orderId', paymentController.mockPay)

// 模拟第三方支付平台回调，学习阶段可保留认证，也可单独做签名保护
router.post('/mock/callback', paymentController.callback)

export default router
```

Controller：

```ts
export async function mockPay(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await paymentService.createMockPaymentCallback(req.params.orderId)
    ResponseUtil.success(res, result, '支付成功')
  } catch (err) {
    next(err)
  }
}

export async function callback(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await paymentService.handlePaymentCallback(req.body.payload, req.body.signature)
    ResponseUtil.success(res, result, '回调处理成功')
  } catch (err) {
    next(err)
  }
}
```

---

## Step 10：CSV 异步导入

### 10.1 上传中间件

如果已有 upload 中间件，可复用；否则创建：

路径：`backend/src/middleware/csvUpload.ts`

```ts
import multer from 'multer'

export const csvUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true)
    } else {
      cb(new Error('仅支持 CSV 文件'))
    }
  },
  limits: { fileSize: 2 * 1024 * 1024 },
})
```

### 10.2 Import service

路径：`backend/src/services/import.service.ts`

```ts
import prisma from '@/lib/prisma'
import { importQueue } from '@/lib/queue'

export async function createBookImportJob(userId: string, workspaceId: string, file: Express.Multer.File) {
  const job = await prisma.importJob.create({
    data: {
      userId,
      workspaceId,
      status: 'PENDING',
    },
  })

  await importQueue.add('book-import', {
    importJobId: job.id,
    userId,
    workspaceId,
    csvText: file.buffer.toString('utf-8'),
  })

  return job
}

export async function getImportJob(userId: string, workspaceId: string, jobId: string) {
  return prisma.importJob.findFirst({
    where: { id: jobId, userId, workspaceId },
  })
}
```

### 10.3 Import worker

路径：`backend/src/workers/import.worker.ts`

```ts
import { parse } from 'csv-parse/sync'
import prisma from '@/lib/prisma'
import logger from '@/lib/logger'

interface ImportJobData {
  importJobId: string
  userId: string
  workspaceId: string
  csvText: string
}

export async function handleBookImportJob(data: ImportJobData) {
  const { importJobId, userId, workspaceId, csvText } = data

  await prisma.importJob.update({
    where: { id: importJobId },
    data: { status: 'RUNNING' },
  })

  try {
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Array<{
      title: string
      author: string
      status?: string
      pageCount?: string
      description?: string
    }>

    await prisma.importJob.update({
      where: { id: importJobId },
      data: { total: records.length },
    })

    let successCount = 0
    let failedCount = 0

    for (const record of records) {
      try {
        if (!record.title || !record.author) throw new Error('title 和 author 必填')

        await prisma.book.create({
          data: {
            title: record.title,
            author: record.author,
            status: (record.status as any) || 'WISHLIST',
            pageCount: record.pageCount ? Number(record.pageCount) : undefined,
            description: record.description || undefined,
            userId,
            workspaceId,
          },
        })

        successCount++
      } catch (err) {
        failedCount++
        logger.warn('Import row failed', { importJobId, record, error: (err as Error).message })
      }

      await prisma.importJob.update({
        where: { id: importJobId },
        data: {
          processed: { increment: 1 },
          successCount,
          failedCount,
        },
      })
    }

    await prisma.importJob.update({
      where: { id: importJobId },
      data: { status: 'SUCCESS' },
    })
  } catch (err) {
    await prisma.importJob.update({
      where: { id: importJobId },
      data: {
        status: 'FAILED',
        error: (err as Error).message,
      },
    })
  }
}
```

### 10.4 Import routes

路径：`backend/src/routes/import.routes.ts`

```ts
import { Router } from 'express'
import { authenticate } from '@/middleware/auth'
import { resolveWorkspace, requireWorkspaceRole } from '@/middleware/workspace'
import { csvUpload } from '@/middleware/csvUpload'
import * as importController from '@/controllers/import.controller'

const router = Router()

router.use(authenticate, resolveWorkspace)

router.post(
  '/books',
  requireWorkspaceRole('MEMBER'),
  csvUpload.single('file'),
  importController.createBookImport,
)

router.get('/:jobId', importController.getJob)

export default router
```

---

## Step 11：导出 CSV

路径：`backend/src/controllers/export.controller.ts`

```ts
import { Request, Response, NextFunction } from 'express'
import prisma from '@/lib/prisma'

export async function exportBooks(req: Request, res: Response, next: NextFunction) {
  try {
    const books = await prisma.book.findMany({
      where: { workspaceId: req.workspace!.id },
      orderBy: { createdAt: 'desc' },
      select: {
        title: true,
        author: true,
        status: true,
        pageCount: true,
        description: true,
      },
    })

    const header = 'title,author,status,pageCount,description\n'
    const rows = books
      .map((b) =>
        [b.title, b.author, b.status, b.pageCount || '', b.description || '']
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="booknest-books.csv"')
    res.send('\uFEFF' + header + rows)
  } catch (err) {
    next(err)
  }
}
```

路由：

```ts
router.get('/exports/books', authenticate, resolveWorkspace, exportController.exportBooks)
```

---

## Step 12：前端活动和订单页面

### 12.1 Hooks

路径：`frontend/src/hooks/useActivities.ts`

```ts
export function useActivities() {
  const { activeWorkspaceId } = useWorkspaceStore()
  return useQuery({
    queryKey: ['activities', activeWorkspaceId],
    queryFn: async () => {
      const { data } = await apiClient.get('/activities')
      return data
    },
    enabled: !!activeWorkspaceId,
  })
}

export function useCreateOrder() {
  return useMutation({
    mutationFn: async (activityId: string) => {
      const { data } = await apiClient.post('/orders', { activityId })
      return data
    },
  })
}

export function useMockPay() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data } = await apiClient.post(`/payments/mock/pay/${orderId}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
```

### 12.2 ActivityList 页面

路径：`frontend/src/pages/Activities.tsx`

功能：

- 显示活动列表。
- 显示 capacity / registeredCount。
- 点击“报名”创建订单。
- 创建订单后显示“模拟支付”。
- 支付成功后显示 ticket code。

最小实现：

```tsx
export function Activities() {
  const { data: activities = [] } = useActivities()
  const createOrder = useCreateOrder()
  const mockPay = useMockPay()
  const [pendingOrder, setPendingOrder] = useState<any>(null)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">读书会活动</h1>

      {activities.map((activity: any) => (
        <div key={activity.id} className="rounded border p-4">
          <h2 className="font-semibold">{activity.title}</h2>
          <p className="text-sm text-gray-500">
            名额：{activity.registeredCount}/{activity.capacity}
          </p>
          <p className="text-sm">价格：¥{(activity.priceCents / 100).toFixed(2)}</p>

          <button
            data-testid={`activity-register-${activity.id}`}
            onClick={() =>
              createOrder.mutate(activity.id, {
                onSuccess: (order) => setPendingOrder(order),
              })
            }
            className="mt-2 rounded bg-blue-600 px-4 py-2 text-white"
          >
            报名
          </button>
        </div>
      ))}

      {pendingOrder && (
        <div className="rounded border p-4">
          <h2 className="font-semibold">待支付订单：{pendingOrder.orderNo}</h2>
          <button
            data-testid="mock-pay-button"
            onClick={() => mockPay.mutate(pendingOrder.id)}
            className="mt-2 rounded bg-green-600 px-4 py-2 text-white"
          >
            模拟支付
          </button>
        </div>
      )}
    </div>
  )
}
```

---

## Step 13：前端 CSV 导入页面

路径：`frontend/src/pages/DataTools.tsx`

```tsx
import { useState } from 'react'
import apiClient from '@/lib/api-client'
import { useQuery } from '@tanstack/react-query'

export function DataTools() {
  const [jobId, setJobId] = useState<string | null>(null)

  const { data: job } = useQuery({
    queryKey: ['import-job', jobId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/imports/${jobId}`)
      return data
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = (query.state.data as any)?.status
      return status === 'SUCCESS' || status === 'FAILED' ? false : 1000
    },
  })

  const upload = async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const { data } = await apiClient.post('/imports/books', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    setJobId(data.id)
  }

  const progress = job?.total ? Math.round((job.processed / job.total) * 100) : 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">数据工具</h1>

      <div className="rounded border p-4">
        <h2 className="font-semibold">CSV 导入书籍</h2>
        <input
          data-testid="csv-upload-input"
          type="file"
          accept=".csv"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) upload(file)
          }}
        />
      </div>

      {job && (
        <div className="rounded border p-4">
          <div>状态：{job.status}</div>
          <div>进度：{job.processed}/{job.total}</div>
          <div className="mt-2 h-2 rounded bg-gray-200">
            <div className="h-2 rounded bg-blue-600" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-2 text-sm text-gray-500">
            成功：{job.successCount}，失败：{job.failedCount}
          </div>
        </div>
      )}

      <a
        href="/api/v1/exports/books"
        className="inline-block rounded bg-gray-800 px-4 py-2 text-white"
      >
        导出当前 Workspace 书籍
      </a>
    </div>
  )
}
```

注意：导出链接如果需要 token 和 workspace header，不能直接用 `<a>`。更稳的方式是用 Axios 下载 blob：

```ts
const exportBooks = async () => {
  const res = await apiClient.get('/exports/books', { responseType: 'blob' })
  const url = window.URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = 'booknest-books.csv'
  a.click()
  window.URL.revokeObjectURL(url)
}
```

---

## Step 14：并发防超卖测试脚本

路径：`backend/scripts/test-concurrency.ts`

```ts
import axios from 'axios'

const API = 'http://localhost:4000/api/v1'

async function main() {
  const token = process.env.TEST_TOKEN!
  const workspaceId = process.env.TEST_WORKSPACE_ID!
  const activityId = process.env.TEST_ACTIVITY_ID!

  const headers = {
    Authorization: `Bearer ${token}`,
    'X-Workspace-Id': workspaceId,
  }

  const requests = Array.from({ length: 50 }).map(async () => {
    try {
      const orderRes = await axios.post(`${API}/orders`, { activityId }, { headers })
      const order = orderRes.data.data
      const payRes = await axios.post(`${API}/payments/mock/pay/${order.id}`, {}, { headers })
      return { ok: true, data: payRes.data }
    } catch (err: any) {
      return { ok: false, message: err.response?.data?.message || err.message }
    }
  })

  const results = await Promise.all(requests)
  const success = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok).length

  console.log({ success, failed })
  console.log(results.map((r) => r.ok ? 'OK' : r.message))
}

main().catch(console.error)
```

运行：

```bash
TEST_TOKEN="xxx" TEST_WORKSPACE_ID="xxx" TEST_ACTIVITY_ID="xxx" npx tsx scripts/test-concurrency.ts
```

验收：活动 capacity 如果是 10，即使并发 50 个请求，最终 `registeredCount` 不能超过 10，ticket 数量不能超过 10。

---

## Step 15：自动化测试

后端至少补充这些测试：

路径：`backend/tests/integration/payment.test.ts`

```ts
describe('Payment flow', () => {
  it('creates pending order for activity', async () => {})
  it('mock pay changes order to PAID and creates ticket', async () => {})
  it('same payment event is idempotent', async () => {})
  it('expired order cannot be paid', async () => {})
  it('activity capacity cannot be oversold', async () => {})
})
```

路径：`backend/tests/integration/import.test.ts`

```ts
describe('Book CSV import', () => {
  it('creates import job after CSV upload', async () => {})
  it('worker imports valid rows', async () => {})
  it('invalid CSV row increases failedCount', async () => {})
})
```

---

## Day 11 验收标准 Checklist

### 订单 / 支付

- [ ] ADMIN 可以创建读书会活动。
- [ ] 用户可以对活动创建 PENDING 订单。
- [ ] 订单有 `orderNo`、`amountCents`、`expiresAt`。
- [ ] 点击模拟支付后订单变成 PAID。
- [ ] 支付成功后创建 Ticket。
- [ ] 支付成功后 Activity `registeredCount + 1`。
- [ ] 重复支付回调不会重复创建 Ticket。
- [ ] 重复支付回调不会重复增加 registeredCount。
- [ ] 过期订单不能支付。
- [ ] 活动满员后不能继续报名。
- [ ] 支付成功会写 AuditLog。

### 队列

- [ ] `npm run dev:all` 能同时启动 API 和 worker。
- [ ] 创建订单后 BullMQ 中有 `expire-order` delayed job。
- [ ] 订单过期后 worker 会标记为 EXPIRED。
- [ ] CSV 上传后立即返回 ImportJob。
- [ ] Worker 后台处理 CSV。
- [ ] 前端可以轮询看到导入进度。
- [ ] 导入完成后书籍列表出现新增数据。

### 数据库

- [ ] PaymentEvent.eventId 有唯一约束。
- [ ] Ticket.orderId 有唯一约束。
- [ ] Activity registeredCount 不会超过 capacity。
- [ ] 常用查询字段有 index。
- [ ] 支付回调使用 Prisma transaction。
- [ ] 并发测试脚本验证不超卖。

### 前端

- [ ] 活动列表页可查看活动和剩余名额。
- [ ] 报名后出现待支付订单。
- [ ] 模拟支付后显示报名成功。
- [ ] 数据工具页可上传 CSV。
- [ ] 数据工具页显示导入进度。
- [ ] 可以导出当前 Workspace 书籍 CSV。

---

## Day 11 Git Commit 示例

```bash
git commit -m "feat: add activity order payment models"
git commit -m "feat: add BullMQ queues and workers"
git commit -m "feat: implement activity registration order flow"
git commit -m "feat: implement mock payment callback with idempotency"
git commit -m "feat: add order expiration worker"
git commit -m "feat: add CSV book import jobs"
git commit -m "feat: add frontend activities and data tools pages"
git commit -m "test: add payment idempotency and capacity tests"
git commit -m "test: add import job tests"
```

---

## Day 11 Prompt 模板

### 订单状态机

```txt
帮我给 BookNest 增加读书会活动报名订单系统。

需要模型：
1. Activity：title、capacity、registeredCount、priceCents、status、startsAt、workspaceId
2. Order：orderNo、amountCents、status(PENDING/PAID/CANCELLED/EXPIRED)、expiresAt、paidAt、userId、activityId、workspaceId
3. PaymentEvent：provider、eventId(unique)、rawPayload、orderId
4. Ticket：code、orderId(unique)、userId、activityId、workspaceId

要求：
- 创建订单时状态为 PENDING，15 分钟过期
- 支付成功后创建 ticket
- 重复支付回调必须幂等
- 活动名额不能超卖
```

### BullMQ 队列

```txt
帮我在 BookNest 后端接入 BullMQ。

要求：
1. 创建 queue.ts，导出 orderQueue、importQueue、queueConnection
2. 创建 src/workers/index.ts，启动 order worker 和 import worker
3. order worker 处理 expire-order job
4. import worker 处理 book-import job
5. package.json 增加 worker:dev 和 dev:all 脚本
6. 使用 Redis 环境变量 REDIS_HOST / REDIS_PORT / REDIS_PASSWORD
```

### 支付回调幂等

```txt
帮我实现模拟支付回调处理：

输入：payload + signature
payload 包含 eventId、orderNo、amountCents、paidAt、status

要求：
1. 用 HMAC-SHA256 校验签名
2. PaymentEvent.eventId 唯一，重复 eventId 直接返回 idempotent=true
3. 使用 Prisma $transaction
4. 订单必须是 PENDING 才能支付
5. 订单过期不能支付
6. Activity registeredCount < capacity 才能 +1
7. 创建 Ticket，且 Ticket.orderId 唯一
8. 写 AuditLog
```

### CSV 导入

```txt
帮我实现 CSV 异步导入书籍功能：

1. POST /api/v1/imports/books 上传 CSV 文件，字段 title、author、status、pageCount、description
2. 接口立即创建 ImportJob 并返回 jobId
3. BullMQ worker 后台解析 CSV
4. 每处理一行更新 ImportJob.processed、successCount、failedCount
5. GET /api/v1/imports/:jobId 返回进度
6. 前端页面上传 CSV 后每秒轮询进度
```

---

## Day 11 每日回顾

1. 什么是幂等？为什么支付回调必须幂等？
2. 为什么订单状态不能随意跳转？
3. 为什么要把 CSV 导入放到后台任务，而不是 HTTP 请求里同步处理？
4. `updateMany({ registeredCount: { lt: capacity } })` 为什么能帮助防超卖？
5. 如果 worker 挂了，系统会出现什么现象？你会怎么排查？

---

# 阶段总验收

完成 Day 8-11 后，整个阶段需要达到以下标准：

## 工程化

- [ ] 前后端都有 lint / format 检查。
- [ ] OpenAPI 文档可访问。
- [ ] 前端 API 类型可以从 OpenAPI 生成。
- [ ] `ARCHITECTURE.md` 可帮助新人理解系统。

## 测试

- [ ] Playwright E2E 至少覆盖登录、书籍 CRUD、评论、上传、权限。
- [ ] CI 中能运行 E2E。
- [ ] 失败时有 trace / screenshot / report。

## 多租户

- [ ] 用户可以创建和切换 Workspace。
- [ ] 所有 Book / Category 数据按 Workspace 隔离。
- [ ] RBAC 权限矩阵生效。
- [ ] 成员邀请和审计日志可用。

## 真实业务复杂度

- [ ] 活动报名订单链路完整。
- [ ] 模拟支付回调可用。
- [ ] 重复回调幂等。
- [ ] 订单过期任务可用。
- [ ] CSV 异步导入可用。
- [ ] 并发报名不会超卖。

## 最终演示路径

演示时按这个顺序：

1. 登录 BookNest。
2. 创建一个新的 Workspace。
3. 邀请一个成员。
4. 切换 Workspace。
5. 创建书籍。
6. 查看 AuditLog。
7. 跑一条 Playwright E2E。
8. 打开 `/api-docs` 展示 OpenAPI。
9. 创建读书会活动。
10. 报名并模拟支付。
11. 重复调用支付回调，证明不会重复出票。
12. 上传 CSV 导入书籍，展示任务进度。
13. 运行并发测试，证明活动不会超卖。

---

# 本阶段最终项目结构新增内容

```txt
booknest/
├── ARCHITECTURE.md
├── .github/workflows/
│   ├── deploy.yml
│   └── e2e.yml
├── backend/
│   ├── generated/
│   │   └── openapi.json
│   ├── scripts/
│   │   ├── generate-openapi.ts
│   │   ├── backfill-workspaces.ts
│   │   └── test-concurrency.ts
│   ├── src/
│   │   ├── schemas/
│   │   │   ├── common.schema.ts
│   │   │   ├── auth.schema.ts
│   │   │   ├── book.schema.ts
│   │   │   ├── workspace.schema.ts
│   │   │   └── activity.schema.ts
│   │   ├── middleware/
│   │   │   ├── zodValidate.ts
│   │   │   └── workspace.ts
│   │   ├── services/
│   │   │   ├── workspace.service.ts
│   │   │   ├── audit.service.ts
│   │   │   ├── activity.service.ts
│   │   │   ├── order.service.ts
│   │   │   ├── payment.service.ts
│   │   │   └── import.service.ts
│   │   ├── routes/
│   │   │   ├── workspace.routes.ts
│   │   │   ├── activity.routes.ts
│   │   │   ├── order.routes.ts
│   │   │   ├── payment.routes.ts
│   │   │   └── import.routes.ts
│   │   ├── workers/
│   │   │   ├── index.ts
│   │   │   ├── order.worker.ts
│   │   │   └── import.worker.ts
│   │   └── lib/
│   │       ├── openapi.ts
│   │       ├── queue.ts
│   │       └── mockPayment.ts
│   └── tests/
│       └── integration/
│           ├── workspace-permission.test.ts
│           ├── payment.test.ts
│           └── import.test.ts
└── frontend/
    ├── playwright.config.ts
    ├── e2e/
    │   ├── auth.spec.ts
    │   ├── book-crud.spec.ts
    │   ├── review.spec.ts
    │   ├── upload.spec.ts
    │   ├── permission.spec.ts
    │   └── helpers/
    └── src/
        ├── stores/
        │   └── useWorkspaceStore.ts
        ├── hooks/
        │   ├── useWorkspaces.ts
        │   └── useActivities.ts
        ├── components/
        │   └── WorkspaceSwitcher.tsx
        ├── pages/
        │   ├── WorkspaceMembers.tsx
        │   ├── AuditLogs.tsx
        │   ├── Activities.tsx
        │   └── DataTools.tsx
        └── types/
            └── api.generated.ts
```

---

# 阶段结束复盘问题

1. 你现在能不能画出 BookNest 的完整架构图？
2. 如果后端新增字段，前端如何第一时间发现类型不匹配？
3. 如果某次发布破坏了登录流程，E2E 能不能挡住？
4. 如果用户 A 试图访问用户 B 的 Workspace，后端哪一层会拦截？
5. 如果支付平台重复推送 3 次回调，为什么不会重复出票？
6. 如果 50 个人同时抢 10 个活动名额，为什么不会超卖？
7. 如果 CSV 有 10000 行，为什么不能同步导入？
8. 如果 worker 挂了，如何从日志、健康检查、BullMQ 状态定位问题？

---

# 下一阶段建议

完成本阶段后，建议进入：

1. **微信小程序阶段**：多端登录、小程序 UI、微信登录、分享、订阅消息、支付或模拟支付。
2. **RAG + AI 阶段**：文档上传、切分、embedding、向量检索、引用回答、RAG 评测、AI 安全。
3. **Next.js / SSR 阶段**：公开页面、SEO、BFF、服务端渲染、缓存策略。

本阶段的价值在于：你已经不只是会做 CRUD，而是开始接触真实业务系统的核心复杂度：工程质量、测试回归、团队权限、交易状态、异步任务、数据一致性。
