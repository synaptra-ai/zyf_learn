import { Request, Response, NextFunction } from 'express'
import { achievementService } from '../services/achievement.service'
import { ResponseUtil } from '../utils/response'

export const achievementController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await achievementService.getAll(req.user!.id, req.workspace!.id)
      ResponseUtil.success(res, data)
    } catch (err) {
      next(err)
    }
  },

  async checkAndUnlock(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await achievementService.checkAndUnlock(req.user!.id, req.workspace!.id)
      ResponseUtil.success(res, data)
    } catch (err) {
      next(err)
    }
  },
}
