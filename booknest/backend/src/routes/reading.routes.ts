import { Router } from 'express'
import { readingController } from '../controllers/reading.controller'
import { authenticate } from '../middleware/auth'
import { resolveWorkspace } from '../middleware/workspace'
import { validateBody, validateQuery } from '../middleware/zodValidate'
import {
  createSessionBodySchema,
  listSessionsQuerySchema,
  updateGoalBodySchema,
} from '../schemas/reading.schema'

const router = Router()

router.use(authenticate, resolveWorkspace)

router.post('/sessions', validateBody(createSessionBodySchema), readingController.createSession)
router.get('/sessions', validateQuery(listSessionsQuerySchema), readingController.getSessionsByDate)
router.get('/sessions/timeline', readingController.getTimeline)

router.get('/summary', readingController.getSummary)

router.get('/goal', readingController.getGoal)
router.put('/goal', validateBody(updateGoalBodySchema), readingController.updateGoal)

export default router
