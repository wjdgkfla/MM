'use client'

import { useState } from 'react'
import { RATING_TAGS, RATING_TAG_LABELS, RatingTag } from '@/lib/types'

interface RatingFormProps {
  sellerId: string
  listingId: string
  onSuccess?: () => void
}

export function RatingForm({ sellerId, listingId, onSuccess }: RatingFormProps) {
  const [score, setScore] = useState<1 | -1 | null>(null)
  const [selectedTags, setSelectedTags] = useState<RatingTag[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [done, setDone] = useState(false)

  const toggleTag = (tag: RatingTag) => {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag].slice(0, 5)
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (score === null) {
      setFeedback('Please select thumbs up or down.')
      return
    }
    setSubmitting(true)
    setFeedback('')
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerId, listingId, score, tags: selectedTags }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Could not submit rating')
      }
      setDone(true)
      onSuccess?.()
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Could not submit rating')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-[#006633]/30 bg-[#006633]/5 p-4 text-center">
        <p className="text-sm font-medium text-[#006633]">Thanks for your feedback!</p>
        <p className="mt-1 text-xs text-gray-500">Your rating helps the Mason Market community.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm font-semibold text-gray-900">Rate this seller</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setScore(1)}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-colors ${
            score === 1
              ? 'border-[#006633] bg-[#006633]/10 text-[#006633]'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
          }`}
        >
          👍 Good
        </button>
        <button
          type="button"
          onClick={() => setScore(-1)}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-colors ${
            score === -1
              ? 'border-red-300 bg-red-50 text-red-700'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
          }`}
        >
          👎 Bad
        </button>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-gray-600">What stood out? (optional)</p>
        <div className="flex flex-wrap gap-2">
          {RATING_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                selectedTags.includes(tag)
                  ? 'border-[#006633] bg-[#006633]/10 text-[#006633]'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              {RATING_TAG_LABELS[tag]}
            </button>
          ))}
        </div>
      </div>
      {feedback ? <p className="text-xs text-red-600">{feedback}</p> : null}
      <button type="submit" disabled={submitting} className="ui-btn-primary w-full">
        {submitting ? 'Submitting…' : 'Submit rating'}
      </button>
    </form>
  )
}
