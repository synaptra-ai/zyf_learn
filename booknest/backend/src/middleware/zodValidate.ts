import { NextFunction, Request, Response } from 'express'
import { ZodSchema } from 'zod'
import { ApiError } from '../utils/errors'

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      return next(new ApiError(400, 'Validation failed', result.error.flatten()))
    }
    req.body = result.data
    next()
  }
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query)
    if (!result.success) {
      return next(new ApiError(400, 'Validation failed', result.error.flatten()))
    }
    ;(req as any).validatedQuery = result.data
    next()
  }
}
