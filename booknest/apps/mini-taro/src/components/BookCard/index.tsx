import React from 'react'
import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { Book } from '@booknest/domain'
import { StatusBadge } from '@/components/StatusBadge'
import { getCoverThumbUrl } from '@/utils/image'
import './index.scss'

interface BookCardProps {
  book: Book
  variant?: 'featured' | 'grid'
}

const moodQuotes = [
  '有些故事，只在安静时才能读懂',
  '你不是没时间，你是太容易被打断',
  '翻过这一页，遇见新的自己',
  '世界很喧嚣，书里很安静',
  '生活需要一点仪式感',
  '在文字里找到属于自己的角落',
  '一本书，一杯茶，一个下午',
  '有些路，只能在书里走一遍',
  '让阅读成为你的呼吸',
  '每本书都是一次温柔的冒险',
]

function getMoodQuote(title: string): string {
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) - hash + title.charCodeAt(i)) | 0
  }
  return moodQuotes[Math.abs(hash) % moodQuotes.length]
}

export const BookCard = React.memo(function BookCard({ book, variant = 'grid' }: BookCardProps) {
  const handleOpen = () => {
    Taro.navigateTo({ url: `/sub/books/pages/detail/index?id=${book.id}` })
  }

  return (
    <View className={`book-card book-card--${variant}`} onClick={handleOpen}>
      <View className="book-card__cover-wrap">
        {book.coverUrl ? (
          <Image
            className="book-card__cover"
            src={getCoverThumbUrl(book.coverUrl)}
            mode="aspectFill"
            lazyLoad
          />
        ) : (
          <View className="book-card__cover book-card__cover--placeholder">
            <Text className="book-card__cover-text">{book.title[0]}</Text>
          </View>
        )}
        {variant === 'featured' && (
          <View className="book-card__quote-overlay">
            <Text className="book-card__mood">{getMoodQuote(book.title)}</Text>
          </View>
        )}
      </View>
      <View className="book-card__body">
        <Text className="book-card__title">{book.title}</Text>
      </View>
      <View className="book-card__badge">
        <StatusBadge status={book.status} />
      </View>
    </View>
  )
})
