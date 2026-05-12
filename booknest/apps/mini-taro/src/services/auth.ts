import Taro from '@tarojs/taro'
import { request } from './request'
import { useAuthStore } from '@/stores/auth-store'

interface LoginResponse {
  token: string
  user: {
    id: string
    email?: string | null
    nickname?: string | null
    avatarUrl?: string | null
  }
}

export async function loginByWechat() {
  const loginRes = await Taro.login()
  if (!loginRes.code) throw new Error('未获取到微信登录 code')

  const session = await request<LoginResponse>({
    url: '/api/v1/wechat/login',
    method: 'POST',
    data: { code: loginRes.code },
    auth: false,
  })

  useAuthStore.getState().setSession(session)
  return session
}
