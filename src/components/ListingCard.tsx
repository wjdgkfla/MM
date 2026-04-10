'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Listing } from '@/lib/types'
import { CATEGORY_LABELS, LOCATION_LABELS, PICKUP_ZONE_LABELS } from '@/lib/types'
import { StatusBadge } from '@/components/StatusBadge'
import { formatRecency } from '@/lib/time'
import { TrustCues } from '@/components/TrustCues'

interface ListingCardProps {
  listing: Listing
  isSaved?: boolean
  onToggleSave?: (listingId: string) => void
}

const FALLBACK_IMAGE = '/listings/moving-boxes.svg'

export function ListingCard({ listing, isSaved = false, onToggleSave }: ListingCardProps) {
  const priceLabel = listing.price === 0 ? 'Free' : `$${listing.price}`
  const coverImage = listing.imageUrls[0] || FALLBACK_IMAGE
  const recencyLabel = formatRecency(listing.createdAt)

  return (
    <article className="overflow-hidden rounded-[20px] border border-[var(--air-border)] bg-white shadow-[var(--air-shadow)] transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {onToggleSave && (
          <button
            type="button"
            onClick={() => onToggleSave(listing.id)}
            aria-label={isSaved ? 'Unsave listing' : 'Save listing'}
            className={`absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/70 shadow-sm transition-colors ${
              isSaved ? 'bg-[var(--mason-green)] text-white' : 'bg-white/95 text-[var(--air-text)] hover:bg-white'
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path
                fill={isSaved ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.8"
                d="M12.1 20.3c-.1 0-.2 0-.3-.1C7 17.4 4 14.8 4 11.5 4 8.8 6 7 8.5 7c1.5 0 2.8.7 3.6 1.8C13 7.7 14.3 7 15.8 7 18.3 7 20.3 8.8 20.3 11.5c0 3.3-3 5.9-7.8 8.7-.2.1-.3.1-.4.1z"
              />
            </svg>
          </button>
        )}

        <Image
          src={coverImage}
          alt={listing.title}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          unoptimized={coverImage.startsWith('data:')}
        />
      </div>

      <Link href={`/item/${listing.id}`} className="block p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="min-h-[2.6rem] line-clamp-2 text-[15px] font-semibold leading-snug tracking-[-0.01em] text-[var(--air-text)]">
            {listing.title}
          </p>
          <StatusBadge status={listing.status} />
        </div>

        <p className="mt-2 text-2xl font-bold tracking-[-0.02em] text-[var(--mason-green)]">{priceLabel}</p>

        <p className="mt-1 text-xs text-[var(--air-muted)]">
          {LOCATION_LABELS[listing.campusLocation]} - {PICKUP_ZONE_LABELS[listing.pickupZone]}
        </p>
        <p className="mt-1 line-clamp-1 text-xs text-gray-500">Meetup zone set for safer handoff.</p>

        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-[var(--air-muted)]">
          <span className="rounded-full bg-[var(--air-chip)] px-2 py-1">{CATEGORY_LABELS[listing.category]}</span>
          <span>{recencyLabel}</span>
        </div>

        <div className="mt-2">
          <TrustCues listing={listing} compact />
        </div>
      </Link>
    </article>
  )
}
