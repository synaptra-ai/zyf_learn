import { request } from './request'

export interface DashboardData {
  statusDistribution: { status: string; count: number }[]
  categoryStats: { id: string; name: string; color: string; count: number }[]
  monthly: { finishedBooks: number; totalMinutes: number; month: string }
  streak: { days: number }
  total: { books: number; finished: number; minutes: number }
}

export interface HeatmapEntry {
  date: string
  minutes: number
}

export const getDashboard = () =>
  request<DashboardData>({ url: '/api/v1/stats-dashboard/dashboard' })

export const getHeatmap = (year?: number) =>
  request<HeatmapEntry[]>({ url: `/api/v1/stats-dashboard/heatmap${year ? `?year=${year}` : ''}` })
