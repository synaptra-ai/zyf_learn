import { NextFunction, Request, Response } from 'express'
import { statsDashboardService } from '../services/stats-dashboard.service'
import { ResponseUtil } from '../utils/response'

export const statsDashboardController = {
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await statsDashboardService.getDashboard(
        req.user!.id,
        req.workspace!.id,
      )
      ResponseUtil.success(res, data)
    } catch (err) {
      next(err)
    }
  },

  async getHeatmap(req: Request, res: Response, next: NextFunction) {
    try {
      const year =
        parseInt(req.query.year as string) || new Date().getFullYear()
      const data = await statsDashboardService.getHeatmap(
        req.user!.id,
        req.workspace!.id,
        year,
      )
      ResponseUtil.success(res, data)
    } catch (err) {
      next(err)
    }
  },
}
