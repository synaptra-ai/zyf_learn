import { Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { listCategories, createCategory, deleteCategory } from '@/services/categories'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'
import { WorkspaceSwitcher } from '@/components/WorkspaceSwitcher'
import './index.scss'

const PRESET_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b']

export default function CategoriesPage() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [submitting, setSubmitting] = useState(false)

  const loadCategories = () => {
    listCategories()
      .then(setCategories)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!activeWorkspaceId) return
    loadCategories()
  }, [activeWorkspaceId])

  const handleCreate = async () => {
    if (!newName.trim()) return Taro.showToast({ title: '请输入分类名', icon: 'none' })
    if (submitting) return
    setSubmitting(true)
    try {
      await createCategory({ name: newName.trim(), color: newColor })
      Taro.showToast({ title: '创建成功', icon: 'success' })
      setNewName('')
      setNewColor(PRESET_COLORS[0])
      setShowForm(false)
      loadCategories()
    } catch {
      // request adapter 已 showToast
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = (id: string, name: string) => {
    Taro.showModal({
      title: '确认删除',
      content: `删除分类「${name}」？该分类下的书籍不会被删除。`,
      success: async (res) => {
        if (!res.confirm) return
        try {
          await deleteCategory(id)
          Taro.showToast({ title: '已删除', icon: 'success' })
          loadCategories()
        } catch {
          // request adapter 已 showToast
        }
      },
    })
  }

  if (loading) return (
    <View className="categories">
      <LoadingState text="加载中..." />
    </View>
  )

  return (
    <View className="categories">
      <View className="categories__header">
        <Text className="categories__title">分类管理</Text>
        <WorkspaceSwitcher />
      </View>
      <View className="categories__toolbar">
        <View className="categories__add-btn" onClick={() => setShowForm(!showForm)}>
          <Text className="categories__add-btn-text">{showForm ? '取消' : '+ 添加分类'}</Text>
        </View>
      </View>

      {showForm && (
        <View className="categories__form">
          <Input
            className="categories__form-input"
            placeholder="输入分类名"
            value={newName}
            onInput={(e) => setNewName(e.detail.value)}
          />
          <View className="categories__color-picker">
            {PRESET_COLORS.map((c) => (
              <View
                key={c}
                className={`categories__color-dot ${newColor === c ? 'categories__color-dot--active' : ''}`}
                style={{ background: c }}
                onClick={() => setNewColor(c)}
              />
            ))}
          </View>
          <View className="categories__form-submit" onClick={handleCreate}>
            <Text className="categories__form-submit-text">{submitting ? '创建中...' : '确认添加'}</Text>
          </View>
        </View>
      )}

      {categories.length > 0 ? (
        <View className="categories__list">
          {categories.map((cat) => (
            <View key={cat.id} className="categories__item">
              <View className="categories__item-dot" style={{ background: cat.color }} />
              <View className="categories__item-info">
                <Text className="categories__item-name">{cat.name}</Text>
                <Text className="categories__item-count">{cat._count?.books || 0} 本</Text>
              </View>
              <View className="categories__item-delete" onClick={() => handleDelete(cat.id, cat.name)}>
                <Text className="categories__item-delete-text">删除</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <EmptyState title="暂无分类" description="点击上方「+ 添加」创建分类" />
      )}

    </View>
  )
}
