'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  AdminActivityLog,
  Listing,
  ListingStatus,
  REPORT_REASON_LABELS,
  REPORT_STATUSES,
  Report,
  ReportStatus,
  User,
} from '@/lib/types'

type ModerationPayload = {
  listings: Listing[]
  users: User[]
  reports: Report[]
  activity: AdminActivityLog[]
}

type AdminTab = 'overview' | 'listings' | 'users' | 'reports' | 'activity'

const TABS: Array<{ id: AdminTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'listings', label: 'Listings' },
  { id: 'users', label: 'Users' },
  { id: 'reports', label: 'Reports' },
  { id: 'activity', label: 'Activity' },
]

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

export function AdminModerationClient({
  adminName,
  adminEmail,
}: {
  adminName: string
  adminEmail: string
}) {
  const [tab, setTab] = useState<AdminTab>('overview')
  const [payload, setPayload] = useState<ModerationPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busyKey, setBusyKey] = useState<string>('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/moderation')
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || 'Failed to load moderation data')
      }
      const nextPayload = (await res.json()) as ModerationPayload
      setPayload(nextPayload)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load moderation data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const reportStats = useMemo(() => {
    const reports = payload?.reports || []
    return {
      total: reports.length,
      open: reports.filter((report) => report.status === 'open').length,
      reviewed: reports.filter((report) => report.status === 'reviewed').length,
      resolved: reports.filter((report) => report.status === 'resolved').length,
    }
  }, [payload])

  const reportStateByListing = useMemo(() => {
    const map = new Map<string, { total: number; open: number }>()
    for (const report of payload?.reports || []) {
      const current = map.get(report.listingId) || { total: 0, open: 0 }
      current.total += 1
      if (report.status === 'open') current.open += 1
      map.set(report.listingId, current)
    }
    return map
  }, [payload])

  const mutateListing = async (
    listingId: string,
    input: { moderationState?: Listing['moderationState']; status?: ListingStatus }
  ) => {
    setBusyKey(`listing-${listingId}`)
    setError('')
    try {
      const res = await fetch(`/api/admin/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || 'Failed to update listing')
      }
      await load()
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : 'Failed to update listing')
    } finally {
      setBusyKey('')
    }
  }

  const removeListing = async (listingId: string) => {
    const ok = window.confirm('Remove this listing from marketplace?')
    if (!ok) return

    setBusyKey(`listing-remove-${listingId}`)
    setError('')
    try {
      const res = await fetch(`/api/admin/listings/${listingId}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || 'Failed to remove listing')
      }
      await load()
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : 'Failed to remove listing')
    } finally {
      setBusyKey('')
    }
  }

  const mutateUser = async (
    userId: string,
    input: { role?: User['role']; accountState?: User['accountState'] }
  ) => {
    setBusyKey(`user-${userId}`)
    setError('')
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || 'Failed to update user')
      }
      await load()
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : 'Failed to update user')
    } finally {
      setBusyKey('')
    }
  }

  const mutateReport = async (reportId: string, status: ReportStatus) => {
    setBusyKey(`report-${reportId}`)
    setError('')
    try {
      const res = await fetch('/api/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, status }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || 'Failed to update report')
      }
      await load()
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : 'Failed to update report')
    } finally {
      setBusyKey('')
    }
  }

  const seedFirebase = async () => {
    setBusyKey('seed-firebase')
    setError('')
    setInfo('')
    try {
      const res = await fetch('/api/admin/firebase/seed', { method: 'POST' })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(body?.error || 'Failed to seed Firebase')
      }
      const counts = body?.counts
      if (counts) {
        setInfo(
          `Firebase snapshot: ${counts.users} users, ${counts.listings} listings, ${counts.messages} messages, ${counts.reports} reports, ${counts.adminActivity} admin activity entries.`
        )
      } else {
        setInfo('Firebase check completed.')
      }
    } catch (seedError) {
      setError(seedError instanceof Error ? seedError.message : 'Failed to check database')
    } finally {
      setBusyKey('')
    }
  }

  const checkFirebaseStatus = async () => {
    setBusyKey('check-firebase')
    setError('')
    setInfo('')
    try {
      const res = await fetch('/api/admin/firebase/status')
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(body?.error || 'Failed to check database status')
      }

      const message = body?.connected
        ? `✓ Supabase connected. ${body.details || ''}`
        : `✗ Supabase not connected. ${body.details || ''}`

      setInfo(message)
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Failed to check database status')
    } finally {
      setBusyKey('')
    }
  }

  const listings = payload?.listings || []
  const users = payload?.users || []
  const reports = payload?.reports || []
  const activity = payload?.activity || []

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8">
      <h1 className="font-display text-[32px] font-black" style={{ color: 'var(--m-ink)' }}>Admin</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--m-muted)' }}>
        Signed in as {adminName} ({adminEmail})
      </p>
      <div className="mt-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={checkFirebaseStatus}
            disabled={busyKey === 'check-firebase'}
            className="ui-btn-secondary"
          >
            {busyKey === 'check-firebase' ? 'Checking...' : 'Check DB Status'}
          </button>
          <button
            type="button"
            onClick={seedFirebase}
            disabled={busyKey === 'seed-firebase'}
            className="ui-btn-secondary"
          >
            {busyKey === 'seed-firebase' ? 'Checking...' : 'Check Database'}
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-xl px-3 py-2 text-sm font-medium ${
              tab === item.id
                ? 'bg-[var(--m-pop)] text-white'
                : 'border bg-white hover:bg-[var(--m-soft)]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {info ? <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{info}</p> : null}

      {loading ? (
        <div className="mt-6 space-y-3">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="h-16 rounded-xl bg-[var(--m-soft)] animate-pulse" />
          ))}
        </div>
      ) : null}

      {!loading && tab === 'overview' ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="ui-surface p-4">
            <p className="text-xs uppercase" style={{ color: 'var(--m-muted)' }}>Listings</p>
            <p className="mt-2 text-2xl font-bold" style={{ color: 'var(--m-ink)' }}>{listings.length}</p>
          </div>
          <div className="ui-surface p-4">
            <p className="text-xs uppercase" style={{ color: 'var(--m-muted)' }}>Users</p>
            <p className="mt-2 text-2xl font-bold" style={{ color: 'var(--m-ink)' }}>{users.length}</p>
          </div>
          <div className="ui-surface p-4">
            <p className="text-xs uppercase" style={{ color: 'var(--m-muted)' }}>Open reports</p>
            <p className="mt-2 text-2xl font-bold" style={{ color: 'var(--m-ink)' }}>{reportStats.open}</p>
          </div>
          <div className="ui-surface p-4">
            <p className="text-xs uppercase" style={{ color: 'var(--m-muted)' }}>Flagged/hidden listings</p>
            <p className="mt-2 text-2xl font-bold" style={{ color: 'var(--m-ink)' }}>
              {listings.filter((item) => item.moderationState !== 'visible').length}
            </p>
          </div>
          <div className="ui-surface p-4">
            <p className="text-xs uppercase" style={{ color: 'var(--m-muted)' }}>Suspended users</p>
            <p className="mt-2 text-2xl font-bold" style={{ color: 'var(--m-ink)' }}>
              {users.filter((item) => item.accountState === 'suspended').length}
            </p>
          </div>
          <div className="ui-surface p-4">
            <p className="text-xs uppercase" style={{ color: 'var(--m-muted)' }}>Recent admin activity</p>
            <p className="mt-2 text-2xl font-bold" style={{ color: 'var(--m-ink)' }}>{activity.length}</p>
          </div>
        </div>
      ) : null}

      {!loading && tab === 'listings' ? (
        <div className="ui-surface mt-6 overflow-x-auto p-4">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-[var(--m-muted)]">
                <th className="pb-2 pr-4">Title</th>
                <th className="pb-2 pr-4">Seller</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Category</th>
                <th className="pb-2 pr-4">Campus</th>
                <th className="pb-2 pr-4">Created</th>
                <th className="pb-2 pr-4">Report state</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--m-line)]">
              {listings.map((listing) => {
                const seller = users.find((user) => user.id === listing.sellerId)
                const reportState = reportStateByListing.get(listing.id)
                const reportLabel = reportState
                  ? reportState.open > 0
                    ? `Open ${reportState.open}/${reportState.total}`
                    : `Resolved ${reportState.total}`
                  : 'None'

                return (
                  <tr key={listing.id}>
                    <td className="py-2 pr-4">
                      <Link href={`/item/${listing.id}`} className="font-medium text-[var(--m-ink)] hover:text-[var(--m-green)]">
                        {listing.title}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-[var(--m-muted)]">{seller?.displayName || listing.sellerId}</td>
                    <td className="py-2 pr-4 text-[var(--m-muted)]">
                      <span className="capitalize">{listing.status}</span> /{' '}
                      <span className="capitalize">{listing.moderationState}</span>
                    </td>
                    <td className="py-2 pr-4 text-[var(--m-muted)]">{listing.category}</td>
                    <td className="py-2 pr-4 text-[var(--m-muted)]">{listing.campusLocation}</td>
                    <td className="py-2 pr-4 text-[var(--m-muted)]">{formatDate(listing.createdAt)}</td>
                    <td className="py-2 pr-4 text-[var(--m-muted)]">{reportLabel}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          disabled={busyKey.startsWith(`listing-${listing.id}`)}
                          onClick={() =>
                            mutateListing(listing.id, {
                              moderationState:
                                listing.moderationState === 'hidden' ? 'visible' : 'hidden',
                            })
                          }
                          className="rounded-lg border border-[var(--m-line)] px-2 py-1 text-xs"
                        >
                          {listing.moderationState === 'hidden' ? 'Unhide' : 'Hide'}
                        </button>
                        <button
                          type="button"
                          disabled={busyKey.startsWith(`listing-${listing.id}`)}
                          onClick={() =>
                            mutateListing(listing.id, {
                              moderationState:
                                listing.moderationState === 'flagged' ? 'visible' : 'flagged',
                            })
                          }
                          className="rounded-lg border border-[var(--m-line)] px-2 py-1 text-xs"
                        >
                          {listing.moderationState === 'flagged' ? 'Unflag' : 'Flag'}
                        </button>
                        <select
                          value={listing.status}
                          onChange={(e) => mutateListing(listing.id, { status: e.target.value as ListingStatus })}
                          className="rounded-lg border border-[var(--m-line)] px-2 py-1 text-xs"
                        >
                          <option value="available">available</option>
                          <option value="reserved">reserved</option>
                          <option value="sold">sold</option>
                        </select>
                        <button
                          type="button"
                          disabled={busyKey === `listing-remove-${listing.id}`}
                          onClick={() => removeListing(listing.id)}
                          className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-700"
                        >
                          Remove
                        </button>
                        <Link href={`/item/${listing.id}`} className="rounded-lg border border-[var(--m-line)] px-2 py-1 text-xs">
                          Open
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && tab === 'users' ? (
        <div className="ui-surface mt-6 overflow-x-auto p-4">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-[var(--m-muted)]">
                <th className="pb-2 pr-4">User</th>
                <th className="pb-2 pr-4">Role</th>
                <th className="pb-2 pr-4">Verification</th>
                <th className="pb-2 pr-4">Listings</th>
                <th className="pb-2 pr-4">Account state</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--m-line)]">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="py-2 pr-4 text-[var(--m-ink)]">
                    <p className="font-medium">{user.displayName}</p>
                    <p className="text-xs text-[var(--m-muted)]">{user.gmuEmail}</p>
                  </td>
                  <td className="py-2 pr-4 text-[var(--m-muted)] capitalize">{user.role}</td>
                  <td className="py-2 pr-4 text-[var(--m-muted)]">
                    {user.gmuEmailVerified ? 'GMU email verified' : 'Verification pending'}
                  </td>
                  <td className="py-2 pr-4 text-[var(--m-muted)]">{user.listingCount}</td>
                  <td className="py-2 pr-4 text-[var(--m-muted)] capitalize">{user.accountState}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        disabled={busyKey === `user-${user.id}`}
                        onClick={() =>
                          mutateUser(user.id, { role: user.role === 'admin' ? 'student' : 'admin' })
                        }
                        className="rounded-lg border border-[var(--m-line)] px-2 py-1 text-xs"
                      >
                        {user.role === 'admin' ? 'Remove admin' : 'Promote admin'}
                      </button>
                      <button
                        type="button"
                        disabled={busyKey === `user-${user.id}`}
                        onClick={() =>
                          mutateUser(user.id, {
                            accountState: user.accountState === 'suspended' ? 'active' : 'suspended',
                          })
                        }
                        className="rounded-lg border border-[var(--m-line)] px-2 py-1 text-xs"
                      >
                        {user.accountState === 'suspended' ? 'Activate' : 'Suspend'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && tab === 'reports' ? (
        <div className="ui-surface mt-6 overflow-x-auto p-4">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-[var(--m-muted)]">
                <th className="pb-2 pr-4">Target</th>
                <th className="pb-2 pr-4">Reason</th>
                <th className="pb-2 pr-4">Created</th>
                <th className="pb-2 pr-4">Resolution</th>
                <th className="pb-2">Moderation actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--m-line)]">
              {reports.map((report) => {
                const listing = listings.find((item) => item.id === report.listingId)
                const seller = users.find((item) => item.id === report.sellerId)
                return (
                  <tr key={report.id}>
                    <td className="py-2 pr-4 text-[var(--m-ink)]">
                      <p>
                        <Link href={`/item/${report.listingId}`} className="font-medium text-[var(--m-ink)] hover:text-[var(--m-green)]">
                          {listing?.title || 'Listing removed'}
                        </Link>
                      </p>
                      <p className="text-xs text-[var(--m-muted)]">
                        {report.includeSeller ? `Seller + listing (${seller?.displayName || report.sellerId})` : 'Listing only'}
                      </p>
                    </td>
                    <td className="py-2 pr-4 text-[var(--m-muted)]">{REPORT_REASON_LABELS[report.reason]}</td>
                    <td className="py-2 pr-4 text-[var(--m-muted)]">{formatDate(report.createdAt)}</td>
                    <td className="py-2 pr-4 capitalize text-[var(--m-muted)]">{report.status}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1">
                        {REPORT_STATUSES.map((status) => (
                          <button
                            key={status}
                            type="button"
                            disabled={busyKey === `report-${report.id}` || status === report.status}
                            onClick={() => mutateReport(report.id, status)}
                            className="rounded-lg border border-[var(--m-line)] px-2 py-1 text-xs capitalize disabled:opacity-50"
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && tab === 'activity' ? (
        <div className="ui-surface mt-6 overflow-x-auto p-4">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-[var(--m-muted)]">
                <th className="pb-2 pr-4">Time</th>
                <th className="pb-2 pr-4">Admin</th>
                <th className="pb-2 pr-4">Action</th>
                <th className="pb-2 pr-4">Target</th>
                <th className="pb-2">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--m-line)]">
              {activity.map((entry) => (
                <tr key={entry.id}>
                  <td className="py-2 pr-4 text-[var(--m-muted)]">{formatDate(entry.createdAt)}</td>
                  <td className="py-2 pr-4 text-[var(--m-muted)]">{entry.actorDisplayName}</td>
                  <td className="py-2 pr-4 text-[var(--m-muted)]">{entry.action}</td>
                  <td className="py-2 pr-4 text-[var(--m-muted)]">
                    {entry.targetType}:{entry.targetId}
                  </td>
                  <td className="py-2 text-[var(--m-muted)]">{entry.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
