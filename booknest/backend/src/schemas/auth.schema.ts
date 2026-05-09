import { z } from '../lib/zod-extended'

export const userPublicSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  createdAt: z.string().datetime().optional(),
})

export const registerBodySchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少 6 位'),
  name: z.string().min(1, '姓名不能为空').max(50),
})

export const loginBodySchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(1, '密码不能为空'),
})

export const authResponseSchema = z.object({
  token: z.string(),
  user: userPublicSchema,
})
