import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import {
  ratingsFindByRevieweeId,
  ratingsCreate,
  ratingsFindByReviewerAndTransaction,
  transactionsFindById,
  usersFindById,
  usersRecomputeReputationScore,
} from '@/lib/data/supabaseDataAccess'
import { RATING_TAGS, RatingTag, RatingScore } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    // Query param kept as `sellerId` for client compatibility — it now means
    // "reviews received by this user" regardless of whether they were the
    // buyer or seller in the underlying transaction (two-way reviews).
    const sellerId = searchParams.get('sellerId')
    if (!sellerId) return NextResponse.json({ error: 'sellerId required' }, { status: 400 })
    const ratings = await ratingsFindByRevieweeId(sellerId)
    return NextResponse.json(ratings)
  } catch (err) {
    console.error('GET /api/ratings error:', err)
    return NextResponse.json({ error: 'Failed to load ratings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const reviewer = await usersFindById(session.userId)
    if (reviewer?.accountState === 'suspended') {
      return NextResponse.json({ error: 'Your account is suspended' }, { status: 403 })
    }

    const body = await request.json()
    const { transactionId, score, tags } = body

    if (!transactionId || (score !== 1 && score !== -1)) {
      return NextResponse.json(
        { error: 'Missing required fields (transactionId, score)' },
        { status: 400 }
      )
    }

    // Review eligibility (P0-4): the transaction must be completed, the
    // reviewer must be one of its two participants, and they haven't already
    // reviewed this transaction. Replaces the old "buyer messaged the seller"
    // check, which didn't require an actual purchase.
    const transaction = await transactionsFindById(String(transactionId))
    if (!transaction) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

    if (transaction.status !== 'completed') {
      return NextResponse.json(
        { error: 'You can only review a transaction after it is completed' },
        { status: 403 }
      )
    }

    const reviewerId = session.userId
    if (reviewerId !== transaction.buyerId && reviewerId !== transaction.sellerId) {
      return NextResponse.json(
        { error: 'You were not a participant in this transaction' },
        { status: 403 }
      )
    }
    const revieweeId = reviewerId === transaction.buyerId ? transaction.sellerId : transaction.buyerId

    const existing = await ratingsFindByReviewerAndTransaction(reviewerId, transaction.id)
    if (existing) {
      return NextResponse.json(
        { error: 'You have already reviewed this transaction' },
        { status: 409 }
      )
    }

    const validTags = Array.isArray(tags)
      ? (tags as string[])
          .filter((t): t is RatingTag => RATING_TAGS.includes(t as RatingTag))
          .slice(0, 5)
      : []

    const rating = await ratingsCreate({
      sellerId: transaction.sellerId,
      buyerId: transaction.buyerId,
      listingId: transaction.listingId,
      transactionId: transaction.id,
      reviewerId,
      revieweeId,
      score: score as RatingScore,
      tags: validTags,
    })

    await usersRecomputeReputationScore(revieweeId).catch(() => {})

    return NextResponse.json(rating)
  } catch (err) {
    console.error('POST /api/ratings error:', err)
    return NextResponse.json({ error: 'Failed to submit rating' }, { status: 500 })
  }
}
