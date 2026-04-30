import { useStats } from '@/hooks/useStats'
import { useCategories } from '@/hooks/useCategories'
import { BookOpen, Bookmark, CheckCircle, Heart, Library, Loader2 } from 'lucide-react'

const statusConfig = [
  { key: 'OWNED', label: '已拥有', color: 'bg-blue-500', icon: Library },
  { key: 'READING', label: '在读', color: 'bg-yellow-500', icon: Bookmark },
  { key: 'FINISHED', label: '已读完', color: 'bg-green-500', icon: CheckCircle },
  { key: 'WISHLIST', label: '想读', color: 'bg-purple-500', icon: Heart },
]

export default function Stats() {
  const { data: stats, isLoading: statsLoading } = useStats()
  const { data: categories = [] } = useCategories()

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!stats || stats.totalBooks === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">统计仪表盘</h1>
        <div className="py-16 text-center text-gray-400 dark:text-gray-500">
          <BookOpen className="mx-auto mb-3 h-12 w-12" />
          <p>还没有数据，添加书籍后即可查看统计</p>
        </div>
      </div>
    )
  }

  const finishedCount = stats.statusBreakdown['FINISHED'] ?? 0
  const finishedRate = stats.totalBooks > 0
    ? Math.round((finishedCount / stats.totalBooks) * 100)
    : 0

  const byStatus = statusConfig.map((s) => ({
    ...s,
    count: stats.statusBreakdown[s.key] ?? 0,
  }))

  const maxCount = Math.max(...byStatus.map((s) => s.count), 1)

  const byCategory = categories.map((cat) => ({
    ...cat,
    count: cat._count?.books ?? 0,
  })).filter((c) => c.count > 0)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">统计仪表盘</h1>

      {/* 概览卡片 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {byStatus.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.key} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <Icon className="h-4 w-4" />
                <span className="text-sm">{s.label}</span>
              </div>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{s.count}</p>
            </div>
          )
        })}
      </div>

      {/* 状态分布柱状图 */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">状态分布</h2>
        <div className="space-y-3">
          {byStatus.map((s) => (
            <div key={s.key} className="flex items-center gap-3">
              <span className="w-16 text-sm text-gray-600 dark:text-gray-300">{s.label}</span>
              <div className="flex-1">
                <div className="h-8 rounded bg-gray-100 dark:bg-gray-700">
                  <div
                    className={`h-full rounded ${s.color} transition-all`}
                    style={{ width: `${Math.max((s.count / maxCount) * 100, s.count > 0 ? 8 : 0)}%` }}
                  />
                </div>
              </div>
              <span className="w-8 text-right text-sm font-medium text-gray-700 dark:text-gray-300">{s.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 阅读完成率 */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">阅读完成率</h2>
        <div className="flex items-center gap-4">
          <div className="relative h-24 w-24">
            <svg className="h-24 w-24 -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke="#E5E7EB" strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke="#10B981" strokeWidth="3"
                strokeDasharray={`${finishedRate}, 100`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-gray-900 dark:text-gray-100">
              {finishedRate}%
            </span>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p>共 {stats.totalBooks} 本书</p>
            <p>已读完 {finishedCount} 本</p>
            {stats.averageRating !== null && (
              <p>平均评分 {stats.averageRating}</p>
            )}
          </div>
        </div>
      </div>

      {/* 分类分布 */}
      {byCategory.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">分类分布</h2>
          <div className="space-y-2">
            {byCategory.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-300">{cat.name}</span>
                <span className="ml-auto text-sm font-medium text-gray-700 dark:text-gray-300">{cat.count} 本</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 最近添加 */}
      {stats.recentBooks.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">最近添加</h2>
          <div className="space-y-3">
            {stats.recentBooks.map((book) => (
              <div key={book.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{book.title}</span>
                  <span className="ml-2 text-gray-400 dark:text-gray-500">{book.author}</span>
                </div>
                <span className="text-gray-400 dark:text-gray-500">
                  {new Date(book.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
