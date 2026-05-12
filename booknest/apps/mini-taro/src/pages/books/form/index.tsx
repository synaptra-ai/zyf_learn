import { Input, Text, Textarea, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useState } from 'react'
import type { BookStatus } from '@booknest/domain'
import { mockBooks, mockCategories } from '@/mocks/books'
import { SafeAreaButton } from '@/components/SafeAreaButton'
import './index.scss'

const STATUS_OPTIONS: { value: BookStatus; label: string }[] = [
  { value: 'OWNED', label: '已拥有' },
  { value: 'READING', label: '在读' },
  { value: 'FINISHED', label: '已读完' },
  { value: 'WISHLIST', label: '想读' },
]

export default function BookFormPage() {
  const router = useRouter()
  const editBook = mockBooks.find((b) => b.id === router.params.id)

  const [title, setTitle] = useState(editBook?.title || '')
  const [author, setAuthor] = useState(editBook?.author || '')
  const [description, setDescription] = useState(editBook?.description || '')
  const [status, setStatus] = useState<BookStatus>(editBook?.status || 'OWNED')
  const [categoryId, setCategoryId] = useState(editBook?.categoryId || '')

  const handleSubmit = () => {
    if (!title.trim() || !author.trim()) {
      Taro.showToast({ title: '请填写书名和作者', icon: 'none' })
      return
    }
    Taro.showToast({ title: editBook ? '保存成功 (mock)' : '添加成功 (mock)', icon: 'success' })
    setTimeout(() => Taro.navigateBack(), 1500)
  }

  return (
    <View className="form">
      <View className="form__group">
        <Text className="form__label">书名 *</Text>
        <Input
          className="form__input"
          value={title}
          placeholder="输入书名"
          onInput={(e) => setTitle(e.detail.value)}
        />
      </View>

      <View className="form__group">
        <Text className="form__label">作者 *</Text>
        <Input
          className="form__input"
          value={author}
          placeholder="输入作者"
          onInput={(e) => setAuthor(e.detail.value)}
        />
      </View>

      <View className="form__group">
        <Text className="form__label">状态</Text>
        <View className="form__status-group">
          {STATUS_OPTIONS.map((opt) => (
            <View
              key={opt.value}
              className={`form__status-chip ${status === opt.value ? 'form__status-chip--active' : ''}`}
              onClick={() => setStatus(opt.value)}
            >
              <Text className="form__status-chip-text">{opt.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="form__group">
        <Text className="form__label">分类</Text>
        <View className="form__category-group">
          {mockCategories.map((cat) => (
            <View
              key={cat.id}
              className={`form__category-chip ${categoryId === cat.id ? 'form__category-chip--active' : ''}`}
              style={{ borderColor: categoryId === cat.id ? cat.color : '#e2e8f0' }}
              onClick={() => setCategoryId(cat.id)}
            >
              <Text
                className="form__category-chip-text"
                style={{ color: categoryId === cat.id ? cat.color : '#64748b' }}
              >
                {cat.name}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View className="form__group">
        <Text className="form__label">简介</Text>
        <Textarea
          className="form__textarea"
          value={description}
          placeholder="输入简介（可选）"
          onInput={(e) => setDescription(e.detail.value)}
          maxlength={500}
        />
      </View>

      <SafeAreaButton text={editBook ? '保存修改' : '添加书籍'} onClick={handleSubmit} />
    </View>
  )
}
