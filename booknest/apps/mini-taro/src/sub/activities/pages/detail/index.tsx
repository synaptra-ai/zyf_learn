import { Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { getActivity, type Activity } from '@/services/activities'
import { createOrder } from '@/services/orders'
import { payOrder } from '@/services/pay'
import { subscribeActivityReminder } from '@/services/subscription'
import { LoadingState } from '@/components/LoadingState'
import './index.scss'

export default function ActivityDetailPage() {
  const router = useRouter()
  const activityId = router.params.id!
  const [activity, setActivity] = useState<Activity | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!activityId) return
    getActivity(activityId)
      .then(setActivity)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [activityId])

  const handleRegister = async () => {
    if (!activity || submitting) return
    setSubmitting(true)
    try {
      const order = await createOrder(activity.id)
      await payOrder(order.id)
      Taro.redirectTo({ url: `/sub/orders/pages/result/index?orderId=${order.id}` })
    } catch {
      // request adapter / payOrder 已 showToast
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubscribe = async () => {
    if (!activity) return
    try {
      const result = await subscribeActivityReminder(activity.id)
      Taro.showToast({
        title: result === 'accept' ? '订阅成功' : '订阅已取消',
        icon: 'none',
      })
    } catch {
      // 真机才支持 requestSubscribeMessage，开发工具会报错
      Taro.showToast({ title: '请在真机上使用', icon: 'none' })
    }
  }

  if (loading || !activity) return <LoadingState text="加载中..." />

  const isFull = activity.registeredCount >= activity.capacity
  const canRegister = activity.status === 'PUBLISHED' && !isFull

  return (
    <View className="act-detail">
      <View className="act-detail__header">
        <Text className="act-detail__title">{activity.title}</Text>
        <View className="act-detail__tags">
          <Text className="act-detail__tag act-detail__tag--status">
            {activity.status === 'PUBLISHED' ? '报名中' : activity.status}
          </Text>
        </View>
      </View>

      <View className="act-detail__info">
        <View className="act-detail__row">
          <Text className="act-detail__label">时间</Text>
          <Text className="act-detail__value">{new Date(activity.startsAt).toLocaleString('zh-CN')}</Text>
        </View>
        <View className="act-detail__row">
          <Text className="act-detail__label">名额</Text>
          <Text className="act-detail__value">{activity.registeredCount}/{activity.capacity} 人</Text>
        </View>
        <View className="act-detail__row">
          <Text className="act-detail__label">费用</Text>
          <Text className="act-detail__price">
            {activity.priceCents === 0 ? '免费' : `¥${(activity.priceCents / 100).toFixed(2)}`}
          </Text>
        </View>
      </View>

      {activity.description && (
        <View className="act-detail__desc-section">
          <Text className="act-detail__section-title">活动详情</Text>
          <Text className="act-detail__desc">{activity.description}</Text>
        </View>
      )}

      <View className="act-detail__subscribe" onClick={handleSubscribe}>
        <Text className="act-detail__subscribe-icon">🔔</Text>
        <Text className="act-detail__subscribe-text">订阅活动开始提醒</Text>
      </View>

      <View className="act-detail__bottom">
        <View className="act-detail__bottom-info">
          <Text className="act-detail__bottom-price">
            {activity.priceCents === 0 ? '免费' : `¥${(activity.priceCents / 100).toFixed(2)}`}
          </Text>
          <Text className="act-detail__bottom-count">
            剩余 {activity.capacity - activity.registeredCount} 个名额
          </Text>
        </View>
        <View
          className={`act-detail__btn ${!canRegister ? 'act-detail__btn--disabled' : ''}`}
          onClick={canRegister ? handleRegister : undefined}
        >
          <Text className="act-detail__btn-text">
            {submitting ? '处理中...' : isFull ? '已满' : '立即报名'}
          </Text>
        </View>
      </View>
    </View>
  )
}
