import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useBookStore } from '@/stores/useBookStore'
import { useCategoryStore } from '@/stores/useCategoryStore'
import { bookSchema, type BookFormData } from '@/lib/schemas'
import { Toast } from '@/components/ui/Toast'

const statusOptions = [
  { value: 'OWNED', label: '已拥有' },
  { value: 'READING', label: '在读' },
  { value: 'FINISHED', label: '已读完' },
  { value: 'WISHLIST', label: '想读' },
] as const

export default function BookCreate() {
  const navigate = useNavigate()
  const addBook = useBookStore((s) => s.addBook)
  const categories = useCategoryStore((s) => s.categories)
  const [toast, setToast] = useState<{ id: string; message: string; variant: 'success' | 'error' } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BookFormData>({
    resolver: zodResolver(bookSchema),
    defaultValues: { status: 'WISHLIST' },
  })

  const onSubmit = (data: BookFormData) => {
    const clean = { ...data, isbn: data.isbn || undefined, categoryId: data.categoryId || undefined }
    addBook(clean)
    setToast({ id: crypto.randomUUID(), message: '添加成功', variant: 'success' })
    setTimeout(() => navigate('/'), 800)
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {toast && (
        <Toast
          variant={toast.variant}
          message={toast.message}
          onClose={() => setToast(null)}
          className="fixed bottom-4 right-4 z-50"
        />
      )}

      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">添加书籍</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          id="title"
          label="书名 *"
          placeholder="输入书名"
          error={errors.title?.message}
          {...register('title')}
        />

        <Input
          id="author"
          label="作者 *"
          placeholder="输入作者"
          error={errors.author?.message}
          {...register('author')}
        />

        <Input
          id="isbn"
          label="ISBN"
          placeholder="10位或13位数字"
          error={errors.isbn?.message}
          {...register('isbn')}
        />

        <Input
          id="pageCount"
          label="页数"
          type="number"
          placeholder="输入页数"
          error={errors.pageCount?.message}
          {...register('pageCount', { valueAsNumber: true })}
        />

        <div className="space-y-1">
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            状态 *
          </label>
          <select
            id="status"
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            {...register('status')}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errors.status && <p className="text-sm text-red-600">{errors.status.message}</p>}
        </div>

        {categories.length > 0 && (
          <div className="space-y-1">
            <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              分类
            </label>
            <select
              id="categoryId"
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              {...register('categoryId')}
            >
              <option value="">未分类</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            描述
          </label>
          <textarea
            id="description"
            rows={4}
            placeholder="输入书籍描述"
            className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            {...register('description')}
          />
          {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" isLoading={isSubmitting}>
            添加书籍
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            取消
          </Button>
        </div>
      </form>
    </div>
  )
}
