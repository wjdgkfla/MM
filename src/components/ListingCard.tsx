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
    <article className="ui-surface overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {onToggleSave && (
          <button
            type="button"
            onClick={() => onToggleSave(listing.id)}
            aria-label={isSaved ? 'Unsave listing' : 'Save listing'}
            className={`absolute right-3 top-3 z-10 rounded-full px-2.5 py-1.5 text-sm shadow-sm ring-1 ring-black/5 ${
              isSaved ? 'bg-[#006633] text-white' : 'bg-white/95 text-gray-800 hover:bg-white'
            }`}
          >
            {isSaved ? '♥' : '♡'}
          </button>
        )}

        <Image
          src={coverImage}
          alt={listing.title}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
      </div>

      <Link href={`/item/${listing.id}`} className="block p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="font-semibold text-gray-900 leading-snug line-clamp-2 min-h-[2.6rem]">{listing.title}</p>
          <StatusBadge status={listing.status} />
        </div>

        <p className="text-[#006633] font-bold text-xl mt-2">{priceLabel}</p>

        <p className="mt-1 text-xs text-gray-600">
          {LOCATION_LABELS[listing.campusLocation]} • {PICKUP_ZONE_LABELS[listing.pickupZone]}
        </p>
        <p className="mt-1 text-xs text-gray-500 line-clamp-1">Meetup zone clearly set for safer handoff.</p>

        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-gray-600">
          <span className="bg-gray-100 px-2 py-1 rounded-full">{CATEGORY_LABELS[listing.category]}</span>
          <span>{recencyLabel}</span>
        </div>

        <div className="mt-2">
          <TrustCues listing={listing} compact />
        </div>
      </Link>
    </article>
  )
}
