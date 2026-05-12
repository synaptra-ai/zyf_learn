import { Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import './index.scss'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = () => {
    if (!email || !password) {
      Taro.showToast({ title: '请输入邮箱和密码', icon: 'none' })
      return
    }
    Taro.showToast({ title: '登录成功 (mock)', icon: 'success' })
    setTimeout(() => Taro.switchTab({ url: '/pages/index/index' }), 1500)
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
            type="safe-password"
            placeholder="请输入密码"
            value={password}
            onInput={(e) => setPassword(e.detail.value)}
          />
        </View>

        <View className="login__btn" onClick={handleLogin}>
          <Text className="login__btn-text">登录</Text>
        </View>
      </View>
    </View>
  )
}
