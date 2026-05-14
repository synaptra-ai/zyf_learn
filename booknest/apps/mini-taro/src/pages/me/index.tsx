import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { recordCustomerServiceEvent } from '@/services/customer-service'
import { WorkspaceSwitcher } from '@/components/WorkspaceSwitcher'
import './index.scss'

export default function MePage() {
  const user = useAuthStore((s) => s.user)
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const [bookCount, setBookCount] = useState(0)
  const [finishedCount, setFinishedCount] = useState(0)

  useEffect(() => {
    if (activeWorkspaceId) {
      import('@/services/books').then(({ listBooks }) => {
        listBooks({ page: 1, pageSize: 1 })
          .then((res) => setBookCount(res.total || 0))
          .catch(() => {})
        listBooks({ page: 1, pageSize: 1, status: 'FINISHED' })
          .then((res) => setFinishedCount(res.total || 0))
          .catch(() => {})
      })
    }
  }, [activeWorkspaceId])

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

      <View className="me__stats">
        <View className="me__stat">
          <Text className="me__stat-num">{bookCount}</Text>
          <Text className="me__stat-label">藏书</Text>
        </View>
        <View className="me__stat">
          <Text className="me__stat-num">{finishedCount}</Text>
          <Text className="me__stat-label">已读</Text>
        </View>
        <View className="me__stat">
          <Text className="me__stat-num">0</Text>
          <Text className="me__stat-label">连续天数</Text>
        </View>
      </View>

      <View className="me__menu">
        <View
          className="me__menu-item"
          onClick={() => Taro.navigateTo({ url: '/sub/activities/pages/list/index' })}
        >
          <Text className="me__menu-text">读书会活动</Text>
          <Text className="me__menu-arrow">›</Text>
        </View>
        <View
          className="me__menu-item"
          onClick={() => Taro.navigateTo({ url: '/sub/admin/pages/content-security/index' })}
        >
          <Text className="me__menu-text">内容审核管理</Text>
          <Text className="me__menu-arrow">›</Text>
        </View>
        <View className="me__menu-item">
          <Text className="me__menu-text">Workspace</Text>
          <WorkspaceSwitcher />
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
