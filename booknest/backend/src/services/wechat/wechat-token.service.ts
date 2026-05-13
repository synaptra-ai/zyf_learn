import redis from '../../lib/redis'

const KEY = 'wechat:access_token'

export async function getWechatAccessToken() {
  const cached = await redis.get(KEY)
  if (cached) return cached

  const url = new URL('https://api.weixin.qq.com/cgi-bin/token')
  url.searchParams.set('grant_type', 'client_credential')
  url.searchParams.set('appid', process.env.WECHAT_APP_ID!)
  url.searchParams.set('secret', process.env.WECHAT_APP_SECRET!)

  const res = await fetch(url)
  const data = (await res.json()) as {
    access_token?: string
    expires_in?: number
    errcode?: number
    errmsg?: string
  }

  if (!data.access_token) {
    throw new Error(`获取微信 access_token 失败：${data.errmsg || data.errcode}`)
  }

  await redis.set(KEY, data.access_token, 'EX', Math.max((data.expires_in || 7200) - 300, 60))
  return data.access_token
}
