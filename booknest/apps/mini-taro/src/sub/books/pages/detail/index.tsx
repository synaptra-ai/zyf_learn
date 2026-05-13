import { Image, Input, Text, Textarea, View } from '@tarojs/components'
import Taro, { useShareAppMessage, useRouter } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { StatusBadge } from '@/components/StatusBadge'
import { LoadingState } from '@/components/LoadingState'
import { getBook, deleteBook } from '@/services/books'
import { listReviews, createReview, type Review } from '@/services/reviews'
import { listWorkspaces } from '@/services/workspaces'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { canEditBook, canDeleteBook } from '@/utils/permissions'
import type { Book } from '@booknest/domain'
import './index.scss'

export default function BookDetailPage() {
  const router = useRouter()
  const id = router.params.id!
  const token = useAuthStore((s) => s.token)
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)

  const [book, setBook] = useState<Book | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [workspaces, setWorkspaces] = useState<any[]>([])

  // 评论表单
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  const loadData = async () => {
    try {
      const [bookData, reviewData] = await Promise.all([
        getBook(id),
        listReviews(id).catch(() => []),
      ])
      setBook(bookData)
      setReviews(reviewData as Review[])
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [id])

  useEffect(() => {
    if (token) listWorkspaces().then(setWorkspaces).catch(() => {})
  }, [token])

  const activeRole = workspaces.find((w) => w.id === activeWorkspaceId)?.members?.[0]?.role
  const showEdit = canEditBook(activeRole)
  const showDelete = canDeleteBook(activeRole)

  useShareAppMessage(() => ({
    title: book ? `推荐一本书：${book.title}` : 'BookNest 书籍详情',
    path: `/sub/books/pages/detail/index?id=${id}`,
    imageUrl: book?.coverUrl || undefined,
  }))

  const handleDelete = async () => {
    const { confirm } = await Taro.showModal({
      title: '确认删除',
      content: `确定要删除《${book?.title}》吗？`,
    })
    if (!confirm) return
    try {
      await deleteBook(id)
      Taro.showToast({ title: '已删除', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 1000)
    } catch {}
  }

  const handleSubmitReview = async () => {
    if (!comment.trim()) return Taro.showToast({ title: '请输入评论内容', icon: 'none' })
    if (submittingReview) return
    setSubmittingReview(true)
    try {
      await createReview(id, { rating, comment: comment.trim() })
      Taro.showToast({ title: '评论成功', icon: 'success' })
      setComment('')
      setRating(5)
      loadData()
    } catch {} finally {
      setSubmittingReview(false)
    }
  }

  if (loading || !book) return <LoadingState text="加载中..." />

  return (
    <View className="detail">
      <View className="detail__header">
        {book.coverUrl ? (
          <Image className="detail__cover" src={book.coverUrl} mode="aspectFill" />
        ) : (
          <View className="detail__cover detail__cover--placeholder">
            <Text className="detail__cover-text">{book.title[0]}</Text>
          </View>
        )}
        <View className="detail__info">
          <Text className="detail__title">{book.title}</Text>
          <Text className="detail__author">{book.author}</Text>
          <StatusBadge status={book.status} />
        </View>
      </View>

      {book.description && (
        <View className="detail__section">
          <Text className="detail__section-title">简介</Text>
          <Text className="detail__desc">{book.description}</Text>
        </View>
      )}

      <View className="detail__section">
        <Text className="detail__section-title">详细信息</Text>
        <View className="detail__meta">
          {book.isbn && (
            <View className="detail__meta-row">
              <Text className="detail__meta-label">ISBN</Text>
              <Text className="detail__meta-value">{book.isbn}</Text>
            </View>
          )}
          {book.pageCount && (
            <View className="detail__meta-row">
              <Text className="detail__meta-label">页数</Text>
              <Text className="detail__meta-value">{book.pageCount}</Text>
            </View>
          )}
          {book.category && (
            <View className="detail__meta-row">
              <Text className="detail__meta-label">分类</Text>
              <Text className="detail__meta-value" style={{ color: book.category.color }}>
                {book.category.name}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* 评论区 */}
      <View className="detail__section">
        <Text className="detail__section-title">评论 ({reviews.length})</Text>

        {reviews.length > 0 ? (
          <View className="detail__reviews">
            {reviews.map((r) => (
              <View key={r.id} className="detail__review">
                <View className="detail__review-header">
                  <Text className="detail__review-user">{r.user?.name || '用户'}</Text>
                  <Text className="detail__review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</Text>
                </View>
                <Text className="detail__review-comment">{r.comment}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text className="detail__empty-reviews">暂无评论</Text>
        )}

        {token && (
          <View className="detail__review-form">
            <View className="detail__rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <Text
                  key={n}
                  className={`detail__star ${n <= rating ? 'detail__star--active' : ''}`}
                  onClick={() => setRating(n)}
                >
                  ★
                </Text>
              ))}
            </View>
            <Textarea
              className="detail__review-input"
              placeholder="写下你的读后感..."
              value={comment}
              onInput={(e) => setComment(e.detail.value)}
              maxlength={500}
            />
            <View className="detail__review-submit" onClick={handleSubmitReview}>
              <Text className="detail__review-submit-text">{submittingReview ? '提交中...' : '发表评论'}</Text>
            </View>
          </View>
        )}
      </View>

      {(showEdit || showDelete) && (
        <View className="detail__actions">
          {showEdit && (
            <View
              className="detail__btn detail__btn--primary"
              onClick={() => Taro.navigateTo({ url: `/sub/books/pages/form/index?id=${book.id}` })}
            >
              <Text className="detail__btn-text">编辑</Text>
            </View>
          )}
          {showDelete && (
            <View className="detail__btn detail__btn--danger" onClick={handleDelete}>
              <Text className="detail__btn-text">删除</Text>
            </View>
          )}
        </View>
      )}
    </View>
  )
}
