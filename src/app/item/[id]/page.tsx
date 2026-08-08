import type { Metadata } from 'next'
import { listingsFindById } from '@/lib/data/supabaseDataAccess'
import { LOCATION_LABELS } from '@/lib/types'
import ItemPageClient from './ItemPageClient'

const FALLBACK_IMAGE = '/listings/moving-boxes.svg'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const listing = await listingsFindById(id)

  if (!listing || listing.moderationState === 'hidden') {
    return { title: 'Listing not found | Mason Market' }
  }

  const campus = LOCATION_LABELS[listing.campusLocation] ?? 'GMU'
  const title = `${listing.title} — $${listing.price} | Mason Market`
  const description = `${campus} · ${listing.condition} condition · Mason Market, the trusted GMU student marketplace.`
  const image = listing.coverImageUrl || listing.imageUrls[0] || FALLBACK_IMAGE

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: [{ url: image }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

export default function ItemPage() {
  return <ItemPageClient />
}
