import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { ApiError } from '@/utils/errors'
import { verifyPaymentSignature, signPaymentPayload, MockPaymentPayload } from '@/lib/mockPayment'
import { writeAuditLog } from './audit.service'

export async function createMockPaymentCallback(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) throw new ApiError(404, '订单不存在')

  const payload: MockPaymentPayload = {
    eventId: `evt_${crypto.randomUUID()}`,
    orderNo: order.orderNo,
    amountCents: order.amountCents,
    paidAt: new Date().toISOString(),
    status: 'SUCCESS',
  }

  const signature = signPaymentPayload(payload)
  return handlePaymentCallback(payload, signature)
}

export async function handlePaymentCallback(payload: MockPaymentPayload, signature: string) {
  if (!verifyPaymentSignature(payload, signature)) {
    throw new ApiError(400, '支付签名无效')
  }

  return prisma.$transaction(async (tx) => {
    const existingEvent = await tx.paymentEvent.findUnique({
      where: { eventId: payload.eventId },
      include: { order: { include: { ticket: true } } },
    })

    if (existingEvent) {
      return { idempotent: true, order: existingEvent.order }
    }

    const order = await tx.order.findUnique({
      where: { orderNo: payload.orderNo },
      include: { activity: true, ticket: true },
    })

    if (!order) throw new ApiError(404, '订单不存在')
    if (order.amountCents !== payload.amountCents) throw new ApiError(400, '支付金额不匹配')

    await tx.paymentEvent.create({
      data: {
        provider: 'mockpay',
        eventId: payload.eventId,
        orderId: order.id,
        rawPayload: payload as any,
      },
    })

    if (order.status === 'PAID') {
      return { idempotent: true, order }
    }

    if (order.status !== 'PENDING') {
      throw new ApiError(400, `订单状态不可支付: ${order.status}`)
    }

    if (order.expiresAt < new Date()) {
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'EXPIRED' },
      })
      throw new ApiError(400, '订单已过期')
    }

    const existingTicket = await tx.ticket.findFirst({
      where: { activityId: order.activityId, userId: order.userId },
    })
    if (existingTicket) throw new ApiError(400, '你已报名该活动')

    const activityUpdate = await tx.activity.updateMany({
      where: {
        id: order.activityId,
        registeredCount: { lt: order.activity.capacity },
      },
      data: { registeredCount: { increment: 1 } },
    })

    if (activityUpdate.count !== 1) {
      throw new ApiError(400, '活动名额已满')
    }

    const paidOrder = await tx.order.update({
      where: { id: order.id },
      data: { status: 'PAID', paidAt: new Date(payload.paidAt) },
    })

    const ticket = await tx.ticket.create({
      data: {
        code: `TICKET-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        workspaceId: order.workspaceId,
        userId: order.userId,
        activityId: order.activityId,
        orderId: order.id,
      },
    })

    await tx.auditLog.create({
      data: {
        workspaceId: order.workspaceId,
        actorId: order.userId,
        action: 'order.paid',
        entityType: 'Order',
        entityId: order.id,
        metadata: {
          orderNo: order.orderNo,
          ticketCode: ticket.code,
          amountCents: order.amountCents,
        } as any,
      },
    })

    return { idempotent: false, order: paidOrder, ticket }
  })
}
