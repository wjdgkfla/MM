'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Listing } from '@/lib/types'
import { PICKUP_ZONE_LABELS, LOCATION_LABELS } from '@/lib/types'
import { formatRecency } from '@/lib/time'

interface ListingCardProps {
  listing: Listing
  isSaved?: boolean
  onToggleSave?: (listingId: string) => void
}

const FALLBACK_IMAGE = '/listings/moving-boxes.svg'

export function ListingCard({ listing, isSaved = false, onToggleSave }: ListingCardProps) {
  const priceLabel = listing.price === 0 ? 'Free' : `$${listing.price}`
  const coverImage = listing.imageUrls[0] || FALLBACK_IMAGE

  return (
    <article className="cursor-pointer group">
      {/* Square photo */}
      <Link href={`/item/${listing.id}`} className="block">
        <div
          className="relative aspect-square overflow-hidden bg-[var(--m-soft)]"
          style={{ borderRadius: 'var(--r-card)' }}
        >
          <Image
          src={coverImage}
          alt={listing.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          unoptimized={coverImage.startsWith('data:')}
        />

        {/* Heart button */}
        {onToggleSave && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleSave(listing.id) }}
            aria-label={isSaved ? 'Unsave listing' : 'Save listing'}
            className="absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-full transition-colors"
            style={{
              background: isSaved ? 'var(--m-pop)' : 'rgba(0,0,0,0.15)',
              color: '#fff',
            }}
          >
            <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
              <path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 0 0-7.1 7.1l8.8 8.9 8.8-8.9a5 5 0 0 0 0-7.1Z" />
            </svg>
          </button>
        )}

        {/* Reserved scrim */}
        {listing.status === 'reserved' && (
          <div className="absolute inset-0 grid place-items-center bg-black/45">
            <span className="rounded-full border border-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
              Reserved
            </span>
          </div>
        )}

        {/* Free tag */}
        {listing.price === 0 && listing.status !== 'reserved' && (
          <div
            className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
            style={{ background: 'var(--m-green)' }}
          >
            Free
          </div>
        )}
        </div>
      </Link>

      {/* Info below photo */}
      <Link href={`/item/${listing.id}`} className="block pt-3">
        <p className="min-h-[2.6em] line-clamp-2 text-[13px] leading-snug" style={{ color: 'var(--m-ink)' }}>
          {listing.title}
        </p>
        <p className="mt-1 text-[15px] font-bold tabular-nums" style={{ color: 'var(--m-ink)' }}>
          {priceLabel}
        </p>
        <div className="mt-1 flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--m-muted)' }}>
          <span className="truncate">
            {LOCATION_LABELS[listing.campusLocation]} · {PICKUP_ZONE_LABELS[listing.pickupZone]}
          </span>
          <span>·</span>
          <span className="shrink-0">{formatRecency(listing.createdAt)}</span>
        </div>
        {(listing.favoriteCount > 0 || (listing.viewCount ?? 0) > 0) && (
          <div className="mt-1.5 flex items-center gap-2.5 text-[11px]" style={{ color: 'var(--m-muted)' }}>
            {listing.favoriteCount > 0 && (
              <span className="flex items-center gap-0.5">
                <svg viewBox="0 0 24 24" className="h-[11px] w-[11px]" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 0 0-7.1 7.1l8.8 8.9 8.8-8.9a5 5 0 0 0 0-7.1Z" />
                </svg>
                {listing.favoriteCount}
              </span>
            )}
            {(listing.viewCount ?? 0) > 0 && (
              <span>{listing.viewCount} views</span>
            )}
          </div>
        )}
      </Link>
    </article>
  )
}
