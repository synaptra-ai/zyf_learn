import { Text, View } from '@tarojs/components'
import { useEffect, useState } from 'react'
import { getDashboard, type DashboardData, getHeatmap, type HeatmapEntry } from '@/services/stats-dashboard'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { LoadingState } from '@/components/LoadingState'
import './index.scss'

const STATUS_LABELS: Record<string, string> = {
  OWNED: '已拥有',
  READING: '在读',
  FINISHED: '已读完',
  WISHLIST: '想读',
}

const STATUS_COLORS: Record<string, string> = {
  OWNED: '#64748b',
  READING: '#3b82f6',
  FINISHED: '#22c55e',
  WISHLIST: '#f59e0b',
}

export default function StatsPage() {
  const token = useAuthStore((s) => s.token)
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const [data, setData] = useState<DashboardData | null>(null)
  const [heatmap, setHeatmap] = useState<HeatmapEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token && activeWorkspaceId) {
      setLoading(true)
      Promise.all([getDashboard(), getHeatmap()])
        .then(([dashboard, heatmapData]) => {
          setData(dashboard)
          setHeatmap(heatmapData)
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [token, activeWorkspaceId])

  if (loading) return <LoadingState text="加载统计数据..." />
  if (!data) return <View><Text>暂无数据</Text></View>

  const totalStatus = data.statusDistribution.reduce((sum, s) => sum + s.count, 0)

  return (
    <View className="stats">
      {/* 总览卡片 */}
      <View className="stats__overview">
        <View className="stats__overview-card">
          <Text className="stats__overview-num">{data.total.books}</Text>
          <Text className="stats__overview-label">总藏书</Text>
        </View>
        <View className="stats__overview-card">
          <Text className="stats__overview-num">{data.total.finished}</Text>
          <Text className="stats__overview-label">已读完</Text>
        </View>
        <View className="stats__overview-card">
          <Text className="stats__overview-num">{data.streak.days}</Text>
          <Text className="stats__overview-label">连续天数</Text>
        </View>
        <View className="stats__overview-card">
          <Text className="stats__overview-num">{Math.round(data.total.minutes / 60)}</Text>
          <Text className="stats__overview-label">总小时</Text>
        </View>
      </View>

      {/* 本月概览 */}
      <View className="stats__section">
        <Text className="stats__section-title">{data.monthly.month} 月度</Text>
        <View className="stats__month-row">
          <View className="stats__month-item">
            <Text className="stats__month-num">{data.monthly.finishedBooks}</Text>
            <Text className="stats__month-label">本月读完</Text>
          </View>
          <View className="stats__month-item">
            <Text className="stats__month-num">{data.monthly.totalMinutes}</Text>
            <Text className="stats__month-label">阅读分钟</Text>
          </View>
        </View>
      </View>

      {/* 状态分布 */}
      <View className="stats__section">
        <Text className="stats__section-title">书籍状态分布</Text>
        <View className="stats__bar-chart">
          {data.statusDistribution.map((s) => (
            <View key={s.status} className="stats__bar-row">
              <Text className="stats__bar-label">{STATUS_LABELS[s.status] || s.status}</Text>
              <View className="stats__bar-track">
                <View
                  className="stats__bar-fill"
                  style={{
                    width: `${totalStatus > 0 ? (s.count / totalStatus) * 100 : 0}%`,
                    background: STATUS_COLORS[s.status] || '#64748b',
                  }}
                />
              </View>
              <Text className="stats__bar-count">{s.count}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 分类统计 */}
      <View className="stats__section">
        <Text className="stats__section-title">分类阅读统计</Text>
        <View className="stats__categories">
          {data.categoryStats.slice(0, 8).map((cat) => {
            const maxCount = Math.max(...data.categoryStats.map((c) => c.count), 1)
            return (
              <View key={cat.id} className="stats__cat-row">
                <View className="stats__cat-dot" style={{ background: cat.color }} />
                <Text className="stats__cat-name">{cat.name}</Text>
                <View className="stats__cat-bar-track">
                  <View
                    className="stats__cat-bar-fill"
                    style={{ width: `${(cat.count / maxCount) * 100}%`, background: cat.color }}
                  />
                </View>
                <Text className="stats__cat-count">{cat.count}本</Text>
              </View>
            )
          })}
        </View>
      </View>

      {/* 阅读热力图 */}
      {heatmap.length > 0 && (
        <View className="stats__section">
          <Text className="stats__section-title">阅读热力图</Text>
          <View className="stats__heatmap">
            {heatmap.map((entry) => {
              const intensity = Math.min(entry.minutes / 30, 1)
              const bg = entry.minutes === 0
                ? '#E6E0D8'
                : `rgba(196, 149, 106, ${0.2 + intensity * 0.8})`
              return (
                <View
                  key={entry.date}
                  className="stats__heatmap-cell"
                  style={{ background: bg }}
                />
              )
            })}
          </View>
          <View className="stats__heatmap-legend">
            <Text className="stats__heatmap-legend-text">少</Text>
            <View className="stats__heatmap-cell" style={{ background: '#E6E0D8' }} />
            <View className="stats__heatmap-cell" style={{ background: 'rgba(196, 149, 106, 0.2)' }} />
            <View className="stats__heatmap-cell" style={{ background: 'rgba(196, 149, 106, 0.5)' }} />
            <View className="stats__heatmap-cell" style={{ background: 'rgba(196, 149, 106, 0.8)' }} />
            <View className="stats__heatmap-cell" style={{ background: 'rgba(196, 149, 106, 1)' }} />
            <Text className="stats__heatmap-legend-text">多</Text>
          </View>
        </View>
      )}
    </View>
  )
}
