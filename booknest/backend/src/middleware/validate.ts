import { Request, Response, NextFunction } from 'express'
import { validationResult } from 'express-validator'
import { ResponseUtil } from '../utils/response'

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const details = errors.array().map((err) => ({
      field: err.type === 'field' ? err.path : undefined,
      message: err.msg,
    }))
    return ResponseUtil.error(res, 'Validation failed', 400, details)
  }
  next()
}
