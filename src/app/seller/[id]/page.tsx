import Link from 'next/link'
import { notFound } from 'next/navigation'
import { dataAccess } from '@/lib/data'
import { ListingCard } from '@/components/ListingCard'
import { SellerTrustCard } from '@/components/SellerTrustCard'
import { formatPostedDate, formatRecency } from '@/lib/time'

export default function SellerProfilePage({ params }: { params: { id: string } }) {
  const seller = dataAccess.users.findById(params.id)

  if (!seller) {
    notFound()
  }

  const allSellerListings = dataAccess.listings.findBySellerId(seller.id)
  const activeListings = allSellerListings.filter(
    (listing) => listing.moderationState !== 'hidden' && listing.status !== 'sold'
  )
  const soldCount = allSellerListings.filter((listing) => listing.status === 'sold').length

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href="/" className="text-sm text-gray-500 hover:text-[#006633]">
        Back to Mason Market
      </Link>

      <div className="mt-4 ui-surface p-5 sm:p-6">
        <h1 className="text-2xl font-bold text-[#006633]">Seller profile</h1>
        <p className="mt-1 text-sm text-gray-600">
          Trust details for {seller.displayName}. GMU verification and activity cues help buyers decide quickly.
        </p>

        <div className="mt-5">
          <SellerTrustCard seller={seller} sellerListingCount={activeListings.length} />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Joined</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{formatPostedDate(seller.joinedAt)}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Recently active</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{formatRecency(seller.lastActiveAt)}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Transactions (placeholder)</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{soldCount} completed listings</p>
          </div>
        </div>
      </div>

      <section className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Active listings</h2>
          <p className="text-sm text-gray-600">{activeListings.length} active</p>
        </div>

        {activeListings.length === 0 ? (
          <div className="ui-surface mt-4 p-8 text-center">
            <p className="text-gray-600">No active listings right now.</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
