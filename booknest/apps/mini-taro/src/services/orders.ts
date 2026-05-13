import { request } from './request'

export interface Order {
  id: string
  orderNo: string
  amountCents: number
  status: string
  expiresAt: string
  paidAt?: string | null
  activity: { id: string; title: string; priceCents: number }
  ticket?: { id: string; code: string } | null
}

export function getOrder(orderId: string) {
  return request<Order>({ url: `/api/v1/orders/${orderId}` })
}

export function createOrder(activityId: string) {
  return request<Order>({
    url: '/api/v1/orders',
    method: 'POST',
    data: { activityId },
  })
}
