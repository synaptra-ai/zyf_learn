import { Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { usePullDownRefresh, useReachBottom } from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'
import { BookCard } from '@/components/BookCard'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'
import { WorkspaceSwitcher } from '@/components/WorkspaceSwitcher'
import { listBooks } from '@/services/books'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { listWorkspaces } from '@/services/workspaces'
import { canCreateBook } from '@/utils/permissions'
import './index.scss'

const PAGE_SIZE = 10

export default function IndexPage() {
  const token = useAuthStore((s) => s.token)
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace)

  useEffect(() => {
    useAuthStore.getState().hydrate()
    useWorkspaceStore.getState().hydrate()
  }, [])

  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>()
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<any[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [booksLoading, setBooksLoading] = useState(false)

  const [workspaces, setWorkspaces] = useState<any[]>([])

  useEffect(() => {
    if (!token) return
    listWorkspaces().then(setWorkspaces).catch(() => {})
  }, [token])

  const activeRole = workspaces.find((w) => w.id === activeWorkspaceId)?.members[0]?.role
  const showFab = canCreateBook(activeRole)

  // 获取书籍列表
  const fetchBooks = async (reset = false) => {
    if (!activeWorkspaceId) return
    setBooksLoading(true)
    try {
      const res = await listBooks({
        page: reset ? 1 : page,
        pageSize: PAGE_SIZE,
        keyword: debouncedKeyword || undefined,
        status: status || undefined,
      })
      if (reset || page === 1) {
        setItems(res.items)
      } else {
        setItems((prev) => [...prev, ...res.items])
      }
      setHasMore(res.items.length >= PAGE_SIZE)
    } catch {} finally {
      setBooksLoading(false)
    }
  }

  useEffect(() => {
    if (activeWorkspaceId) {
      fetchBooks(true)
    }
  }, [activeWorkspaceId, debouncedKeyword, status])

  useEffect(() => {
    if (page > 1 && activeWorkspaceId) {
      fetchBooks()
    }
  }, [page])

  // 自动选择第一个 workspace
  useEffect(() => {
    if (workspaces.length > 0 && !activeWorkspaceId) {
      setActiveWorkspace(workspaces[0].id)
    }
  }, [workspaces, activeWorkspaceId, setActiveWorkspace])

  usePullDownRefresh(async () => {
    setPage(1)
    await fetchBooks(true)
    Taro.stopPullDownRefresh()
  })

  useReachBottom(() => {
    if (hasMore && !booksLoading) {
      setPage((prev) => prev + 1)
    }
  })

  const handleSearch = (value: string) => {
    setKeyword(value)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      setDebouncedKeyword(value)
      setPage(1)
    }, 300)
  }

  const statusFilters = [
    { label: '全部', value: '' },
    { label: '在购', value: 'OWNED' },
    { label: '在读', value: 'READING' },
    { label: '已读', value: 'FINISHED' },
    { label: '想读', value: 'WISHLIST' },
  ]

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

      <View className="page__filters">
        <Input
          className="page__search"
          type="text"
          placeholder="搜索书名或作者"
          value={keyword}
          onInput={(e) => handleSearch(e.detail.value)}
        />
        <ScrollView scrollX className="page__status-bar">
          {statusFilters.map((f) => (
            <View
              key={f.value}
              className={`page__status-chip ${status === f.value ? 'page__status-chip--active' : ''}`}
              onClick={() => { setStatus(f.value); setPage(1) }}
            >
              <Text>{f.label}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {!activeWorkspaceId ? (
        <LoadingState text="加载中..." />
      ) : booksLoading && page === 1 ? (
        <LoadingState text="加载中..." />
      ) : items.length > 0 ? (
        <ScrollView scrollY className="book-list">
          {items.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
          {booksLoading && <LoadingState text="加载更多..." />}
          {!hasMore && items.length > PAGE_SIZE && (
            <Text className="page__nomore">没有更多了</Text>
          )}
        </ScrollView>
      ) : (
        <EmptyState
          title="还没有书籍"
          description="点击下方按钮添加第一本书"
          actionText="添加书籍"
          onAction={() => Taro.navigateTo({ url: '/sub/books/pages/form/index' })}
        />
      )}

      {showFab && (
        <View
          className="fab"
          onClick={() => Taro.navigateTo({ url: '/sub/books/pages/form/index' })}
        >
          <Text className="fab__text">+</Text>
        </View>
      )}
    </View>
  )
}
