'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useAuthSession } from '@/lib/auth/useAuthSession'
import { AuthRequiredCard } from '@/components/AuthRequiredCard'
import { Listing, STATUS_LABELS } from '@/lib/types'
import { formatRecency } from '@/lib/time'
import { StatusBadge } from '@/components/StatusBadge'

type ListingStatusAction = 'available' | 'reserved' | 'sold'

const statusActionsByCurrentStatus: Record<
  Listing['status'],
  Array<{ label: string; nextStatus: ListingStatusAction }>
> = {
  available: [{ label: 'Mark reserved', nextStatus: 'reserved' }],
  reserved: [
    { label: 'Mark available', nextStatus: 'available' },
    { label: 'Mark sold', nextStatus: 'sold' },
  ],
  sold: [{ label: 'Relist as available', nextStatus: 'available' }],
}

export default function MyListingsPage() {
  const { session, loading: authLoading } = useAuthSession()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (!session) return

    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const res = await fetch('/api/listings?mine=true')
        if (!res.ok) throw new Error('Could not load your listings')
        const payload = (await res.json()) as Listing[]
        setListings(Array.isArray(payload) ? payload : [])
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Could not load your listings')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [session])

  const totals = useMemo(() => {
    return {
      all: listings.length,
      available: listings.filter((item) => item.status === 'available').length,
      reserved: listings.filter((item) => item.status === 'reserved').length,
      sold: listings.filter((item) => item.status === 'sold').length,
    }
  }, [listings])

  const updateStatus = async (id: string, nextStatus: ListingStatusAction) => {
    setBusyId(id)
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error || 'Failed to update status')
      }
      const updated = (await res.json()) as Listing
      setListings((current) => current.map((item) => (item.id === id ? updated : item)))
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Failed to update status')
    } finally {
      setBusyId(null)
    }
  }

  const archiveListing = async (id: string) => {
    const ok = window.confirm('Archive this listing? It will be permanently removed from Mason Market.')
    if (!ok) return

    setBusyId(id)
    try {
      const res = await fetch(`/api/listings/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error || 'Failed to archive listing')
      }
      setListings((current) => current.filter((item) => item.id !== id))
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to archive listing')
    } finally {
      setBusyId(null)
    }
  }

  if (authLoading) {
    return <div className="max-w-[1280px] mx-auto px-6 py-10 text-sm" style={{ color: 'var(--m-muted)' }}>Loading…</div>
  }

  if (!session) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <AuthRequiredCard
          title="Sign in to manage your listings"
          description="Listing management is available for signed-in GMU users."
          redirectTo="/my-listings"
        />
      </div>
    )
  }

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[36px] font-black" style={{ color: 'var(--m-ink)' }}>My posts</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--m-muted)' }}>
            {totals.all} total • {totals.available} available • {totals.reserved} reserved • {totals.sold} sold
          </p>
        </div>
        <Link href="/sell" className="ui-btn-primary">
          Post new listing
        </Link>
      </div>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {loading ? (
        <div className="mt-6 space-y-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="h-28 rounded-2xl bg-[var(--m-soft)] animate-pulse" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="ui-surface mt-6 p-8 text-center">
          <p style={{ color: 'var(--m-ink)' }}>You have no listings yet.</p>
          <Link href="/sell" className="mt-3 inline-block text-sm font-medium" style={{ color: 'var(--m-green)' }}>
            Create your first listing
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {listings.map((listing) => {
            const actions = statusActionsByCurrentStatus[listing.status]
            const isBusy = busyId === listing.id

            return (
              <div key={listing.id} className="ui-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/item/${listing.id}`} className="text-base font-semibold hover:underline" style={{ color: 'var(--m-ink)' }}>
                      {listing.title}
                    </Link>
                    <p className="mt-1 text-sm" style={{ color: 'var(--m-muted)' }}>
                      {listing.price === 0 ? 'Free' : `$${listing.price}`} • {listing.campusLocation} • Updated{' '}
                      {formatRecency(listing.updatedAt)}
                    </p>
                  </div>
                  <StatusBadge status={listing.status} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/my-listings/${listing.id}/edit`} className="ui-btn-secondary">
                    Edit
                  </Link>
                  {actions.map((action) => (
                    <button
                      key={action.nextStatus}
                      type="button"
                      disabled={isBusy}
                      onClick={() => updateStatus(listing.id, action.nextStatus)}
                      className="ui-btn-secondary disabled:opacity-60"
                    >
                      {action.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => archiveListing(listing.id)}
                    className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    Archive/Delete
                  </button>
                </div>

                <p className="mt-2 text-xs" style={{ color: 'var(--m-muted)' }}>Current status: {STATUS_LABELS[listing.status]}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
