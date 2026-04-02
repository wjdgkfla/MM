'use client'

import { useEffect, useMemo, useState } from 'react'
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

  const { session } = useAuthSession()
  const { savedSet, toggleFavorite } = useFavorites(session?.userId)

  const handleToggleFavorite = (listingId: string) => {
    if (!session) {
      router.push('/sign-in?redirect=/')
      return
    }
    toggleFavorite(listingId)
  }

  const handleLoggedOutSearch = () => {
    const params = new URLSearchParams({ redirect: '/' })
    const submittedSearch = searchInput.trim()
    if (submittedSearch) {
      params.set('search', submittedSearch)
    }
    router.push(`/sign-in?${params.toString()}`)
  }

  useEffect(() => {
    if (!session) {
      setLoading(false)
      return
    }

    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (search) params.set('search', search)
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
    fetch(`/api/listings?${params.toString()}`)
      .then((res) => res.json())
      .then((data: Listing[]) => setListings(Array.isArray(data) ? data : []))
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

  if (!session) {
    return (
      <div className="mx-auto flex min-h-[72vh] w-full max-w-[720px] flex-col items-center justify-center px-4 py-12 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--mason-green)] shadow-[var(--air-shadow)]">
          <span className="text-4xl font-bold text-[var(--mason-gold)]">M</span>
        </div>

        <h1 className="text-4xl font-bold tracking-[-0.03em] text-[var(--air-text)] sm:text-5xl">Mason Market</h1>
        <p className="mt-3 max-w-xl text-base text-[var(--air-muted)] sm:text-lg">
          Search trusted campus listings. Log in to see and browse all available items.
        </p>

        <div className="mt-8 w-full max-w-[620px]">
          <SearchBar
            value={searchInput}
            onChange={setSearchInput}
            onSubmit={handleLoggedOutSearch}
            placeholder="Search for textbooks, dorm items, and electronics"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1160px] px-4 py-6 sm:py-8">
      <section className="mb-6 sm:mb-8">
        <h1 className="text-3xl font-bold tracking-[-0.02em] text-[var(--air-text)] sm:text-4xl">Mason Market</h1>
        <p className="mt-2 text-base text-[var(--air-muted)] sm:text-lg">
          Browse what GMU students are selling around campus right now.
        </p>
      </section>

      <div className="ui-surface mb-6 space-y-4 p-4 sm:mb-8 sm:p-5">
        <SearchBar
          value={searchInput}
          onChange={setSearchInput}
          onSubmit={() => setSearch(searchInput.trim())}
        />
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
              <option value="">All Status</option>
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

          <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-[var(--air-border)] bg-white px-3 py-3 text-sm text-[var(--air-text)]">
            <input
              type="checkbox"
              checked={freeOnly}
              onChange={(e) => setFreeOnly(e.target.checked)}
              className="h-4 w-4 accent-[var(--mason-green)]"
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

      {!loading && (
        <div className="mb-5 text-sm text-[var(--air-muted)]">
          {listings.length} listings - {savedCount} saved
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-[4/5] rounded-[20px] bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto max-w-md rounded-3xl border border-dashed border-[var(--air-border)] bg-white px-6 py-10">
            <p className="text-lg font-medium text-[var(--air-text)]">No listings found</p>
            <p className="mt-2 text-sm text-[var(--air-muted)]">Try another search or broaden your filters.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isSaved={savedSet.has(listing.id)}
              onToggleSave={handleToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  )
}
