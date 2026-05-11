import { Request, Response, NextFunction } from 'express'
import * as activityService from '../services/activity.service'
import { ResponseUtil } from '../utils/response'

export const activityController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const activities = await activityService.listActivities(req.workspace!.id)
      ResponseUtil.success(res, activities)
    } catch (err) { next(err) }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const activity = await activityService.getActivity(req.workspace!.id, req.params.id as string)
      ResponseUtil.success(res, activity)
    } catch (err) { next(err) }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const activity = await activityService.createActivity(req.user!.id, req.workspace!.id, req.body)
      ResponseUtil.success(res, activity, '创建成功', 201)
    } catch (err) { next(err) }
  },
}
