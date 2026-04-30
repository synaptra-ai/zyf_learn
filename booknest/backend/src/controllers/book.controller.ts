import { Request, Response, NextFunction } from 'express'
import { bookService } from '../services/book.service'
import { ResponseUtil } from '../utils/response'

export const bookController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await bookService.list(req.user!.id, {
        page: req.query.page ? Number(req.query.page) : undefined,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
        status: req.query.status as string | undefined,
        categoryId: req.query.categoryId as string | undefined,
        sortBy: req.query.sortBy as string | undefined,
        sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
      })
      ResponseUtil.paginated(res, data.items, data.total, data.page, data.pageSize)
    } catch (err) {
      next(err)
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const book = await bookService.getById(req.user!.id, req.params.id)
      ResponseUtil.success(res, book)
    } catch (err) {
      next(err)
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const book = await bookService.create(req.user!.id, req.body)
      ResponseUtil.success(res, book, '创建成功', 201)
    } catch (err) {
      next(err)
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const book = await bookService.update(req.user!.id, req.params.id, req.body)
      ResponseUtil.success(res, book, '更新成功')
    } catch (err) {
      next(err)
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await bookService.delete(req.user!.id, req.params.id)
      ResponseUtil.success(res, null, '删除成功')
    } catch (err) {
      next(err)
    }
  },
}
