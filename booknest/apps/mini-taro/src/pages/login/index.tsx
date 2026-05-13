import { Button, Input, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useState } from 'react'
import { loginByWechat } from '@/services/auth'
import { request } from '@/services/request'
import { useAuthStore } from '@/stores/auth-store'
import './index.scss'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const navigateAfterLogin = () => {
    const redirect = router.params.redirect
    if (redirect) {
      const url = decodeURIComponent(redirect)
      const tabbarPages = ['/pages/index/index', '/pages/categories/index', '/pages/me/index']
      if (tabbarPages.some((p) => url.startsWith(p))) {
        Taro.reLaunch({ url })
      } else {
        Taro.redirectTo({ url })
      }
    } else {
      Taro.reLaunch({ url: '/pages/index/index' })
    }
  }

  const handleWechatLogin = async () => {
    try {
      setLoading(true)
      await loginByWechat()
      navigateAfterLogin()
    } catch {
      // request adapter 已 showToast
    } finally {
      setLoading(false)
    }
  }

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Taro.showToast({ title: '请输入邮箱和密码', icon: 'none' })
      return
    }
    try {
      setLoading(true)
      const res = await request<{ token: string; user: { id: string; email: string; name: string } }>({
        url: '/api/v1/auth/login',
        method: 'POST',
        data: { email, password },
        auth: false,
      })
      useAuthStore.getState().setSession({ token: res.token, user: { id: res.user.id, email: res.user.email, nickname: res.user.name } })
      navigateAfterLogin()
    } catch {
      // request adapter 已 showToast
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="login">
      <View className="login__header">
        <Text className="login__title">BookNest</Text>
        <Text className="login__subtitle">登录你的账户</Text>
      </View>

      <View className="login__form">
        <View className="login__field">
          <Text className="login__label">邮箱</Text>
          <Input
            className="login__input"
            type="text"
            placeholder="请输入邮箱"
            value={email}
            onInput={(e) => setEmail(e.detail.value)}
          />
        </View>

        <View className="login__field">
          <Text className="login__label">密码</Text>
          <Input
            className="login__input"
            type="text"
            password
            placeholder="请输入密码"
            value={password}
            onInput={(e) => setPassword(e.detail.value)}
          />
        </View>

        <View className="login__btn" onClick={handleEmailLogin}>
          <Text className="login__btn-text">{loading ? '登录中...' : '邮箱登录'}</Text>
        </View>

        <Button
          className="login__wechat-btn"
          type="primary"
          onClick={handleWechatLogin}
          disabled={loading}
        >
          微信一键登录
        </Button>
      </View>
    </View>
  )
}
