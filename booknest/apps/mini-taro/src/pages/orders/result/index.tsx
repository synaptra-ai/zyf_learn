import { Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { getOrder, type Order } from '@/services/orders'
import { LoadingState } from '@/components/LoadingState'
import './index.scss'

const STATUS_MAP: Record<string, { text: string; color: string }> = {
  PENDING: { text: '支付确认中，请稍候', color: '#f59e0b' },
  PAID: { text: '报名成功，Ticket 已生成', color: '#10b981' },
  FAILED: { text: '支付失败，请重新支付', color: '#ef4444' },
  CANCELLED: { text: '支付已取消', color: '#6b7280' },
  EXPIRED: { text: '订单已过期，请重新报名', color: '#6b7280' },
}

export default function OrderResultPage() {
  const router = useRouter()
  const orderId = router.params.orderId!
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orderId) return

    let timer: ReturnType<typeof setInterval>

    const fetchOrder = async () => {
      try {
        const data = await getOrder(orderId)
        setOrder(data)
        setLoading(false)
        if (data.status !== 'PENDING') {
          clearInterval(timer)
        }
      } catch {
        setLoading(false)
        clearInterval(timer)
      }
    }

    fetchOrder()
    timer = setInterval(fetchOrder, 2000)
    return () => clearInterval(timer)
  }, [orderId])

  if (loading || !order) {
    return <LoadingState text="加载中..." />
  }

  const statusInfo = STATUS_MAP[order.status] || { text: '未知状态', color: '#6b7280' }

  return (
    <View className="order-result">
      <View className="order-result__icon">
        <Text style={{ fontSize: '120rpx' }}>
          {order.status === 'PAID' ? '✅' : order.status === 'PENDING' ? '⏳' : '❌'}
        </Text>
      </View>
      <Text className="order-result__status" style={{ color: statusInfo.color }}>
        {statusInfo.text}
      </Text>
      <Text className="order-result__title">{order.activity?.title || '活动'}</Text>
      <Text className="order-result__amount">
        ¥{(order.amountCents / 100).toFixed(2)}
      </Text>
      {order.ticket && (
        <View className="order-result__ticket">
          <Text className="order-result__ticket-label">Ticket Code</Text>
          <Text className="order-result__ticket-code">{order.ticket.code}</Text>
        </View>
      )}
      <View className="order-result__actions">
        <View
          className="order-result__btn"
          onClick={() => Taro.switchTab({ url: '/pages/index/index' })}
        >
          <Text className="order-result__btn-text">返回首页</Text>
        </View>
      </View>
    </View>
  )
}
