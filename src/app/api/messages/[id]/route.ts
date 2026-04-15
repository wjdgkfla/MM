import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import {
  messagesUpdateOfferStatus,
  usersFindById,
  listingsFindById,
} from '@/lib/data/firestoreDataAccess'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const user = await usersFindById(session.userId)
    if (user?.accountState === 'suspended') {
      return NextResponse.json({ error: 'Your account is suspended' }, { status: 403 })
    }

    const body = await request.json()
    const { offerStatus } = body

    if (offerStatus !== 'accepted' && offerStatus !== 'declined') {
      return NextResponse.json(
        { error: 'offerStatus must be accepted or declined' },
        { status: 400 }
      )
    }

    // Fetch the message first to verify the requester is the intended recipient (seller)
    const db = (await import('@/lib/firebase/admin')).getFirebaseAdminDb()
    if (!db) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

    const msgDoc = await db.collection('messages').doc(params.id).get()
    if (!msgDoc.exists) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

    const msgData = msgDoc.data()!

    // Only the recipient of the offer (toUserId) may accept or decline
    if (msgData.toUserId !== session.userId) {
      return NextResponse.json({ error: 'Only the offer recipient can accept or decline' }, { status: 403 })
    }

    // Only offer-type messages can be responded to
    if (msgData.type !== 'offer') {
      return NextResponse.json({ error: 'This message is not an offer' }, { status: 400 })
    }

    // Can't re-respond to a settled offer
    if (msgData.offerStatus === 'accepted' || msgData.offerStatus === 'declined') {
      return NextResponse.json({ error: 'This offer has already been responded to' }, { status: 409 })
    }

    const updated = await messagesUpdateOfferStatus(params.id, offerStatus)
    if (!updated) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('PATCH /api/messages/[id] error:', err)
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 })
  }
}
