import { NextRequest, NextResponse } from 'next/server'
import { dataAccess } from '@/lib/data'
import { getSessionFromRequest } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request)
  const { searchParams } = new URL(request.url)
  const listingId = searchParams.get('listingId')
  const userId = searchParams.get('userId')
  const peerId = searchParams.get('peerId')

  if (listingId && userId && peerId) {
    if (!session || session.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const thread = dataAccess.messages.listThread(listingId, userId, peerId)
    return NextResponse.json(thread)
  }

  if (listingId) {
    if (!userId) {
      return NextResponse.json({ error: 'userId required for listing messages' }, { status: 400 })
    }
    if (!session || session.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const messages = dataAccess.messages.listByListing(listingId, userId)
    return NextResponse.json(messages)
  }

  if (userId) {
    if (!session || session.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const inbox = dataAccess.conversations.listByUser(userId)
    return NextResponse.json(inbox)
  }

  return NextResponse.json({ error: 'Pass listingId or userId' }, { status: 400 })
}

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }

    const body = await request.json()
    const { listingId, toUserId, body: messageBody } = body

    if (!listingId || !toUserId || !messageBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const listing = dataAccess.listings.findById(String(listingId))
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    const message = dataAccess.messages.create({
      listingId: String(listingId),
      fromUserId: String(session.userId),
      toUserId: String(toUserId),
      body: String(messageBody),
    })

    return NextResponse.json(message)
  } catch {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
