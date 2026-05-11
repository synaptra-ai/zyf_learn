import crypto from 'crypto'

export interface MockPaymentPayload {
  eventId: string
  orderNo: string
  amountCents: number
  paidAt: string
  status: 'SUCCESS'
}

export function signPaymentPayload(payload: MockPaymentPayload) {
  const secret = process.env.MOCK_PAYMENT_SECRET!
  const content = `${payload.eventId}|${payload.orderNo}|${payload.amountCents}|${payload.paidAt}|${payload.status}`
  return crypto.createHmac('sha256', secret).update(content).digest('hex')
}

export function verifyPaymentSignature(payload: MockPaymentPayload, signature: string) {
  const expected = signPaymentPayload(payload)
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}
