import { Text, View } from '@tarojs/components'
import './index.scss'

interface SafeAreaButtonProps {
  text: string
  onClick?: () => void
  type?: 'primary' | 'danger'
}

export function SafeAreaButton({ text, onClick, type = 'primary' }: SafeAreaButtonProps) {
  return (
    <View className="safe-area-button">
      <View className="safe-area-button__inner">
        <View
          className={`safe-area-button__btn safe-area-button__btn--${type}`}
          onClick={onClick}
        >
          <Text className="safe-area-button__text">{text}</Text>
        </View>
      </View>
    </View>
  )
}
