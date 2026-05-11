import { Request, Response, NextFunction } from 'express'
import { ResponseUtil } from '../utils/response'
import { workspaceService } from '../services/workspace.service'

export const workspaceController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const workspaces = await workspaceService.list(req.user!.id)
      ResponseUtil.success(res, workspaces)
    } catch (err) {
      next(err)
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const workspace = await workspaceService.create(req.user!.id, req.body)
      ResponseUtil.success(res, workspace, 'Workspace 创建成功', 201)
    } catch (err) {
      next(err)
    }
  },

  async members(req: Request, res: Response, next: NextFunction) {
    try {
      const members = await workspaceService.listMembers(req.workspace!.id)
      ResponseUtil.success(res, members)
    } catch (err) {
      next(err)
    }
  },

  async invite(req: Request, res: Response, next: NextFunction) {
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
  },

  async acceptInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const member = await workspaceService.acceptInvitation(req.user!.id, req.params.token as string)
      ResponseUtil.success(res, member, '已接受邀请')
    } catch (err) {
      next(err)
    }
  },

  async updateMemberRole(req: Request, res: Response, next: NextFunction) {
    try {
      const member = await workspaceService.updateMemberRole(
        req.workspace!.id,
        req.user!.id,
        req.params.memberId as string,
        req.body.role,
      )
      ResponseUtil.success(res, member, '角色已更新')
    } catch (err) {
      next(err)
    }
  },
}
