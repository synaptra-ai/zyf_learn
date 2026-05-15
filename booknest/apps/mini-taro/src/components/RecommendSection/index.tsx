import React from 'react'
import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { getCoverThumbUrl } from '@/utils/image'
import type { RecommendBook } from '@/services/recommendation'
import './index.scss'

interface RecommendSectionProps {
  title: string
  books: RecommendBook[]
  showProgress?: boolean
}

export const RecommendSection: React.FC<RecommendSectionProps> = React.memo(
  function RecommendSection({ title, books, showProgress = false }) {
    if (books.length === 0) return null

    return (
      <View className="recommend-section">
        <Text className="recommend-section__title">{title}</Text>
        <ScrollView scrollX className="recommend-section__scroll">
          <View className="recommend-section__list">
            {books.map((book) => (
              <View
                key={book.id}
                className="recommend-section__card"
                onClick={() =>
                  Taro.navigateTo({ url: `/sub/books/pages/detail/index?id=${book.id}` })
                }
              >
                <View className="recommend-section__cover-wrap">
                  {book.coverUrl ? (
                    <Image
                      className="recommend-section__cover"
                      src={getCoverThumbUrl(book.coverUrl)}
                      mode="aspectFill"
                      lazyLoad
                    />
                  ) : (
                    <View className="recommend-section__cover recommend-section__cover--placeholder">
                      <Text className="recommend-section__cover-text">{book.title[0]}</Text>
                    </View>
                  )}
                  {showProgress && book.readingProgress > 0 && (
                    <View className="recommend-section__progress-bar">
                      <View
                        className="recommend-section__progress-fill"
                        style={{ width: `${book.readingProgress}%` }}
                      />
                    </View>
                  )}
                </View>
                <Text className="recommend-section__name">{book.title}</Text>
                {showProgress && book.readingProgress > 0 && (
                  <Text className="recommend-section__progress-text">
                    {book.readingProgress}%
                  </Text>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    )
  },
)
