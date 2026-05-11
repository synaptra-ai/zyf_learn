import { Request, Response, NextFunction } from 'express'
import { categoryService } from '../services/category.service'
import { ResponseUtil } from '../utils/response'

export const categoryController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await categoryService.list(req.workspace!.id)
      ResponseUtil.success(res, categories)
    } catch (err) {
      next(err)
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await categoryService.create(req.user!.id, req.workspace!.id, req.body)
      ResponseUtil.success(res, category, '创建成功', 201)
    } catch (err) {
      next(err)
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await categoryService.update(req.user!.id, req.workspace!.id, req.params.id as string, req.body)
      ResponseUtil.success(res, category, '更新成功')
    } catch (err) {
      next(err)
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await categoryService.delete(req.user!.id, req.workspace!.id, req.params.id as string)
      ResponseUtil.success(res, null, '删除成功')
    } catch (err) {
      next(err)
    }
  },
}
