import { Request, Response, NextFunction } from 'express'
import { socialService } from '../services/social.service'
import { ResponseUtil } from '../utils/response'

export const socialController = {
  async getReport(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await socialService.getReport(req.user!.id, req.workspace!.id)
      ResponseUtil.success(res, data)
    } catch (err) {
      next(err)
    }
  },

  async getFeed(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1
      const pageSize = Number(req.query.pageSize) || 20
      const data = await socialService.getFeed(req.workspace!.id, page, pageSize)
      ResponseUtil.success(res, data)
    } catch (err) {
      next(err)
    }
  },
}
