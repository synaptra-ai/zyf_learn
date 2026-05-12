import { request } from './request'

export interface Category {
  id: string
  name: string
  color: string
}

export function listCategories() {
  return request<Category[]>({
    url: '/api/v1/categories',
    method: 'GET',
  })
}
