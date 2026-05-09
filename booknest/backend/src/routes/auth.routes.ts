import { Router } from 'express'
import { authController } from '../controllers/auth.controller'
import { authenticate } from '../middleware/auth'
import { validateBody } from '../middleware/zodValidate'
import { registerBodySchema, loginBodySchema } from '../schemas/auth.schema'
import { authLimiter } from '../middleware/rateLimit'

const router = Router()

router.post('/register', authLimiter, validateBody(registerBodySchema), authController.register)
router.post('/login', authLimiter, validateBody(loginBodySchema), authController.login)
router.get('/me', authenticate, authController.me)

export default router
