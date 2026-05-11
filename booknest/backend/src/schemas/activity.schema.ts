import { z } from 'zod'

export const createActivityBodySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  capacity: z.number().int().positive().max(10000),
  priceCents: z.number().int().min(0),
  startsAt: z.string().datetime(),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('PUBLISHED'),
})

export const updateActivityBodySchema = createActivityBodySchema.partial()
