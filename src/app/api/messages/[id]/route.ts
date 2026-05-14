import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import {
  messagesUpdateOfferStatus,
  usersFindById,
} from '@/lib/data/supabaseDataAccess'
import { getSupabaseAdmin } from '@/lib/supabase/server'

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

    // Fetch the message to verify the requester is the intended recipient (toUserId)
    const { data: msgData, error: msgError } = await getSupabaseAdmin()
      .from('messages')
      .select('*')
      .eq('id', params.id)
      .single()

    if (msgError || !msgData) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const msg = msgData as Record<string, unknown>

    if (msg.to_user_id !== session.userId) {
      return NextResponse.json({ error: 'Only the offer recipient can accept or decline' }, { status: 403 })
    }

    if (msg.type !== 'offer') {
      return NextResponse.json({ error: 'This message is not an offer' }, { status: 400 })
    }

    if (msg.offer_status === 'accepted' || msg.offer_status === 'declined') {
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
