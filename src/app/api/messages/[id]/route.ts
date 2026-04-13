import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import { messagesUpdateOfferStatus, usersFindById } from '@/lib/data/firestoreDataAccess'

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

    const updated = await messagesUpdateOfferStatus(params.id, offerStatus)
    if (!updated) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('PATCH /api/messages/[id] error:', err)
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 })
  }
}
