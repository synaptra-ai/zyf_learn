import { z } from 'zod'

export const uuidSchema = z.string().uuid()

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
})

export const errorResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  details: z.unknown().optional(),
})

export const successResponse = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    code: z.number(),
    message: z.string(),
    data,
  })

export const paginatedResponse = <T extends z.ZodTypeAny>(item: T) =>
  successResponse(
    z.object({
      items: z.array(item),
      total: z.number(),
      page: z.number(),
      pageSize: z.number(),
      totalPages: z.number(),
    }),
  )
