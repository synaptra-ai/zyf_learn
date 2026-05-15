import { Router } from 'express'
import { recommendationController } from '../controllers/recommendation.controller'
import { authenticate } from '../middleware/auth'
import { resolveWorkspace } from '../middleware/workspace'

const router = Router()

router.use(authenticate, resolveWorkspace)

router.get('/', recommendationController.getHomepage)
router.get('/discover', recommendationController.getDiscover)
router.get('/similar/:bookId', recommendationController.getSimilar)

export default router
