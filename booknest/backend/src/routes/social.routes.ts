import { Router } from 'express'
import { socialController } from '../controllers/social.controller'
import { authenticate } from '../middleware/auth'
import { resolveWorkspace } from '../middleware/workspace'

const router = Router()

router.use(authenticate, resolveWorkspace)

router.get('/report', socialController.getReport)
router.get('/feed', socialController.getFeed)

export default router
