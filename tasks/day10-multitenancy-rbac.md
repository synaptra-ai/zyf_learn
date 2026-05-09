# Day 10：多租户 SaaS — Workspace / RBAC / Invitation / AuditLog

> BookNest 第二阶段：工程化与真实业务复杂度训练。
> 本阶段承接 Day 1-7 的完整全栈应用：继续使用 React + TypeScript + Tailwind + React Query 前端、Express + Prisma + PostgreSQL 后端、Redis / OSS / Socket.IO、Docker Compose 与 GitHub Actions。
> 这一版为独立单日任务文档，每一天都可以单独发给学员执行。

## 本阶段统一项目约定

| 项目 | 约定 |
|---|---|
| Repo 根目录 | `booknest/` |
| 前端目录 | `booknest/frontend` |
| 后端目录 | `booknest/backend` |
| 前端端口 | `http://localhost:4001` |
| 后端端口 | `http://localhost:4000` |
| PostgreSQL | `localhost:5433` |
| Redis | `localhost:6379` |
| API 前缀 | `/api/v1` |

## 开始前检查

- [ ] Day 1-7 的 BookNest 项目可以本地启动。
- [ ] `cd backend && npm run dev` 正常。
- [ ] `cd frontend && npm run dev` 正常。
- [ ] 登录、书籍 CRUD、评论、上传、Redis、健康检查功能可用。
- [ ] 当前分支干净：`git status` 没有未提交的重要改动。

建议当天开始前新建分支，例如：

```bash
git checkout -b feat/day10-multitenancy-rbac
```

---

## 项目简介

目前 BookNest 是“一个用户管理自己的书”。真实 SaaS 系统通常是“一个团队、多名成员、不同角色、共享资源”。今天要把 BookNest 升级为团队书架：用户可以创建多个 Workspace，邀请成员，不同角色拥有不同权限，所有关键操作写入审计日志。

**今天的目标**：完成一个可运行的多租户 RBAC 系统，并让前端支持 Workspace 切换和成员管理。

---

## 学习目标

完成今天后，你将掌握：

1. 多租户数据模型设计。
2. RBAC 角色权限矩阵。
3. Workspace 级数据隔离。
4. 邀请成员的 token 流程。
5. 审计日志 AuditLog 的价值和实现。
6. 前端如何根据权限显示 / 隐藏功能。
7. 后端如何防止前端绕过权限。
8. 如何写权限测试。

---

## 技术栈

| 技术 | 用途 |
|---|---|
| Prisma | 多租户模型和迁移 |
| PostgreSQL | Workspace / Member / AuditLog 存储 |
| Express middleware | workspace 解析和 RBAC 权限校验 |
| React Query | workspace、member、audit log 数据获取 |
| Zustand | activeWorkspaceId 本地状态 |
| Zod | workspace 相关请求校验 |

---

## 权限矩阵

| 操作 | OWNER | ADMIN | MEMBER | VIEWER |
|---|---:|---:|---:|---:|
| 查看书籍 | ✅ | ✅ | ✅ | ✅ |
| 创建书籍 | ✅ | ✅ | ✅ | ❌ |
| 编辑任意书籍 | ✅ | ✅ | ❌ | ❌ |
| 编辑自己的书籍 | ✅ | ✅ | ✅ | ❌ |
| 删除任意书籍 | ✅ | ✅ | ❌ | ❌ |
| 管理分类 | ✅ | ✅ | ✅ | ❌ |
| 邀请成员 | ✅ | ✅ | ❌ | ❌ |
| 修改成员角色 | ✅ | ❌ | ❌ | ❌ |
| 移除成员 | ✅ | ❌ | ❌ | ❌ |
| 查看审计日志 | ✅ | ✅ | ❌ | ❌ |
| 删除 Workspace | ✅ | ❌ | ❌ | ❌ |

---

## 功能清单

### Must-Have

| # | 功能 | 说明 |
|---|---|---|
| 1 | Prisma 多租户模型 | Workspace / WorkspaceMember / Invitation / AuditLog |
| 2 | 默认 Workspace 迁移 | 给已有用户和书籍创建默认团队 |
| 3 | Workspace API | 创建、列表、详情、切换上下文 |
| 4 | RBAC 中间件 | requireWorkspaceRole / requirePermission |
| 5 | Book 数据隔离 | 所有书籍按 workspaceId 隔离 |
| 6 | 成员邀请 | 创建邀请、接受邀请、成员列表 |
| 7 | 审计日志 | 创建书籍、删除书籍、邀请成员等写日志 |
| 8 | 前端 WorkspaceSwitcher | 顶部切换当前 Workspace |
| 9 | 成员管理页 | 邀请、查看成员、修改角色 |
| 10 | 权限测试 | 角色权限矩阵自动化测试 |

### Nice-to-Have

| # | 功能 | 说明 |
|---|---|---|
| 11 | 邀请过期时间 | 7 天后失效 |
| 12 | 转让 OWNER | owner 转让团队所有权 |
| 13 | 审计日志筛选 | 按 action / user / 时间筛选 |
| 14 | 前端权限 hook | `useCan(permission)` |

---

## Step 1：修改 Prisma Schema

路径：`backend/prisma/schema.prisma`

### 1.1 新增枚举

```prisma
enum WorkspaceRole {
  OWNER
  ADMIN
  MEMBER
  VIEWER
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  EXPIRED
  REVOKED
}
```

### 1.2 新增模型

```prisma
model Workspace {
  id          String   @id @default(uuid())
  name        String   @db.VarChar(100)
  description String?  @db.Text
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  members     WorkspaceMember[]
  invitations Invitation[]
  auditLogs   AuditLog[]
  books       Book[]
  categories  Category[]

  @@map("workspaces")
}

model WorkspaceMember {
  id          String        @id @default(uuid())
  role        WorkspaceRole @default(MEMBER)
  joinedAt    DateTime      @default(now()) @map("joined_at")

  workspaceId String    @map("workspace_id")
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  userId      String @map("user_id")
  user        User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([workspaceId, userId])
  @@index([userId])
  @@map("workspace_members")
}

model Invitation {
  id          String           @id @default(uuid())
  email       String           @db.VarChar(255)
  role        WorkspaceRole    @default(MEMBER)
  token       String           @unique
  status      InvitationStatus @default(PENDING)
  expiresAt   DateTime         @map("expires_at")
  createdAt   DateTime         @default(now()) @map("created_at")
  acceptedAt  DateTime?        @map("accepted_at")

  workspaceId String    @map("workspace_id")
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  invitedById String @map("invited_by_id")
  invitedBy   User   @relation("InvitedBy", fields: [invitedById], references: [id], onDelete: Cascade)

  @@index([workspaceId])
  @@index([email])
  @@map("invitations")
}

model AuditLog {
  id          String   @id @default(uuid())
  action      String   @db.VarChar(100)
  entityType  String   @map("entity_type") @db.VarChar(50)
  entityId    String?  @map("entity_id")
  metadata    Json?
  createdAt   DateTime @default(now()) @map("created_at")

  workspaceId String    @map("workspace_id")
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  actorId     String @map("actor_id")
  actor       User   @relation(fields: [actorId], references: [id], onDelete: Cascade)

  @@index([workspaceId, createdAt])
  @@index([actorId])
  @@map("audit_logs")
}
```

### 1.3 修改 User 模型

```prisma
model User {
  id           String     @id @default(uuid())
  email        String     @unique
  passwordHash String     @map("password_hash")
  name         String
  role         UserRole   @default(USER)
  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt @map("updated_at")

  books       Book[]
  categories  Category[]
  reviews     Review[]
  memberships WorkspaceMember[]
  invitationsSent Invitation[] @relation("InvitedBy")
  auditLogs   AuditLog[]

  @@map("users")
}
```

### 1.4 修改 Book 模型

给 Book 增加 `workspaceId`：

```prisma
model Book {
  id            String     @id @default(uuid())
  title         String     @db.VarChar(200)
  author        String     @db.VarChar(100)
  isbn          String?    @db.VarChar(13)
  publishedDate DateTime?  @map("published_date")
  pageCount     Int?       @map("page_count")
  description   String?    @db.Text
  coverUrl      String?    @map("cover_url")
  status        BookStatus @default(WISHLIST)
  createdAt     DateTime   @default(now()) @map("created_at")
  updatedAt     DateTime   @updatedAt @map("updated_at")

  userId     String @map("user_id")
  user       User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  workspaceId String    @map("workspace_id")
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  categoryId String?    @map("category_id")
  category   Category?  @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  reviews    Review[]

  @@index([workspaceId, status])
  @@index([workspaceId, createdAt])
  @@index([workspaceId, categoryId])
  @@map("books")
}
```

### 1.5 修改 Category 模型

```prisma
model Category {
  id        String   @id @default(uuid())
  name      String   @db.VarChar(50)
  color     String   @db.VarChar(7)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  userId String @map("user_id")
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  workspaceId String    @map("workspace_id")
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  books  Book[]

  @@unique([workspaceId, name])
  @@index([workspaceId])
  @@map("categories")
}
```

---

## Step 2：迁移已有数据到默认 Workspace

由于 Book / Category 新增了必填 `workspaceId`，直接迁移可能失败。推荐分两步：

1. 先把 `workspaceId` 设为可选。
2. 运行迁移和 backfill 脚本。
3. 再把 `workspaceId` 改成必填。

为了学习阶段简单，可以重置本地数据库：

```bash
cd backend
npx prisma migrate dev --name add_workspace_models
```

如果你希望保留已有数据，创建 backfill 脚本。

路径：`backend/scripts/backfill-workspaces.ts`

```ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany()

  for (const user of users) {
    const workspace = await prisma.workspace.create({
      data: {
        name: `${user.name} 的个人书架`,
        description: '系统自动创建的默认 Workspace',
        members: {
          create: {
            userId: user.id,
            role: 'OWNER',
          },
        },
      },
    })

    await prisma.book.updateMany({
      where: { userId: user.id, workspaceId: null as any },
      data: { workspaceId: workspace.id },
    })

    await prisma.category.updateMany({
      where: { userId: user.id, workspaceId: null as any },
      data: { workspaceId: workspace.id },
    })
  }

  console.log('Workspace backfill completed')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

脚本：

```json
{
  "scripts": {
    "workspace:backfill": "tsx scripts/backfill-workspaces.ts"
  }
}
```

---

## Step 2.5：修改注册流程，自动创建默认 Workspace

新增用户注册后，必须立刻拥有一个默认 Workspace，否则前端登录后没有可切换的团队。

路径：`backend/src/services/auth.service.ts`

把注册逻辑改为事务：

```ts
export async function register(email: string, password: string, name: string) {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw new ApiError(409, '邮箱已注册')

  const passwordHash = await bcrypt.hash(password, 10)

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: { email, passwordHash, name },
    })

    await tx.workspace.create({
      data: {
        name: `${name} 的个人书架`,
        description: '默认 Workspace',
        members: {
          create: {
            userId: createdUser.id,
            role: 'OWNER',
          },
        },
      },
    })

    return createdUser
  })

  const token = signToken(user)
  return { token, user: sanitizeUser(user) }
}
```

如果你的 `signToken` / `sanitizeUser` 函数名称不同，保留原来的函数名即可。关键点是：**创建 User 和默认 Workspace 必须在同一个事务里完成**。

---

## Step 3：扩展 Express Request 类型

路径：`backend/src/types/express.d.ts`

```ts
import { WorkspaceRole } from '@prisma/client'

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
      }
      workspace?: {
        id: string
        role: WorkspaceRole
      }
    }
  }
}
```

---

## Step 4：创建 Workspace schema

路径：`backend/src/schemas/workspace.schema.ts`

```ts
import { z } from 'zod'

export const workspaceRoleSchema = z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'])

export const createWorkspaceBodySchema = z.object({
  name: z.string().min(1, 'Workspace 名称不能为空').max(100),
  description: z.string().max(1000).optional(),
})

export const inviteMemberBodySchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  role: workspaceRoleSchema.default('MEMBER'),
})

export const updateMemberRoleBodySchema = z.object({
  role: workspaceRoleSchema,
})
```

---

## Step 5：创建 Workspace 权限中间件

路径：`backend/src/middleware/workspace.ts`

```ts
import { NextFunction, Request, Response } from 'express'
import { WorkspaceRole } from '@prisma/client'
import prisma from '@/lib/prisma'
import { ApiError } from '@/utils/errors'

const roleWeight: Record<WorkspaceRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  MEMBER: 2,
  VIEWER: 1,
}

export async function resolveWorkspace(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw new ApiError(401, '未登录')

    const workspaceId = req.header('X-Workspace-Id')
    if (!workspaceId) throw new ApiError(400, '缺少 X-Workspace-Id')

    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: req.user.id,
        },
      },
    })

    if (!member) throw new ApiError(403, '无权访问该 Workspace')

    req.workspace = {
      id: workspaceId,
      role: member.role,
    }

    next()
  } catch (err) {
    next(err)
  }
}

export function requireWorkspaceRole(minRole: WorkspaceRole) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.workspace) return next(new ApiError(400, 'Workspace 未解析'))

    if (roleWeight[req.workspace.role] < roleWeight[minRole]) {
      return next(new ApiError(403, '权限不足'))
    }

    next()
  }
}

export function canEditOwnResource(req: Request, ownerId: string) {
  if (!req.user || !req.workspace) return false
  if (['OWNER', 'ADMIN'].includes(req.workspace.role)) return true
  if (req.workspace.role === 'MEMBER' && req.user.id === ownerId) return true
  return false
}
```

---

## Step 6：创建 AuditLog service

路径：`backend/src/services/audit.service.ts`

```ts
import prisma from '@/lib/prisma'

interface AuditParams {
  workspaceId: string
  actorId: string
  action: string
  entityType: string
  entityId?: string
  metadata?: Record<string, unknown>
}

export async function writeAuditLog(params: AuditParams) {
  return prisma.auditLog.create({
    data: {
      workspaceId: params.workspaceId,
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata || {},
    },
  })
}
```

---

## Step 7：实现 Workspace service

路径：`backend/src/services/workspace.service.ts`

```ts
import crypto from 'crypto'
import { WorkspaceRole } from '@prisma/client'
import prisma from '@/lib/prisma'
import { ApiError } from '@/utils/errors'
import { writeAuditLog } from './audit.service'

export async function listWorkspaces(userId: string) {
  return prisma.workspace.findMany({
    where: {
      members: {
        some: { userId },
      },
    },
    include: {
      members: {
        where: { userId },
        select: { role: true },
      },
      _count: {
        select: { members: true, books: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  })
}

export async function createWorkspace(userId: string, data: { name: string; description?: string }) {
  const workspace = await prisma.workspace.create({
    data: {
      name: data.name,
      description: data.description,
      members: {
        create: {
          userId,
          role: 'OWNER',
        },
      },
    },
  })

  await writeAuditLog({
    workspaceId: workspace.id,
    actorId: userId,
    action: 'workspace.created',
    entityType: 'Workspace',
    entityId: workspace.id,
    metadata: { name: workspace.name },
  })

  return workspace
}

export async function listMembers(workspaceId: string) {
  return prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: { id: true, email: true, name: true, createdAt: true },
      },
    },
    orderBy: { joinedAt: 'asc' },
  })
}

export async function inviteMember(
  workspaceId: string,
  actorId: string,
  data: { email: string; role: WorkspaceRole },
) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const invitation = await prisma.invitation.create({
    data: {
      workspaceId,
      invitedById: actorId,
      email: data.email,
      role: data.role,
      token,
      expiresAt,
    },
  })

  await writeAuditLog({
    workspaceId,
    actorId,
    action: 'member.invited',
    entityType: 'Invitation',
    entityId: invitation.id,
    metadata: { email: data.email, role: data.role },
  })

  return invitation
}

export async function acceptInvitation(userId: string, token: string) {
  const invitation = await prisma.invitation.findUnique({ where: { token } })

  if (!invitation) throw new ApiError(404, '邀请不存在')
  if (invitation.status !== 'PENDING') throw new ApiError(400, '邀请不可用')
  if (invitation.expiresAt < new Date()) throw new ApiError(400, '邀请已过期')

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new ApiError(404, '用户不存在')
  if (user.email !== invitation.email) throw new ApiError(403, '该邀请不属于当前用户')

  return prisma.$transaction(async (tx) => {
    const member = await tx.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: invitation.workspaceId,
          userId,
        },
      },
      update: { role: invitation.role },
      create: {
        workspaceId: invitation.workspaceId,
        userId,
        role: invitation.role,
      },
    })

    await tx.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
    })

    await tx.auditLog.create({
      data: {
        workspaceId: invitation.workspaceId,
        actorId: userId,
        action: 'member.joined',
        entityType: 'WorkspaceMember',
        entityId: member.id,
        metadata: { invitationId: invitation.id },
      },
    })

    return member
  })
}

export async function updateMemberRole(
  workspaceId: string,
  actorId: string,
  memberId: string,
  role: WorkspaceRole,
) {
  const member = await prisma.workspaceMember.findFirst({
    where: { id: memberId, workspaceId },
  })

  if (!member) throw new ApiError(404, '成员不存在')
  if (member.role === 'OWNER') throw new ApiError(400, '不能直接修改 OWNER 角色')

  const updated = await prisma.workspaceMember.update({
    where: { id: memberId },
    data: { role },
  })

  await writeAuditLog({
    workspaceId,
    actorId,
    action: 'member.role_updated',
    entityType: 'WorkspaceMember',
    entityId: memberId,
    metadata: { from: member.role, to: role },
  })

  return updated
}
```

---

## Step 8：创建 Workspace controller 和 routes

### 8.1 Controller

路径：`backend/src/controllers/workspace.controller.ts`

```ts
import { Request, Response, NextFunction } from 'express'
import { ResponseUtil } from '@/utils/response'
import * as workspaceService from '@/services/workspace.service'

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaces = await workspaceService.listWorkspaces(req.user!.id)
    ResponseUtil.success(res, workspaces)
  } catch (err) {
    next(err)
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const workspace = await workspaceService.createWorkspace(req.user!.id, req.body)
    ResponseUtil.success(res, workspace, 'Workspace 创建成功', 201)
  } catch (err) {
    next(err)
  }
}

export async function members(req: Request, res: Response, next: NextFunction) {
  try {
    const members = await workspaceService.listMembers(req.workspace!.id)
    ResponseUtil.success(res, members)
  } catch (err) {
    next(err)
  }
}

export async function invite(req: Request, res: Response, next: NextFunction) {
  try {
    const invitation = await workspaceService.inviteMember(
      req.workspace!.id,
      req.user!.id,
      req.body,
    )
    ResponseUtil.success(res, invitation, '邀请已创建', 201)
  } catch (err) {
    next(err)
  }
}

export async function acceptInvitation(req: Request, res: Response, next: NextFunction) {
  try {
    const member = await workspaceService.acceptInvitation(req.user!.id, req.params.token)
    ResponseUtil.success(res, member, '已接受邀请')
  } catch (err) {
    next(err)
  }
}

export async function updateMemberRole(req: Request, res: Response, next: NextFunction) {
  try {
    const member = await workspaceService.updateMemberRole(
      req.workspace!.id,
      req.user!.id,
      req.params.memberId,
      req.body.role,
    )
    ResponseUtil.success(res, member, '角色已更新')
  } catch (err) {
    next(err)
  }
}
```

### 8.2 Routes

路径：`backend/src/routes/workspace.routes.ts`

```ts
import { Router } from 'express'
import { authenticate } from '@/middleware/auth'
import { resolveWorkspace, requireWorkspaceRole } from '@/middleware/workspace'
import { validateBody } from '@/middleware/zodValidate'
import {
  createWorkspaceBodySchema,
  inviteMemberBodySchema,
  updateMemberRoleBodySchema,
} from '@/schemas/workspace.schema'
import * as workspaceController from '@/controllers/workspace.controller'

const router = Router()

router.use(authenticate)

router.get('/', workspaceController.list)
router.post('/', validateBody(createWorkspaceBodySchema), workspaceController.create)

router.post('/invitations/:token/accept', workspaceController.acceptInvitation)

router.get(
  '/current/members',
  resolveWorkspace,
  requireWorkspaceRole('ADMIN'),
  workspaceController.members,
)

router.post(
  '/current/invitations',
  resolveWorkspace,
  requireWorkspaceRole('ADMIN'),
  validateBody(inviteMemberBodySchema),
  workspaceController.invite,
)

router.put(
  '/current/members/:memberId/role',
  resolveWorkspace,
  requireWorkspaceRole('OWNER'),
  validateBody(updateMemberRoleBodySchema),
  workspaceController.updateMemberRole,
)

export default router
```

### 8.3 注册路由

路径：`backend/src/routes/index.ts`

```ts
import workspaceRoutes from './workspace.routes'

router.use('/workspaces', workspaceRoutes)
```

---

## Step 9：改造 Book service，按 Workspace 隔离

核心原则：所有 Book 查询必须带 `workspaceId`。

路径：`backend/src/services/book.service.ts`

### 9.1 list

```ts
export async function list(workspaceId: string, params: ListParams) {
  const { page = 1, pageSize = 10, status, categoryId, search } = params

  const where = {
    workspaceId,
    ...(status && { status }),
    ...(categoryId && { categoryId }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' as const } },
        { author: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [items, total] = await Promise.all([
    prisma.book.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        category: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.book.count({ where }),
  ])

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}
```

### 9.2 getById

```ts
export async function getById(workspaceId: string, bookId: string) {
  const book = await prisma.book.findFirst({
    where: { id: bookId, workspaceId },
    include: {
      category: true,
      reviews: true,
      user: { select: { id: true, name: true, email: true } },
    },
  })

  if (!book) throw new ApiError(404, '书籍不存在')
  return book
}
```

### 9.3 create

```ts
export async function create(userId: string, workspaceId: string, data: CreateBookDTO) {
  const book = await prisma.book.create({
    data: {
      ...data,
      userId,
      workspaceId,
    },
  })

  await writeAuditLog({
    workspaceId,
    actorId: userId,
    action: 'book.created',
    entityType: 'Book',
    entityId: book.id,
    metadata: { title: book.title },
  })

  await invalidateBookCache(workspaceId)
  return book
}
```

### 9.4 update 权限判断

```ts
export async function update(
  userId: string,
  workspaceId: string,
  role: WorkspaceRole,
  bookId: string,
  data: UpdateBookDTO,
) {
  const book = await prisma.book.findFirst({ where: { id: bookId, workspaceId } })
  if (!book) throw new ApiError(404, '书籍不存在')

  const canEdit = ['OWNER', 'ADMIN'].includes(role) || (role === 'MEMBER' && book.userId === userId)
  if (!canEdit) throw new ApiError(403, '无权编辑该书籍')

  const updated = await prisma.book.update({
    where: { id: bookId },
    data,
  })

  await writeAuditLog({
    workspaceId,
    actorId: userId,
    action: 'book.updated',
    entityType: 'Book',
    entityId: bookId,
    metadata: { changes: data },
  })

  await invalidateBookCache(workspaceId)
  return updated
}
```

---

## Step 10：给 Book 路由加 Workspace 中间件

路径：`backend/src/routes/book.routes.ts`

```ts
router.use(authenticate)
router.use(resolveWorkspace)

router.get('/', validateQuery(listBooksQuerySchema), bookController.list)
router.get('/:id', bookController.getById)
router.post('/', requireWorkspaceRole('MEMBER'), validateBody(createBookBodySchema), bookController.create)
router.put('/:id', requireWorkspaceRole('MEMBER'), validateBody(updateBookBodySchema), bookController.update)
router.delete('/:id', requireWorkspaceRole('ADMIN'), bookController.remove)
```

Controller 中调用 service 时传入 workspace：

```ts
const result = await bookService.list(req.workspace!.id, req.query as any)
```

```ts
const book = await bookService.create(req.user!.id, req.workspace!.id, req.body)
```

```ts
const book = await bookService.update(
  req.user!.id,
  req.workspace!.id,
  req.workspace!.role,
  req.params.id,
  req.body,
)
```

---

## Step 11：前端增加 active workspace store

路径：`frontend/src/stores/useWorkspaceStore.ts`

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WorkspaceState {
  activeWorkspaceId: string | null
  setActiveWorkspaceId: (id: string) => void
  clearActiveWorkspaceId: () => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      activeWorkspaceId: null,
      setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),
      clearActiveWorkspaceId: () => set({ activeWorkspaceId: null }),
    }),
    { name: 'booknest-workspace' },
  ),
)
```

---

## Step 12：Axios 请求自动带 Workspace header

路径：`frontend/src/lib/api-client.ts`

```ts
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  const workspaceId = useWorkspaceStore.getState().activeWorkspaceId
  if (workspaceId) {
    config.headers['X-Workspace-Id'] = workspaceId
  }

  return config
})
```

---

## Step 13：React Query hooks for workspace

路径：`frontend/src/hooks/useWorkspaces.ts`

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'

export const workspaceKeys = {
  all: ['workspaces'] as const,
  list: () => [...workspaceKeys.all, 'list'] as const,
  members: (workspaceId: string) => [...workspaceKeys.all, workspaceId, 'members'] as const,
}

export function useWorkspaces() {
  return useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: async () => {
      const { data } = await apiClient.get('/workspaces')
      return data
    },
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: { name: string; description?: string }) => {
      const { data } = await apiClient.post('/workspaces', body)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceKeys.list() }),
  })
}

export function useWorkspaceMembers(workspaceId: string | null) {
  return useQuery({
    queryKey: workspaceKeys.members(workspaceId || ''),
    queryFn: async () => {
      const { data } = await apiClient.get('/workspaces/current/members')
      return data
    },
    enabled: !!workspaceId,
  })
}

export function useInviteMember() {
  const queryClient = useQueryClient()
  const { activeWorkspaceId } = useWorkspaceStore()

  return useMutation({
    mutationFn: async (body: { email: string; role: string }) => {
      const { data } = await apiClient.post('/workspaces/current/invitations', body)
      return data
    },
    onSuccess: () => {
      if (activeWorkspaceId) {
        queryClient.invalidateQueries({ queryKey: workspaceKeys.members(activeWorkspaceId) })
      }
    },
  })
}
```

---

## Step 14：实现 WorkspaceSwitcher

路径：`frontend/src/components/WorkspaceSwitcher.tsx`

```tsx
import { useEffect } from 'react'
import { useWorkspaces } from '@/hooks/useWorkspaces'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'

export function WorkspaceSwitcher() {
  const { data: workspaces = [], isLoading } = useWorkspaces()
  const { activeWorkspaceId, setActiveWorkspaceId } = useWorkspaceStore()

  useEffect(() => {
    if (!activeWorkspaceId && workspaces.length > 0) {
      setActiveWorkspaceId(workspaces[0].id)
    }
  }, [activeWorkspaceId, workspaces, setActiveWorkspaceId])

  if (isLoading) return <div className="text-sm text-gray-500">加载团队...</div>

  return (
    <select
      data-testid="workspace-switcher"
      value={activeWorkspaceId || ''}
      onChange={(e) => setActiveWorkspaceId(e.target.value)}
      className="rounded-md border px-3 py-2 text-sm dark:bg-gray-800"
    >
      {workspaces.map((workspace: any) => (
        <option key={workspace.id} value={workspace.id}>
          {workspace.name}
        </option>
      ))}
    </select>
  )
}
```

在 `Layout.tsx` 顶部导航中加入：

```tsx
<WorkspaceSwitcher />
```

---

## Step 15：更新 Query Key，按 Workspace 隔离缓存

路径：`frontend/src/hooks/query-keys.ts`

```ts
export const bookKeys = {
  all: ['books'] as const,
  workspace: (workspaceId: string | null) => [...bookKeys.all, workspaceId] as const,
  lists: (workspaceId: string | null) => [...bookKeys.workspace(workspaceId), 'list'] as const,
  list: (workspaceId: string | null, filters: BookFilters) =>
    [...bookKeys.lists(workspaceId), filters] as const,
  details: (workspaceId: string | null) => [...bookKeys.workspace(workspaceId), 'detail'] as const,
  detail: (workspaceId: string | null, id: string) => [...bookKeys.details(workspaceId), id] as const,
}
```

在 `useBooks` 中读取 activeWorkspaceId：

```ts
const { activeWorkspaceId } = useWorkspaceStore()

return useQuery({
  queryKey: bookKeys.list(activeWorkspaceId, filters),
  queryFn: async () => {
    const { data } = await apiClient.get('/books', { params: filters })
    return data
  },
  enabled: !!activeWorkspaceId,
})
```

---

## Step 16：成员管理页面

路径：`frontend/src/pages/WorkspaceMembers.tsx`

```tsx
import { useWorkspaceMembers, useInviteMember } from '@/hooks/useWorkspaces'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { useForm } from 'react-hook-form'

export function WorkspaceMembers() {
  const { activeWorkspaceId } = useWorkspaceStore()
  const { data: members = [], isLoading } = useWorkspaceMembers(activeWorkspaceId)
  const inviteMember = useInviteMember()
  const { register, handleSubmit, reset } = useForm({
    defaultValues: { email: '', role: 'MEMBER' },
  })

  const onSubmit = (data: any) => {
    inviteMember.mutate(data, {
      onSuccess: () => reset(),
    })
  }

  if (!activeWorkspaceId) return <div>请先选择 Workspace</div>
  if (isLoading) return <div>加载成员...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">成员管理</h1>
        <p className="text-gray-500">邀请成员加入当前 Workspace</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex gap-2">
        <input
          data-testid="invite-email"
          {...register('email')}
          placeholder="成员邮箱"
          className="rounded border px-3 py-2"
        />
        <select data-testid="invite-role" {...register('role')} className="rounded border px-3 py-2">
          <option value="ADMIN">ADMIN</option>
          <option value="MEMBER">MEMBER</option>
          <option value="VIEWER">VIEWER</option>
        </select>
        <button data-testid="invite-submit" type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">
          邀请
        </button>
      </form>

      <div className="rounded border">
        {members.map((member: any) => (
          <div key={member.id} className="flex items-center justify-between border-b p-4">
            <div>
              <div className="font-medium">{member.user.name}</div>
              <div className="text-sm text-gray-500">{member.user.email}</div>
            </div>
            <span className="rounded bg-gray-100 px-2 py-1 text-sm">{member.role}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

添加路由：

```tsx
<Route path="workspace/members" element={<WorkspaceMembers />} />
```

---

## Step 17：审计日志接口和页面

### 17.1 后端 service

路径：`backend/src/services/audit.service.ts`

```ts
export async function listAuditLogs(workspaceId: string, params: { page?: number; pageSize?: number }) {
  const page = params.page || 1
  const pageSize = params.pageSize || 20

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: { workspaceId },
      include: {
        actor: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where: { workspaceId } }),
  ])

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}
```

### 17.2 路由

```ts
router.get(
  '/current/audit-logs',
  resolveWorkspace,
  requireWorkspaceRole('ADMIN'),
  auditController.list,
)
```

### 17.3 前端页面

路径：`frontend/src/pages/AuditLogs.tsx`

展示：

- action
- actor.name
- entityType
- entityId
- createdAt
- metadata JSON

---

## Step 18：权限自动化测试

路径：`backend/tests/integration/workspace-permission.test.ts`

核心测试场景：

```ts
describe('Workspace RBAC', () => {
  it('VIEWER 可以查看书籍，但不能创建书籍', async () => {})
  it('MEMBER 可以创建书籍，但不能删除他人的书籍', async () => {})
  it('ADMIN 可以删除任意书籍', async () => {})
  it('只有 OWNER 可以修改成员角色', async () => {})
  it('非成员访问 workspace 返回 403', async () => {})
  it('关键操作会写入 AuditLog', async () => {})
})
```

示例：

```ts
it('VIEWER 不能创建书籍', async () => {
  const res = await request(app)
    .post('/api/v1/books')
    .set('Authorization', `Bearer ${viewerToken}`)
    .set('X-Workspace-Id', workspaceId)
    .send({ title: 'No Permission', author: 'Viewer' })

  expect(res.status).toBe(403)
})
```

---

## Day 10 验收标准 Checklist

- [ ] Prisma 中新增 Workspace / WorkspaceMember / Invitation / AuditLog。
- [ ] 用户注册或 seed 后会有默认 Workspace。
- [ ] `GET /api/v1/workspaces` 返回当前用户加入的 Workspace。
- [ ] 所有 Book API 必须带 `X-Workspace-Id`。
- [ ] 未加入 Workspace 的用户访问返回 403。
- [ ] VIEWER 不能创建、编辑、删除书籍。
- [ ] MEMBER 可以创建书籍，但不能删除他人书籍。
- [ ] ADMIN 可以管理书籍和邀请成员。
- [ ] OWNER 可以修改成员角色。
- [ ] 创建书籍、邀请成员、修改角色会写 AuditLog。
- [ ] 前端顶部可以切换 Workspace。
- [ ] 切换 Workspace 后书籍列表会重新加载。
- [ ] 成员管理页可以创建邀请。
- [ ] 后端至少 6 个 RBAC 测试通过。
- [ ] E2E 中至少有 1 条 Workspace 切换测试。

---

## Day 10 Git Commit 示例

```bash
git commit -m "feat: add workspace and membership models"
git commit -m "feat: add workspace RBAC middleware"
git commit -m "feat: scope book APIs by workspace"
git commit -m "feat: add invitation and member management APIs"
git commit -m "feat: add audit log service"
git commit -m "feat: add frontend workspace switcher"
git commit -m "feat: add workspace members page"
git commit -m "test: add workspace RBAC integration tests"
```

---

## Day 10 Prompt 模板

### Prisma 多租户模型

```txt
帮我给 BookNest 设计多租户 Prisma 模型。

需要：
1. Workspace
2. WorkspaceMember，包含 role：OWNER / ADMIN / MEMBER / VIEWER
3. Invitation，包含 email、role、token、status、expiresAt
4. AuditLog，记录 action、entityType、entityId、metadata、actorId、workspaceId
5. Book 和 Category 增加 workspaceId
6. 同一 workspace 下 category name 唯一
7. 常用字段添加索引
```

### RBAC 中间件

```txt
帮我实现 Express RBAC 中间件：

1. resolveWorkspace：从 Header X-Workspace-Id 读取 workspaceId，检查当前用户是否是成员
2. requireWorkspaceRole(minRole)：检查当前用户角色是否大于等于 minRole
3. 角色权重：OWNER=4，ADMIN=3，MEMBER=2，VIEWER=1
4. 把 { id, role } 写入 req.workspace
5. 权限不足返回 403
```

### 前端 Workspace 切换

```txt
帮我实现前端 WorkspaceSwitcher：

1. 使用 useWorkspaces 获取当前用户加入的 workspace 列表
2. 使用 Zustand 保存 activeWorkspaceId 到 localStorage
3. select 切换后更新 activeWorkspaceId
4. Axios 请求拦截器自动加 Header：X-Workspace-Id
5. React Query 的 bookKeys 要包含 activeWorkspaceId，避免不同 workspace 缓存串数据
```

---

## Day 10 每日回顾

1. 多租户和普通用户隔离有什么区别？
2. 为什么前端隐藏按钮不能代替后端权限校验？
3. 为什么 Book 查询必须始终带 `workspaceId`？
4. AuditLog 对真实业务有什么价值？
5. 如果一个 MEMBER 通过 Postman 调删除接口，系统会怎样拦截？

---
