import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ListingCard } from '@/components/ListingCard'
import { SellerTrustCard } from '@/components/SellerTrustCard'
import { SellerRating } from '@/components/SellerRating'
import { formatPostedDate, formatRecency } from '@/lib/time'
import { usersFindById, listingsFindBySellerId } from '@/lib/data/supabaseDataAccess'

export default async function SellerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const seller = await usersFindById(id)

  if (!seller) {
    notFound()
  }

  const allSellerListings = await listingsFindBySellerId(seller.id)
  const activeListings = allSellerListings.filter(
    (listing) => listing.moderationState !== 'hidden' && listing.status !== 'sold'
  )
  const soldCount = allSellerListings.filter((listing) => listing.status === 'sold').length

  return (
    <div className="max-w-wide mx-auto px-6 py-8">
      <Link href="/" className="text-sm hover:underline" style={{ color: 'var(--m-muted)' }}>
        Back to Mason Market
      </Link>

      <div className="mt-4 ui-surface p-5 sm:p-6">
        <h1 className="font-display text-display-md font-black" style={{ color: 'var(--m-ink)' }}>{seller.displayName}</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--m-muted)' }}>
          Trust details for {seller.displayName}. GMU verification and activity cues help buyers decide quickly.
        </p>
        {seller.bio ? (
          <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: 'var(--m-ink)' }}>{seller.bio}</p>
        ) : null}

        <div className="mt-5">
          <SellerTrustCard seller={seller} sellerListingCount={activeListings.length} />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl p-3" style={{ background: 'var(--m-soft)' }}>
            <p className="text-xs" style={{ color: 'var(--m-muted)' }}>Joined</p>
            <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--m-ink)' }}>{formatPostedDate(seller.joinedAt)}</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: 'var(--m-soft)' }}>
            <p className="text-xs" style={{ color: 'var(--m-muted)' }}>Recently active</p>
            <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--m-ink)' }}>{formatRecency(seller.lastActiveAt)}</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: 'var(--m-soft)' }}>
            <p className="text-xs" style={{ color: 'var(--m-muted)' }}>Completed listings</p>
            <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--m-ink)' }}>{soldCount} sold</p>
          </div>
        </div>

        <div className="mt-5 border-t pt-5" style={{ borderColor: 'var(--m-line)' }}>
          <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--m-ink)' }}>Manner temperature</h2>
          <SellerRating sellerId={seller.id} />
        </div>
      </div>

      <section className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--m-ink)' }}>Active listings</h2>
          <p className="text-sm" style={{ color: 'var(--m-muted)' }}>{activeListings.length} active</p>
        </div>

        {activeListings.length === 0 ? (
          <div className="ui-surface mt-4 p-8 text-center">
            <p style={{ color: 'var(--m-muted)' }}>No active listings right now.</p>
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
