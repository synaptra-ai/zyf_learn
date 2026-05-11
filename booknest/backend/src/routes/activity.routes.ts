import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { resolveWorkspace, requireWorkspaceRole } from '../middleware/workspace'
import { validateBody } from '../middleware/zodValidate'
import { createActivityBodySchema } from '../schemas/activity.schema'
import { activityController } from '../controllers/activity.controller'

const router = Router()

router.use(authenticate, resolveWorkspace)
router.get('/', activityController.list)
router.get('/:id', activityController.getById)
router.post(
  '/',
  requireWorkspaceRole('ADMIN'),
  validateBody(createActivityBodySchema),
  activityController.create,
)

export default router
