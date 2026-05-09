import { useNavigate } from 'react-router-dom'
import { List } from 'react-window'
import { Badge } from '@/components/ui/Badge'
import type { BookItem } from '@/hooks/useBooks'

const statusLabel: Record<BookItem['status'], 'owned' | 'reading' | 'finished' | 'wishlist'> = {
  OWNED: 'owned',
  READING: 'reading',
  FINISHED: 'finished',
  WISHLIST: 'wishlist',
}

const statusText: Record<BookItem['status'], string> = {
  OWNED: '已拥有',
  READING: '在读',
  FINISHED: '已读完',
  WISHLIST: '想读',
}

interface BookTableProps {
  books: BookItem[]
  getCategory: (id?: string) => { id: string; name: string; color: string } | undefined
}

const ROW_HEIGHT = 52

interface RowData {
  books: BookItem[]
  getCategory: (id?: string) => { id: string; name: string; color: string } | undefined
  navigate: (path: string) => void
}

function Row({ index, style, books, getCategory, navigate }: RowData & {
  index: number
  style: React.CSSProperties
}) {
  const book = books[index]
  const category = getCategory(book.categoryId ?? undefined)
  return (
    <div
      style={style}
      onClick={() => navigate(`/books/${book.id}`)}
      className="flex cursor-pointer items-center border-b border-gray-100 dark:border-gray-700 px-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
    >
      <span className="w-[30%] truncate font-medium text-gray-900 dark:text-gray-100">{book.title}</span>
      <span className="w-[20%] truncate text-gray-500 dark:text-gray-400">{book.author}</span>
      <span className="w-[15%]">
        <Badge variant={statusLabel[book.status]}>{statusText[book.status]}</Badge>
      </span>
      <span className="w-[20%]">
        {category ? (
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: category.color + '20', color: category.color }}
          >
            {category.name}
          </span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500">-</span>
        )}
      </span>
      <span className="w-[15%] text-gray-500 dark:text-gray-400">
        {new Date(book.createdAt).toLocaleDateString()}
      </span>
    </div>
  )
}

export function BookTable({ books, getCategory }: BookTableProps) {
  const navigate = useNavigate()

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3">
        <span className="w-[30%] text-sm font-medium text-gray-500 dark:text-gray-400">书名</span>
        <span className="w-[20%] text-sm font-medium text-gray-500 dark:text-gray-400">作者</span>
        <span className="w-[15%] text-sm font-medium text-gray-500 dark:text-gray-400">状态</span>
        <span className="w-[20%] text-sm font-medium text-gray-500 dark:text-gray-400">分类</span>
        <span className="w-[15%] text-sm font-medium text-gray-500 dark:text-gray-400">添加时间</span>
      </div>
      {books.length > 0 && (
        <List
          rowComponent={Row as any}
          rowCount={books.length}
          rowHeight={ROW_HEIGHT}
          rowProps={{ books, getCategory, navigate } as any}
          style={{ height: Math.min(books.length * ROW_HEIGHT, 520), overflow: 'auto' }}
        />
      )}
    </div>
  )
}
