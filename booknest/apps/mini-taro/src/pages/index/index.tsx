import { ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { BookCard } from '@/components/BookCard'
import { EmptyState } from '@/components/EmptyState'
import { mockBooks } from '@/mocks/books'
import './index.scss'

export default function IndexPage() {
  const books = mockBooks

  return (
    <View className="page">
      <View className="page__header">
        <Text className="page__title">BookNest Mini</Text>
        <Text className="page__subtitle">从 Web 迁移到微信小程序</Text>
      </View>

      {books.length > 0 ? (
        <ScrollView scrollY className="book-list">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </ScrollView>
      ) : (
        <EmptyState
          title="还没有书籍"
          description="点击下方按钮添加第一本书"
          actionText="添加书籍"
          onAction={() => Taro.navigateTo({ url: '/pages/books/form/index' })}
        />
      )}

      <View
        className="fab"
        onClick={() => Taro.navigateTo({ url: '/pages/books/form/index' })}
      >
        <Text className="fab__text">+</Text>
      </View>
    </View>
  )
}
