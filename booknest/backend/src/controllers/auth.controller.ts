import { Request, Response, NextFunction } from 'express'
import { authService } from '../services/auth.service'
import { ResponseUtil } from '../utils/response'

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name } = req.body
      const result = await authService.register(email, password, name)
      ResponseUtil.success(res, result, '注册成功', 201)
    } catch (err) {
      next(err)
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body
      const result = await authService.login(email, password)
      ResponseUtil.success(res, result, '登录成功')
    } catch (err) {
      next(err)
    }
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.getMe(req.user!.id)
      ResponseUtil.success(res, user)
    } catch (err) {
      next(err)
    }
  },
}
