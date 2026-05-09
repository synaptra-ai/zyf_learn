import { useNavigate } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
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

interface BookCardProps {
  book: BookItem
  category?: { id: string; name: string; color: string }
}

export function BookCard({ book, category }: BookCardProps) {
  const navigate = useNavigate()

  return (
    <Card
      className="cursor-pointer border-gray-200 transition-shadow hover:shadow-md dark:border-gray-600"
      onClick={() => navigate(`/books/${book.id}`)}
    >
      <div className="p-4">
        <div className="flex gap-4">
          <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded bg-gray-100 dark:bg-gray-700">
            {book.coverUrl ? (
              <img
                src={book.coverUrl}
                alt={book.title}
                className="h-full w-full rounded object-cover"
              />
            ) : (
              <BookOpen className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-gray-900 dark:text-gray-100">{book.title}</h3>
            <p className="truncate text-sm text-gray-500 dark:text-gray-400">{book.author}</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant={statusLabel[book.status]}>
                {statusText[book.status]}
              </Badge>
              {category && (
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: category.color + '20',
                    color: category.color,
                  }}
                >
                  {category.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
