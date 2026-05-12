import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

export default function MePage() {
  return (
    <View className="me">
      <View className="me__header">
        <View className="me__avatar">
          <Text className="me__avatar-text">B</Text>
        </View>
        <View className="me__info">
          <Text className="me__name">BookNest 用户</Text>
          <Text className="me__email">未登录 (mock)</Text>
        </View>
      </View>

      <View className="me__stats">
        <View className="me__stat">
          <Text className="me__stat-num">4</Text>
          <Text className="me__stat-label">书籍</Text>
        </View>
        <View className="me__stat">
          <Text className="me__stat-num">2</Text>
          <Text className="me__stat-label">在读</Text>
        </View>
        <View className="me__stat">
          <Text className="me__stat-num">1</Text>
          <Text className="me__stat-label">已读完</Text>
        </View>
      </View>

      <View className="me__menu">
        <View className="me__menu-item">
          <Text className="me__menu-text">我的 Workspace</Text>
          <Text className="me__menu-arrow">›</Text>
        </View>
        <View className="me__menu-item">
          <Text className="me__menu-text">数据工具</Text>
          <Text className="me__menu-arrow">›</Text>
        </View>
        <View className="me__menu-item">
          <Text className="me__menu-text">设置</Text>
          <Text className="me__menu-arrow">›</Text>
        </View>
      </View>
    </View>
  )
}
