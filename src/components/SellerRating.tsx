'use client'

import { useEffect, useState } from 'react'
import { Rating, RATING_TAG_LABELS, RatingTag } from '@/lib/types'

interface SellerRatingProps {
  sellerId: string
  compact?: boolean
  mannerTemp?: number
}

/** Maps positive-review ratio to a "manner temperature" like 당근마켓 */
function getMannerTemp(ratings: Rating[]): number {
  if (ratings.length === 0) return 36.5
  const positiveCount = ratings.filter((r) => r.score === 1).length
  const ratio = positiveCount / ratings.length
  // Range: 36.5 (baseline) → 99 (all positive)
  return Math.round((36.5 + ratio * 62.5) * 10) / 10
}

function getTempColor(temp: number): string {
  if (temp >= 80) return 'text-[var(--m-green)]'
  if (temp >= 60) return 'text-blue-500'
  if (temp >= 40) return 'text-amber-500'
  return 'text-red-500'
}

export function SellerRating({ sellerId, compact = false, mannerTemp }: SellerRatingProps) {
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

  const temp = mannerTemp !== undefined ? mannerTemp : getMannerTemp(ratings)
  const positiveCount = ratings.filter((r) => r.score === 1).length
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
      <span className={`inline-flex items-center gap-1 text-sm font-semibold ${getTempColor(temp)}`}>
        🌡️ {temp}° manner
      </span>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <div>
          <span className={`text-3xl font-bold ${getTempColor(temp)}`}>{temp}°</span>
          <p className="text-xs text-[var(--m-muted)] mt-0.5">Manner temperature</p>
        </div>
        <div className="text-sm text-[var(--m-muted)]">
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
