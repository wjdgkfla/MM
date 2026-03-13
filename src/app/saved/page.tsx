'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ListingCard } from '@/components/ListingCard'
import { useFavorites } from '@/lib/useFavorites'
import { Listing } from '@/lib/types'
import { useAuthSession } from '@/lib/auth/useAuthSession'
import { AuthRequiredCard } from '@/components/AuthRequiredCard'
import { useRouter } from 'next/navigation'

export default function SavedPage() {
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const { session, loading: authLoading } = useAuthSession()
  const { savedIds, savedSet, toggleFavorite } = useFavorites(session?.userId)

  useEffect(() => {
    if (!session) {
      setLoading(false)
      return
    }

    fetch('/api/listings')
      .then((res) => res.json())
      .then((data: Listing[]) => setListings(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [session])

  const savedListings = useMemo(() => {
    const byId = new Map(listings.map((listing) => [listing.id, listing]))
    return savedIds.map((id) => byId.get(id)).filter((listing): listing is Listing => Boolean(listing))
  }, [listings, savedIds])

  if (authLoading) {
    return <div className="max-w-6xl mx-auto px-4 py-10 text-sm text-gray-500">Loading…</div>
  }

  if (!session) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <AuthRequiredCard
          title="Sign in to view saved items"
          description="Saved listings are tied to your GMU account session."
          redirectTo="/saved"
        />
      </div>
    )
  }

  const handleToggleFavorite = (listingId: string) => {
    if (!session) {
      router.push('/sign-in?redirect=/saved')
      return
    }
    toggleFavorite(listingId)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-bold text-[#006633]">Saved Items</h1>
      <p className="mt-1 text-gray-600">Track listings you want to revisit between classes.</p>

      {loading ? (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, index) => (
            <div key={index} className="bg-gray-100 rounded-2xl aspect-[4/5] animate-pulse" />
          ))}
        </div>
      ) : savedListings.length === 0 ? (
        <div className="mt-12 ui-surface border-dashed p-8 text-center">
          <p className="text-gray-700 font-medium">No saved listings yet.</p>
          <Link href="/" className="mt-3 inline-block text-sm font-medium text-[#006633]">
            Browse Mason Market
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {savedListings.map((listing) => (
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
