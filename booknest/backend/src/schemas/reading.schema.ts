import { z } from '../lib/zod-extended'

export const createSessionBodySchema = z.object({
  bookId: z.string().min(1, '请选择要阅读的书籍'),
  startTime: z.string().datetime('开始时间格式错误'),
  endTime: z.string().datetime('结束时间格式错误'),
  note: z.string().max(500).optional(),
  readingProgress: z.number().int().min(0).max(100).optional(),
}).refine(
  (data) => new Date(data.endTime) > new Date(data.startTime),
  { message: '结束时间必须晚于开始时间', path: ['endTime'] },
)

export const listSessionsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式错误').optional(),
  days: z.coerce.number().int().min(1).max(30).default(7),
})

export const updateGoalBodySchema = z.object({
  dailyGoalMinutes: z.number().int().min(1, '目标至少1分钟').max(480, '目标不能超过8小时'),
})

export const updateProgressBodySchema = z.object({
  readingProgress: z.number().int().min(0).max(100),
})

export type CreateSessionBody = z.infer<typeof createSessionBodySchema>
export type UpdateGoalBody = z.infer<typeof updateGoalBodySchema>
