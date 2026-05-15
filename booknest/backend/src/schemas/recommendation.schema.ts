import { z } from '../lib/zod-extended'

export const recommendResponseSchema = z.object({
  items: z.array(z.any()),
})

export const discoverResponseSchema = z.object({
  continueReading: z.array(z.any()),
  forYou: z.array(z.any()),
  categoryPicks: z.array(z.object({
    category: z.any(),
    books: z.array(z.any()),
  })),
})

export const similarResponseSchema = z.object({
  items: z.array(z.any()),
})
