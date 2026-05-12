import { Text, View } from '@tarojs/components'
import './index.scss'

interface LoadingStateProps {
  text?: string
}

export function LoadingState({ text = '加载中...' }: LoadingStateProps) {
  return (
    <View className="loading-state">
      <View className="loading-state__spinner" />
      <Text className="loading-state__text">{text}</Text>
    </View>
  )
}
