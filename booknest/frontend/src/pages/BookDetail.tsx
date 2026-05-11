import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, BookOpen, Hash, FileText, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { useBook, useDeleteBook } from '@/hooks/useBooks'
import { useReviews } from '@/hooks/useReviews'
import { ReviewForm } from '@/components/book/ReviewForm'
import { BookListSkeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { Star } from 'lucide-react'

const statusVariant = { OWNED: 'owned', READING: 'reading', FINISHED: 'finished', WISHLIST: 'wishlist' } as const
const statusText = { OWNED: '已拥有', READING: '在读', FINISHED: '已读完', WISHLIST: '想读' } as const

export default function BookDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: book, isLoading, isError, error, refetch } = useBook(id!)
  const { data: reviews = [] } = useReviews(id!)
  const deleteBook = useDeleteBook()
  const [showDelete, setShowDelete] = useState(false)

  if (isLoading) return <BookListSkeleton count={1} />

  if (isError || !book) {
    return <ErrorState message={error?.message || '书籍不存在'} onRetry={() => refetch()} />
  }

  const handleDelete = () => {
    deleteBook.mutate(book.id, { onSuccess: () => navigate('/') })
  }

  return (
    <div className="space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">书籍详情</h1>
        </div>
        <div className="flex gap-2">
          <Button data-testid="edit-book" variant="outline" onClick={() => navigate(`/books/${book.id}/edit`)}>
            <Pencil className="mr-1 h-4 w-4" />
            编辑
          </Button>
          <Button data-testid="delete-book" variant="destructive" onClick={() => setShowDelete(true)}>
            <Trash2 className="mr-1 h-4 w-4" />
            删除
          </Button>
        </div>
      </div>

      {/* 书籍信息卡片 */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex gap-6">
          <div className="flex h-40 w-28 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
            {book.coverUrl ? (
              <img data-testid="book-cover-image" src={book.coverUrl} alt={book.title} className="h-full w-full rounded-lg object-cover" />
            ) : (
              <BookOpen className="h-12 w-12 text-gray-400 dark:text-gray-500" />
            )}
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{book.title}</h2>
              <p className="text-gray-500 dark:text-gray-400">{book.author}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={statusVariant[book.status as keyof typeof statusVariant]}>
                {statusText[book.status as keyof typeof statusText]}
              </Badge>
              {book.category && (
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: book.category.color + '20', color: book.category.color }}
                >
                  {book.category.name}
                </span>
              )}
            </div>
            {book.isbn && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Hash className="h-4 w-4" /> ISBN: {book.isbn}
              </div>
            )}
            {book.pageCount && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <FileText className="h-4 w-4" /> {book.pageCount} 页
              </div>
            )}
          </div>
        </div>
        {book.description && (
          <div className="mt-6 border-t border-gray-100 pt-4 dark:border-gray-700">
            <h3 className="mb-2 font-medium text-gray-700 dark:text-gray-300">简介</h3>
            <p className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">{book.description}</p>
          </div>
        )}
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <Calendar className="h-3.5 w-3.5" />
          添加于 {new Date(book.createdAt).toLocaleString()}
          {book.updatedAt !== book.createdAt && (
            <> · 更新于 {new Date(book.updatedAt).toLocaleString()}</>
          )}
        </div>
      </div>

      {/* 评论区域 */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-bold">评论 ({reviews.length})</h3>
        <ReviewForm bookId={book.id} />
        {reviews.length > 0 ? (
          <div className="mt-4 space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{review.user.name}</span>
                  <span className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                      />
                    ))}
                  </span>
                  <span className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                </div>
                {review.text && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{review.text}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-400">暂无评论，来写第一条吧</p>
        )}
      </div>

      {/* 删除确认弹窗 */}
      <Modal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        title="确认删除"
        onConfirm={handleDelete}
        confirmText="删除"
      >
        <p>确定要删除《{book.title}》吗？此操作不可撤销。</p>
      </Modal>
    </div>
  )
}
