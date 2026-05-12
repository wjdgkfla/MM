'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ListingCard } from '@/components/ListingCard'
import { useFavorites } from '@/lib/useFavorites'
import { Listing } from '@/lib/types'
import { useAuthSession } from '@/lib/auth/useAuthSession'
import { AuthRequiredCard } from '@/components/AuthRequiredCard'
import { useRouter } from 'next/navigation'

export default function SavedPage() {
  const router = useRouter()
  const [savedListings, setSavedListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const { session, loading: authLoading } = useAuthSession()
  const { savedIds, savedSet, toggleFavorite } = useFavorites(session?.userId)

  useEffect(() => {
    if (!session) {
      setLoading(false)
      return
    }
    if (savedIds.length === 0) {
      setSavedListings([])
      setLoading(false)
      return
    }

    setLoading(true)
    fetch(`/api/listings?ids=${savedIds.join(',')}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data: Listing[]) => {
        const fetched = Array.isArray(data) ? data : []
        setSavedListings(fetched)
      })
      .catch(() => setSavedListings([]))
      .finally(() => setLoading(false))
  }, [session, savedIds])

  if (authLoading) {
    return <div className="max-w-[1280px] mx-auto px-6 py-10 text-sm" style={{ color: 'var(--m-muted)' }}>Loading…</div>
  }

  if (!session) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
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
    <div className="max-w-[1280px] mx-auto px-6 py-6 sm:py-8">
      <h1 className="font-display text-[36px] font-black" style={{ color: 'var(--m-ink)' }}>Saved finds</h1>
      <p className="mt-1 text-[13px]" style={{ color: 'var(--m-muted)' }}>
        {savedListings.length} {savedListings.length === 1 ? 'item' : 'items'}
      </p>

      {loading ? (
        <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, index) => (
            <div key={index} className="aspect-square rounded-2xl bg-[var(--m-soft)] animate-pulse" />
          ))}
        </div>
      ) : savedListings.length === 0 ? (
        <div className="mt-12 rounded-[var(--r-lg)] border p-16 text-center max-w-[480px] mx-auto" style={{ borderColor: 'var(--m-line)' }}>
          <svg viewBox="0 0 24 24" className="mx-auto h-9 w-9 mb-3" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ color: 'var(--m-pop)' }}>
            <path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 0 0-7.1 7.1l8.8 8.9 8.8-8.9a5 5 0 0 0 0-7.1Z" />
          </svg>
          <p className="font-display text-[24px] font-black" style={{ color: 'var(--m-ink)' }}>Nothing saved yet</p>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--m-muted)' }}>Tap the heart on a listing to save it here.</p>
          <Link href="/" className="mt-5 inline-flex h-11 items-center rounded-full px-6 text-[13px] font-bold text-white" style={{ background: 'var(--m-pop)' }}>
            Browse feed
          </Link>
        </div>
      ) : (
        <>
        {savedIds.length > savedListings.length ? (
          <p className="mt-4 text-xs" style={{ color: 'var(--m-muted)' }}>
            {savedIds.length - savedListings.length} saved item{savedIds.length - savedListings.length > 1 ? 's are' : ' is'} no longer available and {savedIds.length - savedListings.length > 1 ? 'have' : 'has'} been removed from view.
          </p>
        ) : null}
        <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {savedListings.map((listing) => (
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
