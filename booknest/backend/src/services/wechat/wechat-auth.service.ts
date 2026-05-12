import crypto from 'node:crypto'

interface Code2SessionResult {
  openid: string
  session_key: string
  unionid?: string
  errcode?: number
  errmsg?: string
}

export async function code2Session(code: string): Promise<Code2SessionResult> {
  if (process.env.WECHAT_LOGIN_MODE === 'mock') {
    return {
      openid: `mock-openid-${code}`,
      session_key: 'mock-session-key',
      unionid: `mock-unionid-${code}`,
    }
  }

  const url = new URL('https://api.weixin.qq.com/sns/jscode2session')
  url.searchParams.set('appid', process.env.WECHAT_APP_ID!)
  url.searchParams.set('secret', process.env.WECHAT_APP_SECRET!)
  url.searchParams.set('js_code', code)
  url.searchParams.set('grant_type', 'authorization_code')

  const res = await fetch(url)
  const data = (await res.json()) as Code2SessionResult

  if (data.errcode) {
    throw new Error(`微信登录失败：${data.errmsg || data.errcode}`)
  }

  return data
}

export function hashSessionKey(sessionKey: string) {
  return crypto.createHash('sha256').update(sessionKey).digest('hex')
}
