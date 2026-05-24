import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import {
  ratingsFindBySellerId,
  ratingsCreate,
  ratingsFindByBuyerAndListing,
  listingsFindById,
  usersFindById,
  messagesExistsByUserAndListing,
  usersAdjustReputationScore,
} from '@/lib/data/supabaseDataAccess'
import { RATING_TAGS, RatingTag, RatingScore } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sellerId = searchParams.get('sellerId')
    if (!sellerId) return NextResponse.json({ error: 'sellerId required' }, { status: 400 })
    const ratings = await ratingsFindBySellerId(sellerId)
    return NextResponse.json(ratings)
  } catch (err) {
    console.error('GET /api/ratings error:', err)
    return NextResponse.json({ error: 'Failed to load ratings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const buyer = await usersFindById(session.userId)
    if (buyer?.accountState === 'suspended') {
      return NextResponse.json({ error: 'Your account is suspended' }, { status: 403 })
    }

    const body = await request.json()
    const { sellerId, listingId, score, tags } = body

    if (!sellerId || !listingId || (score !== 1 && score !== -1)) {
      return NextResponse.json(
        { error: 'Missing required fields (sellerId, listingId, score)' },
        { status: 400 }
      )
    }

    if (sellerId === session.userId) {
      return NextResponse.json({ error: 'You cannot rate yourself' }, { status: 400 })
    }

    const listing = await listingsFindById(String(listingId))
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    if (listing.sellerId !== String(sellerId)) {
      return NextResponse.json({ error: 'Seller does not match listing' }, { status: 400 })
    }

    const hasMessaged = await messagesExistsByUserAndListing(session.userId, String(listingId))
    if (!hasMessaged) {
      return NextResponse.json(
        { error: 'You can only rate sellers you have messaged about this listing' },
        { status: 403 }
      )
    }

    const existing = await ratingsFindByBuyerAndListing(session.userId, String(listingId))
    if (existing) {
      return NextResponse.json(
        { error: 'You have already rated this seller for this listing' },
        { status: 409 }
      )
    }

    const validTags = Array.isArray(tags)
      ? (tags as string[])
          .filter((t): t is RatingTag => RATING_TAGS.includes(t as RatingTag))
          .slice(0, 5)
      : []

    const rating = await ratingsCreate({
      sellerId: String(sellerId),
      buyerId: session.userId,
      listingId: String(listingId),
      score: score as RatingScore,
      tags: validTags,
    })

    // Update seller's manner temperature: delta = price/10 * score (1 decimal place)
    const delta = Math.round((listing.price / 10) * (score as number) * 10) / 10
    await usersAdjustReputationScore(String(sellerId), delta).catch(() => {})

    return NextResponse.json(rating)
  } catch (err) {
    console.error('POST /api/ratings error:', err)
    return NextResponse.json({ error: 'Failed to submit rating' }, { status: 500 })
  }
}
