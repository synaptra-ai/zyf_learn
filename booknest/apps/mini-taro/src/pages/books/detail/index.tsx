import { Image, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { StatusBadge } from '@/components/StatusBadge'
import { LoadingState } from '@/components/LoadingState'
import { useBook } from '@/hooks/use-books'
import './index.scss'

export default function BookDetailPage() {
  const router = useRouter()
  const { data: book, isLoading } = useBook(router.params.id!)

  if (isLoading || !book) {
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

      <View className="detail__actions">
        <View
          className="detail__btn detail__btn--primary"
          onClick={() =>
            Taro.navigateTo({ url: `/pages/books/form/index?id=${book.id}` })
          }
        >
          <Text className="detail__btn-text">编辑</Text>
        </View>
      </View>
    </View>
  )
}
