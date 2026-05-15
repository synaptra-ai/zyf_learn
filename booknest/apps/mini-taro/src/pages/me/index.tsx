import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { recordCustomerServiceEvent } from '@/services/customer-service'
import { getAchievements, type Achievement } from '@/services/achievement'
import { getReadingSummary } from '@/services/reading'
import { getReadingReport } from '@/services/social'
import { WorkspaceSwitcher } from '@/components/WorkspaceSwitcher'
import './index.scss'

export default function MePage() {
  const user = useAuthStore((s) => s.user)
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const [bookCount, setBookCount] = useState(0)
  const [finishedCount, setFinishedCount] = useState(0)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [achievementStats, setAchievementStats] = useState({ unlocked: 0, total: 0 })
  const [streakDays, setStreakDays] = useState(0)
  const [report, setReport] = useState<{ booksFinished: number; totalMinutes: number; achievements: number; period: string } | null>(null)

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
      getAchievements().then((res) => {
        setAchievements(res.achievements)
        setAchievementStats(res.stats)
      }).catch(() => {})
      getReadingSummary().then((res) => setStreakDays(res.streakDays)).catch(() => {})
      getReadingReport().then((r) => setReport(r)).catch(() => {})
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

  Taro.useShareAppMessage(() => {
    if (report) {
      return {
        title: `我的${report.period}阅读报告 — ${report.booksFinished}本书 ${report.totalMinutes}分钟`,
        path: '/pages/index/index',
      }
    }
    return {
      title: 'BookNest — 我的阅读空间',
      path: '/pages/index/index',
    }
  })

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
          <Text className="me__stat-num">{streakDays}</Text>
          <Text className="me__stat-label">连续天数</Text>
        </View>
      </View>

      <View className="me__achievements">
        <View className="me__achievements-header">
          <Text className="me__achievements-title">成就徽章</Text>
          <Text className="me__achievements-count">{achievementStats.unlocked}/{achievementStats.total}</Text>
        </View>
        <View className="me__achievements-progress">
          <View
            className="me__achievements-progress-fill"
            style={{ width: `${achievementStats.total > 0 ? (achievementStats.unlocked / achievementStats.total) * 100 : 0}%` }}
          />
        </View>
        <View className="me__badges">
          {achievements.map((a) => (
            <View
              key={a.id}
              className={`me__badge ${a.unlocked ? 'me__badge--unlocked' : 'me__badge--locked'}`}
            >
              <View className="me__badge-icon">
                <Text className={`me__badge-emoji ${a.unlocked ? '' : 'me__badge-emoji--locked'}`}>{a.icon}</Text>
              </View>
              <Text className="me__badge-name">{a.name}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="me__menu">
        <View className="me__menu-item" onClick={() => {
          if (report) {
            Taro.showShareMenu({ withShareTicket: true })
          }
        }}>
          <Text className="me__menu-text">分享阅读报告</Text>
          <Text className="me__menu-arrow">›</Text>
        </View>
        <View
          className="me__menu-item"
          onClick={() => Taro.navigateTo({ url: '/sub/reading/pages/stats/index' })}
        >
          <Text className="me__menu-text">阅读统计</Text>
          <Text className="me__menu-arrow">›</Text>
        </View>
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
