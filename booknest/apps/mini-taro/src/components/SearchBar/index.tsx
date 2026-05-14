import { Input, Text, View } from '@tarojs/components'
import { useRef } from 'react'
import './index.scss'

interface SearchBarProps {
  value: string
  placeholder?: string
  onChange: (value: string) => void
}

export function SearchBar({ value, placeholder = '搜索', onChange }: SearchBarProps) {
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const handleInput = (val: string) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => onChange(val), 300)
  }

  return (
    <View className="search-bar">
      <Text className="search-bar__icon">🔍</Text>
      <Input
        className="search-bar__input"
        type="text"
        placeholder={placeholder}
        value={value}
        onInput={(e) => handleInput(e.detail.value)}
      />
      {value ? (
        <Text className="search-bar__clear" onClick={() => onChange('')}>✕</Text>
      ) : null}
    </View>
  )
}
