import prisma from '../lib/prisma'
import { logger } from '../utils/logger'

export async function handleExpireOrderJob(data: { orderId: string }) {
  const order = await prisma.order.findUnique({ where: { id: data.orderId } })

  if (!order) {
    logger.warn('Expire order job skipped: order not found', data)
    return
  }

  if (order.status !== 'PENDING') {
    logger.info('Expire order job skipped: order not pending', { orderId: order.id, status: order.status })
    return
  }

  if (order.expiresAt > new Date()) {
    logger.info('Expire order job skipped: not expired yet', { orderId: order.id })
    return
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { status: 'EXPIRED' },
  })

  logger.info('Order expired', { orderId: order.id, orderNo: order.orderNo })
}
