import { request } from './request'

export interface Activity {
  id: string
  title: string
  description?: string | null
  capacity: number
  priceCents: number
  status: string
  startsAt: string
  registeredCount: number
  createdAt: string
}

export function listActivities() {
  return request<Activity[]>({
    url: '/api/v1/activities',
    method: 'GET',
  })
}

export function getActivity(id: string) {
  return request<Activity & { orders?: any[] }>({
    url: `/api/v1/activities/${id}`,
    method: 'GET',
  })
}
