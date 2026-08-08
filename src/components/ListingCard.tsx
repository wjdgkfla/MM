'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { Listing, CONDITION_LABELS, PICKUP_ZONE_LABELS } from '@/lib/types'
import { formatRecency } from '@/lib/time'
import { badgeToneByTrust, trustBadgeLabel } from '@/lib/trust'

interface ListingCardProps {
  listing: Listing
  isSaved?: boolean
  onToggleSave?: (listingId: string) => void
}

const FALLBACK_IMAGE = '/listings/moving-boxes.svg'

/** Turn a display name like "Alex Chen" into "AC" */
function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map(w => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('')
}

/** Background tint per category — keeps cards visually distinct */
const CAT_BG: Record<string, string> = {
  textbooks:   '#f7eded',
  electronics: '#e9eff8',
  furniture:   '#f7f0e7',
  clothing:    '#e9f2ed',
  supplies:    '#eeecf8',
  free:        '#f7f3e5',
  other:       '#f4f4f4',
}

export function ListingCard({ listing, isSaved = false, onToggleSave }: ListingCardProps) {
  const [sellerHovered, setSellerHovered] = useState(false)
  const priceLabel  = listing.price === 0 ? 'Free' : `$${listing.price}`
  const coverImage  = listing.coverImageUrl || listing.imageUrls[0] || FALLBACK_IMAGE
  const isReserved  = listing.status === 'reserved'
  const isSold      = listing.status === 'sold'
  const isFree      = listing.price === 0
  const bg          = CAT_BG[listing.category] || CAT_BG.other
  const initials    = getInitials(listing.sellerProfile?.displayName || '?')
  const photoCount  = listing.imageUrls.filter(Boolean).length
  const trustBadge  = listing.sellerProfile?.trustBadge
  const showTrustBadge = trustBadge === 'verified-gmu' || trustBadge === 'trusted-seller'

  return (
    <article
      className="group cursor-pointer"
      style={{ transition: 'transform 220ms ease' }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
    >
      {/* ── Square photo ── */}
      <Link href={`/item/${listing.id}`} className="block">
        <div
          className="relative aspect-square overflow-hidden"
          style={{ borderRadius: 'var(--r-card)', background: bg }}
        >
          <Image
            src={coverImage}
            alt={listing.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            unoptimized={coverImage.startsWith('data:')}
          />

          {/* Reserved scrim */}
          {listing.listingKind === 'wanted' && (
            <div className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white" style={{ background: 'var(--m-ink)' }}>
              Wanted
            </div>
          )}
          {(listing.isStale || listing.isExpired) && (
            <div className="absolute bottom-2 right-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-[var(--m-muted)]">
              {listing.isExpired ? 'Expired' : 'Refresh soon'}
            </div>
          )}

          {/* Sold scrim */}
          {isSold && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(15,22,17,0.6)' }}>
              <span className="rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white" style={{ borderColor: 'rgba(255,255,255,0.65)' }}>
                Sold
              </span>
            </div>
          )}

          {/* Reserved scrim */}
          {isReserved && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(15,22,17,0.52)' }}>
              <span className="rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white" style={{ borderColor: 'rgba(255,255,255,0.65)' }}>
                Reserved
              </span>
            </div>
          )}

          {/* Free badge */}
          {isFree && !isReserved && listing.listingKind !== 'wanted' && (
            <div className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white" style={{ background: 'var(--m-green)' }}>
              Free
            </div>
          )}

          {/* Multi-photo dot indicators */}
          {photoCount > 1 && (
            <div className="pointer-events-none absolute bottom-2 left-0 right-0 flex justify-center gap-1">
              {Array.from({ length: Math.min(photoCount, 5) }).map((_, i) => (
                <span key={i} className="rounded-full" style={{ width: i === 0 ? 6 : 5, height: i === 0 ? 6 : 5, background: i === 0 ? 'white' : 'rgba(255,255,255,0.52)', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', flexShrink: 0, display: 'block' }} />
              ))}
            </div>
          )}

          {/* Save / heart button */}
          {onToggleSave && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); e.preventDefault(); onToggleSave(listing.id) }}
              aria-label={isSaved ? 'Unsave listing' : 'Save listing'}
              aria-pressed={isSaved}
              className="absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-full transition-all duration-200"
              style={{
                background: isSaved ? 'var(--m-gold)' : 'rgba(0,0,0,0.15)',
                color: '#fff',
                filter: isSaved ? 'none' : 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))',
              }}
            >
              <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
                <path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 0 0-7.1 7.1l8.8 8.9 8.8-8.9a5 5 0 0 0 0-7.1Z" />
              </svg>
            </button>
          )}
        </div>
      </Link>

      {/* ── Info below photo ── */}
      <Link href={`/item/${listing.id}`} className="block pt-3">
        {/* Title */}
        <p
          className="min-h-[2.6em] line-clamp-2 text-[14px] font-medium leading-snug"
          style={{ color: 'var(--m-ink)' }}
        >
          {listing.title}
        </p>

        {/* Price */}
        <p className="font-display mt-1 text-[18px] font-black tabular-nums" style={{ color: 'var(--m-ink)' }}>
          {priceLabel}
        </p>

        {/* Zone · recency */}
        <div className="mt-1 flex items-center gap-1 text-[11px]" style={{ color: 'var(--m-muted)' }}>
          <span className="truncate">{PICKUP_ZONE_LABELS[listing.pickupZone]}</span>
          <span>·</span>
          <span className="shrink-0">{formatRecency(listing.createdAt)}</span>
        </div>
      </Link>

      {/* Stats row: saves · views · seller avatar (kept outside the item Link so the avatar can link to the seller page) */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {listing.favoriteCount > 0 && (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--m-muted)' }}>
              <svg viewBox="0 0 24 24" className="h-[11px] w-[11px]" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 0 0-7.1 7.1l8.8 8.9 8.8-8.9a5 5 0 0 0 0-7.1Z" />
              </svg>
              {listing.favoriteCount}
            </span>
          )}
          {(listing.viewCount ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--m-muted)' }}>
              <svg viewBox="0 0 24 24" className="h-[11px] w-[11px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              {listing.viewCount}
            </span>
          )}
          {/* Condition chip */}
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: 'var(--m-soft)', color: 'var(--m-muted)' }}
          >
            {CONDITION_LABELS[listing.condition]}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Verified/trusted badge — surfaced here, not just on the seller's own page */}
          {showTrustBadge && trustBadge && (
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeToneByTrust[trustBadge]}`}>
              {trustBadgeLabel(trustBadge)}
            </span>
          )}

          {/* Seller avatar — links to the seller page (was hover-only tooltip, dead on touch) */}
          {initials && (
            <Link
              href={`/seller/${listing.sellerId}`}
              onMouseEnter={() => setSellerHovered(true)}
              onMouseLeave={() => setSellerHovered(false)}
              className="relative flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
              style={{ background: 'var(--m-ink)' }}
              title={listing.sellerProfile?.displayName}
            >
              {initials}
              {/* Tooltip */}
              {sellerHovered && listing.sellerProfile?.displayName && (
                <div
                  className="pointer-events-none absolute bottom-full right-0 mb-1.5 whitespace-nowrap rounded-lg px-2 py-1 text-[11px] font-medium text-white"
                  style={{ background: 'rgba(0,0,0,0.8)' }}
                >
                  {listing.sellerProfile.displayName}
                </div>
              )}
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
