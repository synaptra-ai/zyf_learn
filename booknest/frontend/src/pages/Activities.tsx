import { useState } from 'react'
import { useActivities, useCreateActivity, useCreateOrder, useMockPay } from '@/hooks/useActivities'
import { useWorkspaceMembers } from '@/hooks/useWorkspaces'
import { useAuthStore } from '@/stores/useAuthStore'
import { Calendar, Users, DollarSign, Plus } from 'lucide-react'

export default function Activities() {
  const { data: activities = [], isLoading } = useActivities()
  const { data: members } = useWorkspaceMembers()
  const user = useAuthStore((s) => s.user)
  const createOrder = useCreateOrder()
  const mockPay = useMockPay()
  const createActivity = useCreateActivity()
  const [pendingOrder, setPendingOrder] = useState<any>(null)
  const [paidResult, setPaidResult] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    capacity: '20',
    priceCents: '0',
    startsAt: '',
  })

  const currentMember = members?.find((m: any) => m.user?.id === user?.id || m.userId === user?.id)
  const isAdmin = currentMember && ['OWNER', 'ADMIN'].includes(currentMember.role)

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

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    createActivity.mutate(
      {
        title: form.title,
        description: form.description || undefined,
        capacity: Number(form.capacity),
        priceCents: Number(form.priceCents) * 100,
        startsAt: new Date(form.startsAt).toISOString(),
      },
      {
        onSuccess: () => {
          setShowForm(false)
          setForm({ title: '', description: '', capacity: '20', priceCents: '0', startsAt: '' })
        },
      },
    )
  }

  if (isLoading) return <div className="py-8 text-center text-gray-500">加载中...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">读书会活动</h1>
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            创建活动
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">活动名称 *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              maxLength={200}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              placeholder="例如：前端读书会第3期"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">描述</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              maxLength={2000}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              placeholder="活动简介"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">名额 *</label>
              <input
                type="number"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                required
                min={1}
                max={10000}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">价格（元）</label>
              <input
                type="number"
                value={form.priceCents}
                onChange={(e) => setForm({ ...form, priceCents: e.target.value })}
                min={0}
                step="0.01"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">开始时间 *</label>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={createActivity.isPending}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {createActivity.isPending ? '创建中...' : '创建'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              取消
            </button>
          </div>
          {createActivity.isError && (
            <p className="text-sm text-red-600">创建失败，请检查表单</p>
          )}
        </form>
      )}

      {activities.length === 0 && !showForm && (
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
