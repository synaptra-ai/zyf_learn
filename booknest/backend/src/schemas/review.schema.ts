import { z } from 'zod'

export const reviewSchema = z.object({
  id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  text: z.string().nullable().optional(),
  bookId: z.string().uuid(),
  userId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const createReviewBodySchema = z.object({
  rating: z.number().int().min(1, '评分最低 1').max(5, '评分最高 5'),
  text: z.string().optional(),
})
