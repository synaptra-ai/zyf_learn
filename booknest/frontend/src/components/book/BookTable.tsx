import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import type { Book, Category } from '@/types'

const statusLabel: Record<Book['status'], 'owned' | 'reading' | 'finished' | 'wishlist'> = {
  OWNED: 'owned',
  READING: 'reading',
  FINISHED: 'finished',
  WISHLIST: 'wishlist',
}

const statusText: Record<Book['status'], string> = {
  OWNED: '已拥有',
  READING: '在读',
  FINISHED: '已读完',
  WISHLIST: '想读',
}

interface BookTableProps {
  books: Book[]
  getCategory: (id?: string) => Category | undefined
}

export function BookTable({ books, getCategory }: BookTableProps) {
  const navigate = useNavigate()

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">书名</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">作者</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">状态</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">分类</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">添加时间</th>
          </tr>
        </thead>
        <tbody>
          {books.map((book) => {
            const category = getCategory(book.categoryId)
            return (
              <tr
                key={book.id}
                onClick={() => navigate(`/books/${book.id}`)}
                className="cursor-pointer border-b border-gray-100 dark:border-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{book.title}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{book.author}</td>
                <td className="px-4 py-3">
                  <Badge variant={statusLabel[book.status]}>
                    {statusText[book.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {category ? (
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: category.color + '20',
                        color: category.color,
                      }}
                    >
                      {category.name}
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  {new Date(book.createdAt).toLocaleDateString()}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
