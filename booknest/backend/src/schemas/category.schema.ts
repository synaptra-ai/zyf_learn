import { z } from 'zod'

export const categorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, '颜色格式不正确'),
  userId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const createCategoryBodySchema = z.object({
  name: z.string().min(1, '分类名不能为空').max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, '颜色格式不正确'),
})

export const updateCategoryBodySchema = createCategoryBodySchema.partial()
