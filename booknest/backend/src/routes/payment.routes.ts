import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { resolveWorkspace } from '../middleware/workspace'
import { paymentController } from '../controllers/payment.controller'

const router = Router()

router.use(authenticate, resolveWorkspace)

router.post('/mock/pay/:orderId', paymentController.mockPay)
router.post('/mock/callback', paymentController.callback)

export default router
