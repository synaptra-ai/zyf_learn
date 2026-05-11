import { Router } from 'express'
import authRoutes from './auth.routes'
import bookRoutes from './book.routes'
import categoryRoutes from './category.routes'
import statsRoutes from './stats.routes'
import workspaceRoutes from './workspace.routes'

const router = Router()
router.use('/auth', authRoutes)
router.use('/books', bookRoutes)
router.use('/categories', categoryRoutes)
router.use('/stats', statsRoutes)
router.use('/workspaces', workspaceRoutes)

export default router
