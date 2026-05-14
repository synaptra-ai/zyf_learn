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

export const BookCard = React.memo(function BookCard({ book, variant = 'grid' }: BookCardProps) {
  const handleOpen = () => {
    Taro.navigateTo({ url: `/sub/books/pages/detail/index?id=${book.id}` })
  }

  return (
    <View className={`book-card book-card--${variant}`} onClick={handleOpen} compileMode>
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
      </View>
      <View className="book-card__body">
        <Text className="book-card__title">{book.title}</Text>
        {variant === 'featured' && (
          <Text className="book-card__author">{book.author}</Text>
        )}
      </View>
      <View className="book-card__badge">
        <StatusBadge status={book.status} />
      </View>
    </View>
  )
})
