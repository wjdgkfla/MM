'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ListingCard } from '@/components/ListingCard'
import { CategoryFilter } from '@/components/CategoryFilter'
import { SearchBar } from '@/components/SearchBar'
import { useFavorites } from '@/lib/useFavorites'
import {
  CAMPUS_LOCATIONS,
  CONDITIONS,
  LISTING_STATUSES,
  PICKUP_ZONES,
  CampusLocation,
  CONDITION_LABELS,
  Listing,
  ListingStatus,
  LOCATION_LABELS,
  PICKUP_ZONE_LABELS,
  PickupZone,
  STATUS_LABELS,
  Condition,
} from '@/lib/types'
import { useAuthSession } from '@/lib/auth/useAuthSession'

type SortOption = 'newest' | 'price-asc' | 'price-desc'

function SelectChevron() {
  return (
    <span className="ui-select-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </span>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const didSeedFromUrl = useRef(false)
  const [category, setCategory] = useState<Listing['category'] | null>(null)
  const [campusLocation, setCampusLocation] = useState<CampusLocation | ''>('')
  const [pickupZone, setPickupZone] = useState<PickupZone | ''>('')
  const [condition, setCondition] = useState<Condition | ''>('')
  const [status, setStatus] = useState<ListingStatus | ''>('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [courseTag, setCourseTag] = useState('')
  const [sort, setSort] = useState<SortOption>('newest')
  const [freeOnly, setFreeOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')

  const { session } = useAuthSession()
  const { savedSet, toggleFavorite } = useFavorites(session?.userId)

  // Seed search from ?search= param when arriving from the header search bar.
  useEffect(() => {
    if (didSeedFromUrl.current) return
    didSeedFromUrl.current = true
    const q = new URLSearchParams(window.location.search).get('search')
    if (q) {
      setSearchInput(q)
      setSearch(q)
    }
  }, [])

  const handleToggleFavorite = (listingId: string) => {
    if (!session) {
      router.push('/sign-in?redirect=/')
      return
    }
    toggleFavorite(listingId)
  }

  useEffect(() => {
    const params = new URLSearchParams()
    // Filters and search are available to all visitors — no sign-in required to browse
    if (search) params.set('search', search)
    if (category) params.set('category', category)
    if (campusLocation) params.set('campusLocation', campusLocation)
    if (pickupZone) params.set('pickupZone', pickupZone)
    if (condition) params.set('condition', condition)
    if (status) params.set('status', status)
    if (minPrice) params.set('minPrice', minPrice)
    if (maxPrice) params.set('maxPrice', maxPrice)
    if (courseTag) params.set('courseTag', courseTag)
    if (freeOnly) params.set('freeOnly', 'true')
    params.set('sort', sort)

    setLoading(true)
    setFetchError('')
    fetch(`/api/listings?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server error ${res.status}`)
        return res.json()
      })
      .then((data: Listing[]) => setListings(Array.isArray(data) ? data : []))
      .catch(() => setFetchError('Failed to load listings. Check your connection and try again.'))
      .finally(() => setLoading(false))
  }, [
    session,
    category,
    search,
    campusLocation,
    pickupZone,
    condition,
    status,
    minPrice,
    maxPrice,
    courseTag,
    freeOnly,
    sort,
  ])

  const savedCount = useMemo(() => listings.filter((item) => savedSet.has(item.id)).length, [listings, savedSet])

  const clearFilters = () => {
    setSearch('')
    setSearchInput('')
    setCategory(null)
    setCampusLocation('')
    setPickupZone('')
    setCondition('')
    setStatus('')
    setMinPrice('')
    setMaxPrice('')
    setCourseTag('')
    setFreeOnly(false)
    setSort('newest')
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-6 sm:py-8">
      <section className="mb-6 sm:mb-8">
        <h1 className="text-3xl font-bold tracking-[-0.02em] sm:text-4xl" style={{ color: 'var(--m-ink)' }}>Mason Market</h1>
        <p className="mt-2 text-base sm:text-lg" style={{ color: 'var(--m-muted)' }}>
          Browse what GMU students are selling around campus right now.
        </p>
        {!session && (
          <p className="mt-2 text-sm" style={{ color: 'var(--m-muted)' }}>
            <a href="/sign-in?redirect=/" className="font-medium hover:underline" style={{ color: 'var(--m-green)' }}>Sign in</a> to save listings, use filters, message sellers, and post items. Search works for everyone.
          </p>
        )}
      </section>

      <div className="mb-6 sm:mb-8">
        <SearchBar
          value={searchInput}
          onChange={setSearchInput}
          onSubmit={() => setSearch(searchInput.trim())}
        />
      </div>

      <div className="ui-surface mb-6 space-y-4 p-4 sm:mb-8 sm:p-5">
        <CategoryFilter selected={category} onSelect={setCategory} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="ui-select-wrap">
            <select
              value={campusLocation}
              onChange={(e) => setCampusLocation(e.target.value as CampusLocation | '')}
              className="ui-select"
            >
              <option value="">All Campuses</option>
              {CAMPUS_LOCATIONS.map((campus) => (
                <option key={campus} value={campus}>
                  {LOCATION_LABELS[campus]}
                </option>
              ))}
            </select>
            <SelectChevron />
          </div>

          <div className="ui-select-wrap">
            <select
              value={pickupZone}
              onChange={(e) => setPickupZone(e.target.value as PickupZone | '')}
              className="ui-select"
            >
              <option value="">All Pickup Areas</option>
              {PICKUP_ZONES.map((zone) => (
                <option key={zone} value={zone}>
                  {PICKUP_ZONE_LABELS[zone]}
                </option>
              ))}
            </select>
            <SelectChevron />
          </div>

          <div className="ui-select-wrap">
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as Condition | '')}
              className="ui-select"
            >
              <option value="">Any Condition</option>
              {CONDITIONS.map((itemCondition) => (
                <option key={itemCondition} value={itemCondition}>
                  {CONDITION_LABELS[itemCondition]}
                </option>
              ))}
            </select>
            <SelectChevron />
          </div>

          <div className="ui-select-wrap">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ListingStatus | '')}
              className="ui-select"
            >
              <option value="">Any status</option>
              {LISTING_STATUSES.map((itemStatus) => (
                <option key={itemStatus} value={itemStatus}>
                  {STATUS_LABELS[itemStatus]}
                </option>
              ))}
            </select>
            <SelectChevron />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            type="number"
            min="0"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="Min $"
            className="ui-input"
          />
          <input
            type="number"
            min="0"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="Max $"
            className="ui-input"
          />
          <input
            type="text"
            value={courseTag}
            onChange={(e) => setCourseTag(e.target.value)}
            placeholder="Course code (for textbooks)"
            className="ui-input"
          />

          <div className="ui-select-wrap">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="ui-select"
            >
              <option value="newest">Newest</option>
              <option value="price-asc">Lowest Price</option>
              <option value="price-desc">Highest Price</option>
            </select>
            <SelectChevron />
          </div>

          <label className="flex min-h-12 items-center gap-2 rounded-2xl border px-3 py-3 text-sm bg-white" style={{ borderColor: 'var(--m-line)', color: 'var(--m-ink)' }}>
            <input
              type="checkbox"
              checked={freeOnly}
              onChange={(e) => setFreeOnly(e.target.checked)}
              className="h-4 w-4 accent-[var(--m-pop)]"
            />
            Free items only
          </label>
        </div>

        <div className="flex justify-end">
          <button type="button" onClick={clearFilters} className="ui-btn-secondary px-4 py-2 text-xs">
            Reset filters
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square rounded-[20px] bg-[var(--m-soft)] animate-pulse" />
          ))}
        </div>
      ) : fetchError ? (
        <div className="py-16 text-center">
          <div className="mx-auto max-w-md rounded-3xl border border-dashed bg-white px-6 py-10" style={{ borderColor: 'var(--m-line)' }}>
            <p className="text-lg font-medium text-red-600">Could not load listings</p>
            <p className="mt-2 text-sm" style={{ color: 'var(--m-muted)' }}>{fetchError}</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-4 ui-btn-secondary text-sm">
              Try again
            </button>
          </div>
        </div>
      ) : listings.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto max-w-md rounded-3xl border border-dashed bg-white px-6 py-10" style={{ borderColor: 'var(--m-line)' }}>
            <p className="text-lg font-medium" style={{ color: 'var(--m-ink)' }}>No listings found</p>
            <p className="mt-2 text-sm" style={{ color: 'var(--m-muted)' }}>Try another search or broaden your filters.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="text-[18px] font-bold tracking-tight" style={{ color: 'var(--m-ink)' }}>
              Listings near Fairfax
            </h2>
            <p className="text-[12px]" style={{ color: 'var(--m-muted)' }}>
              {listings.length} {listings.length === 1 ? 'item' : 'items'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isSaved={savedSet.has(listing.id)}
                onToggleSave={handleToggleFavorite}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
