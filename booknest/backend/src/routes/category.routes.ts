import { Router } from 'express'
import { categoryController } from '../controllers/category.controller'
import { authenticate } from '../middleware/auth'
import { validateBody } from '../middleware/zodValidate'
import { createCategoryBodySchema, updateCategoryBodySchema } from '../schemas/category.schema'

const router = Router()

router.get('/', authenticate, categoryController.list)
router.post('/', authenticate, validateBody(createCategoryBodySchema), categoryController.create)
router.put('/:id', authenticate, validateBody(updateCategoryBodySchema), categoryController.update)
router.delete('/:id', authenticate, categoryController.delete)

export default router
