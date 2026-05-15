import { Router } from 'express'
import { statsDashboardController } from '../controllers/stats-dashboard.controller'
import { authenticate } from '../middleware/auth'
import { resolveWorkspace } from '../middleware/workspace'

const router = Router()
router.use(authenticate, resolveWorkspace)

router.get('/dashboard', statsDashboardController.getDashboard)
router.get('/heatmap', statsDashboardController.getHeatmap)

export default router
