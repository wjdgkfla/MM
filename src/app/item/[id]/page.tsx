'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { SellerTrustCard } from '@/components/SellerTrustCard'
import { StatusBadge } from '@/components/StatusBadge'
import { TrustCues } from '@/components/TrustCues'
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  LOCATION_LABELS,
  PICKUP_ZONE_LABELS,
  Listing,
  REPORT_REASON_LABELS,
  ReportReason,
  User,
} from '@/lib/types'
import { formatPostedDate, formatRecency } from '@/lib/time'
import { useFavorites } from '@/lib/useFavorites'
import { isCampusMeetupRecommended } from '@/lib/trust'
import { useAuthSession } from '@/lib/auth/useAuthSession'

const FALLBACK_IMAGE = '/listings/moving-boxes.svg'

type ListingDetailResponse = {
  listing: Listing
  seller: User | null
  sellerListingCount: number
}

const statusActionsByCurrentStatus: Record<
  Listing['status'],
  Array<{ label: string; nextStatus: Listing['status'] }>
> = {
  available: [{ label: 'Mark reserved', nextStatus: 'reserved' }],
  reserved: [
    { label: 'Mark available', nextStatus: 'available' },
    { label: 'Mark sold', nextStatus: 'sold' },
  ],
  sold: [{ label: 'Relist as available', nextStatus: 'available' }],
}

export default function ItemPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [listing, setListing] = useState<Listing | null>(null)
  const [seller, setSeller] = useState<User | null>(null)
  const [sellerListingCount, setSellerListingCount] = useState(0)
  const [activeImage, setActiveImage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [showReportForm, setShowReportForm] = useState(false)
  const [reportReason, setReportReason] = useState<ReportReason>('scam-concern')
  const [reportNotes, setReportNotes] = useState('')
  const [includeSellerInReport, setIncludeSellerInReport] = useState(false)
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportFeedback, setReportFeedback] = useState('')

  const { session } = useAuthSession()
  const { isSaved, toggleFavorite } = useFavorites(session?.userId)

  useEffect(() => {
    if (!params?.id) return

    setLoading(true)
    fetch(`/api/listings/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found')
        return res.json() as Promise<ListingDetailResponse>
      })
      .then((data) => {
        setListing(data.listing)
        setSeller(data.seller)
        setSellerListingCount(data.sellerListingCount || 0)
        setActiveImage(0)
      })
      .catch(() => {
        setListing(null)
        setSeller(null)
        setSellerListingCount(0)
      })
      .finally(() => setLoading(false))
  }, [params?.id])

  const gallery = useMemo(() => {
    if (!listing) return [FALLBACK_IMAGE]

    const candidates = listing.imageUrls.filter(Boolean) as string[]
    const deduped = Array.from(new Set(candidates))
    return deduped.length > 0 ? deduped : [FALLBACK_IMAGE]
  }, [listing])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-gray-100 rounded-2xl aspect-[4/3] animate-pulse" />
        <div className="mt-6 h-8 bg-gray-100 rounded animate-pulse w-2/3" />
        <div className="mt-4 h-4 bg-gray-100 rounded animate-pulse w-1/3" />
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 text-lg">Listing not found</p>
        <Link href="/" className="mt-4 inline-block font-medium text-[#006633]">
          Back to listings
        </Link>
      </div>
    )
  }

  const priceLabel = listing.price === 0 ? 'Free' : `$${listing.price}`
  const selectedImage = gallery[Math.min(activeImage, gallery.length - 1)]
  const listingIsSaved = isSaved(listing.id)
  const signInRedirect = `/sign-in?redirect=${encodeURIComponent(`/item/${listing.id}`)}`
  const isOwnListing = Boolean(session && session.userId === listing.sellerId)
  const isSoldListing = listing.status === 'sold'
  const sellerStatusActions = statusActionsByCurrentStatus[listing.status]

  const handleStatusChange = async (nextStatus: Listing['status']) => {
    setActionError('')
    setActionBusy(true)
    try {
      const res = await fetch(`/api/listings/${listing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error || 'Could not update listing status')
      }
      const updated = (await res.json()) as Listing
      setListing(updated)
    } catch (statusError) {
      setActionError(statusError instanceof Error ? statusError.message : 'Could not update listing status')
    } finally {
      setActionBusy(false)
    }
  }

  const handleDelete = async () => {
    const ok = window.confirm('Archive/Delete this listing? This removes it from the marketplace.')
    if (!ok) return

    setActionError('')
    setActionBusy(true)
    try {
      const res = await fetch(`/api/listings/${listing.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error || 'Could not archive listing')
      }
      router.push('/my-listings')
      router.refresh()
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : 'Could not archive listing')
      setActionBusy(false)
    }
  }

  const handleSubmitReport = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!session) {
      router.push(signInRedirect)
      return
    }

    setReportSubmitting(true)
    setReportFeedback('')
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          reason: reportReason,
          notes: reportNotes.trim(),
          includeSeller: includeSellerInReport,
        }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error || 'Could not submit report')
      }

      setReportFeedback('Thanks. Your report was submitted to Mason Market moderation.')
      setReportNotes('')
      setIncludeSellerInReport(false)
      setShowReportForm(false)
    } catch (reportError) {
      setReportFeedback(reportError instanceof Error ? reportError.message : 'Could not submit report')
    } finally {
      setReportSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/" className="mb-6 inline-block text-sm text-gray-500 hover:text-[#006633]">
        Back to Mason Market
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:gap-8">
        <section>
          <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 aspect-[4/3]">
            <Image src={selectedImage} alt={listing.title} fill className="object-cover" priority unoptimized={selectedImage.startsWith('data:')} />
          </div>

          {gallery.length > 1 ? (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {gallery.map((image, index) => (
                <button
                  type="button"
                  key={`${image}-${index}`}
                  onClick={() => setActiveImage(index)}
                  className={`relative overflow-hidden rounded-xl border aspect-square ${
                    index === activeImage ? 'border-[#006633]' : 'border-gray-200'
                  }`}
                >
                  <Image src={image} alt={`${listing.title} ${index + 1}`} fill className="object-cover" unoptimized={image.startsWith('data:')} />
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <section className="space-y-5">
          <div className="ui-surface p-5 sm:p-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
                {CATEGORY_LABELS[listing.category]}
              </span>
              <StatusBadge status={listing.status} />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 leading-tight">{listing.title}</h1>
            <div className="mt-2 flex items-center gap-3">
              <p className="text-3xl sm:text-[2rem] font-bold text-[#006633]">{priceLabel}</p>
              {listing.favoriteCount > 0 ? (
                <span className="flex items-center gap-1 text-sm text-gray-400">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                    <path fill="currentColor" d="M12.1 20.3c-.1 0-.2 0-.3-.1C7 17.4 4 14.8 4 11.5 4 8.8 6 7 8.5 7c1.5 0 2.8.7 3.6 1.8C13 7.7 14.3 7 15.8 7 18.3 7 20.3 8.8 20.3 11.5c0 3.3-3 5.9-7.8 8.7-.2.1-.3.1-.4.1z"/>
                  </svg>
                  {listing.favoriteCount} {listing.favoriteCount === 1 ? 'person' : 'people'} saved this
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-gray-600">Condition: {CONDITION_LABELS[listing.condition]}</p>

            <div className="mt-4 space-y-1 text-sm text-gray-600">
              <p>
                Pickup: {LOCATION_LABELS[listing.campusLocation]} - {PICKUP_ZONE_LABELS[listing.pickupZone]}
              </p>
              <p>{listing.pickupNotes}</p>
              <p>
                Posted {formatRecency(listing.createdAt)} ({formatPostedDate(listing.createdAt)})
              </p>
            </div>
            <div className="mt-3">
              <TrustCues listing={listing} />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  if (!session) {
                    router.push(signInRedirect)
                    return
                  }
                  toggleFavorite(listing.id)
                }}
                className={`ui-btn-secondary ${
                  listingIsSaved
                    ? 'border-[#006633] bg-[#006633]/10 text-[#1d5a3a]'
                    : ''
                }`}
              >
                {listingIsSaved ? 'Saved ♥' : 'Save ♡'}
              </button>
              {isSoldListing && !isOwnListing ? (
                <button type="button" disabled className="ui-btn-primary cursor-not-allowed text-center opacity-60">
                  Listing sold
                </button>
              ) : session ? (
                isOwnListing ? (
                  <Link href="/messages" className="ui-btn-primary text-center">
                    View buyer messages
                  </Link>
                ) : (
                  <Link href={`/messages?listingId=${listing.id}`} className="ui-btn-primary text-center">
                    Message seller
                  </Link>
                )
              ) : (
                <Link href={signInRedirect} className="ui-btn-primary text-center">
                  Sign in to message
                </Link>
              )}
            </div>

            <p className="mt-2 text-xs text-gray-500">
              {isSoldListing && !isOwnListing
                ? 'This listing is marked sold and no longer accepts buyer messages.'
                : 'Use messages for availability, meetup timing, and price discussion.'}
            </p>
            {actionError ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p> : null}
          </div>

          {isOwnListing ? (
            <div className="ui-surface p-5 sm:p-6">
              <h2 className="text-base font-semibold text-gray-900">Seller controls</h2>
              <p className="mt-1 text-sm text-gray-600">Manage status, edit details, or remove this listing.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/my-listings/${listing.id}/edit`} className="ui-btn-secondary">
                  Edit listing
                </Link>
                {sellerStatusActions.map((action) => (
                  <button
                    key={action.nextStatus}
                    type="button"
                    onClick={() => handleStatusChange(action.nextStatus)}
                    disabled={actionBusy}
                    className="ui-btn-secondary disabled:opacity-60"
                  >
                    {action.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={actionBusy}
                  className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  Archive/Delete
                </button>
              </div>
              <p className="mt-3 text-xs text-gray-500">Tip: You can also manage all your listings from the My Listings page.</p>
            </div>
          ) : null}

          <div className="ui-surface p-5 sm:p-6">
            <h2 className="text-base font-semibold text-gray-900">Item details</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">{listing.description}</p>
            {listing.category === 'textbooks' &&
            (listing.courseCode || listing.professorName || listing.edition || listing.bundleNotes) ? (
              <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-sm font-medium text-gray-900">Course material details</p>
                <div className="mt-2 space-y-1 text-sm text-gray-700">
                  {listing.courseCode ? <p>Course: {listing.courseCode}</p> : null}
                  {listing.professorName ? <p>Professor: {listing.professorName}</p> : null}
                  {listing.edition ? <p>Edition: {listing.edition}</p> : null}
                  {listing.bundleNotes ? <p>Bundle notes: {listing.bundleNotes}</p> : null}
                </div>
              </div>
            ) : null}
            {listing.tags.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {listing.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-[#006633]/10 px-2.5 py-1 text-xs text-[#1c5a3a]">
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="ui-surface p-5 sm:p-6">
            <h2 className="text-base font-semibold text-gray-900">Trust & safety</h2>
            <ul className="mt-3 space-y-2 text-sm text-gray-700">
              <li>GMU-only marketplace. Only verified university emails can post or message.</li>
              <li>
                {isCampusMeetupRecommended(listing.pickupZone)
                  ? 'Campus meetup recommended for first-time exchanges.'
                  : 'This listing uses off-campus meetup. Choose a busy public location.'}
              </li>
              <li>Check the item before payment and meet in visible public areas.</li>
            </ul>

            {!isOwnListing ? (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (!session) {
                      router.push(signInRedirect)
                      return
                    }
                    setShowReportForm((current) => !current)
                  }}
                  className="text-sm font-medium text-[#006633] hover:underline"
                >
                  {showReportForm ? 'Cancel report' : 'Report this listing'}
                </button>

                {showReportForm ? (
                  <form onSubmit={handleSubmitReport} className="mt-3 space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Reason</label>
                      <select
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value as ReportReason)}
                        className="ui-input"
                      >
                        {(Object.keys(REPORT_REASON_LABELS) as ReportReason[]).map((reason) => (
                          <option key={reason} value={reason}>
                            {REPORT_REASON_LABELS[reason]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Notes (optional)</label>
                      <textarea
                        rows={3}
                        maxLength={500}
                        value={reportNotes}
                        onChange={(e) => setReportNotes(e.target.value)}
                        placeholder="Share what looked suspicious or unsafe."
                        className="ui-input resize-none"
                      />
                    </div>

                    <label className="flex items-start gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={includeSellerInReport}
                        onChange={(e) => setIncludeSellerInReport(e.target.checked)}
                        className="mt-1 h-4 w-4"
                      />
                      Also report seller behavior for moderator review.
                    </label>

                    <button type="submit" disabled={reportSubmitting} className="ui-btn-secondary">
                      {reportSubmitting ? 'Submitting...' : 'Submit report'}
                    </button>
                  </form>
                ) : null}

                {reportFeedback ? (
                  <p className={`mt-2 text-xs ${reportFeedback.startsWith('Thanks') ? 'text-[#006633]' : 'text-red-700'}`}>
                    {reportFeedback}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-gray-900">Seller profile</h2>
              <Link href={`/seller/${listing.sellerId}`} className="text-sm font-medium text-[#006633] hover:underline">
                View seller page
              </Link>
            </div>
            <SellerTrustCard seller={seller} sellerListingCount={sellerListingCount} />
          </div>
        </section>
      </div>
    </div>
  )
}
