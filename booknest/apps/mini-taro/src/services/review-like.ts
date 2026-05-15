import { request } from './request'

export function toggleReviewLike(reviewId: string) {
  return request<{ liked: boolean; likeCount: number }>({
    url: `/api/v1/reviews/${reviewId}/like`,
    method: 'POST',
  })
}

export function getReviewLikeStatus(reviewId: string) {
  return request<{ liked: boolean; likeCount: number }>({
    url: `/api/v1/reviews/${reviewId}/like-status`,
    method: 'GET',
  })
}
