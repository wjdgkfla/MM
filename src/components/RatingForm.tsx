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
      <div className="rounded-xl border border-[var(--m-green)]/30 bg-[var(--m-green-soft)] p-4 text-center">
        <p className="text-sm font-medium text-[var(--m-green)]">Thanks for your feedback!</p>
        <p className="mt-1 text-xs text-[var(--m-muted)]">Your rating helps the Mason Market community.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-[var(--m-line)] bg-[var(--m-soft)] p-4">
      <p className="text-sm font-semibold text-[var(--m-ink)]">Rate this seller</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setScore(1)}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-colors ${
            score === 1
              ? 'border-[var(--m-green)] bg-[var(--m-green-soft)] text-[var(--m-green)]'
              : 'border-[var(--m-line)] bg-white text-[var(--m-ink)] hover:border-[var(--m-ink)]'
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
              : 'border-[var(--m-line)] bg-white text-[var(--m-ink)] hover:border-[var(--m-ink)]'
          }`}
        >
          👎 Bad
        </button>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-[var(--m-muted)]">What stood out? (optional)</p>
        <div className="flex flex-wrap gap-2">
          {RATING_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                selectedTags.includes(tag)
                  ? 'border-[var(--m-green)] bg-[var(--m-green-soft)] text-[var(--m-green)]'
                  : 'border-[var(--m-line)] bg-white text-[var(--m-muted)] hover:border-[var(--m-ink)]'
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
