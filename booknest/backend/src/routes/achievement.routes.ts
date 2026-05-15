import { Router } from 'express'
import { achievementController } from '../controllers/achievement.controller'
import { authenticate } from '../middleware/auth'
import { resolveWorkspace } from '../middleware/workspace'

const router = Router()

router.use(authenticate, resolveWorkspace)

router.get('/', achievementController.getAll)
router.post('/check', achievementController.checkAndUnlock)

export default router
