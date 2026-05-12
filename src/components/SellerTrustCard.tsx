import { User } from '@/lib/types'
import { formatPostedDate, formatRecency } from '@/lib/time'
import { LOCATION_LABELS } from '@/lib/types'
import { badgeToneByTrust, trustBadgeLabel } from '@/lib/trust'

interface SellerTrustCardProps {
  seller: User | null
  sellerListingCount?: number
}

export function SellerTrustCard({ seller, sellerListingCount = 0 }: SellerTrustCardProps) {
  if (!seller) {
    return (
      <section className="rounded-2xl border border-[var(--m-line)] bg-white p-4">
        <p className="text-sm text-[var(--m-muted)]">Seller profile is unavailable.</p>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-[var(--m-line)] bg-white p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-[var(--m-ink)]">{seller.displayName}</p>
          <p className="text-sm text-[var(--m-muted)]">
            {seller.gmuEmailVerified ? 'GMU email verified' : 'GMU email pending'} • {LOCATION_LABELS[seller.homeCampus]}
          </p>
          <p className="mt-1 text-xs text-[var(--m-muted)]">Joined {formatPostedDate(seller.joinedAt)}</p>
          <p className="mt-1 text-xs text-[var(--m-muted)]">Recently active {formatRecency(seller.lastActiveAt)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeToneByTrust[seller.trustBadge]}`}>
          {trustBadgeLabel(seller.trustBadge)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div className="rounded-xl bg-[var(--m-soft)] p-3 text-center">
          <p className="font-semibold text-[var(--m-ink)]">{seller.reputationScore.toFixed(1)}</p>
          <p className="text-xs text-[var(--m-muted)]">Reputation</p>
        </div>
        <div className="rounded-xl bg-[var(--m-soft)] p-3 text-center">
          <p className="font-semibold text-[var(--m-ink)]">{seller.gmuEmailVerified ? 'Yes' : 'No'}</p>
          <p className="text-xs text-[var(--m-muted)]">Campus Verified</p>
        </div>
        <div className="rounded-xl bg-[var(--m-soft)] p-3 text-center">
          <p className="font-semibold text-[var(--m-ink)]">{seller.listingCount || sellerListingCount}</p>
          <p className="text-xs text-[var(--m-muted)]">Active Listings</p>
        </div>
        <div className="rounded-xl bg-[var(--m-soft)] p-3 text-center">
          <p className="font-semibold text-[var(--m-ink)]">{seller.isStudentSeller ? 'Student' : 'Community'}</p>
          <p className="text-xs text-[var(--m-muted)]">Seller Type</p>
        </div>
      </div>
    </section>
  )
}
