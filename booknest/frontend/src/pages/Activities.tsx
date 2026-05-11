import { useState } from 'react'
import { useActivities, useCreateOrder, useMockPay } from '@/hooks/useActivities'
import { Calendar, Users, DollarSign } from 'lucide-react'

export default function Activities() {
  const { data: activities = [], isLoading } = useActivities()
  const createOrder = useCreateOrder()
  const mockPay = useMockPay()
  const [pendingOrder, setPendingOrder] = useState<any>(null)
  const [paidResult, setPaidResult] = useState<any>(null)

  function handleRegister(activityId: string) {
    createOrder.mutate(activityId, {
      onSuccess: (order) => {
        setPendingOrder(order)
        setPaidResult(null)
      },
    })
  }

  function handlePay() {
    if (!pendingOrder) return
    mockPay.mutate(pendingOrder.id, {
      onSuccess: (result) => {
        setPaidResult(result)
        setPendingOrder(null)
      },
    })
  }

  if (isLoading) return <div className="py-8 text-center text-gray-500">加载中...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">读书会活动</h1>

      {activities.length === 0 && (
        <p className="text-gray-500">暂无活动</p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {activities.map((activity: any) => (
          <div key={activity.id} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{activity.title}</h2>
            {activity.description && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{activity.description}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(activity.startsAt).toLocaleDateString('zh-CN')}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {activity.registeredCount}/{activity.capacity}
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                {(activity.priceCents / 100).toFixed(2)} 元
              </span>
            </div>
            {activity.status === 'PUBLISHED' && activity.registeredCount < activity.capacity && (
              <button
                onClick={() => handleRegister(activity.id)}
                disabled={createOrder.isPending}
                className="mt-3 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                报名
              </button>
            )}
          </div>
        ))}
      </div>

      {pendingOrder && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-600 dark:bg-yellow-900/20">
          <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
            待支付订单：{pendingOrder.orderNo}
          </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            金额：{(pendingOrder.amountCents / 100).toFixed(2)} 元
          </p>
          <button
            onClick={handlePay}
            disabled={mockPay.isPending}
            className="mt-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            模拟支付
          </button>
        </div>
      )}

      {paidResult && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4 dark:border-green-600 dark:bg-green-900/20">
          <h3 className="font-semibold text-green-800 dark:text-green-200">报名成功！</h3>
          {paidResult.ticket && (
            <p className="mt-1 text-sm text-green-700 dark:text-green-300">
              票据编号：{paidResult.ticket.code}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
