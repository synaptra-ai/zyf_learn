import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Upload, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useCreateBook, useUploadCover } from '@/hooks/useBooks'
import { useCategories } from '@/hooks/useCategories'
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
  const createBook = useCreateBook()
  const uploadCover = useUploadCover()
  const { data: categories = [] } = useCategories()
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setCoverPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BookFormData>({
    resolver: zodResolver(bookSchema),
    defaultValues: { status: 'WISHLIST' },
  })

  const onSubmit = (data: BookFormData) => {
    const clean = { ...data, isbn: data.isbn || undefined, categoryId: data.categoryId || undefined }
    createBook.mutate(clean, {
      onSuccess: async (newBook) => {
        if (coverFile) {
          try {
            await uploadCover.mutateAsync({ bookId: newBook.id, file: coverFile })
          } catch {
            setToast({ message: '书籍已添加，但封面上传失败', variant: 'error' })
            return
          }
        }
        setToast({ message: '添加成功', variant: 'success' })
        setTimeout(() => navigate(`/books/${newBook.id}`), 800)
      },
      onError: () => {
        setToast({ message: '添加失败', variant: 'error' })
      },
    })
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
        <Input id="title" label="书名 *" placeholder="输入书名" error={errors.title?.message} {...register('title')} />
        <Input id="author" label="作者 *" placeholder="输入作者" error={errors.author?.message} {...register('author')} />
        <Input id="isbn" label="ISBN" placeholder="10位或13位数字" error={errors.isbn?.message} {...register('isbn')} />
        <Input id="pageCount" label="页数" type="number" placeholder="输入页数" error={errors.pageCount?.message} {...register('pageCount', { valueAsNumber: true })} />

        <div className="space-y-1">
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">状态 *</label>
          <select
            id="status"
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            {...register('status')}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {categories.length > 0 && (
          <div className="space-y-1">
            <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">分类</label>
            <select
              id="categoryId"
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              {...register('categoryId')}
            >
              <option value="">未分类</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">描述</label>
          <textarea
            id="description"
            rows={4}
            placeholder="输入书籍描述"
            className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            {...register('description')}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">封面</label>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
          <div
            onClick={() => fileRef.current?.click()}
            className="group relative flex h-36 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-primary-400 hover:bg-primary-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-primary-500 dark:hover:bg-gray-700"
          >
            {coverPreview ? (
              <>
                <img src={coverPreview} alt="封面预览" className="h-full w-full rounded-md object-cover" />
                <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <Upload className="h-6 w-6 text-white" />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <BookOpen className="h-8 w-8" />
                <span className="text-sm">点击上传封面</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" isLoading={createBook.isPending}>添加书籍</Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>取消</Button>
        </div>
      </form>
    </div>
  )
}
