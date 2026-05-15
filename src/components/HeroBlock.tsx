'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

interface HeroBlockProps {
  initialSearch?: string
}

const TRENDING = ['TI-84 calculator', 'IKEA desk', 'MATH 113 textbook', 'mini fridge', 'hoodie', 'monitor']

export function HeroBlock({ initialSearch = '' }: HeroBlockProps) {
  const router = useRouter()
  const [query, setQuery] = useState(initialSearch)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    router.push(q ? `/?search=${encodeURIComponent(q)}` : '/')
  }

  return (
    <section
      className="border-b"
      style={{ borderColor: 'var(--m-line)', background: 'var(--m-soft)' }}
    >
      <div className="mx-auto max-w-[1280px] px-6 py-10 sm:py-14">
        <div className="max-w-2xl">
          {/* Headline */}
          <h1
            className="text-[28px] font-black leading-tight tracking-tight sm:text-[38px]"
            style={{ color: 'var(--m-ink)' }}
          >
            The campus marketplace
            <br />
            <span style={{ color: 'var(--m-green)' }}>for Mason students.</span>
          </h1>
          <p className="mt-2 text-[14px] sm:text-[16px]" style={{ color: 'var(--m-muted)' }}>
            Buy and sell textbooks, electronics, furniture, and more — safely on campus.
          </p>

          {/* Search */}
          <form onSubmit={handleSubmit} className="mt-5 flex items-center gap-3">
            <div
              className="flex flex-1 items-center gap-2 rounded-full border bg-white px-4 h-12 max-w-[480px] focus-within:border-[var(--m-ink)] transition-colors"
              style={{ borderColor: 'var(--m-line)' }}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" style={{ color: 'var(--m-muted)' }} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
              </svg>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search textbooks, electronics, furniture…"
                className="flex-1 bg-transparent text-[14px] outline-none"
                style={{ color: 'var(--m-ink)' }}
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} className="shrink-0" style={{ color: 'var(--m-muted)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}>
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
                </button>
              )}
            </div>
            <button
              type="submit"
              className="h-12 rounded-full px-5 text-[14px] font-bold text-white shrink-0"
              style={{ background: 'var(--m-green)' }}
            >
              Search
            </button>
          </form>

          {/* Trending chips */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--m-muted)' }}>Trending</span>
            {TRENDING.map(term => (
              <button
                key={term}
                type="button"
                onClick={() => { setQuery(term); router.push(`/?search=${encodeURIComponent(term)}`) }}
                className="rounded-full border bg-white px-3 py-1 text-[12px] font-medium transition-colors hover:border-[var(--m-ink)]"
                style={{ borderColor: 'var(--m-line)', color: 'var(--m-ink)' }}
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
