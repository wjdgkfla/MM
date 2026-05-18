'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Mason Market] Unhandled error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="ui-surface max-w-md p-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <svg className="h-7 w-7 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="font-display text-xl font-bold" style={{ color: 'var(--m-ink)' }}>Something went wrong</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--m-muted)' }}>
          An unexpected error occurred. Try refreshing the page or going back to the feed.
        </p>
        {error.digest ? (
          <p className="mt-2 font-mono text-xs" style={{ color: 'var(--m-muted)' }}>Error ID: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="ui-btn-primary"
          >
            Try again
          </button>
          <Link href="/" className="ui-btn-secondary">
            Back to feed
          </Link>
        </div>
      </div>
    </div>
  )
}
