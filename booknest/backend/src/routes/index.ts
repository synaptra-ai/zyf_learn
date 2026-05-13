import { Router } from 'express'
import authRoutes from './auth.routes'
import bookRoutes from './book.routes'
import categoryRoutes from './category.routes'
import statsRoutes from './stats.routes'
import workspaceRoutes from './workspace.routes'
import activityRoutes from './activity.routes'
import orderRoutes from './order.routes'
import paymentRoutes from './payment.routes'
import importRoutes from './import.routes'
import { wechatRouter } from './wechat.routes'
import { wechatPayRouter } from './wechat-pay.routes'
import { exportBooks } from '../controllers/export.controller'
import { authenticate } from '../middleware/auth'
import { resolveWorkspace } from '../middleware/workspace'

const router = Router()
router.use('/auth', authRoutes)
router.use('/books', bookRoutes)
router.use('/categories', categoryRoutes)
router.use('/stats', statsRoutes)
router.use('/workspaces', workspaceRoutes)
router.use('/activities', activityRoutes)
router.use('/orders', orderRoutes)
router.use('/payments', paymentRoutes)
router.use('/imports', importRoutes)
router.use('/wechat', wechatRouter)
router.use('/wechat-pay', wechatPayRouter)
router.get('/exports/books', authenticate, resolveWorkspace, exportBooks)

export default router
