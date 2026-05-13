import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { resolveWorkspace } from '../middleware/workspace'
import { createWechatPrepay } from '../services/wechat-pay/wechat-pay.service'
import { handlePaymentCallback } from '../services/payment.service'
import { ApiError } from '../utils/errors'

export const wechatPayRouter = Router()

const prepaySchema = z.object({
  orderId: z.string().min(1),
})

wechatPayRouter.post('/prepay', authenticate, resolveWorkspace, async (req, res, next) => {
  try {
    const { orderId } = prepaySchema.parse(req.body)
    const result = await createWechatPrepay({
      orderId,
      userId: req.user!.id,
      workspaceId: req.workspace!.id,
    })
    res.json({ code: 0, message: 'ok', data: result })
  } catch (error) {
    next(error)
  }
})

wechatPayRouter.post('/mock-callback', authenticate, async (req, res, next) => {
  if (process.env.NODE_ENV === 'production' || process.env.WECHAT_PAY_MODE !== 'mock') {
    res.status(403).json({ code: 403, message: 'production disabled', data: null })
    return
  }
  try {
    const { orderId } = req.body
    if (!orderId) throw new ApiError(400, '缺少 orderId')
    const { createMockPaymentCallback, notifyPaymentSuccess } = await import('../services/payment.service')
    const result = await createMockPaymentCallback(orderId)
    if (!result.idempotent && result.ticket && result.order) {
      const order = await import('../lib/prisma').then(m => m.default.order.findUnique({
        where: { id: orderId }, include: { activity: true, user: true }
      }))
      if (order?.activity && order.user) {
        await notifyPaymentSuccess(order.userId, order.activity.title, result.ticket.code)
      }
    }
    res.json({ code: 0, message: 'ok', data: result })
  } catch (error) {
    next(error)
  }
})
