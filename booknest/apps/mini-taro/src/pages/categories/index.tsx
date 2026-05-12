import { Text, View } from '@tarojs/components'
import { mockCategories, mockBooks } from '@/mocks/books'
import { EmptyState } from '@/components/EmptyState'
import './index.scss'

export default function CategoriesPage() {
  return (
    <View className="categories">
      <View className="categories__header">
        <Text className="categories__title">分类管理</Text>
      </View>

      {mockCategories.length > 0 ? (
        <View className="categories__list">
          {mockCategories.map((cat) => {
            const count = mockBooks.filter((b) => b.categoryId === cat.id).length
            return (
              <View key={cat.id} className="categories__item">
                <View
                  className="categories__item-dot"
                  style={{ background: cat.color }}
                />
                <View className="categories__item-info">
                  <Text className="categories__item-name">{cat.name}</Text>
                  <Text className="categories__item-count">{count} 本</Text>
                </View>
              </View>
            )
          })}
        </View>
      ) : (
        <EmptyState title="暂无分类" description="分类将随书籍一起创建" />
      )}
    </View>
  )
}
