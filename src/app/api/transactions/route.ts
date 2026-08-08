import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import { isValidEntityId } from '@/lib/validators'
import { transactionsFindActiveForListingAndUsers } from '@/lib/data/supabaseDataAccess'

// Lets the messages thread find "the" transaction for a listing/peer pair so
// it can attach meetup-scheduling and completion-confirmation actions.
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const listingId = searchParams.get('listingId')
    const peerId = searchParams.get('peerId')
    if (!listingId || !peerId || !isValidEntityId(listingId) || !isValidEntityId(peerId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    const transaction = await transactionsFindActiveForListingAndUsers(listingId, session.userId, peerId)
    if (!transaction) return NextResponse.json(null)

    // Only the buyer/seller on the transaction may see it.
    if (transaction.buyerId !== session.userId && transaction.sellerId !== session.userId) {
      return NextResponse.json(null)
    }

    return NextResponse.json(transaction)
  } catch (err) {
    console.error('GET /api/transactions error:', err)
    return NextResponse.json({ error: 'Failed to load transaction' }, { status: 500 })
  }
}
