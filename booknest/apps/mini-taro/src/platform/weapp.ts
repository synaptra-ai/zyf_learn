import Taro from '@tarojs/taro'

export async function platformLogin() {
  const { code } = await Taro.login()
  return code
}

export async function platformRequestPayment(params: any) {
  await Taro.requestPayment(params)
}

export async function platformSubscribeMessage(tmplIds: string[]) {
  return Taro.requestSubscribeMessage({ tmplIds } as any)
}

export function platformOpenCustomerService() {
  Taro.showToast({ title: '客服功能仅在微信小程序可用', icon: 'none' })
}
