import { z } from 'zod'

export const bookSchema = z.object({
  title: z.string().min(1, '书名不能为空').max(200, '书名不超过200字'),
  author: z.string().min(1, '作者不能为空').max(100),
  isbn: z.string().regex(/^(?:\d{10}|\d{13})$/, 'ISBN格式不正确').optional().or(z.literal('')),
  pageCount: z.number().positive('页数必须大于0').optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['OWNED', 'READING', 'FINISHED', 'WISHLIST']),
  categoryId: z.string().optional(),
})

export type BookFormData = z.infer<typeof bookSchema>
