import { z } from '../lib/zod-extended'

export const achievementProgressSchema = z.object({
  current: z.number(),
  target: z.number(),
})

export const achievementItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  category: z.string(),
  unlocked: z.boolean(),
  unlockedAt: z.string().nullable(),
  progress: achievementProgressSchema,
})

export const achievementsResponseSchema = z.object({
  achievements: z.array(achievementItemSchema),
  stats: z.object({
    unlocked: z.number(),
    total: z.number(),
  }),
})

export const checkResponseSchema = z.object({
  newlyUnlocked: z.array(z.object({
    id: z.string(),
    name: z.string(),
    icon: z.string(),
  })),
})
