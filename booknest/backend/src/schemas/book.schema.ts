import { z } from '../lib/zod-extended'

export const bookStatusSchema = z.enum(['OWNED', 'READING', 'FINISHED', 'WISHLIST'])

export const bookSchema = z.object({
  id: z.string().uuid().openapi({ example: '4e8311a0-8f32-4e9d-a17b-0e9f12345678' }),
  title: z.string().openapi({ example: 'Clean Code' }),
  author: z.string().openapi({ example: 'Robert C. Martin' }),
  isbn: z.string().nullable().optional(),
  publishedDate: z.string().nullable().optional(),
  pageCount: z.number().nullable().optional(),
  description: z.string().nullable().optional(),
  coverUrl: z.string().nullable().optional(),
  status: bookStatusSchema,
  categoryId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const createBookBodySchema = z.object({
  title: z.string().min(1, '书名不能为空').max(200),
  author: z.string().min(1, '作者不能为空').max(100),
  isbn: z.string().max(13).optional(),
  publishedDate: z.string().optional(),
  pageCount: z.number().int().positive().optional(),
  description: z.string().max(2000).optional(),
  coverUrl: z.string().url().optional(),
  status: bookStatusSchema.default('WISHLIST'),
  categoryId: z.string().uuid().optional(),
})

export const updateBookBodySchema = createBookBodySchema.partial()

export const listBooksQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(10),
  status: bookStatusSchema.optional(),
  categoryId: z.string().uuid().optional(),
  sortBy: z.enum(['createdAt', 'title', 'author', 'pageCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type CreateBookBody = z.infer<typeof createBookBodySchema>
export type UpdateBookBody = z.infer<typeof updateBookBodySchema>
export type ListBooksQuery = z.infer<typeof listBooksQuerySchema>
