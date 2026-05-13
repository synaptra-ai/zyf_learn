import prisma from '../../lib/prisma'
import { ApiError } from '../../utils/errors'
import { wechatPayConfig } from './wechat-pay.config'
import { createMockPayParams } from './mock-pay.service'
import type { MiniProgramPayParams } from './wechat-pay.config'

export async function createWechatPrepay(input: {
  orderId: string
  userId: string
  workspaceId: string
}): Promise<MiniProgramPayParams & { mock?: boolean }> {
  const order = await prisma.order.findFirst({
    where: { id: input.orderId, userId: input.userId, workspaceId: input.workspaceId },
    include: { user: true, activity: true },
  })

  if (!order) throw new ApiError(404, '订单不存在')
  if (order.status !== 'PENDING') throw new ApiError(400, '订单状态不可支付')
  if (order.expiresAt < new Date()) {
    await prisma.order.update({ where: { id: order.id }, data: { status: 'EXPIRED' } })
    throw new ApiError(400, '订单已过期')
  }

  if (wechatPayConfig.mode === 'mock') {
    return createMockPayParams(order.id)
  }

  if (!order.user.wechatOpenId) {
    throw new ApiError(400, '用户未绑定微信身份')
  }

  // Real mode: 调用微信支付 JSAPI/小程序下单（后续实现）
  throw new ApiError(501, '真实微信支付尚未实现')
}
