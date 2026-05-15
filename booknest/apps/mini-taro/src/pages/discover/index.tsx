import { Text, View } from '@tarojs/components'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { RecommendSection } from '@/components/RecommendSection'
import { getDiscoverPage, type DiscoverData } from '@/services/recommendation'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { LoadingState } from '@/components/LoadingState'
import { EmptyState } from '@/components/EmptyState'
import './index.scss'

export default function DiscoverPage() {
  const token = useAuthStore((s) => s.token)
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)

  const [data, setData] = useState<DiscoverData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    if (!token || !activeWorkspaceId) return
    setLoading(true)
    try {
      const res = await getDiscoverPage()
      setData(res)
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    useAuthStore.getState().hydrate()
    useWorkspaceStore.getState().hydrate()
  }, [])

  useEffect(() => {
    if (token && activeWorkspaceId) fetchData()
  }, [token, activeWorkspaceId])

  usePullDownRefresh(async () => {
    await fetchData()
    Taro.stopPullDownRefresh()
  })

  if (loading) return <LoadingState text="发现好书中..." />

  if (!data) {
    return (
      <EmptyState
        title="暂无推荐"
        description="添加更多书籍后获取个性化推荐"
      />
    )
  }

  const hasContent =
    data.continueReading.length > 0 ||
    data.forYou.length > 0 ||
    data.categoryPicks.length > 0

  if (!hasContent) {
    return (
      <EmptyState
        title="暂无推荐"
        description="添加更多书籍后获取个性化推荐"
      />
    )
  }

  return (
    <View className="discover">
      <View className="discover__header">
        <Text className="discover__title">发现</Text>
        <Text className="discover__subtitle">根据你的阅读偏好推荐</Text>
      </View>

      <RecommendSection
        title="继续阅读"
        books={data.continueReading}
        showProgress
      />

      <RecommendSection title="你可能喜欢" books={data.forYou} />

      {data.categoryPicks.map((pick) => (
        <RecommendSection
          key={pick.category.id}
          title={`${pick.category.name}精选`}
          books={pick.books}
        />
      ))}
    </View>
  )
}
