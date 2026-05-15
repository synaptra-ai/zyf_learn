import { Router } from 'express'
import { reviewLikeController } from '../controllers/review-like.controller'
import { authenticate } from '../middleware/auth'
import { resolveWorkspace } from '../middleware/workspace'

const router = Router()

router.use(authenticate, resolveWorkspace)

router.post('/:reviewId/like', reviewLikeController.toggle)
router.get('/:reviewId/like-status', reviewLikeController.getStatus)

export default router
