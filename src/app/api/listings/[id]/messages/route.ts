import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import {
  listingsFindById,
  messagesListByListing,
  messagesListThread,
  messagesCreate,
} from '@/lib/data/firestoreDataAccess'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }

    const listing = await listingsFindById(params.id)
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const buyerId = String(searchParams.get('buyerId') || '').trim()
    const viewerUserId = String(searchParams.get('viewerUserId') || '').trim()

    if (!buyerId) {
      return NextResponse.json({ error: 'buyerId is required' }, { status: 400 })
    }

    const messages = viewerUserId
      ? await messagesListThread(params.id, listing.sellerId, buyerId)
      : await messagesListByListing(params.id, buyerId)
    return NextResponse.json(messages)
  } catch {
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }

    const listing = await listingsFindById(params.id)
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    const body = await request.json()
    const content = String(body.content || '').trim()

    if (!content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const senderRole = session.userId === listing.sellerId ? 'seller' : 'buyer'
    const providedBuyerId = String(body.buyerId || '').trim()
    const buyerId = senderRole === 'buyer' ? session.userId : providedBuyerId

    if (!buyerId || buyerId === listing.sellerId) {
      return NextResponse.json({ error: 'Valid buyer identity is required' }, { status: 400 })
    }

    const message = await messagesCreate({
      listingId: params.id,
      fromUserId: session.userId,
      toUserId: senderRole === 'buyer' ? listing.sellerId : buyerId,
      body: content,
    })

    return NextResponse.json(message)
  } catch {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
