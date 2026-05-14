import { Text, View } from '@tarojs/components'
import './index.scss'

interface StatsCardProps {
  value: string | number
  label: string
  icon?: string
}

export function StatsCard({ value, label, icon }: StatsCardProps) {
  return (
    <View className="stats-card">
      {icon && <Text className="stats-card__icon">{icon}</Text>}
      <Text className="stats-card__value">{value}</Text>
      <Text className="stats-card__label">{label}</Text>
    </View>
  )
}
