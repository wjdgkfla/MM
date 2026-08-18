'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'motion/react'
import { ListingCard } from '@/components/ListingCard'
import { HeroBlock } from '@/components/HeroBlock'
import { SubNavRail } from '@/components/SubNavRail'
import { FilterDrawer, FilterState } from '@/components/FilterDrawer'
import { SeasonalRibbon } from '@/components/SeasonalRibbon'
import { useFavorites } from '@/lib/useFavorites'
import { CAMPUS_LOCATIONS, CampusLocation, CATEGORIES, Category, Listing, LISTING_KINDS, ListingKind, CONDITION_LABELS, LOCATION_LABELS, PICKUP_ZONE_LABELS } from '@/lib/types'
import { useAuthSession } from '@/lib/auth/useAuthSession'
import { useLocale } from '@/lib/i18n/LocaleProvider'

type SortOption = 'newest' | 'oldest' | 'price-asc' | 'price-desc'

const EMPTY_FILTERS: FilterState = {
  campusLocation: '',
  pickupZone: '',
  condition: '',
  status: '',
  listingKind: '',
  minPrice: '',
  maxPrice: '',
  freeOnly: false,
  courseTag: '',
}

function filterChips(f: FilterState): { key: keyof FilterState; label: string }[] {
  const chips: { key: keyof FilterState; label: string }[] = []
  if (f.campusLocation) chips.push({ key: 'campusLocation', label: LOCATION_LABELS[f.campusLocation] })
  if (f.pickupZone) chips.push({ key: 'pickupZone', label: PICKUP_ZONE_LABELS[f.pickupZone] })
  if (f.condition) chips.push({ key: 'condition', label: CONDITION_LABELS[f.condition] })
  if (f.status) chips.push({ key: 'status', label: f.status === 'available' ? 'Available' : 'Reserved' })
  if (f.listingKind) chips.push({ key: 'listingKind', label: f.listingKind === 'sell' ? 'For sale' : 'Wanted' })
  if (f.minPrice && f.maxPrice) chips.push({ key: 'minPrice', label: `$${f.minPrice}–$${f.maxPrice}` })
  else if (f.minPrice) chips.push({ key: 'minPrice', label: `Over $${f.minPrice}` })
  else if (f.maxPrice) chips.push({ key: 'maxPrice', label: `Under $${f.maxPrice}` })
  if (f.freeOnly) chips.push({ key: 'freeOnly', label: 'Free only' })
  if (f.courseTag) chips.push({ key: 'courseTag', label: f.courseTag })
  return chips
}

function countFilters(f: FilterState): number {
  return (
    (f.campusLocation ? 1 : 0) +
    (f.pickupZone ? 1 : 0) +
    (f.condition ? 1 : 0) +
    (f.status ? 1 : 0) +
    (f.listingKind ? 1 : 0) +
    (f.minPrice ? 1 : 0) +
    (f.maxPrice ? 1 : 0) +
    (f.freeOnly ? 1 : 0) +
    (f.courseTag ? 1 : 0)
  )
}

function HomeContent() {
  const router = useRouter()
  const { t } = useLocale()
  const { session } = useAuthSession()
  const { savedSet, toggleFavorite } = useFavorites(session?.userId)

  const searchParams = useSearchParams()

  // Core state
  const [listings, setListings]       = useState<Listing[]>([])
  const [search, setSearch]           = useState<string>(() => searchParams.get('search') || '')
  const [category, setCategory]       = useState<Category | null>(() => {
    const c = searchParams.get('category')
    return c && CATEGORIES.includes(c as Category) ? (c as Category) : null
  })
  const [sort, setSort]               = useState<SortOption>('newest')
  const [filters, setFilters]         = useState<FilterState>(EMPTY_FILTERS)
  const [drawerOpen, setDrawerOpen]   = useState(false)

  // Pagination + loading
  const [loading, setLoading]         = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [fetchError, setFetchError]   = useState('')
  const [showEmailBanner, setShowEmailBanner] = useState(false)
  const [cursor, setCursor]           = useState<string | null>(null)
  const [hasMore, setHasMore]         = useState(true)
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})
  const [notifyMeSaved, setNotifyMeSaved] = useState(false)
  const [notifyMeSaving, setNotifyMeSaving] = useState(false)
  // Bumped every time the main filter/search/sort fetch starts. loadMore and
  // the main fetch itself check this before applying their response, so a
  // slow request whose filters have since changed can't clobber newer state.
  const requestIdRef = useRef(0)

  // Sync state when URL search params change (chip clicks, seasonal ribbon, back/forward)
  useEffect(() => {
    const q = searchParams.get('search') || ''
    const c = searchParams.get('category')
    const campus = searchParams.get('campusLocation')
    const kind = searchParams.get('listingKind')
    setSearch(q)
    setCategory(c && CATEGORIES.includes(c as Category) ? (c as Category) : null)
    setFilters((prev) => ({
      ...prev,
      campusLocation: campus && CAMPUS_LOCATIONS.includes(campus as CampusLocation) ? (campus as CampusLocation) : '',
      listingKind: kind && LISTING_KINDS.includes(kind as ListingKind) ? (kind as ListingKind) : '',
    }))
    setCursor(null)
    setHasMore(true)
  }, [searchParams])

  useEffect(() => {
    fetch('/api/listings/category-counts')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => setCategoryCounts(data || {}))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!session) return
    fetch('/api/profile')
      .then((res) => res.ok ? res.json() : null)
      .then((payload) => setShowEmailBanner(Boolean(payload?.user && !payload.user.marketingEmailOptIn)))
      .catch(() => {})
  }, [session])

  const optIntoEmail = async () => {
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marketingEmailOptIn: true }),
    })
    setShowEmailBanner(false)
  }

  const saveCurrentSearch = async () => {
    if (!session) { router.push('/sign-in?redirect=/'); return }
    const label = search || category || 'Mason Market search'
    await fetch('/api/saved-searches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, query: search, filters: { category, ...filters, sort } }),
    })
  }

  const notifyMe = async () => {
    if (!session) { router.push('/sign-in?redirect=/'); return }
    setNotifyMeSaving(true)
    try {
      await fetch('/api/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: search, query: search, filters: {} }),
      })
      setNotifyMeSaved(true)
    } finally {
      setNotifyMeSaving(false)
    }
  }

  const handleToggleFavorite = (listingId: string) => {
    if (!session) { router.push('/sign-in?redirect=/'); return }
    toggleFavorite(listingId)
  }

  // Debounce the free-text filter fields (price/course) so typing doesn't fire a fetch per keystroke.
  // Button/chip-driven filters stay on `filters` directly so they still apply instantly.
  const [debouncedText, setDebouncedText] = useState({
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    courseTag: filters.courseTag,
  })
  useEffect(() => {
    const id = setTimeout(() => setDebouncedText({
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      courseTag: filters.courseTag,
    }), 300)
    return () => clearTimeout(id)
  }, [filters.minPrice, filters.maxPrice, filters.courseTag])

  const buildParams = (cur: string | null = null) => {
    const p = new URLSearchParams()
    if (search)              p.set('search', search)
    if (category)            p.set('category', category)
    if (filters.campusLocation) p.set('campusLocation', filters.campusLocation)
    if (filters.pickupZone)  p.set('pickupZone', filters.pickupZone)
    if (filters.condition)   p.set('condition', filters.condition)
    if (filters.status)      p.set('status', filters.status)
    if (filters.listingKind) p.set('listingKind', filters.listingKind)
    if (debouncedText.minPrice)  p.set('minPrice', debouncedText.minPrice)
    if (debouncedText.maxPrice)  p.set('maxPrice', debouncedText.maxPrice)
    if (debouncedText.courseTag) p.set('courseTag', debouncedText.courseTag)
    if (filters.freeOnly)    p.set('freeOnly', 'true')
    p.set('sort', sort)
    if (cur) p.set('cursor', cur)
    return p
  }

  // Main fetch — reset on any filter/search/sort/category change
  useEffect(() => {
    const requestId = ++requestIdRef.current
    setCursor(null)
    setHasMore(true)
    setLoading(true)
    setFetchError('')
    setNotifyMeSaved(false)
    fetch(`/api/listings?${buildParams(null).toString()}`)
      .then(res => {
        if (!res.ok) throw new Error(`Server error ${res.status}`)
        return res.json()
      })
      .then((data: { listings: Listing[]; nextCursor: string | null }) => {
        if (requestIdRef.current !== requestId) return // filters changed since this fetch started
        const result = Array.isArray(data?.listings) ? data.listings : []
        setListings(result)
        setCursor(data?.nextCursor ?? null)
        setHasMore(Boolean(data?.nextCursor))
      })
      .catch(() => {
        if (requestIdRef.current === requestId) setFetchError('Failed to load listings. Check your connection and try again.')
      })
      .finally(() => {
        if (requestIdRef.current === requestId) setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, sort, filters.campusLocation, filters.pickupZone, filters.condition, filters.status, filters.listingKind, filters.freeOnly, debouncedText])

  const loadMore = async () => {
    if (!cursor) return
    const requestId = requestIdRef.current
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/listings?${buildParams(cursor).toString()}`)
      if (!res.ok) return
      const data = await res.json() as { listings: Listing[]; nextCursor: string | null }
      if (requestIdRef.current !== requestId) return // filters changed while this page was loading
      if (Array.isArray(data?.listings) && data.listings.length > 0) {
        setListings(prev => [...prev, ...data.listings])
        setCursor(data.nextCursor ?? null)
        setHasMore(Boolean(data.nextCursor))
      } else {
        setHasMore(false)
      }
    } finally {
      setLoadingMore(false)
    }
  }

  const clearAll = () => {
    setSearch('')
    setCategory(null)
    setSort('newest')
    setFilters(EMPTY_FILTERS)
    setCursor(null)
    setHasMore(true)
    router.replace('/')
  }

  const clearFilterChip = (key: keyof FilterState) => {
    if (key === 'minPrice') setFilters(prev => ({ ...prev, minPrice: '', maxPrice: '' }))
    else if (key === 'freeOnly') setFilters(prev => ({ ...prev, freeOnly: false }))
    else setFilters(prev => ({ ...prev, [key]: '' }))
  }

  const filterCount = countFilters(filters)
  const hasAnyFilter = !!search || !!category || filterCount > 0

  return (
    <>
      <SeasonalRibbon />

      <HeroBlock
        initialSearch={search}
        featuredListings={listings.filter(l => l.coverImageUrl || l.imageUrls[0]).slice(0, 3)}
      />

      {showEmailBanner ? (
        <section className="border-y bg-white" style={{ borderColor: 'var(--m-line)' }}>
          <div className="mx-auto flex max-w-wide flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-[var(--m-ink)]">{t('home.updatesTitle')}</p>
              <p className="text-sm text-[var(--m-muted)]">{t('home.updatesBody')}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={optIntoEmail} className="ui-btn-primary">{t('home.subscribe')}</button>
              <button type="button" onClick={() => setShowEmailBanner(false)} className="ui-btn-secondary">{t('home.notNow')}</button>
            </div>
          </div>
        </section>
      ) : null}

      <SubNavRail
        category={category}
        onCategoryChange={c => {
          setCategory(c)
          setCursor(null)
          const p = new URLSearchParams(searchParams.toString())
          if (c) p.set('category', c); else p.delete('category')
          router.replace(`/?${p.toString()}`)
        }}
        sort={sort}
        onSortChange={s => { setSort(s); setCursor(null) }}
        filterCount={filterCount}
        onFiltersOpen={() => setDrawerOpen(true)}
        totalCount={listings.length}
        loading={loading}
        categoryCounts={categoryCounts}
      />

      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filters={filters}
        onChange={partial => setFilters(prev => ({ ...prev, ...partial }))}
        onReset={() => setFilters(EMPTY_FILTERS)}
        totalCount={listings.length}
        loading={loading}
      />

      <main>
        <div id="listings-anchor" className="mx-auto w-full max-w-wide px-6 pt-4 pb-7">

          {/* Active search label */}
          {search && (
            <div className="mb-5 flex items-center gap-2">
              <span className="text-[13px]" style={{ color: 'var(--m-muted)' }}>Results for</span>
              <strong className="text-[13px]" style={{ color: 'var(--m-ink)' }}>&ldquo;{search}&rdquo;</strong>
              <button
                type="button"
                onClick={clearAll}
                className="text-[12px] hover:underline"
                style={{ color: 'var(--m-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                Clear
              </button>
            </div>
          )}

          {/* Active filter chips */}
          {(category || filterCount > 0) && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {category && (
                <span className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium" style={{ borderColor: 'var(--m-ink)', color: 'var(--m-ink)' }}>
                  {category}
                  <button onClick={() => setCategory(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--m-muted)' }}>
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
                  </button>
                </span>
              )}
              {filterChips(filters).map(chip => (
                <span key={chip.key} className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium" style={{ borderColor: 'var(--m-line)', color: 'var(--m-ink)' }}>
                  {chip.label}
                  <button onClick={() => clearFilterChip(chip.key)} aria-label={`Remove filter: ${chip.label}`} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--m-muted)' }}>
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
                  </button>
                </span>
              ))}
              <button onClick={clearAll} className="text-[12px] hover:underline" style={{ color: 'var(--m-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                Reset all
              </button>
              <button onClick={saveCurrentSearch} className="text-[12px] font-semibold hover:underline" style={{ color: 'var(--m-green)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                Save search
              </button>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square rounded-[12px] bg-[var(--m-soft)]" />
                  <div className="mt-3 space-y-2">
                    <div className="h-3 w-full rounded-full bg-[var(--m-soft)]" />
                    <div className="h-3 w-3/4 rounded-full bg-[var(--m-soft)]" />
                    <div className="h-4 w-1/3 rounded-full bg-[var(--m-soft)]" />
                    <div className="h-3 w-1/2 rounded-full bg-[var(--m-soft)]" />
                  </div>
                </div>
              ))}
            </div>

          ) : fetchError ? (
            <div className="py-16 text-center">
              <div className="mx-auto max-w-md rounded-3xl border border-dashed bg-white px-6 py-10" style={{ borderColor: 'var(--m-line)' }}>
                <p className="text-[16px] font-semibold text-red-600">Could not load listings</p>
                <p className="mt-2 text-sm" style={{ color: 'var(--m-muted)' }}>{fetchError}</p>
                <button type="button" onClick={() => window.location.reload()} className="mt-4 ui-btn-secondary text-sm">
                  Try again
                </button>
              </div>
            </div>

          ) : listings.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto max-w-md rounded-3xl border border-dashed bg-white px-6 py-10" style={{ borderColor: 'var(--m-line)' }}>
                <div className="mb-4 flex justify-center" style={{ color: 'var(--m-muted)' }}>
                  <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
                  </svg>
                </div>
                {search ? (
                  <>
                    <p className="text-[16px] font-bold" style={{ color: 'var(--m-ink)' }}>
                      No listings yet for &ldquo;{search}&rdquo;
                    </p>
                    <p className="mt-1.5 text-[13px]" style={{ color: 'var(--m-muted)' }}>
                      Nobody has listed that yet — post a Wanted to let sellers know you&apos;re looking.
                    </p>
                    <div className="mt-5 flex flex-wrap justify-center gap-3">
                      <a
                        href={`/sell?kind=wanted&q=${encodeURIComponent(search)}`}
                        className="flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
                        style={{ background: 'var(--m-pop)' }}
                      >
                        + Post Wanted
                      </a>
                      <button
                        type="button"
                        onClick={notifyMe}
                        disabled={notifyMeSaving || notifyMeSaved}
                        className="flex h-10 items-center gap-1.5 rounded-full border px-4 text-[13px] font-semibold disabled:opacity-60"
                        style={{ borderColor: 'var(--m-line)', color: 'var(--m-ink)' }}
                      >
                        {notifyMeSaved ? "You'll be notified" : notifyMeSaving ? 'Saving…' : 'Notify me when one is posted'}
                      </button>
                      <button type="button" onClick={clearAll} className="flex h-10 items-center rounded-full border px-4 text-[13px] font-semibold" style={{ borderColor: 'var(--m-line)', color: 'var(--m-ink)' }}>
                        Clear search
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-[16px] font-bold" style={{ color: 'var(--m-ink)' }}>
                      {hasAnyFilter ? 'Nothing matches those filters' : 'No listings yet'}
                    </p>
                    <p className="mt-1.5 text-[13px]" style={{ color: 'var(--m-muted)' }}>
                      {hasAnyFilter ? 'Try widening the price range or removing a filter.' : 'Be the first to post something.'}
                    </p>
                    {hasAnyFilter && (
                      <button type="button" onClick={clearAll} className="mt-5 ui-btn-secondary px-5 text-sm">
                        Reset filters
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

          ) : (
            <>
              <motion.div
                className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4"
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
              >
                {listings.map(listing => (
                  <motion.div
                    key={listing.id}
                    variants={{
                      hidden: { opacity: 0, y: 12 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
                    }}
                  >
                    <ListingCard
                      listing={listing}
                      isSaved={savedSet.has(listing.id)}
                      onToggleSave={handleToggleFavorite}
                    />
                  </motion.div>
                ))}
              </motion.div>

              {/* Load more */}
              {hasMore && (
                <div className="mt-10 flex justify-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="flex h-12 items-center gap-2 rounded-2xl border px-8 text-[14px] font-semibold transition-colors disabled:opacity-50 hover:border-[var(--m-ink)]"
                    style={{ borderColor: 'var(--m-line)', color: 'var(--m-ink)', background: 'white' }}
                  >
                    {loadingMore ? (
                      <>
                        <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M21 12a9 9 0 1 1-6.2-8.6"/>
                        </svg>
                        Loading…
                      </>
                    ) : (
                      'Load more'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  )
}
