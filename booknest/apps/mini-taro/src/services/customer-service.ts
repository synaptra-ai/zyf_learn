import { request } from './request'

export async function recordCustomerServiceEvent(input: {
  scene: string
  refType?: string
  refId?: string
  payload?: Record<string, any>
}) {
  return request({ url: '/api/v1/customer-service/events', method: 'POST', data: input })
}
