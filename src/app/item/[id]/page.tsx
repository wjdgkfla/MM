'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { SellerTrustCard } from '@/components/SellerTrustCard'
import { SellerRating } from '@/components/SellerRating'
import { RatingForm } from '@/components/RatingForm'
import { StatusBadge } from '@/components/StatusBadge'
import { TrustCues } from '@/components/TrustCues'
import { useLocale } from '@/lib/i18n/LocaleProvider'
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
import { showToast } from '@/components/Toast'
import { ListingPhotoGallery } from '@/components/ListingPhotoGallery'

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
  const { t } = useLocale()
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [listing, setListing] = useState<Listing | null>(null)
  const [seller, setSeller] = useState<User | null>(null)
  const [sellerListingCount, setSellerListingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [offerAmount, setOfferAmount] = useState('')
  const [offerSending, setOfferSending] = useState(false)
  const [offerFeedback, setOfferFeedback] = useState('')
  const offerInputRef = useRef<HTMLInputElement>(null)
  const [showReportForm, setShowReportForm] = useState(false)
  const [reportReason, setReportReason] = useState<ReportReason>('scam-concern')
  const [reportNotes, setReportNotes] = useState('')
  const [includeSellerInReport, setIncludeSellerInReport] = useState(false)
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportFeedback, setReportFeedback] = useState('')
  const [watchingPrice, setWatchingPrice] = useState(false)

  const { session } = useAuthSession()
  const { isSaved, toggleFavorite } = useFavorites(session?.userId)

  // Close offer modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showOfferModal) {
        setShowOfferModal(false)
        setOfferFeedback('')
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showOfferModal])

  // Focus the offer input when modal opens
  useEffect(() => {
    if (showOfferModal) {
      setTimeout(() => offerInputRef.current?.focus(), 50)
    }
  }, [showOfferModal])

  useEffect(() => {
    if (!params?.id) return

    setLoading(true)
    fetch(`/api/listings/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found')
        return res.json() as Promise<ListingDetailResponse>
      })
      .then(async (data) => {
        setListing(data.listing)
        setSeller(data.seller)
        setSellerListingCount(data.sellerListingCount || 0)
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

  // Seed the watch-state toggle from the user's existing price watches so a
  // returning user sees the correct "Watching price" state instead of always
  // starting from "Watch price drop".
  useEffect(() => {
    if (!session || !listing) return
    let cancelled = false
    fetch('/api/price-watches')
      .then((res) => (res.ok ? res.json() : []))
      .then((watches: { listingId: string }[]) => {
        if (cancelled) return
        if (Array.isArray(watches)) {
          setWatchingPrice(watches.some((w) => w.listingId === listing.id))
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [session, listing])

  if (loading) {
    return (
      <div className="max-w-content mx-auto px-4 py-8">
        <div className="bg-[var(--m-soft)] rounded-2xl aspect-[4/3] animate-pulse" />
        <div className="mt-6 h-8 bg-[var(--m-soft)] rounded animate-pulse w-2/3" />
        <div className="mt-4 h-4 bg-[var(--m-soft)] rounded animate-pulse w-1/3" />
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="max-w-narrow mx-auto px-4 py-16 text-center">
        <p className="text-[var(--m-muted)] text-lg">Listing not found</p>
        <Link href="/" className="mt-4 inline-block font-medium text-[var(--m-green)]">
          Back to listings
        </Link>
      </div>
    )
  }

  const priceLabel = listing.price === 0 ? 'Free' : `$${listing.price}`
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
      showToast(`Listing marked as ${nextStatus}`)
    } catch (statusError) {
      setActionError(statusError instanceof Error ? statusError.message : 'Could not update listing status')
    } finally {
      setActionBusy(false)
    }
  }

  const handleDelete = async () => {
    const ok = window.confirm('Delete this listing? It will be permanently removed from Mason Market.')
    if (!ok) return

    setActionError('')
    setActionBusy(true)
    try {
      const res = await fetch(`/api/listings/${listing.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error || 'Could not archive listing')
      }
      showToast('Listing archived')
      router.push('/my-listings')
      router.refresh()
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : 'Could not archive listing')
      setActionBusy(false)
    }
  }

  const handleMakeOffer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) { router.push(signInRedirect); return }
    const amount = Number(offerAmount)
    if (!amount || amount < 1) { setOfferFeedback('Enter a valid offer amount (minimum $1).'); return }
    if (amount > 100000) { setOfferFeedback('Offer cannot exceed $100,000.'); return }
    setOfferSending(true)
    setOfferFeedback('')
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          toUserId: listing.sellerId,
          body: `I'd like to offer $${amount} for this item.`,
          type: 'offer',
          offerAmount: amount,
        }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error || 'Could not send offer')
      }
      setShowOfferModal(false)
      setOfferAmount('')
      router.push(`/messages?listingId=${listing.id}`)
    } catch (err) {
      setOfferFeedback(err instanceof Error ? err.message : 'Could not send offer')
    } finally {
      setOfferSending(false)
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
      showToast('Report submitted to moderation')
    } catch (reportError) {
      setReportFeedback(reportError instanceof Error ? reportError.message : 'Could not submit report')
    } finally {
      setReportSubmitting(false)
    }
  }

  const togglePriceWatch = async () => {
    if (!session) {
      router.push(signInRedirect)
      return
    }
    const method = watchingPrice ? 'DELETE' : 'POST'
    const url = watchingPrice ? `/api/price-watches?listingId=${listing.id}` : '/api/price-watches'
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'POST' ? JSON.stringify({ listingId: listing.id }) : undefined,
      })
      if (!res.ok) {
        showToast('Could not update price watch. Please try again.', 'error')
        return
      }
      setWatchingPrice((current) => !current)
    } catch {
      showToast('Could not update price watch. Please try again.', 'error')
    }
  }

  return (
    <div className="max-w-content mx-auto px-4 py-8">
      <Link href="/" className="mb-6 inline-block text-sm text-[var(--m-muted)] hover:text-[var(--m-green)]">
        Back to Mason Market
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_400px] lg:gap-10">
        <section>
          <ListingPhotoGallery images={gallery} title={listing.title} coverImageUrl={listing.coverImageUrl} />

          <div className="mt-6 space-y-5">
            <div>
              <h1 className="font-display text-display-sm font-black leading-tight" style={{ color: 'var(--m-ink)' }}>
                {listing.title}
              </h1>
              <p className="mt-2 text-sm text-[var(--m-muted)]">Condition: {CONDITION_LABELS[listing.condition]}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[var(--m-soft)] px-2 py-1 text-xs text-[var(--m-ink)]">
                  {CATEGORY_LABELS[listing.category]}
                </span>
                <StatusBadge status={listing.status} />
              </div>
            </div>

            <div className="ui-surface p-5 sm:p-6">
              <h2 className="text-base font-semibold text-[var(--m-ink)]">Item details</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--m-ink)]">{listing.description}</p>
              {listing.category === 'textbooks' &&
              (listing.courseCode || listing.professorName || listing.edition || listing.bundleNotes) ? (
                <div className="mt-4 rounded-xl border bg-[var(--m-soft)] p-3" style={{ borderColor: 'var(--m-line)' }}>
                  <p className="text-sm font-medium text-[var(--m-ink)]">Course material details</p>
                  <div className="mt-2 space-y-1 text-sm text-[var(--m-ink)]">
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
                    <span key={tag} className="rounded-full bg-[var(--m-green-soft)] px-2.5 py-1 text-xs text-[var(--m-ink)]">
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="ui-surface p-5 sm:p-6">
              <h2 className="text-base font-semibold text-[var(--m-ink)]">Trust & safety</h2>
              <ul className="mt-3 space-y-2 text-sm text-[var(--m-ink)]">
                <li>GMU-only marketplace. Only verified university emails can post or message.</li>
                <li>
                  {isCampusMeetupRecommended(listing.pickupZone)
                    ? 'Campus meetup recommended for first-time exchanges.'
                    : 'This listing uses off-campus meetup. Choose a busy public location.'}
                </li>
                <li>Check the item before payment and meet in visible public areas.</li>
              </ul>

              {!isOwnListing ? (
                <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--m-line)' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!session) {
                        router.push(signInRedirect)
                        return
                      }
                      setShowReportForm((current) => !current)
                    }}
                    className="text-sm font-medium text-[var(--m-green)] hover:underline"
                  >
                    {showReportForm ? 'Cancel report' : 'Report this listing'}
                  </button>

                  {showReportForm ? (
                    <form onSubmit={handleSubmitReport} className="mt-3 space-y-3 rounded-xl border bg-[var(--m-soft)] p-3" style={{ borderColor: 'var(--m-line)' }}>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-[var(--m-ink)]">Reason</label>
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
                        <label className="mb-1 block text-sm font-medium text-[var(--m-ink)]">Notes (optional)</label>
                        <textarea
                          rows={3}
                          maxLength={500}
                          value={reportNotes}
                          onChange={(e) => { setReportNotes(e.target.value); setReportFeedback('') }}
                          placeholder="Share what looked suspicious or unsafe."
                          className="ui-input resize-none"
                        />
                      </div>

                      <label className="flex items-start gap-2 text-sm text-[var(--m-ink)]">
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
                    <p className={`mt-2 text-xs ${reportFeedback.startsWith('Thanks') ? 'text-[var(--m-green)]' : 'text-red-700'}`}>
                      {reportFeedback}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-[var(--m-ink)]">Seller profile</h2>
                <Link href={`/seller/${listing.sellerId}`} className="text-sm font-medium text-[var(--m-green)] hover:underline">
                  View seller page
                </Link>
              </div>
              <SellerTrustCard seller={seller} sellerListingCount={sellerListingCount} />
              <div className="mt-3">
                <SellerRating sellerId={listing.sellerId} compact />
              </div>
            </div>

            {isSoldListing && !isOwnListing && session ? (
              <div>
                <h2 className="mb-3 text-base font-semibold text-[var(--m-ink)]">Rate your experience</h2>
                <RatingForm sellerId={listing.sellerId} listingId={listing.id} />
              </div>
            ) : null}
          </div>
        </section>

        <section>
          <div className="sticky top-[88px] space-y-3">
            <div className="rounded-[var(--r-lg)] border bg-white p-6" style={{ borderColor: 'var(--m-line)' }}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <StatusBadge status={listing.status} />
              </div>

              <p className="font-display font-black text-[52px] leading-none tabular-nums" style={{ color: 'var(--m-ink)' }}>
                {priceLabel}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-3">
                {listing.favoriteCount > 0 ? (
                  <span className="flex items-center gap-1 text-sm text-[var(--m-muted)]">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                      <path fill="currentColor" d="M12.1 20.3c-.1 0-.2 0-.3-.1C7 17.4 4 14.8 4 11.5 4 8.8 6 7 8.5 7c1.5 0 2.8.7 3.6 1.8C13 7.7 14.3 7 15.8 7 18.3 7 20.3 8.8 20.3 11.5c0 3.3-3 5.9-7.8 8.7-.2.1-.3.1-.4.1z"/>
                    </svg>
                    {listing.favoriteCount} {listing.favoriteCount === 1 ? 'person' : 'people'} saved this
                  </span>
                ) : null}
                {(listing.viewCount ?? 0) > 0 ? (
                  <span className="flex items-center gap-1 text-sm text-[var(--m-muted)]">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                      <path fill="currentColor" d="M12 5C7 5 2.7 8.1 1 12.5 2.7 16.9 7 20 12 20s9.3-3.1 11-7.5C21.3 8.1 17 5 12 5zm0 12.5c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5zm0-8a3 3 0 100 6 3 3 0 000-6z"/>
                    </svg>
                    {listing.viewCount ?? 0} {listing.viewCount === 1 ? 'view' : 'views'}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 space-y-1 text-sm text-[var(--m-muted)]">
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

              <div className="mt-5 grid grid-cols-1 gap-3">
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
                      ? 'border-[var(--m-green)] bg-[var(--m-green-soft)] text-[var(--m-ink)]'
                      : ''
                  }`}
                >
                  {listingIsSaved ? `${t('item.save')} ♥` : `${t('item.save')} ♡`}
                </button>
                <button type="button" onClick={togglePriceWatch} className="ui-btn-secondary">
                  {watchingPrice ? 'Watching price' : t('item.watchPrice')}
                </button>
                {isSoldListing && !isOwnListing ? (
                  <button type="button" disabled className="w-full h-12 rounded-2xl text-white font-bold text-[14px] flex items-center justify-center gap-2 cursor-not-allowed opacity-60" style={{ background: 'var(--m-ink)' }}>
                    Listing sold
                  </button>
                ) : session ? (
                  isOwnListing ? (
                    <Link href="/messages" className="w-full h-12 rounded-2xl text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-opacity hover:opacity-90" style={{ background: 'var(--m-ink)' }}>
                      View buyer messages
                    </Link>
                  ) : (
                    <Link href={`/messages?listingId=${listing.id}&quick=available`} className="w-full h-12 rounded-2xl text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-opacity hover:opacity-90" style={{ background: 'var(--m-ink)' }}>
                      {t('item.stillAvailable')}
                    </Link>
                  )
                ) : (
                  <Link href={signInRedirect} className="w-full h-12 rounded-2xl text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-opacity hover:opacity-90" style={{ background: 'var(--m-ink)' }}>
                    Sign in to message
                  </Link>
                )}
              </div>
              {!isSoldListing && !isOwnListing && session ? (
                <div className="mt-2 flex gap-2">
                  <Link href={`/messages?listingId=${listing.id}`} className="flex-1 rounded-xl border border-[var(--m-green)]/40 py-2 text-center text-sm font-medium text-[var(--m-green)] hover:bg-[var(--m-green-soft)]">
                    {t('item.messageSeller')}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowOfferModal(true)}
                    className="flex-1 rounded-xl border border-[var(--m-gold)]/60 py-2 text-center text-sm font-medium text-[var(--m-gold-text)] hover:bg-[var(--m-gold-soft)]"
                  >
                    {t('item.makeOffer')}
                  </button>
                </div>
              ) : null}

              <p className="mt-2 text-xs text-[var(--m-muted)]">
                {isSoldListing && !isOwnListing
                  ? 'This listing is marked sold and no longer accepts buyer messages.'
                  : 'Use messages for availability, meetup timing, and price discussion.'}
              </p>
              {actionError ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p> : null}
            </div>

            <div className="rounded-[var(--r-lg)] p-5 text-white relative overflow-hidden" style={{ background: 'var(--m-green)' }}>
              <p className="font-mono-label text-[10px] uppercase tracking-[0.16em] opacity-80">Pickup zone</p>
              <p className="font-display text-[20px] font-black mt-0.5">{PICKUP_ZONE_LABELS[listing.pickupZone]}</p>
              <p className="text-[12px] opacity-90 mt-1">{listing.pickupNotes}</p>
            </div>

            {isOwnListing ? (
              <div className="rounded-[var(--r-lg)] border bg-white p-6" style={{ borderColor: 'var(--m-line)' }}>
                <h2 className="text-base font-semibold text-[var(--m-ink)]">Seller controls</h2>
                <p className="mt-1 text-sm text-[var(--m-muted)]">Manage status, edit details, or remove this listing.</p>
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
                    Delete
                  </button>
                </div>
                <p className="mt-3 text-xs text-[var(--m-muted)]">Tip: You can also manage all your listings from the My Listings page.</p>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      {showOfferModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => { setShowOfferModal(false); setOfferFeedback('') }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[var(--m-ink)]">Make an offer</h2>
            <p className="mt-1 text-sm text-[var(--m-muted)]">
              Listed at{' '}
              <span className="font-semibold text-[var(--m-green)]">{priceLabel}</span>. Enter your offer below.
            </p>
            <form onSubmit={handleMakeOffer} className="mt-4 space-y-4">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--m-muted)]">$</span>
                <input
                  type="number"
                  min="1"
                  max="100000"
                  step="1"
                  value={offerAmount}
                  onChange={(e) => { setOfferAmount(e.target.value); setOfferFeedback('') }}
                  placeholder="0"
                  className={`ui-input pl-7 ${offerFeedback ? 'border-red-400 bg-red-50' : ''}`}
                  ref={offerInputRef}
                />
              </div>
              {offerFeedback ? <p className="text-xs text-red-600">{offerFeedback}</p> : null}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowOfferModal(false); setOfferFeedback('') }}
                  className="ui-btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" disabled={offerSending} className="ui-btn-primary flex-1">
                  {offerSending ? 'Sending…' : 'Send offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
