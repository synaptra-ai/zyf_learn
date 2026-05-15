import { request } from './request'

export interface RecommendBook {
  id: string
  title: string
  author: string
  coverUrl: string | null
  status: string
  readingProgress: number
  category: { id: string; name: string; color: string } | null
}

export interface DiscoverData {
  continueReading: RecommendBook[]
  forYou: RecommendBook[]
  categoryPicks: {
    category: { id: string; name: string; color: string }
    books: RecommendBook[]
  }[]
}

export function getHomepageRecommendations() {
  return request<{ items: RecommendBook[] }>({
    url: '/api/v1/recommendations',
    method: 'GET',
  })
}

export function getDiscoverPage() {
  return request<DiscoverData>({
    url: '/api/v1/recommendations/discover',
    method: 'GET',
  })
}

export function getSimilarBooks(bookId: string) {
  return request<{ items: RecommendBook[] }>({
    url: `/api/v1/recommendations/similar/${bookId}`,
    method: 'GET',
  })
}
