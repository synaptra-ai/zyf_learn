import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import prisma from '../lib/prisma'

export const subscriptionRouter = Router()

const recordSchema = z.object({
  templateId: z.string(),
  scene: z.string(),
  refType: z.string().optional(),
  refId: z.string().optional(),
  result: z.record(z.string(), z.string()),
})

subscriptionRouter.post('/record', authenticate, async (req, res, next) => {
  try {
    const input = recordSchema.parse(req.body)
    const status = input.result[input.templateId]?.toUpperCase() || 'UNKNOWN'

    await prisma.subscriptionRecord.create({
      data: {
        userId: req.user!.id,
        workspaceId: req.workspace?.id,
        templateId: input.templateId,
        scene: input.scene,
        status,
        rawResult: input.result,
      },
    })

    res.json({ code: 0, message: 'ok', data: { status } })
  } catch (error) {
    next(error)
  }
})
