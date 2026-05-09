import { Request, Response, NextFunction } from 'express'
import { ApiError } from '../utils/errors'
import { logger } from '../utils/logger'

type ErrorType = 'validation' | 'auth' | 'database' | 'internal'

function classifyError(err: Error): ErrorType {
  if (err instanceof ApiError) {
    if (err.statusCode === 400) return 'validation'
    if (err.statusCode === 401 || err.statusCode === 403) return 'auth'
    return 'validation'
  }
  if (err.message?.includes('Unique constraint')) return 'database'
  return 'internal'
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const type = classifyError(err)

  logger.error(err.message, {
    type,
    method: req.method,
    path: req.path,
    ...(err instanceof ApiError && { statusCode: err.statusCode }),
    ...(err.stack && { stack: err.stack }),
  })

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      code: err.statusCode,
      message: err.message,
      ...(err.details && { details: err.details }),
    })
  }

  if (err.message?.includes('Unique constraint')) {
    return res.status(409).json({ code: 409, message: '资源已存在' })
  }

  return res.status(500).json({ code: 500, message: '服务器内部错误' })
}
