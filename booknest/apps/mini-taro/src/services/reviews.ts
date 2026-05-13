import { request } from './request'

export interface Review {
  id: string
  rating: number
  comment: string
  user: { id: string; name: string }
  createdAt: string
}

export function listReviews(bookId: string) {
  return request<Review[]>({
    url: `/api/v1/books/${bookId}/reviews`,
    method: 'GET',
  })
}

export function createReview(bookId: string, data: { rating: number; comment: string }) {
  return request<Review>({
    url: `/api/v1/books/${bookId}/reviews`,
    method: 'POST',
    data,
  })
}
