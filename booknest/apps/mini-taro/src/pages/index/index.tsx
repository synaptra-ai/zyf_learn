import { ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookCard } from '@/components/BookCard'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'
import { WorkspaceSwitcher } from '@/components/WorkspaceSwitcher'
import { useBooks } from '@/hooks/use-books'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { listWorkspaces } from '@/services/workspaces'
import './index.scss'

export default function IndexPage() {
  const token = useAuthStore((s) => s.token)
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace)
  const { data: workspaces = [] } = useQuery({
    queryKey: ['workspaces'],
    queryFn: listWorkspaces,
    enabled: Boolean(token),
  })
  const { data, isLoading } = useBooks(activeWorkspaceId)
  const books = data?.items ?? []

  // 自动选择第一个 workspace
  useEffect(() => {
    if (workspaces.length > 0 && !activeWorkspaceId) {
      setActiveWorkspace(workspaces[0].id)
    }
  }, [workspaces, activeWorkspaceId, setActiveWorkspace])

  if (!token) {
    return (
      <View className="page">
        <View className="page__header">
          <Text className="page__title">BookNest Mini</Text>
          <Text className="page__subtitle">你的团队书架</Text>
        </View>
        <EmptyState
          title="请先登录"
          description="登录后查看你的书架"
          actionText="去登录"
          onAction={() => Taro.navigateTo({ url: '/pages/login/index' })}
        />
      </View>
    )
  }

  return (
    <View className="page">
      <View className="page__header">
        <Text className="page__title">BookNest Mini</Text>
        <WorkspaceSwitcher />
      </View>

      {!activeWorkspaceId ? (
        <LoadingState text="加载中..." />
      ) : isLoading ? (
        <LoadingState text="加载中..." />
      ) : books.length > 0 ? (
        <ScrollView scrollY className="book-list">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </ScrollView>
      ) : (
        <EmptyState
          title="还没有书籍"
          description="点击下方按钮添加第一本书"
          actionText="添加书籍"
          onAction={() => Taro.navigateTo({ url: '/pages/books/form/index' })}
        />
      )}

      <View
        className="fab"
        onClick={() => Taro.navigateTo({ url: '/pages/books/form/index' })}
      >
        <Text className="fab__text">+</Text>
      </View>
    </View>
  )
}
