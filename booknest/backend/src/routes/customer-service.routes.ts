import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import prisma from '../lib/prisma'

export const customerServiceRouter = Router()

customerServiceRouter.post('/events', authenticate, async (req, res, next) => {
  try {
    const { scene, refType, refId, payload } = req.body
    await prisma.customerServiceEvent.create({
      data: {
        userId: req.user!.id,
        workspaceId: req.workspace?.id,
        scene,
        refType,
        refId,
        payload,
      },
    })
    res.json({ code: 0, message: 'ok', data: null })
  } catch (error) {
    next(error)
  }
})
