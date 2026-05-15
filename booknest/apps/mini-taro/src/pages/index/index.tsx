import { Image, Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { usePullDownRefresh, useReachBottom } from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'
import { BookCard } from '@/components/BookCard'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'
import { ReadingCard } from '@/components/ReadingCard'
import { ReadingTimer } from '@/components/ReadingTimer'
import { listBooks } from '@/services/books'
import { listCategories } from '@/services/categories'
import { getReadingSummary } from '@/services/reading'
import type { ReadingSummary } from '@/services/reading'
import { getHomepageRecommendations, type RecommendBook } from '@/services/recommendation'
import { RecommendSection } from '@/components/RecommendSection'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { listWorkspaces } from '@/services/workspaces'
import { canCreateBook } from '@/utils/permissions'
import './index.scss'

const PAGE_SIZE = 10

const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

const getQuote = () => {
  const quotes = [
    '愿今天也有一本书陪你入眠',
    '每一页都是一次安静的旅行',
    '书是灵魂的暖光',
    '在文字里找到属于自己的角落',
    '阅读，是最温柔的独处',
    '翻开书页，世界就安静了',
    '有些故事，只在安静时才能读懂',
    '让书成为你今晚的月光',
  ]
  return quotes[new Date().getDate() % quotes.length]
}

const formatDate = () => {
  const d = new Date()
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  return `${d.getMonth() + 1}月${d.getDate()}日 · 星期${weekDays[d.getDay()]}`
}

export default function IndexPage() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
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
  const [categoryId, setCategoryId] = useState('')
  const [categories, setCategories] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<any[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [booksLoading, setBooksLoading] = useState(false)

  const [readingSummary, setReadingSummary] = useState<ReadingSummary | null>(null)
  const [showTimer, setShowTimer] = useState(false)
  const [recommendations, setRecommendations] = useState<RecommendBook[]>([])

  const [workspaces, setWorkspaces] = useState<any[]>([])

  useEffect(() => {
    if (!token) return
    listWorkspaces().then(setWorkspaces).catch(() => {})
  }, [token])

  useEffect(() => {
    if (activeWorkspaceId) listCategories().then(setCategories).catch(() => {})
  }, [activeWorkspaceId])

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
        categoryId: categoryId || undefined,
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
  }, [activeWorkspaceId, debouncedKeyword, status, categoryId])

  useEffect(() => {
    if (page > 1 && activeWorkspaceId) {
      fetchBooks()
    }
  }, [page])

  // 自动选择第一个 workspace（或修正无效缓存）
  useEffect(() => {
    if (workspaces.length === 0) return
    const valid = workspaces.some((w) => w.id === activeWorkspaceId)
    if (!activeWorkspaceId || !valid) {
      setActiveWorkspace(workspaces[0].id)
    }
  }, [workspaces, activeWorkspaceId, setActiveWorkspace])

  useEffect(() => {
    if (!activeWorkspaceId) return
    getReadingSummary().then(setReadingSummary).catch(() => {})
  }, [activeWorkspaceId])

  useEffect(() => {
    if (!activeWorkspaceId) return
    fetchRecommendations()
  }, [activeWorkspaceId])

  const refreshReading = () => {
    if (!activeWorkspaceId) return
    getReadingSummary().then(setReadingSummary).catch(() => {})
  }

  const fetchRecommendations = () => {
    if (!activeWorkspaceId) return
    getHomepageRecommendations().then((res) => setRecommendations(res.items)).catch(() => {})
  }

  usePullDownRefresh(async () => {
    setPage(1)
    refreshReading()
    fetchRecommendations()
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
        <View className="page__greeting">
          <Text className="page__greeting-text">BookNest Mini</Text>
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
      {/* Hero 氛围区 — 生活场景背景 */}
      <View className="hero">
        <Image
          className="hero__bg"
          src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&h=500&fit=crop"
          mode="aspectFill"
        />
        <View className="hero__overlay" />
        <View className="hero__light" />
        <View className="hero__content">
          <Text className="hero__date">{formatDate()}</Text>
          <Text className="hero__greeting">{getGreeting()}，{user?.nickname || '读者'}</Text>
          <Text className="hero__quote">「{getQuote()}」</Text>
        </View>
      </View>

      {readingSummary && (
        <ReadingCard
          todayMinutes={readingSummary.todayMinutes}
          dailyGoal={readingSummary.dailyGoal}
          streakDays={readingSummary.streakDays}
          goalMet={readingSummary.goalMet}
          onStartReading={() => setShowTimer(true)}
          onViewTimeline={() => Taro.navigateTo({ url: '/sub/reading/pages/timeline/index' })}
        />
      )}
      <ReadingTimer
        books={items}
        visible={showTimer}
        onClose={() => setShowTimer(false)}
        onComplete={() => { refreshReading(); fetchBooks(true) }}
      />

      {recommendations.length > 0 && (
        <RecommendSection title="为你推荐" books={recommendations} />
      )}

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
        {categories.length > 0 && (
          <ScrollView scrollX className="page__status-bar">
            <View
              className={`page__status-chip ${categoryId === '' ? 'page__status-chip--active' : ''}`}
              onClick={() => { setCategoryId(''); setPage(1) }}
            >
              <Text>全部分类</Text>
            </View>
            {categories.map((cat: any) => (
              <View
                key={cat.id}
                className={`page__status-chip ${categoryId === cat.id ? 'page__status-chip--active' : ''}`}
                onClick={() => { setCategoryId(cat.id); setPage(1) }}
              >
                <Text>{cat.name}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {!activeWorkspaceId ? (
        <LoadingState text="加载中..." />
      ) : booksLoading && page === 1 ? (
        <LoadingState text="加载中..." />
      ) : items.length > 0 ? (
        <View>
          {items.length >= 2 && (
            <View className="book-featured">
              <BookCard book={items[0]} variant="featured" />
              <BookCard book={items[1]} variant="featured" />
            </View>
          )}
          {items.length > 2 && (
            <View className="book-grid">
              {items.slice(2).map((book) => (
                <BookCard key={book.id} book={book} variant="grid" />
              ))}
            </View>
          )}
          {items.length === 1 && (
            <View className="book-featured">
              <BookCard book={items[0]} variant="featured" />
            </View>
          )}
          {booksLoading && <LoadingState text="加载更多..." />}
          {!hasMore && items.length > PAGE_SIZE && (
            <Text className="page__nomore">没有更多了</Text>
          )}
        </View>
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
