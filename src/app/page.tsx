'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ListingCard } from '@/components/ListingCard'
import { HeroBlock } from '@/components/HeroBlock'
import { SubNavRail } from '@/components/SubNavRail'
import { FilterDrawer, FilterState } from '@/components/FilterDrawer'
import { SeasonalRibbon } from '@/components/SeasonalRibbon'
import { useFavorites } from '@/lib/useFavorites'
import { CATEGORIES, Category, Listing } from '@/lib/types'
import { useAuthSession } from '@/lib/auth/useAuthSession'

type SortOption = 'newest' | 'oldest' | 'price-asc' | 'price-desc'

const EMPTY_FILTERS: FilterState = {
  campusLocation: '',
  pickupZone: '',
  condition: '',
  status: '',
  minPrice: '',
  maxPrice: '',
  freeOnly: false,
  courseTag: '',
}

function countFilters(f: FilterState): number {
  return (
    (f.campusLocation ? 1 : 0) +
    (f.pickupZone ? 1 : 0) +
    (f.condition ? 1 : 0) +
    (f.status ? 1 : 0) +
    (f.minPrice ? 1 : 0) +
    (f.maxPrice ? 1 : 0) +
    (f.freeOnly ? 1 : 0) +
    (f.courseTag ? 1 : 0)
  )
}

function HomeContent() {
  const router = useRouter()
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
  const [page, setPage]               = useState(0)
  const [hasMore, setHasMore]         = useState(true)
  const PAGE_SIZE = 24

  // Sync state when URL search params change (chip clicks, seasonal ribbon, back/forward)
  useEffect(() => {
    const q = searchParams.get('search') || ''
    const c = searchParams.get('category')
    setSearch(q)
    setCategory(c && CATEGORIES.includes(c as Category) ? (c as Category) : null)
    setPage(0)
    setHasMore(true)
  }, [searchParams])

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

  const handleToggleFavorite = (listingId: string) => {
    if (!session) { router.push('/sign-in?redirect=/'); return }
    toggleFavorite(listingId)
  }

  const buildParams = (pg = 0) => {
    const p = new URLSearchParams()
    if (search)              p.set('search', search)
    if (category)            p.set('category', category)
    if (filters.campusLocation) p.set('campusLocation', filters.campusLocation)
    if (filters.pickupZone)  p.set('pickupZone', filters.pickupZone)
    if (filters.condition)   p.set('condition', filters.condition)
    if (filters.status)      p.set('status', filters.status)
    if (filters.minPrice)    p.set('minPrice', filters.minPrice)
    if (filters.maxPrice)    p.set('maxPrice', filters.maxPrice)
    if (filters.courseTag)   p.set('courseTag', filters.courseTag)
    if (filters.freeOnly)    p.set('freeOnly', 'true')
    p.set('sort', sort)
    p.set('page', String(pg))
    return p
  }

  // Main fetch — reset on any filter/search/sort/category change
  useEffect(() => {
    setPage(0)
    setHasMore(true)
    setLoading(true)
    setFetchError('')
    fetch(`/api/listings?${buildParams(0).toString()}`)
      .then(res => {
        if (!res.ok) throw new Error(`Server error ${res.status}`)
        return res.json()
      })
      .then((data: Listing[]) => {
        const result = Array.isArray(data) ? data : []
        setListings(result)
        setHasMore(result.length === PAGE_SIZE)
        // Auto-save zero-result searches for logged-in users (notified when a match appears)
        if (result.length === 0 && search && session) {
          fetch('/api/saved-searches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label: search, query: search, filters: {} }),
          }).catch(() => {})
        }
      })
      .catch(() => setFetchError('Failed to load listings. Check your connection and try again.'))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, sort, filters])

  const loadMore = async () => {
    const next = page + 1
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/listings?${buildParams(next).toString()}`)
      if (!res.ok) return
      const data = await res.json() as Listing[]
      if (Array.isArray(data) && data.length > 0) {
        setListings(prev => [...prev, ...data])
        setPage(next)
        setHasMore(data.length === PAGE_SIZE)
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
    setPage(0)
    setHasMore(true)
    router.replace('/')
  }

  const filterCount = countFilters(filters)
  const hasAnyFilter = !!search || !!category || filterCount > 0

  return (
    <>
      <SeasonalRibbon />

      <HeroBlock initialSearch={search} />

      {showEmailBanner ? (
        <section className="border-y bg-white" style={{ borderColor: 'var(--m-line)' }}>
          <div className="mx-auto flex max-w-[1280px] flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-[var(--m-ink)]">Get Mason Market updates</p>
              <p className="text-sm text-[var(--m-muted)]">Campus seasons, new features, saved deal reminders, and marketplace tips.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={optIntoEmail} className="ui-btn-primary">Subscribe</button>
              <button type="button" onClick={() => setShowEmailBanner(false)} className="ui-btn-secondary">Not now</button>
            </div>
          </div>
        </section>
      ) : null}

      <SubNavRail
        category={category}
        onCategoryChange={c => { setCategory(c); setPage(0) }}
        sort={sort}
        onSortChange={s => { setSort(s); setPage(0) }}
        filterCount={filterCount}
        onFiltersOpen={() => setDrawerOpen(true)}
        totalCount={listings.length}
        loading={loading}
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
        <div id="listings-anchor" className="mx-auto w-full max-w-[1280px] px-6 py-7">

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
          {(hasAnyFilter && !search) && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {category && (
                <span className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium" style={{ borderColor: 'var(--m-ink)', color: 'var(--m-ink)' }}>
                  {category}
                  <button onClick={() => setCategory(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--m-muted)' }}>
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
                  </button>
                </span>
              )}
              {filterCount > 0 && (
                <span className="text-[12px]" style={{ color: 'var(--m-muted)' }}>+{filterCount} filter{filterCount !== 1 ? 's' : ''}</span>
              )}
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
                      No results for &ldquo;{search}&rdquo;
                    </p>
                    <p className="mt-1.5 text-[13px]" style={{ color: 'var(--m-muted)' }}>
                      Nobody has listed that yet — post a Wanted to let sellers know you&apos;re looking.
                    </p>
                    <div className="mt-5 flex justify-center gap-3">
                      <a
                        href={`/sell?kind=wanted&q=${encodeURIComponent(search)}`}
                        className="flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
                        style={{ background: 'var(--m-pop)' }}
                      >
                        + Post Wanted
                      </a>
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
              <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
                {listings.map(listing => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    isSaved={savedSet.has(listing.id)}
                    onToggleSave={handleToggleFavorite}
                  />
                ))}
              </div>

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
