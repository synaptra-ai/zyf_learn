import prisma from '@/lib/prisma'
import { orderQueue } from '@/lib/queue'
import { ApiError } from '@/utils/errors'
import { generateOrderNo } from '@/utils/orderNo'
import { writeAuditLog } from './audit.service'

const ORDER_EXPIRE_MINUTES = 15

export async function createOrder(userId: string, workspaceId: string, activityId: string) {
  const activity = await prisma.activity.findFirst({
    where: { id: activityId, workspaceId, status: 'PUBLISHED' },
  })

  if (!activity) throw new ApiError(404, '活动不存在或未发布')
  if (activity.registeredCount >= activity.capacity) throw new ApiError(400, '活动名额已满')

  const existingPaid = await prisma.order.findFirst({
    where: { userId, workspaceId, activityId, status: 'PAID' },
  })
  if (existingPaid) throw new ApiError(400, '你已报名该活动')

  const expiresAt = new Date(Date.now() + ORDER_EXPIRE_MINUTES * 60 * 1000)

  const order = await prisma.order.create({
    data: {
      orderNo: generateOrderNo(),
      amountCents: activity.priceCents,
      expiresAt,
      userId,
      workspaceId,
      activityId,
    },
  })

  await orderQueue.add(
    'expire-order',
    { orderId: order.id },
    { delay: ORDER_EXPIRE_MINUTES * 60 * 1000, attempts: 3 },
  )

  await writeAuditLog({
    workspaceId,
    actorId: userId,
    action: 'order.created',
    entityType: 'Order',
    entityId: order.id,
    metadata: { activityId, amountCents: order.amountCents },
  })

  return order
}

export async function listMyOrders(userId: string, workspaceId: string) {
  return prisma.order.findMany({
    where: { userId, workspaceId },
    include: {
      activity: true,
      ticket: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}
