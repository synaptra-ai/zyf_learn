import { Router } from 'express'
import { categoryController } from '../controllers/category.controller'
import { authenticate } from '../middleware/auth'
import { resolveWorkspace, requireWorkspaceRole } from '../middleware/workspace'
import { validateBody } from '../middleware/zodValidate'
import { createCategoryBodySchema, updateCategoryBodySchema } from '../schemas/category.schema'

const router = Router()

router.use(authenticate, resolveWorkspace)

router.get('/', categoryController.list)
router.post('/', requireWorkspaceRole('MEMBER'), validateBody(createCategoryBodySchema), categoryController.create)
router.put('/:id', requireWorkspaceRole('MEMBER'), validateBody(updateCategoryBodySchema), categoryController.update)
router.delete('/:id', requireWorkspaceRole('ADMIN'), categoryController.delete)

export default router
