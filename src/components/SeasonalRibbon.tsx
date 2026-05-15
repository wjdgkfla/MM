'use client'

import { useEffect, useState } from 'react'

interface Season {
  emoji: string
  label: string
  body: string
  cta: string
  href: string
}

function getCurrentSeason(): Season | null {
  const m = new Date().getMonth()
  if (m === 4 || m === 5)
    return { emoji: '📦', label: 'Move-out season', body: 'Tons of dorm items being listed.', cta: 'Browse furniture →', href: '/?category=furniture' }
  if (m === 7 || m === 8)
    return { emoji: '📚', label: 'Fall semester', body: 'Textbooks and supplies going fast.', cta: 'Shop textbooks →', href: '/?category=textbooks' }
  if (m === 0 || m === 1)
    return { emoji: '❄️', label: 'Spring listings', body: 'Post your unused items before break.', cta: 'Sell something →', href: '/sell' }
  return { emoji: '🌱', label: 'New listings daily', body: 'GMU students buying and selling on campus.', cta: 'Browse now →', href: '/' }
}

export function SeasonalRibbon() {
  const [dismissed, setDismissed] = useState(false)
  const [season, setSeason] = useState<Season | null>(null)

  useEffect(() => {
    // Check if dismissed in this session
    const wasDismissed = sessionStorage.getItem('ribbon-dismissed')
    if (wasDismissed) { setDismissed(true); return }
    setSeason(getCurrentSeason())
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem('ribbon-dismissed', '1')
  }

  if (dismissed || !season) return null

  return (
    <div
      role="banner"
      style={{ background: 'var(--m-green)', color: 'white', position: 'relative' }}
      className="flex items-center justify-center gap-2 px-12 py-2.5 text-[13px] font-medium"
    >
      <span className="text-[15px]">{season.emoji}</span>
      <span>
        <strong className="font-bold">{season.label}</strong>
        {' — '}
        {season.body}
      </span>
      <a
        href={season.href}
        className="font-bold underline underline-offset-2 hover:no-underline"
        style={{ color: 'white' }}
      >
        {season.cta}
      </a>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full opacity-70 hover:opacity-100 transition-opacity"
        style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  )
}
