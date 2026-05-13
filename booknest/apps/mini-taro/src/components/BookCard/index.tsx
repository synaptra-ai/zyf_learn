import React from 'react'
import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { Book } from '@booknest/domain'
import { StatusBadge } from '@/components/StatusBadge'
import './index.scss'

interface BookCardProps {
  book: Book
}

export const BookCard = React.memo(function BookCard({ book }: BookCardProps) {
  const handleOpen = () => {
    Taro.navigateTo({ url: `/sub/books/pages/detail/index?id=${book.id}` })
  }

  return (
    <View className="book-card" onClick={handleOpen} compileMode>
      {book.coverUrl ? (
        <Image className="book-card__cover" src={book.coverUrl} mode="aspectFill" lazyLoad />
      ) : (
        <View className="book-card__cover book-card__cover--placeholder">
          <Text className="book-card__cover-text">{book.title[0]}</Text>
        </View>
      )}
      <View className="book-card__body">
        <Text className="book-card__title">{book.title}</Text>
        <Text className="book-card__author">{book.author}</Text>
        <View className="book-card__meta">
          <StatusBadge status={book.status} />
          {book.category && (
            <Text
              className="book-card__category"
              style={{ color: book.category.color }}
            >
              {book.category.name}
            </Text>
          )}
        </View>
      </View>
    </View>
  )
})
