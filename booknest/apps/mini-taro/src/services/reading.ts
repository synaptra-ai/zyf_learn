import { request } from './request'

export interface ReadingSession {
  id: string
  bookId: string
  startTime: string
  endTime: string
  durationMinutes: number
  note: string | null
  createdAt: string
  book?: { id: string; title: string; coverUrl: string | null }
}

export interface ReadingSummary {
  todayMinutes: number
  dailyGoal: number
  goalMet: boolean
  streakDays: number
  recentDays: { date: string; minutes: number; goalMet: boolean }[]
}

export interface ReadingGoal {
  id: string
  dailyGoalMinutes: number
  isActive: boolean
}

export interface TimelineDay {
  date: string
  totalMinutes: number
  goalMet: boolean
  sessions: ReadingSession[]
}

export function getReadingSummary() {
  return request<ReadingSummary>({
    url: '/api/v1/reading/summary',
    method: 'GET',
  })
}

export function createReadingSession(data: {
  bookId: string
  startTime: string
  endTime: string
  note?: string
  readingProgress?: number
}) {
  return request<ReadingSession>({
    url: '/api/v1/reading/sessions',
    method: 'POST',
    data,
  })
}

export function getReadingSessions(date: string) {
  return request<ReadingSession[]>({
    url: '/api/v1/reading/sessions',
    method: 'GET',
    data: { date },
  })
}

export function getReadingTimeline(days = 7) {
  return request<TimelineDay[]>({
    url: '/api/v1/reading/sessions/timeline',
    method: 'GET',
    data: { days },
  })
}

export function getReadingGoal() {
  return request<ReadingGoal>({
    url: '/api/v1/reading/goal',
    method: 'GET',
  })
}

export function updateReadingGoal(dailyGoalMinutes: number) {
  return request<ReadingGoal>({
    url: '/api/v1/reading/goal',
    method: 'PUT',
    data: { dailyGoalMinutes },
  })
}

export function updateBookProgress(bookId: string, readingProgress: number) {
  return request<{ id: string; readingProgress: number }>({
    url: `/api/v1/books/${bookId}/progress`,
    method: 'PATCH',
    data: { readingProgress },
  })
}
