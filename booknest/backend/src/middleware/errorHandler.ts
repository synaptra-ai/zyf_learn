import { Request, Response, NextFunction } from 'express'
import { ApiError } from '../utils/errors'

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.error(`[Error] ${err.message}`)

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      code: err.statusCode,
      message: err.message,
      ...(err.details && { details: err.details }),
    })
  }

  // Prisma unique constraint violation
  if (err.message?.includes('Unique constraint')) {
    return res.status(409).json({ code: 409, message: '资源已存在' })
  }

  return res.status(500).json({ code: 500, message: '服务器内部错误' })
}
