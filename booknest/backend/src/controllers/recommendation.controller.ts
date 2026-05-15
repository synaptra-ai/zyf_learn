import { Request, Response, NextFunction } from 'express'
import { recommendationService } from '../services/recommendation.service'
import { ResponseUtil } from '../utils/response'

export const recommendationController = {
  async getHomepage(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await recommendationService.getHomepageRecommendations(
        req.user!.id,
        req.workspace!.id,
      )
      ResponseUtil.success(res, data)
    } catch (err) {
      next(err)
    }
  },

  async getDiscover(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await recommendationService.getDiscoverPage(
        req.user!.id,
        req.workspace!.id,
      )
      ResponseUtil.success(res, data)
    } catch (err) {
      next(err)
    }
  },

  async getSimilar(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await recommendationService.getSimilarBooks(
        req.user!.id,
        req.workspace!.id,
        req.params.bookId as string,
      )
      ResponseUtil.success(res, data)
    } catch (err) {
      next(err)
    }
  },
}
