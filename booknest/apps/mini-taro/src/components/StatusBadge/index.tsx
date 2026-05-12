import { Text, View } from '@tarojs/components'
import type { BookStatus } from '@booknest/domain'
import './index.scss'

const STATUS_CONFIG: Record<BookStatus, { label: string; className: string }> = {
  OWNED: { label: '已拥有', className: 'status-badge--owned' },
  READING: { label: '在读', className: 'status-badge--reading' },
  FINISHED: { label: '已读完', className: 'status-badge--finished' },
  WISHLIST: { label: '想读', className: 'status-badge--wishlist' },
}

interface StatusBadgeProps {
  status: BookStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <View className={`status-badge ${config.className}`}>
      <Text className="status-badge__text">{config.label}</Text>
    </View>
  )
}
