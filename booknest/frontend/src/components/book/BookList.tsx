import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, LayoutGrid, List } from 'lucide-react'
import { useBookStore } from '@/stores/useBookStore'
import { useCategoryStore } from '@/stores/useCategoryStore'
import { Button } from '@/components/ui/Button'
import { BookCard } from './BookCard'
import { BookTable } from './BookTable'
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
  const books = useBookStore((s) => s.books)
  const categories = useCategoryStore((s) => s.categories)

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<BookStatus | 'ALL'>('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  const filtered = useMemo(() => {
    let result = books

    if (query) {
      const q = query.toLowerCase()
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q)
      )
    }

    if (statusFilter !== 'ALL') {
      result = result.filter((b) => b.status === statusFilter)
    }

    if (categoryFilter !== 'ALL') {
      result = result.filter((b) => b.categoryId === categoryFilter)
    }

    return result
  }, [books, query, statusFilter, categoryFilter])

  const getCategory = (id?: string) => categories.find((c) => c.id === id)

  return (
    <div className="space-y-4">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">我的书籍</h1>
        <Button onClick={() => navigate('/books/new')}>
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
            placeholder="搜索书名或作者..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-9 pr-3 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
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
            onClick={() => setStatusFilter(tab.value)}
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
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
          <Search className="mb-3 h-12 w-12" />
          <p className="text-lg font-medium">
            {books.length === 0
              ? '还没有书籍，点击添加你的第一本书'
              : '没有找到匹配的书籍'}
          </p>
          {books.length === 0 && (
            <Button className="mt-4" onClick={() => navigate('/books/new')}>
              <Plus className="mr-1 h-4 w-4" />
              添加书籍
            </Button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((book) => (
            <BookCard key={book.id} book={book} category={getCategory(book.categoryId)} />
          ))}
        </div>
      ) : (
        <BookTable books={filtered} getCategory={getCategory} />
      )}
    </div>
  )
}
