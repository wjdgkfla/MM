import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import {
  messagesCounterOffer,
  messagesFindById,
  messagesUpdateOfferStatus,
  notificationsCreate,
  transactionsAcceptOffer,
  usersFindById,
} from '@/lib/data/supabaseDataAccess'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getSessionFromRequest(request)
    if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const user = await usersFindById(session.userId)
    if (user?.accountState === 'suspended') {
      return NextResponse.json({ error: 'Your account is suspended' }, { status: 403 })
    }

    const body = await request.json()
    const { offerStatus, counterAmount } = body

    const isCounter = counterAmount !== undefined
    if (!isCounter && offerStatus !== 'accepted' && offerStatus !== 'declined' && offerStatus !== 'withdrawn') {
      return NextResponse.json(
        { error: 'offerStatus must be accepted, declined, or withdrawn' },
        { status: 400 }
      )
    }
    if (isCounter && (typeof counterAmount !== 'number' || counterAmount <= 0 || counterAmount > 100_000)) {
      return NextResponse.json({ error: 'counterAmount must be a positive number up to $100,000' }, { status: 400 })
    }

    // Fetch the message to verify the requester is a party to this offer
    const { data: msgData, error: msgError } = await getSupabaseAdmin()
      .from('messages')
      .select('*')
      .eq('id', id)
      .single()

    if (msgError || !msgData) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const msg = msgData as Record<string, unknown>

    // Runtime type guards — guards against schema changes or corruption
    if (typeof msg.to_user_id !== 'string' || typeof msg.from_user_id !== 'string') {
      return NextResponse.json({ error: 'Invalid message data' }, { status: 500 })
    }
    if (msg.type !== 'offer') {
      return NextResponse.json({ error: 'This message is not an offer' }, { status: 400 })
    }
    if (msg.offer_status !== 'pending') {
      return NextResponse.json({ error: 'This offer has already been responded to' }, { status: 409 })
    }
    const isExpired = typeof msg.expires_at === 'string' && new Date(msg.expires_at) < new Date()

    // Withdrawal is the buyer acting on their own offer; accept/decline/counter
    // are the recipient acting on someone else's.
    if (offerStatus === 'withdrawn') {
      if (msg.from_user_id !== session.userId) {
        return NextResponse.json({ error: 'Only the offer sender can withdraw it' }, { status: 403 })
      }
      const updated = await messagesUpdateOfferStatus(id, 'withdrawn')
      if (!updated) return NextResponse.json({ error: 'Message not found' }, { status: 404 })
      return NextResponse.json(updated)
    }

    if (msg.to_user_id !== session.userId) {
      return NextResponse.json({ error: 'Only the offer recipient can respond to it' }, { status: 403 })
    }
    if (isExpired) {
      return NextResponse.json({ error: 'This offer has expired' }, { status: 409 })
    }

    if (isCounter) {
      try {
        const created = await messagesCounterOffer(id, session.userId, counterAmount, `Countered with $${counterAmount}.`)
        return NextResponse.json(created)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not send counteroffer'
        return NextResponse.json({ error: message }, { status: 409 })
      }
    }

    if (offerStatus === 'accepted') {
      // Atomic: marks the offer accepted, declines competing pending offers,
      // creates the transaction row, and reserves the listing for the buyer.
      // Replaces the old plain offer_status update, which never reserved the
      // listing for a specific buyer or recorded an agreed price anywhere.
      let transaction
      try {
        transaction = await transactionsAcceptOffer(id, session.userId)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not accept offer'
        return NextResponse.json({ error: message }, { status: 409 })
      }
      const updated = await messagesFindById(id)
      if (!updated) return NextResponse.json({ error: 'Message not found' }, { status: 404 })
      // transactionsAcceptOffer bypasses messagesUpdateOfferStatus (which normally
      // fires this), so the buyer notification has to happen here instead.
      await notificationsCreate({
        userId: updated.fromUserId,
        type: 'offer-update',
        title: 'Offer accepted',
        body: 'Your offer was accepted.',
        link: `/messages?listingId=${updated.listingId}`,
        meta: { messageId: id },
      }).catch((notifyError) => console.error('offer-accepted notification error:', notifyError))
      return NextResponse.json({ ...updated, transactionId: transaction.id })
    }

    const updated = await messagesUpdateOfferStatus(id, offerStatus)
    if (!updated) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('PATCH /api/messages/[id] error:', err)
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 })
  }
}
