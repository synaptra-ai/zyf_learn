import { Input, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { loginByWechat } from '@/services/auth'
import { request } from '@/services/request'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import './index.scss'

const STORAGE_KEY_EMAIL = 'login_saved_email'
const STORAGE_KEY_PASSWORD = 'login_saved_password'
const STORAGE_KEY_REMEMBER = 'login_remember'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Taro.getStorage({ key: STORAGE_KEY_REMEMBER }).then((res) => {
      if (res.data) {
        setRemember(true)
        Taro.getStorage({ key: STORAGE_KEY_EMAIL }).then((r) => setEmail(r.data || '')).catch(() => {})
        Taro.getStorage({ key: STORAGE_KEY_PASSWORD }).then((r) => setPassword(r.data || '')).catch(() => {})
      }
    }).catch(() => {})
  }, [])

  const navigateAfterLogin = () => {
    const redirect = router.params.redirect
    if (redirect) {
      const url = decodeURIComponent(redirect)
      const tabbarPages = ['/pages/index/index', '/pages/categories/index', '/pages/me/index', '/pages/discover/index']
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
    if (!email) {
      Taro.showToast({ title: '请输入邮箱', icon: 'none' })
      return
    }
    if (!password) {
      Taro.showToast({ title: '请输入密码', icon: 'none' })
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

      if (remember) {
        Taro.setStorage({ key: STORAGE_KEY_EMAIL, data: email }).catch(() => {})
        Taro.setStorage({ key: STORAGE_KEY_PASSWORD, data: password }).catch(() => {})
        Taro.setStorage({ key: STORAGE_KEY_REMEMBER, data: true }).catch(() => {})
      } else {
        Taro.removeStorage({ key: STORAGE_KEY_EMAIL }).catch(() => {})
        Taro.removeStorage({ key: STORAGE_KEY_PASSWORD }).catch(() => {})
        Taro.removeStorage({ key: STORAGE_KEY_REMEMBER }).catch(() => {})
      }

      useWorkspaceStore.getState().setActiveWorkspace(null)
      useAuthStore.getState().setSession({ token: res.token, user: { id: res.user.id, email: res.user.email, nickname: res.user.name } })
      navigateAfterLogin()
    } catch (err) {
      const msg = err instanceof Error ? err.message : '登录失败'
      Taro.showToast({ title: msg, icon: 'none' })
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

        <View className="login__remember" onClick={() => setRemember(!remember)}>
          <Text className={`login__checkbox ${remember ? 'login__checkbox--checked' : ''}`}>
            {remember ? '☑' : '☐'}
          </Text>
          <Text className="login__remember-text">记住密码</Text>
        </View>

        <View className="login__btn" onClick={handleEmailLogin}>
          <Text className="login__btn-text">{loading ? '登录中...' : '邮箱登录'}</Text>
        </View>

        <View
          className="login__wechat-btn"
          onClick={handleWechatLogin}
        >
          <Text className="login__wechat-btn-text">{loading ? '登录中...' : '微信一键登录'}</Text>
        </View>
      </View>
    </View>
  )
}
