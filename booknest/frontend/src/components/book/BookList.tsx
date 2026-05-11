import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, LayoutGrid, List } from 'lucide-react'
import { useBooks } from '@/hooks/useBooks'
import { useCategories } from '@/hooks/useCategories'
import { useAuthStore } from '@/stores/useAuthStore'
import { Button } from '@/components/ui/Button'
import { BookCard } from './BookCard'
import { BookTable } from './BookTable'
import { BookListSkeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { WelcomeModal } from '@/components/ui/WelcomeModal'
import type { BookStatus } from '@/types'

const statusTabs: { value: BookStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '全部' },
  { value: 'OWNED', label: '已拥有' },
  { value: 'READING', label: '在读' },
  { value: 'FINISHED', label: '已读完' },
  { value: 'WISHLIST', label: '想读' },
]

export function BookListView() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const userName = useAuthStore((s) => s.user?.name)
  const [showWelcome, setShowWelcome] = useState(searchParams.get('welcome') === 'true')

  const closeWelcome = () => {
    setShowWelcome(false)
    searchParams.delete('welcome')
    setSearchParams(searchParams, { replace: true })
  }

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<BookStatus | 'ALL'>('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [page, setPage] = useState(1)
  const pageSize = 12
  const tablePageSize = 50

  const { data, isLoading, isError, error, refetch } = useBooks({
    page,
    pageSize: viewMode === 'table' ? tablePageSize : pageSize,
    ...(statusFilter !== 'ALL' && { status: statusFilter }),
    ...(categoryFilter !== 'ALL' && { categoryId: categoryFilter }),
  })

  const { data: categories = [] } = useCategories()

  const getCategory = (id?: string) => categories.find((c) => c.id === id)

  const items = data?.items ?? []
  const totalPages = data?.totalPages ?? 1

  // 客户端搜索过滤（标题/作者关键词）
  const filtered = query
    ? items.filter(
        (b) =>
          b.title.toLowerCase().includes(query.toLowerCase()) ||
          b.author.toLowerCase().includes(query.toLowerCase())
      )
    : items

  return (
    <div className="space-y-4">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">我的书籍</h1>
        <Button data-testid="create-book-link" onClick={() => navigate('/books/new')}>
          <Plus className="mr-1 h-4 w-4" />
          添加书籍
        </Button>
      </div>

      {/* 搜索 + 过滤 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            data-testid="book-search"
            placeholder="搜索书名或作者..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-9 pr-3 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
          className="h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        >
          <option value="ALL">全部分类</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        <div className="flex rounded-md border border-gray-300 dark:border-gray-600">
          <button
            onClick={() => setViewMode('grid')}
            className={`rounded-l-md px-3 py-2 ${
              viewMode === 'grid' ? 'bg-primary-50 text-primary-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`rounded-r-md px-3 py-2 ${
              viewMode === 'table' ? 'bg-primary-50 text-primary-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 状态过滤 Tab */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatusFilter(tab.value); setPage(1) }}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === tab.value
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      {isLoading ? (
        <BookListSkeleton count={pageSize} />
      ) : isError ? (
        <ErrorState message={error?.message} onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
          <Search className="mb-3 h-12 w-12" />
          <p className="text-lg font-medium">
            {data?.total === 0
              ? '还没有书籍，点击添加你的第一本书'
              : '没有找到匹配的书籍'}
          </p>
          {data?.total === 0 && (
            <Button data-testid="create-book-link" className="mt-4" onClick={() => navigate('/books/new')}>
              <Plus className="mr-1 h-4 w-4" />
              添加书籍
            </Button>
          )}
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div data-testid="book-list" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((book) => (
                <BookCard key={book.id} book={book} category={book.category ?? getCategory(book.categoryId ?? undefined)} />
              ))}
            </div>
          ) : (
            <BookTable books={filtered} getCategory={(id) => {
              const b = items.find((b) => b.categoryId === id)
              return b?.category ?? getCategory(id)
            }} />
          )}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                上一页
              </Button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                第 {page} / {totalPages} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </>
      )}

      <WelcomeModal open={showWelcome} onClose={closeWelcome} userName={userName} />
    </div>
  )
}
