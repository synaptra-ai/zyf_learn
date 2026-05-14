import { View } from '@tarojs/components'
import './index.scss'

interface SkeletonProps {
  type?: 'card' | 'list' | 'detail'
  count?: number
}

export function Skeleton({ type = 'card', count = 4 }: SkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i)

  if (type === 'card') {
    return (
      <View className="skeleton-grid">
        {items.map((i) => (
          <View key={i} className="skeleton-card">
            <View className="skeleton-card__image animate-pulse" />
            <View className="skeleton-card__body">
              <View className="skeleton-card__title animate-pulse" />
              <View className="skeleton-card__subtitle animate-pulse" />
            </View>
          </View>
        ))}
      </View>
    )
  }

  if (type === 'list') {
    return (
      <View className="skeleton-list">
        {items.map((i) => (
          <View key={i} className="skeleton-list__item animate-pulse" />
        ))}
      </View>
    )
  }

  // detail
  return (
    <View className="skeleton-detail">
      <View className="skeleton-detail__hero animate-pulse" />
      <View className="skeleton-detail__title animate-pulse" />
      <View className="skeleton-detail__line animate-pulse" />
      <View className="skeleton-detail__line animate-pulse" />
      <View className="skeleton-detail__line--short animate-pulse" />
    </View>
  )
}
