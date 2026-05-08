import { Router } from 'express'
import { body } from 'express-validator'
import { authController } from '../controllers/auth.controller'
import { authenticate } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { authLimiter } from '../middleware/rateLimit'

const router = Router()

const registerRules = [
  body('email').isEmail().withMessage('请输入有效的邮箱地址'),
  body('password').isLength({ min: 6 }).withMessage('密码至少 6 个字符'),
  body('name').notEmpty().withMessage('姓名不能为空'),
]

const loginRules = [
  body('email').isEmail().withMessage('请输入有效的邮箱地址'),
  body('password').notEmpty().withMessage('密码不能为空'),
]

router.post('/register', authLimiter, registerRules, validate, authController.register)
router.post('/login', authLimiter, loginRules, validate, authController.login)
router.get('/me', authenticate, authController.me)

export default router
