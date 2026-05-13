import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { resolveWorkspace } from '../middleware/workspace'
import { validateBody } from '../middleware/zodValidate'
import { orderController } from '../controllers/order.controller'

const router = Router()

router.use(authenticate, resolveWorkspace)

router.get('/my', orderController.listMyOrders)
router.get('/:id', orderController.getById)
router.post(
  '/',
  validateBody(z.object({ activityId: z.string().uuid() })),
  orderController.create,
)

export default router
