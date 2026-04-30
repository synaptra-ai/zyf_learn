import { Router } from 'express'
import { statsController } from '../controllers/stats.controller'
import { authenticate } from '../middleware/auth'

const router = Router()
router.get('/', authenticate, statsController.overview)

export default router
