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

export default function HomePage() {
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>([])
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

  useEffect(() => {
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
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
      <section className="mb-6 sm:mb-8 rounded-3xl border border-[#006633]/10 bg-gradient-to-br from-[#e8f4ee] via-white to-[#f8f5e9] p-5 sm:p-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#006633] mb-2">Mason Market</h1>
        <p className="text-gray-700 text-lg">Browse what GMU students are selling around campus right now.</p>
        <p className="text-sm text-gray-500 mt-2">Textbooks, dorm essentials, electronics, clothes, and free move-out items.</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-700">
          <span className="rounded-full bg-white/85 px-2.5 py-1">GMU-only identity cues</span>
          <span className="rounded-full bg-white/85 px-2.5 py-1">Campus verification placeholder</span>
          <span className="rounded-full bg-white/85 px-2.5 py-1">Campus meetup recommended</span>
        </div>
      </section>

      <div className="ui-surface mb-6 sm:mb-8 space-y-4 p-4 sm:p-5">
        <SearchBar value={search} onChange={setSearch} />
        <CategoryFilter selected={category} onSelect={setCategory} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select
            value={campusLocation}
            onChange={(e) => setCampusLocation(e.target.value as CampusLocation | '')}
            className="ui-input"
          >
            <option value="">All Campuses</option>
            {CAMPUS_LOCATIONS.map((campus) => (
              <option key={campus} value={campus}>
                {LOCATION_LABELS[campus]}
              </option>
            ))}
          </select>

          <select
            value={pickupZone}
            onChange={(e) => setPickupZone(e.target.value as PickupZone | '')}
            className="ui-input"
          >
            <option value="">All Pickup Areas</option>
            {PICKUP_ZONES.map((zone) => (
              <option key={zone} value={zone}>
                {PICKUP_ZONE_LABELS[zone]}
              </option>
            ))}
          </select>

          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as Condition | '')}
            className="ui-input"
          >
            <option value="">Any Condition</option>
            {CONDITIONS.map((itemCondition) => (
              <option key={itemCondition} value={itemCondition}>
                {CONDITION_LABELS[itemCondition]}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ListingStatus | '')}
            className="ui-input"
          >
            <option value="">All Status</option>
            {LISTING_STATUSES.map((itemStatus) => (
              <option key={itemStatus} value={itemStatus}>
                {STATUS_LABELS[itemStatus]}
              </option>
            ))}
          </select>
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
            placeholder="Course code (e.g. CS112)"
            className="ui-input"
          />

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="ui-input"
          >
            <option value="newest">Newest</option>
            <option value="price-asc">Lowest Price</option>
            <option value="price-desc">Highest Price</option>
          </select>

          <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={freeOnly}
              onChange={(e) => setFreeOnly(e.target.checked)}
              className="h-4 w-4 accent-[#006633]"
            />
            Free items only
          </label>
        </div>

        <div className="flex justify-end">
          <button type="button" onClick={clearFilters} className="ui-btn-secondary px-3 py-2 text-xs">
            Reset filters
          </button>
        </div>
      </div>

      {!loading && (
        <div className="mb-5 text-sm text-gray-500">
          {listings.length} listings • {savedCount} saved
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-2xl aspect-[4/5] animate-pulse" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16">
          <div className="mx-auto max-w-md rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10">
            <p className="text-gray-700 text-lg font-medium">No listings found</p>
            <p className="text-gray-500 text-sm mt-2">Try another search or broaden your filters.</p>
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
