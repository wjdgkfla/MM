import { Listing } from '@/lib/types'
import { formatRecency } from '@/lib/time'
import { listingTrustCues } from '@/lib/trust'

type TrustCuesProps = {
  listing: Listing
  compact?: boolean
}

export function TrustCues({ listing, compact = false }: TrustCuesProps) {
  const cues = listingTrustCues(listing)

  const items = [
    cues.gmuVerified ? 'GMU verified' : 'GMU verification pending',
    cues.studentSeller ? 'Student seller' : 'Community seller',
    cues.campusSeller,
    cues.meetup,
    listing.sellerProfile.lastActiveAt ? `Recently active ${formatRecency(listing.sellerProfile.lastActiveAt)}` : 'Activity unknown',
  ]

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? 'text-[11px]' : 'text-xs'}`}>
      {items.map((item) => (
        <span key={item} className="rounded-full bg-[var(--m-soft)] px-2.5 py-1 text-[var(--m-muted)]">
          {item}
        </span>
      ))}
    </div>
  )
}
