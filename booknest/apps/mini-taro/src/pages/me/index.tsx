import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useAuthStore } from '@/stores/auth-store'
import { recordCustomerServiceEvent } from '@/services/customer-service'
import './index.scss'

export default function MePage() {
  const user = useAuthStore((s) => s.user)

  const handleLogout = () => {
    useAuthStore.getState().logout()
    Taro.reLaunch({ url: '/pages/login/index' })
  }

  const handleCustomerService = async () => {
    await recordCustomerServiceEvent({ scene: 'GENERAL_INQUIRY' })
    Taro.showToast({ title: '客服上下文已记录', icon: 'success' })
  }

  return (
    <View className="me">
      <View className="me__header">
        <View className="me__avatar">
          <Text className="me__avatar-text">{user?.nickname?.[0] || user?.email?.[0] || 'B'}</Text>
        </View>
        <View className="me__info">
          <Text className="me__name">{user?.nickname || user?.email || 'BookNest 用户'}</Text>
          <Text className="me__email">{user?.email || '未登录'}</Text>
        </View>
      </View>

      <View className="me__menu">
        <View
          className="me__menu-item"
          onClick={() => Taro.navigateTo({ url: '/pages/admin/content-security/index' })}
        >
          <Text className="me__menu-text">内容审核管理</Text>
          <Text className="me__menu-arrow">›</Text>
        </View>
        <View className="me__menu-item" onClick={handleCustomerService}>
          <Text className="me__menu-text">联系客服</Text>
          <Text className="me__menu-arrow">›</Text>
        </View>
        <View className="me__menu-item" onClick={handleLogout}>
          <Text className="me__menu-text">退出登录</Text>
          <Text className="me__menu-arrow">›</Text>
        </View>
      </View>
    </View>
  )
}
