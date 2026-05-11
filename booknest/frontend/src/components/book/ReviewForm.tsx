import { useState } from 'react'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useCreateReview } from '@/hooks/useReviews'

export function ReviewForm({ bookId }: { bookId: string }) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [text, setText] = useState('')
  const createReview = useCreateReview()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) return
    createReview.mutate(
      { bookId, rating, text: text || undefined },
      { onSuccess: () => { setRating(0); setText('') } }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">评分：</span>
        {Array.from({ length: 5 }).map((_, i) => (
          <button
            key={i}
            data-testid={`review-rating-${i + 1}`}
            type="button"
            onClick={() => setRating(i + 1)}
            onMouseEnter={() => setHoverRating(i + 1)}
            onMouseLeave={() => setHoverRating(0)}
            className="focus:outline-none"
          >
            <Star
              className={`h-5 w-5 transition-colors ${
                i < (hoverRating || rating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300 dark:text-gray-600'
              }`}
            />
          </button>
        ))}
      </div>
      <textarea
        data-testid="review-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="写下你的感想..."
        rows={3}
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:placeholder:text-gray-500"
      />
      <Button data-testid="submit-review" type="submit" size="sm" disabled={rating === 0} isLoading={createReview.isPending}>
        提交评论
      </Button>
    </form>
  )
}
