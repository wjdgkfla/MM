'use client'

import { useEffect, useState } from 'react'
import { Rating, RATING_TAG_LABELS, RatingTag } from '@/lib/types'
import { reputationLabel } from '@/lib/trust'

interface SellerRatingProps {
  sellerId: string
  compact?: boolean
  completedTransactionCount?: number
}

function getPercentColor(percentage: number): string {
  if (percentage >= 80) return 'text-[var(--m-green)]'
  if (percentage >= 60) return 'text-blue-500'
  if (percentage >= 40) return 'text-amber-500'
  return 'text-red-500'
}

export function SellerRating({ sellerId, compact = false, completedTransactionCount = 0 }: SellerRatingProps) {
  const [ratings, setRatings] = useState<Rating[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/ratings?sellerId=${encodeURIComponent(sellerId)}`)
      .then((r) => r.json())
      .then((data) => setRatings(Array.isArray(data) ? data : []))
      .catch(() => setRatings([]))
      .finally(() => setLoading(false))
  }, [sellerId])

  if (loading) return null

  const positiveCount = ratings.filter((r) => r.score === 1).length
  const positiveReviewPercentage = ratings.length > 0 ? Math.round((positiveCount / ratings.length) * 100) : 0
  const summary = reputationLabel({
    completedTransactionCount,
    reviewCount: ratings.length,
    positiveReviewPercentage,
  })
  const tagCounts: Partial<Record<RatingTag, number>> = {}
  for (const rating of ratings) {
    for (const tag of rating.tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1
    }
  }
  const topTags = (Object.entries(tagCounts) as [RatingTag, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-sm font-semibold ${getPercentColor(positiveReviewPercentage)}`}>
        {summary}
      </span>
    )
  }

  return (
    <div>
      <div>
        <p className={`text-sm font-semibold ${getPercentColor(positiveReviewPercentage)}`}>{summary}</p>
        <div className="mt-1 text-sm text-[var(--m-muted)]">
          {ratings.length > 0 ? (
            <p>
              {positiveCount} 👍 · {ratings.length - positiveCount} 👎
              <span className="ml-1 text-[var(--m-muted)]">({ratings.length} {ratings.length === 1 ? 'review' : 'reviews'})</span>
            </p>
          ) : (
            <p className="text-[var(--m-muted)]">No ratings yet</p>
          )}
        </div>
      </div>
      {topTags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {topTags.map(([tag, count]) => (
            <span
              key={tag}
              className="rounded-full bg-[var(--m-green-soft)] px-2.5 py-1 text-xs text-[var(--m-green)]"
            >
              {RATING_TAG_LABELS[tag]} ×{count}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
