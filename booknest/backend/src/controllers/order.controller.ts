import { Request, Response, NextFunction } from 'express'
import * as orderService from '../services/order.service'
import { ResponseUtil } from '../utils/response'

export const orderController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await orderService.createOrder(req.user!.id, req.workspace!.id, req.body.activityId)
      ResponseUtil.success(res, order, '订单创建成功', 201)
    } catch (err) { next(err) }
  },

  async listMyOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const orders = await orderService.listMyOrders(req.user!.id, req.workspace!.id)
      ResponseUtil.success(res, orders)
    } catch (err) { next(err) }
  },
}
