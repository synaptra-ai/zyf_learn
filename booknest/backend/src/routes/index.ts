import { Router } from 'express'
import authRoutes from './auth.routes'
import bookRoutes from './book.routes'
import categoryRoutes from './category.routes'
import statsRoutes from './stats.routes'

const router = Router()
router.use('/auth', authRoutes)
router.use('/books', bookRoutes)
router.use('/categories', categoryRoutes)
router.use('/stats', statsRoutes)

export default router
