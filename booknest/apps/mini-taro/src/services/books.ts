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

export interface BookFormInput {
  title: string
  author: string
  description?: string
  status: string
  categoryId?: string
  isbn?: string
  pageCount?: number
  publishedDate?: string
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

export function createBook(data: BookFormInput) {
  return request<Book, BookFormInput>({
    url: '/api/v1/books',
    method: 'POST',
    data,
  })
}

export function updateBook(id: string, data: Partial<BookFormInput>) {
  return request<Book, Partial<BookFormInput>>({
    url: `/api/v1/books/${id}`,
    method: 'PUT',
    data,
  })
}

export function deleteBook(id: string) {
  return request<{ id: string }>({
    url: `/api/v1/books/${id}`,
    method: 'DELETE',
  })
}
