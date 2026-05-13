import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { request } from '@/services/request'
import { LoadingState } from '@/components/LoadingState'
import './index.scss'

interface SecurityCheck {
  id: string
  targetType: string
  targetId: string | null
  contentType: string
  status: string
  rawResult: any
  createdAt: string
}

export default function ContentSecurityPage() {
  const [items, setItems] = useState<SecurityCheck[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('REVIEW')

  useEffect(() => {
    fetchItems()
  }, [filter])

  const fetchItems = async () => {
    setLoading(true)
    try {
      const data = await request<SecurityCheck[]>({
        url: `/api/v1/admin/content-security?status=${filter}`,
      })
      setItems(Array.isArray(data) ? data : [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      await request({ url: `/api/v1/admin/content-security/${id}/approve`, method: 'POST' })
      Taro.showToast({ title: '已通过', icon: 'success' })
      fetchItems()
    } catch {}
  }

  const handleReject = async (id: string) => {
    const { confirm } = await Taro.showModal({ title: '确认驳回', content: '确定要驳回这条内容吗？' })
    if (!confirm) return
    try {
      await request({ url: `/api/v1/admin/content-security/${id}/reject`, method: 'POST' })
      Taro.showToast({ title: '已驳回', icon: 'success' })
      fetchItems()
    } catch {}
  }

  const STATUS_LABELS: Record<string, string> = {
    REVIEW: '待复核',
    REJECT: '已驳回',
    PASS: '已通过',
    ERROR: '检测异常',
  }

  return (
    <View className="cs-admin">
      <View className="cs-admin__tabs">
        {['REVIEW', 'REJECT', 'ALL'].map((s) => (
          <View
            key={s}
            className={`cs-admin__tab ${filter === s ? 'cs-admin__tab--active' : ''}`}
            onClick={() => setFilter(s)}
          >
            <Text className="cs-admin__tab-text">{STATUS_LABELS[s] || s}</Text>
          </View>
        ))}
      </View>

      {loading ? (
        <LoadingState text="加载中..." />
      ) : items.length === 0 ? (
        <View className="cs-admin__empty">
          <Text className="cs-admin__empty-text">暂无内容</Text>
        </View>
      ) : (
        items.map((item) => (
          <View key={item.id} className="cs-admin__item">
            <View className="cs-admin__item-header">
              <Text className="cs-admin__item-type">{item.targetType}</Text>
              <Text className="cs-admin__item-status">{STATUS_LABELS[item.status] || item.status}</Text>
            </View>
            <View className="cs-admin__item-info">
              <Text className="cs-admin__item-label">类型：{item.contentType}</Text>
              <Text className="cs-admin__item-label">时间：{new Date(item.createdAt).toLocaleString()}</Text>
            </View>
            {item.status === 'REVIEW' && (
              <View className="cs-admin__item-actions">
                <View className="cs-admin__btn cs-admin__btn--approve" onClick={() => handleApprove(item.id)}>
                  <Text className="cs-admin__btn-text">通过</Text>
                </View>
                <View className="cs-admin__btn cs-admin__btn--reject" onClick={() => handleReject(item.id)}>
                  <Text className="cs-admin__btn-text">驳回</Text>
                </View>
              </View>
            )}
          </View>
        ))
      )}
    </View>
  )
}
