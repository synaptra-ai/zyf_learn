import { getWechatAccessToken } from './wechat-token.service'

interface SendSubscribeMessageInput {
  openid: string
  templateId: string
  page: string
  data: Record<string, { value: string }>
}

export async function sendSubscribeMessage(input: SendSubscribeMessageInput) {
  if (process.env.WECHAT_MESSAGE_MODE === 'mock') {
    console.log('[mock-subscribe-message]', input)
    return { mock: true }
  }

  const token = await getWechatAccessToken()
  const res = await fetch(
    `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        touser: input.openid,
        template_id: input.templateId,
        page: input.page,
        data: input.data,
      }),
    },
  )

  const result = (await res.json()) as { errcode: number; errmsg?: string; [key: string]: any }
  if (result.errcode !== 0) {
    throw new Error(`发送订阅消息失败：${result.errmsg || result.errcode}`)
  }
  return result
}
