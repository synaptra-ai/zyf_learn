import Taro from '@tarojs/taro'
import { request } from './request'

const TEMPLATE_IDS = {
  activityReminder: 'mock-template-activity',
  signupSuccess: 'mock-template-signup',
}

export async function subscribeActivityReminder(activityId: string) {
  const tmplId = TEMPLATE_IDS.activityReminder
  const result = await Taro.requestSubscribeMessage({
    tmplIds: [tmplId],
  } as any)

  await request({
    url: '/api/v1/subscriptions/record',
    method: 'POST',
    data: {
      templateId: tmplId,
      scene: 'ACTIVITY_REMINDER',
      refType: 'ACTIVITY',
      refId: activityId,
      result,
    },
  })

  return result[tmplId]
}

export async function subscribeSignupSuccess(orderId: string) {
  const tmplId = TEMPLATE_IDS.signupSuccess
  const result = await Taro.requestSubscribeMessage({
    tmplIds: [tmplId],
  } as any)

  await request({
    url: '/api/v1/subscriptions/record',
    method: 'POST',
    data: {
      templateId: tmplId,
      scene: 'SIGNUP_SUCCESS',
      refType: 'ORDER',
      refId: orderId,
      result,
    },
  })

  return result[tmplId]
}
