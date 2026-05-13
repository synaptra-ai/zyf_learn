import { Image, Input, Text, Textarea, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import type { BookStatus } from '@booknest/domain'
import { createBook, updateBook, getBook, type BookFormInput } from '@/services/books'
import type { Book } from '@booknest/domain'
import { listCategories } from '@/services/categories'
import { chooseCoverImage, uploadCover } from '@/services/upload'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { SafeAreaButton } from '@/components/SafeAreaButton'
import './index.scss'

const STATUS_OPTIONS: { value: BookStatus; label: string }[] = [
  { value: 'OWNED', label: '已拥有' },
  { value: 'READING', label: '在读' },
  { value: 'FINISHED', label: '已读完' },
  { value: 'WISHLIST', label: '想读' },
]

function validateBookForm(input: BookFormInput) {
  if (!input.title.trim()) return '请输入书名'
  if (!input.author.trim()) return '请输入作者'
  if (input.pageCount && input.pageCount < 0) return '页数不能为负数'
  return null
}

export default function BookFormPage() {
  const router = useRouter()
  const editId = router.params.id
  const isEdit = Boolean(editId)
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)

  const [editBook, setEditBook] = useState<Book | null>(null)
  const [categories, setCategories] = useState<any[]>([])

  useEffect(() => {
    if (isEdit && editId) {
      getBook(editId).then(setEditBook).catch(() => {})
    }
  }, [editId, isEdit])

  useEffect(() => {
    listCategories().then(setCategories).catch(() => {})
  }, [activeWorkspaceId])

  const [form, setForm] = useState<BookFormInput>({
    title: '',
    author: '',
    description: '',
    status: 'OWNED',
    categoryId: '',
    isbn: '',
    pageCount: undefined,
    publishedDate: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [tempCoverPath, setTempCoverPath] = useState('')

  useEffect(() => {
    if (editBook) {
      setForm({
        title: editBook.title,
        author: editBook.author,
        description: editBook.description || '',
        status: editBook.status,
        categoryId: editBook.categoryId || '',
        isbn: editBook.isbn || '',
        pageCount: editBook.pageCount || undefined,
        publishedDate: editBook.publishedDate || '',
      })
    }
  }, [editBook])

  const update = (field: keyof BookFormInput, value: string | number | undefined) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    const error = validateBookForm(form)
    if (error) return Taro.showToast({ title: error, icon: 'none' })
    if (submitting) return

    setSubmitting(true)
    try {
      const book = isEdit ? await updateBook(editId!, form) : await createBook(form)
      if (tempCoverPath) {
        await uploadCover(book.id, tempCoverPath)
      }
      Taro.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => {
        Taro.redirectTo({ url: `/pages/books/detail/index?id=${book.id}` })
      }, 1000)
    } catch {
      // request adapter 已 showToast
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View className="form">
      <View className="form__group">
        <Text className="form__label">书名 *</Text>
        <Input
          className="form__input"
          value={form.title}
          placeholder="输入书名"
          onInput={(e) => update('title', e.detail.value)}
        />
      </View>

      <View className="form__group">
        <Text className="form__label">作者 *</Text>
        <Input
          className="form__input"
          value={form.author}
          placeholder="输入作者"
          onInput={(e) => update('author', e.detail.value)}
        />
      </View>

      <View className="form__group">
        <Text className="form__label">状态</Text>
        <View className="form__status-group">
          {STATUS_OPTIONS.map((opt) => (
            <View
              key={opt.value}
              className={`form__status-chip ${form.status === opt.value ? 'form__status-chip--active' : ''}`}
              onClick={() => update('status', opt.value)}
            >
              <Text className="form__status-chip-text">{opt.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="form__group">
        <Text className="form__label">分类</Text>
        <View className="form__category-group">
          {categories.map((cat: any) => (
            <View
              key={cat.id}
              className={`form__category-chip ${form.categoryId === cat.id ? 'form__category-chip--active' : ''}`}
              style={{ borderColor: form.categoryId === cat.id ? cat.color : '#e2e8f0' }}
              onClick={() => update('categoryId', form.categoryId === cat.id ? '' : cat.id)}
            >
              <Text
                className="form__category-chip-text"
                style={{ color: form.categoryId === cat.id ? cat.color : '#64748b' }}
              >
                {cat.name}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View className="form__group">
        <Text className="form__label">ISBN</Text>
        <Input
          className="form__input"
          value={form.isbn}
          placeholder="输入 ISBN（可选）"
          onInput={(e) => update('isbn', e.detail.value)}
        />
      </View>

      <View className="form__group">
        <Text className="form__label">页数</Text>
        <Input
          className="form__input"
          type="number"
          value={form.pageCount ? String(form.pageCount) : ''}
          placeholder="输入页数（可选）"
          onInput={(e) => update('pageCount', e.detail.value ? Number(e.detail.value) : undefined)}
        />
      </View>

      <View className="form__group">
        <Text className="form__label">封面图片</Text>
        <View
          className="form__cover-uploader"
          onClick={async () => {
            try {
              const path = await chooseCoverImage()
              setTempCoverPath(path)
            } catch {}
          }}
        >
          {tempCoverPath ? (
            <Image className="form__cover-preview" src={tempCoverPath} mode="aspectFill" />
          ) : (
            <View className="form__cover-placeholder">
              <Text className="form__cover-placeholder-text">选择封面</Text>
            </View>
          )}
        </View>
      </View>

      <View className="form__group">
        <Text className="form__label">简介</Text>
        <Textarea
          className="form__textarea"
          value={form.description}
          placeholder="输入简介（可选）"
          onInput={(e) => update('description', e.detail.value)}
          maxlength={1000}
        />
      </View>

      <SafeAreaButton
        text={submitting ? '保存中...' : isEdit ? '保存修改' : '添加书籍'}
        onClick={handleSubmit}
      />
    </View>
  )
}
