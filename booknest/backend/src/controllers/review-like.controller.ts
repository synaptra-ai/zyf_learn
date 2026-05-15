import { Request, Response, NextFunction } from 'express'
import { reviewLikeService } from '../services/review-like.service'
import { ResponseUtil } from '../utils/response'

export const reviewLikeController = {
  async toggle(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reviewLikeService.toggle(req.user!.id, req.params.reviewId)
      ResponseUtil.success(res, data)
    } catch (err) {
      next(err)
    }
  },

  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reviewLikeService.getStatus(req.user!.id, req.params.reviewId)
      ResponseUtil.success(res, data)
    } catch (err) {
      next(err)
    }
  },
}
