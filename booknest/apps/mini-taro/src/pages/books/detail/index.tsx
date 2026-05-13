import { Image, Text, View } from '@tarojs/components'
import Taro, { useShareAppMessage, useRouter } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { StatusBadge } from '@/components/StatusBadge'
import { LoadingState } from '@/components/LoadingState'
import { getBook } from '@/services/books'
import type { Book } from '@booknest/domain'
import { deleteBook } from '@/services/books'
import { listWorkspaces } from '@/services/workspaces'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { canEditBook, canDeleteBook } from '@/utils/permissions'
import './index.scss'

export default function BookDetailPage() {
  const router = useRouter()
  const id = router.params.id!
  const token = useAuthStore((s) => s.token)
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)

  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [workspaces, setWorkspaces] = useState<any[]>([])

  useEffect(() => {
    getBook(id).then(setBook).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (token) listWorkspaces().then(setWorkspaces).catch(() => {})
  }, [token])

  const activeRole = workspaces.find((w) => w.id === activeWorkspaceId)?.members?.[0]?.role
  const showEdit = canEditBook(activeRole)
  const showDelete = canDeleteBook(activeRole)

  useShareAppMessage(() => ({
    title: book ? `推荐一本书：${book.title}` : 'BookNest 书籍详情',
    path: `/pages/books/detail/index?id=${id}`,
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

  if (loading || !book) {
    return <LoadingState text="加载中..." />
  }

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

      {(showEdit || showDelete) && (
        <View className="detail__actions">
          {showEdit && (
            <View
              className="detail__btn detail__btn--primary"
              onClick={() =>
                Taro.navigateTo({ url: `/pages/books/form/index?id=${book.id}` })
              }
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
