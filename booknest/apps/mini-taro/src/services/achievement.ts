import { request } from './request'

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: string
  unlocked: boolean
  unlockedAt: string | null
  progress: { current: number; target: number }
}

export interface AchievementsData {
  achievements: Achievement[]
  stats: { unlocked: number; total: number }
}

export function getAchievements() {
  return request<AchievementsData>({
    url: '/api/v1/achievements',
    method: 'GET',
  })
}

export function checkAchievements() {
  return request<{ newlyUnlocked: { id: string; name: string; icon: string }[] }>({
    url: '/api/v1/achievements/check',
    method: 'POST',
  })
}
