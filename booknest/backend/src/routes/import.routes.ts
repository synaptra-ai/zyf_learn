import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { resolveWorkspace, requireWorkspaceRole } from '../middleware/workspace'
import { csvUpload } from '../middleware/csvUpload'
import { importController } from '../controllers/import.controller'

const router = Router()

router.use(authenticate, resolveWorkspace)

router.post(
  '/books',
  requireWorkspaceRole('MEMBER'),
  csvUpload.single('file'),
  importController.createBookImport,
)

router.get('/:jobId', importController.getJob)

export default router
