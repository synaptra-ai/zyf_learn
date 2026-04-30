import { Request, Response, NextFunction } from 'express'
import { statsService } from '../services/stats.service'
import { ResponseUtil } from '../utils/response'

export const statsController = {
  async overview(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await statsService.getOverview(req.user!.id)
      ResponseUtil.success(res, data)
    } catch (err) {
      next(err)
    }
  },
}
