import { Router } from 'express'
import { body } from 'express-validator'
import { categoryController } from '../controllers/category.controller'
import { authenticate } from '../middleware/auth'
import { validate } from '../middleware/validate'

const router = Router()

const createRules = [
  body('name').notEmpty().withMessage('分类名称不能为空').isLength({ max: 50 }).withMessage('分类名称最多 50 个字符'),
  body('color').notEmpty().withMessage('颜色不能为空').matches(/^#[0-9A-Fa-f]{6}$/).withMessage('颜色格式无效，需为 #RRGGBB'),
]

const updateRules = [
  body('name').optional().notEmpty().withMessage('分类名称不能为空').isLength({ max: 50 }).withMessage('分类名称最多 50 个字符'),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('颜色格式无效，需为 #RRGGBB'),
]

router.get('/', authenticate, categoryController.list)
router.post('/', authenticate, createRules, validate, categoryController.create)
router.put('/:id', authenticate, updateRules, validate, categoryController.update)
router.delete('/:id', authenticate, categoryController.delete)

export default router
