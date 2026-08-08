import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import { PICKUP_ZONES } from '@/lib/types'
import {
  transactionsCancelMeetup,
  transactionsConfirmCompletion,
  transactionsConfirmMeetup,
  transactionsFindById,
  transactionsProposeMeetup,
} from '@/lib/data/supabaseDataAccess'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getSessionFromRequest(request)
    if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const transaction = await transactionsFindById(id)
    if (!transaction) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    if (transaction.buyerId !== session.userId && transaction.sellerId !== session.userId) {
      return NextResponse.json({ error: 'Not a participant in this transaction' }, { status: 403 })
    }
    return NextResponse.json(transaction)
  } catch (err) {
    console.error('GET /api/transactions/[id] error:', err)
    return NextResponse.json({ error: 'Failed to load transaction' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getSessionFromRequest(request)
    if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const transaction = await transactionsFindById(id)
    if (!transaction) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    if (transaction.buyerId !== session.userId && transaction.sellerId !== session.userId) {
      return NextResponse.json({ error: 'Not a participant in this transaction' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body

    if (action === 'propose-meetup') {
      const { meetupZone, meetupTime } = body
      if (!PICKUP_ZONES.includes(meetupZone)) {
        return NextResponse.json({ error: 'Invalid meetupZone' }, { status: 400 })
      }
      if (typeof meetupTime !== 'string' || Number.isNaN(Date.parse(meetupTime))) {
        return NextResponse.json({ error: 'Invalid meetupTime' }, { status: 400 })
      }
      if (transaction.status === 'completed' || transaction.status === 'cancelled') {
        return NextResponse.json({ error: 'This transaction is no longer active' }, { status: 409 })
      }
      const updated = await transactionsProposeMeetup(id, meetupZone, meetupTime)
      if (!updated) return NextResponse.json({ error: 'Could not propose meetup' }, { status: 500 })
      return NextResponse.json(updated)
    }

    if (action === 'confirm-meetup') {
      if (!transaction.meetupZone || !transaction.meetupTime) {
        return NextResponse.json({ error: 'No meetup has been proposed yet' }, { status: 409 })
      }
      const updated = await transactionsConfirmMeetup(id)
      if (!updated) return NextResponse.json({ error: 'Could not confirm meetup' }, { status: 500 })
      return NextResponse.json(updated)
    }

    if (action === 'cancel-meetup') {
      const updated = await transactionsCancelMeetup(id)
      if (!updated) return NextResponse.json({ error: 'Could not cancel meetup' }, { status: 500 })
      return NextResponse.json(updated)
    }

    if (action === 'confirm-completion') {
      try {
        const updated = await transactionsConfirmCompletion(id, session.userId)
        return NextResponse.json(updated)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not confirm completion'
        return NextResponse.json({ error: message }, { status: 409 })
      }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('PATCH /api/transactions/[id] error:', err)
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
  }
}
