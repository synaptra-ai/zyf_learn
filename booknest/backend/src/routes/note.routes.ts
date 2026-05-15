import { Router } from 'express'
import { noteController } from '../controllers/note.controller'
import { authenticate } from '../middleware/auth'
import { resolveWorkspace } from '../middleware/workspace'

const router = Router()
router.use(authenticate, resolveWorkspace)

router.post('/', noteController.create)
router.get('/book/:bookId', noteController.listByBook)
router.put('/:id', noteController.update)
router.delete('/:id', noteController.delete)

export default router
