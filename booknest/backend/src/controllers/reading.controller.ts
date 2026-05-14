import { Request, Response, NextFunction } from 'express'
import { readingService } from '../services/reading.service'
import { ResponseUtil } from '../utils/response'

export const readingController = {
  async createSession(req: Request, res: Response, next: NextFunction) {
    try {
      const session = await readingService.createSession(
        req.user!.id,
        req.workspace!.id,
        req.body,
      )
      ResponseUtil.success(res, session, '阅读记录已保存', 201)
    } catch (err) {
      next(err)
    }
  },

  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await readingService.getSummary(req.user!.id, req.workspace!.id)
      ResponseUtil.success(res, data)
    } catch (err) {
      next(err)
    }
  },

  async getSessionsByDate(req: Request, res: Response, next: NextFunction) {
    try {
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0]
      const sessions = await readingService.getSessionsByDate(
        req.user!.id,
        req.workspace!.id,
        date,
      )
      ResponseUtil.success(res, sessions)
    } catch (err) {
      next(err)
    }
  },

  async getTimeline(req: Request, res: Response, next: NextFunction) {
    try {
      const days = Number(req.query.days) || 7
      const timeline = await readingService.getTimeline(req.user!.id, req.workspace!.id, days)
      ResponseUtil.success(res, timeline)
    } catch (err) {
      next(err)
    }
  },

  async getGoal(req: Request, res: Response, next: NextFunction) {
    try {
      const goal = await readingService.getGoal(req.user!.id, req.workspace!.id)
      ResponseUtil.success(res, goal)
    } catch (err) {
      next(err)
    }
  },

  async updateGoal(req: Request, res: Response, next: NextFunction) {
    try {
      const goal = await readingService.updateGoal(
        req.user!.id,
        req.workspace!.id,
        req.body.dailyGoalMinutes,
      )
      ResponseUtil.success(res, goal, '目标已更新')
    } catch (err) {
      next(err)
    }
  },

  async updateProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const book = await readingService.updateProgress(
        req.user!.id,
        req.workspace!.id,
        req.params.id as string,
        req.body.readingProgress,
      )
      ResponseUtil.success(res, book, '进度已更新')
    } catch (err) {
      next(err)
    }
  },
}
