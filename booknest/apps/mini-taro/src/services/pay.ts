import Taro from '@tarojs/taro'
import { request } from './request'

interface PayParams {
  timeStamp: string
  nonceStr: string
  package: string
  signType: 'RSA' | 'MD5'
  paySign: string
  mock?: boolean
}

export async function createPrepay(orderId: string) {
  return request<PayParams>({
    url: '/api/v1/wechat-pay/prepay',
    method: 'POST',
    data: { orderId },
  })
}

export async function payOrder(orderId: string) {
  const params = await createPrepay(orderId)

  if (params.mock) {
    await Taro.showModal({ title: '模拟支付', content: '学习环境模拟支付成功' })
    await request({
      url: '/api/v1/wechat-pay/mock-callback',
      method: 'POST',
      data: { orderId },
    })
    return { status: 'MOCK_PAID' }
  }

  await Taro.requestPayment({
    timeStamp: params.timeStamp,
    nonceStr: params.nonceStr,
    package: params.package,
    signType: params.signType,
    paySign: params.paySign,
  })

  return { status: 'PAYMENT_CLIENT_FINISHED' }
}
