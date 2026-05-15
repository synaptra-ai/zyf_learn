import { request } from './request'

export interface ReadingReport {
  user: { nickname: string }
  booksFinished: number
  totalMinutes: number
  streakDays: number
  achievements: number
  topCategory: string
  period: string
}

export interface FeedItem {
  id: string
  type: string
  content: Record<string, any>
  user: { nickname: string }
  createdAt: string
}

export function getReadingReport() {
  return request<ReadingReport>({
    url: '/api/v1/social/report',
    method: 'GET',
  })
}

export function getFeed(page = 1, pageSize = 20) {
  return request<{ items: FeedItem[]; total: number }>({
    url: '/api/v1/social/feed',
    method: 'GET',
    data: { page, pageSize },
  })
}
