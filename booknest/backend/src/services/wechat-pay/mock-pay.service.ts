import crypto from 'node:crypto'
import type { MiniProgramPayParams } from './wechat-pay.config'

export function createMockPayParams(orderId: string): MiniProgramPayParams & { mock: true } {
  return {
    mock: true,
    timeStamp: String(Math.floor(Date.now() / 1000)),
    nonceStr: crypto.randomUUID().replace(/-/g, ''),
    package: `prepay_id=mock_${orderId}`,
    signType: 'RSA',
    paySign: 'mock-pay-sign',
  }
}
