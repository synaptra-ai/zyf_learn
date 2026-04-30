import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { ApiError } from '../utils/errors'

export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    throw new ApiError(401, '未提供认证令牌')
  }

  const token = authHeader.replace('Bearer ', '')
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string
      email: string
      role: string
    }
    req.user = decoded
    next()
  } catch {
    throw new ApiError(401, '认证令牌无效或已过期')
  }
}
