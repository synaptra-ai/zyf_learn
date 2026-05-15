import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import './index.scss'

const tabs = [
  { pagePath: '/pages/index/index', text: '书架', icon: '📖' },
  { pagePath: '/pages/categories/index', text: '分类', icon: '🗂' },
  { pagePath: '/pages/discover/index', text: '发现', icon: '🧭' },
  { pagePath: '/pages/me/index', text: '我的', icon: '🪶' },
]

export default function CustomTabBar() {
  const [selected, setSelected] = useState(0)

  useEffect(() => {
    const updateSelected = () => {
      const pages = Taro.getCurrentPages()
      const current = pages[pages.length - 1]
      if (current) {
        const path = '/' + current.route
        const idx = tabs.findIndex((t) => t.pagePath === path)
        if (idx >= 0) setSelected(idx)
      }
    }
    updateSelected()
  }, [])

  const handleSwitch = (index: number) => {
    setSelected(index)
    Taro.switchTab({ url: tabs[index].pagePath })
  }

  return (
    <View className="custom-tab-bar">
      {tabs.map((tab, index) => (
        <View
          key={tab.pagePath}
          className={`custom-tab-bar__item ${selected === index ? 'custom-tab-bar__item--active' : ''}`}
          onClick={() => handleSwitch(index)}
        >
          <Text className="custom-tab-bar__icon">{tab.icon}</Text>
          <Text className="custom-tab-bar__label">{tab.text}</Text>
        </View>
      ))}
    </View>
  )
}
