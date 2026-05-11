import { NextFunction, Request, Response } from 'express'
import { WorkspaceRole } from '@/generated/prisma/enums'
import prisma from '../lib/prisma'
import { ApiError } from '../utils/errors'

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

    if (roleWeight[req.workspace.role as WorkspaceRole] < roleWeight[minRole]) {
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
