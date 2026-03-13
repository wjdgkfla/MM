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
      <section className="rounded-2xl border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-500">Seller profile is unavailable.</p>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-gray-900">{seller.displayName}</p>
          <p className="text-sm text-gray-500">
            {seller.gmuEmailVerified ? 'GMU email verified' : 'GMU email pending'} • {LOCATION_LABELS[seller.homeCampus]}
          </p>
          <p className="mt-1 text-xs text-gray-500">Joined {formatPostedDate(seller.joinedAt)}</p>
          <p className="mt-1 text-xs text-gray-500">Recently active {formatRecency(seller.lastActiveAt)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeToneByTrust[seller.trustBadge]}`}>
          {trustBadgeLabel(seller.trustBadge)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div className="rounded-xl bg-gray-50 p-3 text-center">
          <p className="font-semibold text-gray-900">{seller.reputationScore.toFixed(1)}</p>
          <p className="text-xs text-gray-500">Reputation</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-3 text-center">
          <p className="font-semibold text-gray-900">{seller.gmuEmailVerified ? 'Yes' : 'No'}</p>
          <p className="text-xs text-gray-500">Campus Verified</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-3 text-center">
          <p className="font-semibold text-gray-900">{seller.listingCount || sellerListingCount}</p>
          <p className="text-xs text-gray-500">Active Listings</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-3 text-center">
          <p className="font-semibold text-gray-900">{seller.isStudentSeller ? 'Student' : 'Community'}</p>
          <p className="text-xs text-gray-500">Seller Type</p>
        </div>
      </div>
    </section>
  )
}
