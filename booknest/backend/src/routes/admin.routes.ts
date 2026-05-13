import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { resolveWorkspace, requireWorkspaceRole } from '../middleware/workspace'
import prisma from '../lib/prisma'
import { writeAuditLog } from '../services/audit.service'
import { ResponseUtil } from '../utils/response'

export const adminRouter = Router()

// 所有 admin 路由需要 ADMIN 及以上权限
adminRouter.use(authenticate, resolveWorkspace, requireWorkspaceRole('ADMIN'))

// 获取风险内容列表
adminRouter.get('/content-security', async (req, res, next) => {
  try {
    const status = req.query.status as string || 'REVIEW'
    const items = await prisma.contentSecurityCheck.findMany({
      where: {
        workspaceId: req.workspace!.id,
        ...(status !== 'ALL' && { status }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    ResponseUtil.success(res, items)
  } catch (error) {
    next(error)
  }
})

// 通过内容
adminRouter.post('/content-security/:id/approve', async (req, res, next) => {
  try {
    const check = await prisma.contentSecurityCheck.findFirst({
      where: { id: req.params.id, workspaceId: req.workspace!.id },
    })
    if (!check) return ResponseUtil.error(res, '记录不存在', 404)

    await prisma.contentSecurityCheck.update({
      where: { id: req.params.id },
      data: { status: 'PASS' },
    })

    await writeAuditLog({
      workspaceId: req.workspace!.id,
      actorId: req.user!.id,
      action: 'content_security.approved',
      entityType: 'ContentSecurityCheck',
      entityId: req.params.id,
      metadata: { targetType: check.targetType, targetId: check.targetId, previousStatus: check.status },
    })

    ResponseUtil.success(res, null, '已通过')
  } catch (error) {
    next(error)
  }
})

// 驳回内容
adminRouter.post('/content-security/:id/reject', async (req, res, next) => {
  try {
    const check = await prisma.contentSecurityCheck.findFirst({
      where: { id: req.params.id, workspaceId: req.workspace!.id },
    })
    if (!check) return ResponseUtil.error(res, '记录不存在', 404)

    await prisma.contentSecurityCheck.update({
      where: { id: req.params.id },
      data: { status: 'REJECT' },
    })

    // 如果是图片，隐藏封面
    if (check.contentType === 'IMAGE' && check.targetType === 'BOOK' && check.targetId) {
      await prisma.book.update({
        where: { id: check.targetId },
        data: { coverUrl: null },
      }).catch(() => {})
    }

    await writeAuditLog({
      workspaceId: req.workspace!.id,
      actorId: req.user!.id,
      action: 'content_security.rejected',
      entityType: 'ContentSecurityCheck',
      entityId: req.params.id,
      metadata: { targetType: check.targetType, targetId: check.targetId, previousStatus: check.status },
    })

    ResponseUtil.success(res, null, '已驳回')
  } catch (error) {
    next(error)
  }
})
