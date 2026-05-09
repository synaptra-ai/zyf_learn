import { Router } from 'express'
import { bookController } from '../controllers/book.controller'
import { reviewController } from '../controllers/review.controller'
import { uploadController } from '../controllers/upload.controller'
import { authenticate } from '../middleware/auth'
import { validateBody, validateQuery } from '../middleware/zodValidate'
import {
  createBookBodySchema,
  updateBookBodySchema,
  listBooksQuerySchema,
} from '../schemas/book.schema'
import { createReviewBodySchema } from '../schemas/review.schema'
import { upload } from '../lib/upload'
import { uploadLimiter } from '../middleware/rateLimit'

const router = Router()

router.get('/', authenticate, validateQuery(listBooksQuerySchema), bookController.list)
router.post('/batch', authenticate, bookController.batchCreate)
router.get('/:id', authenticate, bookController.getById)
router.post('/', authenticate, validateBody(createBookBodySchema), bookController.create)
router.put('/:id', authenticate, validateBody(updateBookBodySchema), bookController.update)
router.delete('/:id', authenticate, bookController.delete)
router.post('/:id/cover', authenticate, uploadLimiter, upload.single('cover'), uploadController.uploadCover)

// Review routes
router.post('/:bookId/reviews', authenticate, validateBody(createReviewBodySchema), reviewController.create)
router.get('/:bookId/reviews', authenticate, reviewController.listByBook)

export default router
