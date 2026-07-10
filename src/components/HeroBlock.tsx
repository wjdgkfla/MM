'use client'

import React, { FormEvent, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CAMPUS_LOCATIONS, LOCATION_LABELS, CampusLocation, Listing } from '@/lib/types'
import { useLocale } from '@/lib/i18n/LocaleProvider'

/* ── Rotating word suggestions (Karrot-style animation) ───── */
const ROTATING_WORDS = [
  'textbooks', 'desks', 'bikes', 'hoodies', 'monitors', 'printers', 'keyboards', 'lamps',
]

const SUGGESTED_BATCHES = [
  ['MATH 113 calculator', 'IKEA mini fridge', 'hoodie', 'monitor', 'BIOL 124', 'desk'],
  ['dorm chair', 'moving boxes', 'lab manual', 'bike', 'desk lamp', 'CS 310 textbook'],
  ['printer', 'headphones', 'CHEM 211', 'standing lamp', 'keyboard', 'air fryer'],
]

const RECENT_SEARCHES = ['TI-84 calculator', 'IKEA desk', 'MATH 113 textbook', 'mini fridge']

function RotatingWord() {
  const [current, setCurrent] = useState(0)
  const [prev, setPrev]       = useState<number | null>(null)
  const [animKey, setAnimKey] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setCurrent(i => {
        setPrev(i)
        return (i + 1) % ROTATING_WORDS.length
      })
      setAnimKey(k => k + 1)
    }, 2500)
    return () => clearInterval(id)
  }, [])

  // Clear outgoing word after animation finishes
  useEffect(() => {
    if (prev === null) return
    const t = setTimeout(() => setPrev(null), 360)
    return () => clearTimeout(t)
  }, [animKey, prev])

  const colorFor = (i: number): string => (i % 2 === 0 ? 'var(--m-green)' : 'var(--m-gold-text)')

  const wordStyle: React.CSSProperties = {
    whiteSpace: 'nowrap',
    fontWeight: 700,
  }

  return (
    <span style={{ position: 'relative', display: 'inline-flex', height: '1.2em', verticalAlign: 'bottom', overflow: 'hidden' }}>
      {prev !== null && (
        <span style={{ ...wordStyle, color: colorFor(prev), position: 'absolute', animation: 'wordOut 320ms cubic-bezier(0.22,1,0.36,1) both' }}>
          {ROTATING_WORDS[prev]}
        </span>
      )}
      <span key={animKey} style={{ ...wordStyle, color: colorFor(current), animation: animKey > 0 ? 'wordIn 320ms cubic-bezier(0.22,1,0.36,1) both' : 'none' }}>
        {ROTATING_WORDS[current]}
      </span>
    </span>
  )
}

/* ── TypeAhead panel ─────────────────────────────────────── */
function TypeAheadPanel({ query, onSelect }: { query: string; onSelect: (v: string) => void }) {
  const recents  = (query
    ? RECENT_SEARCHES.filter(s => s.toLowerCase().includes(query.toLowerCase()))
    : RECENT_SEARCHES
  ).slice(0, 4)

  const trending = SUGGESTED_BATCHES[0]
    .filter(s => !query || s.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5)

  if (!recents.length && !trending.length) return null

  const Row = ({ icon, label }: { icon: string; label: string }) => (
    <button
      onMouseDown={e => e.preventDefault()}
      onClick={() => onSelect(label)}
      className="flex w-full items-center gap-3 rounded-[10px] px-2 py-2.5 text-left text-[14px] font-medium transition-colors hover:bg-[var(--m-soft)]"
      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--m-ink)', fontFamily: 'inherit' }}
    >
      <span style={{ color: 'var(--m-muted)', flexShrink: 0 }}>
        {icon === 'clock' ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/></svg>
        )}
      </span>
      {label}
    </button>
  )

  return (
    <div
      className="absolute left-0 right-0 z-50 rounded-[20px] border bg-white p-4"
      style={{ top: 'calc(100% + 10px)', borderColor: 'var(--m-line)', boxShadow: '0 24px 64px -16px rgba(0,0,0,0.22)' }}
    >
      <div className="grid gap-5" style={{ gridTemplateColumns: recents.length && trending.length ? '1fr 1fr' : '1fr' }}>
        {recents.length > 0 && (
          <div>
            <p className="mb-1.5 ml-2 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--m-muted)' }}>Recent</p>
            {recents.map(s => <Row key={s} icon="clock" label={s} />)}
          </div>
        )}
        {trending.length > 0 && (
          <div style={{ borderLeft: recents.length ? '1px solid var(--m-line)' : 'none', paddingLeft: recents.length ? 20 : 0 }}>
            <p className="mb-1.5 ml-2 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--m-muted)' }}>Trending now</p>
            {trending.map(s => <Row key={s} icon="trending" label={s} />)}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Campus pill (inline inside search bar) ──────────────── */
function CampusPill({ value, onChange }: { value: CampusLocation; onChange: (c: CampusLocation) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors hover:bg-[var(--m-soft)]"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--m-ink)', whiteSpace: 'nowrap' }}
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--m-green)' }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 22s7-7.5 7-13a7 7 0 0 0-14 0c0 5.5 7 13 7 13Z"/><circle cx="12" cy="9" r="2.5"/>
        </svg>
        {LOCATION_LABELS[value]}
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ color: 'var(--m-muted)' }}>
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>
      {open && (
        <>
          <button
            type="button"
            style={{ position: 'fixed', inset: 0, zIndex: 48, background: 'transparent', border: 'none', cursor: 'default' }}
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 z-50 min-w-[160px] rounded-[14px] border bg-white p-1" style={{ top: 'calc(100% + 6px)', borderColor: 'var(--m-line)', boxShadow: '0 12px 32px -8px rgba(0,0,0,0.18)' }}>
            {CAMPUS_LOCATIONS.map(loc => (
              <button
                key={loc}
                type="button"
                onClick={() => { onChange(loc); setOpen(false) }}
                className="flex w-full items-center rounded-[10px] px-3 py-2 text-left text-[13px] font-medium transition-colors hover:bg-[var(--m-soft)]"
                style={{ background: loc === value ? 'var(--m-soft)' : 'transparent', border: 'none', cursor: 'pointer', color: 'var(--m-ink)', fontFamily: 'inherit' }}
              >
                {LOCATION_LABELS[loc]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ── Featured listings collage (real photos, asymmetric trio) ── */
function FeaturedCollage({ listings }: { listings: Listing[] }) {
  const photos = listings
    .map(l => ({ listing: l, src: l.coverImageUrl || l.imageUrls[0] }))
    .filter((p): p is { listing: Listing; src: string } => Boolean(p.src))
    .slice(0, 3)

  if (photos.length < 3) return null

  return (
    <div className="hidden lg:grid lg:h-[420px] lg:grid-cols-[1.3fr_1fr] lg:grid-rows-2 lg:gap-3">
      {photos.map(({ listing, src }, i) => (
        <Link
          key={listing.id}
          href={`/item/${listing.id}`}
          className={`group relative overflow-hidden ${i === 0 ? 'row-span-2' : ''}`}
          style={{ borderRadius: 20, background: 'var(--m-soft)' }}
        >
          <Image
            src={src}
            alt={listing.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 1024px) 0px, 40vw"
            unoptimized={src.startsWith('data:')}
          />
          <div
            className="absolute inset-x-0 bottom-0 p-3"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.45), transparent)' }}
          >
            <p className="truncate text-[13px] font-semibold text-white">{listing.title}</p>
            <p className="text-[12px] font-bold text-white/90">
              {listing.price === 0 ? 'Free' : `$${listing.price}`}
            </p>
          </div>
        </Link>
      ))}
    </div>
  )
}

/* ── HeroBlock ───────────────────────────────────────────── */
interface HeroBlockProps {
  initialSearch?: string
  featuredListings?: Listing[]
}

export function HeroBlock({ initialSearch = '', featuredListings = [] }: HeroBlockProps) {
  const router = useRouter()
  const { t } = useLocale()
  const [query,     setQuery]   = useState(initialSearch)
  const [campus,    setCampus]  = useState<CampusLocation>('fairfax')
  const [focused,   setFocused] = useState(false)
  const [batchIdx,  setBatch]   = useState(0)

  const batch    = SUGGESTED_BATCHES[batchIdx % SUGGESTED_BATCHES.length]
  const batches  = SUGGESTED_BATCHES.length

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    setFocused(false)
    const params = new URLSearchParams()
    if (q) params.set('search', q)
    params.set('campusLocation', campus)
    router.push(`/?${params.toString()}`)
  }

  const handleSelect = (val: string) => {
    setQuery(val)
    setFocused(false)
    const params = new URLSearchParams()
    params.set('search', val)
    params.set('campusLocation', campus)
    router.push(`/?${params.toString()}`)
  }

  const handleChip = (chip: string) => {
    setQuery(chip)
    setFocused(false)
    const params = new URLSearchParams()
    params.set('search', chip)
    params.set('campusLocation', campus)
    router.push(`/?${params.toString()}`)
  }

  return (
    <section style={{ background: 'var(--m-soft-warm)' }}>
      <div className="mx-auto max-w-wide px-6 py-14 sm:py-16 lg:py-20">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
      <div className="text-center lg:text-left">

        {/* ── Headline with rotating word ── */}
        <h1
          className="text-[36px] font-bold leading-[1.15] tracking-[-0.02em] sm:text-[48px]"
          style={{ color: 'var(--m-ink)', fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)' }}
        >
          Find&nbsp;<RotatingWord />&nbsp;at Mason Market
        </h1>

        {/* ── Subhead ── */}
        <p className="mt-3 text-[15px] font-medium sm:text-[16px]" style={{ color: 'var(--m-muted)', lineHeight: 1.5 }}>
          {t('home.subhead')}
        </p>

        {/* ── Search bar ── */}
        <form onSubmit={handleSubmit} className="mt-7">
          <div style={{ position: 'relative' }}>
            {/* Backdrop when focused */}
            {focused && (
              <div
                onClick={() => setFocused(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 48, background: 'rgba(0,0,0,0.28)' }}
              />
            )}

            {/* Bar */}
            <div
              className="relative z-50 flex items-center rounded-full bg-white"
              style={{
                height: 64,
                border: '1.5px solid var(--m-line)',
                boxShadow: '0 4px 28px rgba(0,107,60,0.09)',
              }}
            >
              {/* Campus selector */}
              <div className="pl-2">
                <CampusPill value={campus} onChange={setCampus} />
              </div>

              {/* Divider */}
              <div className="mx-1 h-7 w-px shrink-0" style={{ background: '#E8E8E5' }} />

              {/* Search input */}
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 160)}
                placeholder={t('home.searchPlaceholder')}
                className="min-w-0 flex-1 bg-transparent text-[15px] font-medium outline-none"
                style={{ color: 'var(--m-ink)', border: 'none', padding: '0 14px' }}
              />

              {/* Clear */}
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[var(--m-soft)]"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--m-muted)' }}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
                </button>
              )}

              {/* Search button */}
              <button
                type="submit"
                aria-label="Search"
                className="mr-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition-opacity hover:opacity-80"
                style={{ background: 'var(--m-green)', border: 'none', cursor: 'pointer' }}
              >
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
                </svg>
              </button>
            </div>

            {/* TypeAhead */}
            {focused && (
              <TypeAheadPanel query={query} onSelect={handleSelect} />
            )}
          </div>
        </form>

        {/* ── Suggested chips rail ── */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
          <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.07em]" style={{ color: 'var(--m-muted)' }}>
            <span style={{ color: 'var(--m-gold-text)' }}>✦</span> {t('home.suggested')}
          </span>
          <span className="shrink-0 text-[12px]" style={{ color: 'var(--m-muted)' }}>·</span>

          {batch.map((chip, i) => (
            <button
              key={`${batchIdx}-${i}`}
              type="button"
              onClick={() => handleChip(chip)}
              className="h-[30px] rounded-full border bg-white px-3 text-[12px] font-medium whitespace-nowrap transition-colors hover:bg-[var(--m-soft)]"
              style={{ borderColor: 'var(--m-line)', color: 'var(--m-ink)', cursor: 'pointer' }}
            >
              {chip}
            </button>
          ))}

          {/* Batch cycle arrows */}
          <div className="flex shrink-0 flex-col gap-0.5">
            {([['up', -1, 'Previous'], ['down', 1, 'Next']] as const).map(([dir, delta, label]) => (
              <button
                key={dir}
                type="button"
                onClick={() => setBatch(b => (b + delta + batches) % batches)}
                aria-label={`${label} suggestions`}
                className="flex h-8 w-8 items-center justify-center opacity-50 hover:opacity-100 transition-opacity sm:h-3.5 sm:w-[18px]"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--m-muted)', padding: 0 }}
              >
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d={dir === 'up' ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} />
                </svg>
              </button>
            ))}
          </div>
        </div>

      </div>

      <FeaturedCollage listings={featuredListings} />
        </div>
      </div>
    </section>
  )
}
