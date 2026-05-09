import { Request, Response, NextFunction } from 'express'
import { bookService } from '../services/book.service'
import { ResponseUtil } from '../utils/response'

export const bookController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = (req as any).validatedQuery ?? req.query
      const data = await bookService.list(req.user!.id, {
        page: query.page ? Number(query.page) : undefined,
        pageSize: query.pageSize ? Number(query.pageSize) : undefined,
        status: query.status as string | undefined,
        categoryId: query.categoryId as string | undefined,
        sortBy: query.sortBy as string | undefined,
        sortOrder: query.sortOrder as 'asc' | 'desc' | undefined,
      })
      ResponseUtil.paginated(res, data.items, data.total, data.page, data.pageSize)
    } catch (err) {
      next(err)
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const book = await bookService.getById(req.user!.id, req.params.id as string)
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
      const book = await bookService.update(req.user!.id, req.params.id as string, req.body)
      ResponseUtil.success(res, book, '更新成功')
    } catch (err) {
      next(err)
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await bookService.delete(req.user!.id, req.params.id as string)
      ResponseUtil.success(res, null, '删除成功')
    } catch (err) {
      next(err)
    }
  },

  async batchCreate(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await bookService.batchCreate(req.user!.id, req.body.books)
      ResponseUtil.success(res, result, '批量导入成功', 201)
    } catch (err) {
      next(err)
    }
  },
}
