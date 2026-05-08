import { Router } from 'express'
import { body, query } from 'express-validator'
import { bookController } from '../controllers/book.controller'
import { reviewController } from '../controllers/review.controller'
import { uploadController } from '../controllers/upload.controller'
import { authenticate } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { upload } from '../lib/upload'
import { uploadLimiter } from '../middleware/rateLimit'

const router = Router()

const createRules = [
  body('title').notEmpty().withMessage('书名不能为空'),
  body('author').notEmpty().withMessage('作者不能为空'),
]

const updateRules = [
  body('title').optional().notEmpty().withMessage('书名不能为空'),
  body('author').optional().notEmpty().withMessage('作者不能为空'),
]

const listRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('page 必须为正整数'),
  query('pageSize').optional().isInt({ min: 1, max: 50 }).withMessage('pageSize 必须为 1-50'),
  query('status').optional().isIn(['OWNED', 'READING', 'FINISHED', 'WISHLIST']).withMessage('无效的状态值'),
  query('sortBy').optional().isIn(['createdAt', 'title', 'author', 'pageCount']).withMessage('无效的排序字段'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('排序方向必须为 asc 或 desc'),
]

router.get('/', authenticate, listRules, validate, bookController.list)
router.post('/batch', authenticate, bookController.batchCreate)
router.get('/:id', authenticate, bookController.getById)
router.post('/', authenticate, createRules, validate, bookController.create)
router.put('/:id', authenticate, updateRules, validate, bookController.update)
router.delete('/:id', authenticate, bookController.delete)
router.post('/:id/cover', authenticate, uploadLimiter, upload.single('cover'), uploadController.uploadCover)

// Review routes
const createReviewRules = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('评分必须为 1-5 的整数'),
  body('text').optional().isString().withMessage('评论内容必须为文本'),
]

router.post('/:bookId/reviews', authenticate, createReviewRules, validate, reviewController.create)
router.get('/:bookId/reviews', authenticate, reviewController.listByBook)

export default router
