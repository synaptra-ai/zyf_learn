import { Router } from 'express'
import { bookController } from '../controllers/book.controller'
import { reviewController } from '../controllers/review.controller'
import { uploadController } from '../controllers/upload.controller'
import { authenticate } from '../middleware/auth'
import { resolveWorkspace, requireWorkspaceRole } from '../middleware/workspace'
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

router.use(authenticate, resolveWorkspace)

router.get('/', validateQuery(listBooksQuerySchema), bookController.list)
router.post('/batch', requireWorkspaceRole('MEMBER'), bookController.batchCreate)
router.get('/:id', bookController.getById)
router.post('/', requireWorkspaceRole('MEMBER'), validateBody(createBookBodySchema), bookController.create)
router.put('/:id', requireWorkspaceRole('MEMBER'), validateBody(updateBookBodySchema), bookController.update)
router.delete('/:id', requireWorkspaceRole('ADMIN'), bookController.delete)
router.post('/:id/cover', requireWorkspaceRole('MEMBER'), uploadLimiter, upload.single('cover'), uploadController.uploadCover)

// Review routes
router.post('/:bookId/reviews', requireWorkspaceRole('MEMBER'), validateBody(createReviewBodySchema), reviewController.create)
router.get('/:bookId/reviews', reviewController.listByBook)

export default router
