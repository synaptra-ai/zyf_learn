import { Request, Response, NextFunction } from 'express'
import { reviewService } from '../services/review.service'
import { ResponseUtil } from '../utils/response'

export const reviewController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const review = await reviewService.create(req.user!.id, req.params.bookId as string, req.workspace?.id, req.body)
      ResponseUtil.success(res, review, '创建成功', 201)
    } catch (err) {
      next(err)
    }
  },

  async listByBook(req: Request, res: Response, next: NextFunction) {
    try {
      const reviews = await reviewService.listByBook(req.params.bookId as string)
      ResponseUtil.success(res, reviews)
    } catch (err) {
      next(err)
    }
  },
}
