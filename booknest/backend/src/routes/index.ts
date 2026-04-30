import { Router } from 'express'
import authRoutes from './auth.routes'
import bookRoutes from './book.routes'

const router = Router()
router.use('/auth', authRoutes)
router.use('/books', bookRoutes)

export default router
