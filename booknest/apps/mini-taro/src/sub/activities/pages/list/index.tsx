import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { listActivities, type Activity } from '@/services/activities'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'
import './index.scss'

export default function ActivityListPage() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeWorkspaceId) return
    listActivities()
      .then(setActivities)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [activeWorkspaceId])

  if (loading) return <LoadingState text="加载中..." />

  return (
    <View className="act-list">
      <View className="act-list__header">
        <Text className="act-list__title">读书会活动</Text>
      </View>

      {activities.length > 0 ? (
        <View className="act-list__cards">
          {activities.map((act) => (
            <View
              key={act.id}
              className="act-list__card"
              onClick={() => Taro.navigateTo({ url: `/sub/activities/pages/detail/index?id=${act.id}` })}
            >
              <View className="act-list__card-top">
                <Text className="act-list__card-title">{act.title}</Text>
                <Text className="act-list__card-status">{act.status === 'PUBLISHED' ? '报名中' : act.status}</Text>
              </View>
              {act.description && (
                <Text className="act-list__card-desc">{act.description}</Text>
              )}
              <View className="act-list__card-bottom">
                <Text className="act-list__card-price">
                  {act.priceCents === 0 ? '免费' : `¥${(act.priceCents / 100).toFixed(2)}`}
                </Text>
                <Text className="act-list__card-count">
                  {act.registeredCount}/{act.capacity} 人
                </Text>
                <Text className="act-list__card-time">
                  {new Date(act.startsAt).toLocaleDateString('zh-CN')}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <EmptyState title="暂无活动" description="还没有发布读书会活动" />
      )}
    </View>
  )
}
