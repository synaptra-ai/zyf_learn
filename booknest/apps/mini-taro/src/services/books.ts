import { request } from './request'
import type { Book } from '@booknest/domain'

export interface ListBooksParams {
  page?: number
  pageSize?: number
  keyword?: string
  status?: string
  categoryId?: string
}

export interface PageResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export function listBooks(params: ListBooksParams) {
  return request<PageResult<Book>>({
    url: '/api/v1/books',
    method: 'GET',
    data: params,
  })
}

export function getBook(id: string) {
  return request<Book>({
    url: `/api/v1/books/${id}`,
    method: 'GET',
  })
}

export function createBook(data: Partial<Book>) {
  return request<Book>({
    url: '/api/v1/books',
    method: 'POST',
    data,
  })
}

export function updateBook(id: string, data: Partial<Book>) {
  return request<Book>({
    url: `/api/v1/books/${id}`,
    method: 'PUT',
    data,
  })
}

export function deleteBook(id: string) {
  return request<void>({
    url: `/api/v1/books/${id}`,
    method: 'DELETE',
  })
}
