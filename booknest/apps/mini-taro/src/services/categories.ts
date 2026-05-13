import { request } from './request'

export interface Category {
  id: string
  name: string
  color: string
  _count?: { books: number }
}

export function listCategories() {
  return request<Category[]>({
    url: '/api/v1/categories',
    method: 'GET',
  })
}

export function createCategory(data: { name: string; color: string }) {
  return request<Category>({
    url: '/api/v1/categories',
    method: 'POST',
    data,
  })
}

export function deleteCategory(id: string) {
  return request<{ message: string }>({
    url: `/api/v1/categories/${id}`,
    method: 'DELETE',
  })
}
