import { Text, View } from '@tarojs/components'
import { useEffect, useState } from 'react'
import { listCategories } from '@/services/categories'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'
import './index.scss'

interface Category {
  id: string
  name: string
  color: string
  _count?: { books: number }
}

export default function CategoriesPage() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeWorkspaceId) return
    listCategories()
      .then(setCategories)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [activeWorkspaceId])

  if (loading) return <LoadingState text="加载中..." />

  return (
    <View className="categories">
      <View className="categories__header">
        <Text className="categories__title">分类管理</Text>
      </View>

      {categories.length > 0 ? (
        <View className="categories__list">
          {categories.map((cat) => (
            <View key={cat.id} className="categories__item">
              <View
                className="categories__item-dot"
                style={{ background: cat.color }}
              />
              <View className="categories__item-info">
                <Text className="categories__item-name">{cat.name}</Text>
                <Text className="categories__item-count">{cat._count?.books || 0} 本</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <EmptyState title="暂无分类" description="分类将随书籍一起创建" />
      )}
    </View>
  )
}
