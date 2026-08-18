'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useAuthSession } from '@/lib/auth/useAuthSession'
import { AuthRequiredCard } from '@/components/AuthRequiredCard'
import { Listing, STATUS_LABELS } from '@/lib/types'
import { formatRecency } from '@/lib/time'
import { StatusBadge } from '@/components/StatusBadge'
import { useLocale } from '@/lib/i18n/LocaleProvider'
import { showToast } from '@/components/Toast'

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
  const { t } = useLocale()
  const { session, loading: authLoading } = useAuthSession()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | Listing['status']>('all')

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

  const visibleListings = useMemo(
    () => (statusFilter === 'all' ? listings : listings.filter((item) => item.status === statusFilter)),
    [listings, statusFilter]
  )

  const STATUS_TABS: Array<{ key: 'all' | Listing['status']; label: string; count: number }> = [
    { key: 'all', label: 'All', count: totals.all },
    { key: 'available', label: 'Available', count: totals.available },
    { key: 'reserved', label: 'Reserved', count: totals.reserved },
    { key: 'sold', label: 'Sold', count: totals.sold },
  ]

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
      showToast(`Listing marked as ${nextStatus}`)
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Failed to update status')
    } finally {
      setBusyId(null)
    }
  }

  const archiveListing = async (id: string) => {
    const ok = window.confirm('Delete this listing? It will be permanently removed from Mason Market.')
    if (!ok) return

    setBusyId(id)
    try {
      const res = await fetch(`/api/listings/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error || 'Failed to archive listing')
      }
      setListings((current) => current.filter((item) => item.id !== id))
      showToast('Listing archived')
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to archive listing')
    } finally {
      setBusyId(null)
    }
  }

  const refreshListing = async (id: string) => {
    setBusyId(id)
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh' }),
      })
      if (!res.ok) throw new Error('Failed to refresh listing')
      const updated = (await res.json()) as Listing
      setListings((current) => current.map((item) => (item.id === id ? updated : item)))
      showToast('Listing refreshed')
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Failed to refresh listing')
    } finally {
      setBusyId(null)
    }
  }

  if (authLoading) {
    return <div className="max-w-wide mx-auto px-6 py-10 text-sm" style={{ color: 'var(--m-muted)' }}>Loading…</div>
  }

  if (!session) {
    return (
      <div className="max-w-narrow mx-auto px-6 py-8">
        <AuthRequiredCard
          title="Sign in to manage your listings"
          description="Listing management is available for signed-in GMU users."
          redirectTo="/my-listings"
        />
      </div>
    )
  }

  return (
    <div className="max-w-wide mx-auto px-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-display-lg font-black" style={{ color: 'var(--m-ink)' }}>{t('header.myPosts')}</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--m-muted)' }}>{totals.all} total listings</p>
        </div>
        <Link href="/sell" className="ui-btn-primary">
          {t('sell.postNew')}
        </Link>
      </div>

      {!loading && listings.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className="ui-pill"
              style={{
                background: statusFilter === tab.key ? 'var(--m-ink)' : 'var(--m-soft)',
                color: statusFilter === tab.key ? 'white' : 'var(--m-ink)',
              }}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      ) : null}

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {loading ? (
        <div className="mt-6 space-y-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="h-28 rounded-2xl bg-[var(--m-soft)] animate-pulse" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="mt-12 rounded-[var(--r-lg)] border p-16 text-center max-w-[480px] mx-auto" style={{ borderColor: 'var(--m-line)' }}>
          <svg viewBox="0 0 24 24" className="mx-auto h-9 w-9 mb-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ color: 'var(--m-pop)' }}>
            <path d="M12 5v14M5 12h14" />
          </svg>
          <p className="font-display text-display-xs font-black" style={{ color: 'var(--m-ink)' }}>You have no listings yet</p>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--m-muted)' }}>Post something to start selling on campus.</p>
          <Link href="/sell" className="mt-5 inline-flex h-11 items-center rounded-full px-6 text-[13px] font-bold text-white" style={{ background: 'var(--m-pop)' }}>
            Create your first listing
          </Link>
        </div>
      ) : visibleListings.length === 0 ? (
        <div className="mt-12 rounded-[var(--r-lg)] border p-10 text-center max-w-[480px] mx-auto" style={{ borderColor: 'var(--m-line)' }}>
          <p className="text-sm" style={{ color: 'var(--m-muted)' }}>
            No {statusFilter} listings right now.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {visibleListings.map((listing) => {
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
                  {(listing.isStale || listing.isExpired) ? (
                    <span className="rounded-full bg-[var(--m-soft)] px-3 py-1 text-xs font-semibold text-[var(--m-muted)]">
                      {listing.isExpired ? 'Expired' : 'Refresh soon'}
                    </span>
                  ) : null}
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
                    onClick={() => refreshListing(listing.id)}
                    className="ui-btn-secondary disabled:opacity-60"
                  >
                    Refresh
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => archiveListing(listing.id)}
                    className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    Delete
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
