import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import { isValidEntityId } from '@/lib/validators'
import {
  listingsFindById,
  messagesListThread,
  messagesCreate,
  usersFindById,
} from '@/lib/data/supabaseDataAccess'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }

    const listing = await listingsFindById(id)
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const buyerId = String(searchParams.get('buyerId') || '').trim()

    if (!buyerId) {
      return NextResponse.json({ error: 'buyerId is required' }, { status: 400 })
    }
    // buyerId is interpolated into a PostgREST .or() filter — reject filter syntax
    if (!isValidEntityId(buyerId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    // Verify requester is a participant in this conversation
    const isSeller = session.userId === listing.sellerId
    const isBuyer = session.userId === buyerId

    if (!isSeller && !isBuyer) {
      return NextResponse.json({ error: 'You are not a participant in this conversation' }, { status: 403 })
    }

    const buyer = await usersFindById(buyerId)
    if (!buyer || buyer.accountState === 'suspended') {
      return NextResponse.json({ error: 'Conversation participant is not active' }, { status: 404 })
    }

    const messages = await messagesListThread(id, listing.sellerId, buyerId)
    if (messages.length === 0 && isSeller) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    return NextResponse.json(messages)
  } catch (err) {
    console.error('GET /api/listings/[id]/messages error:', err)
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }

    // Suspended users cannot send messages
    const sessionUser = await usersFindById(session.userId)
    if (sessionUser?.accountState === 'suspended') {
      return NextResponse.json({ error: 'Your account is suspended' }, { status: 403 })
    }

    const listing = await listingsFindById(id)
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    const body = await request.json()
    const content = String(body.content || '').trim()

    if (!content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (content.length > 2000) {
      return NextResponse.json({ error: 'Message cannot exceed 2000 characters' }, { status: 400 })
    }

    const senderRole = session.userId === listing.sellerId ? 'seller' : 'buyer'
    const providedBuyerId = String(body.buyerId || '').trim()
    const buyerId = senderRole === 'buyer' ? session.userId : providedBuyerId

    if (!buyerId || buyerId === listing.sellerId || !isValidEntityId(buyerId)) {
      return NextResponse.json({ error: 'Valid buyer identity is required' }, { status: 400 })
    }

    const buyer = await usersFindById(buyerId)
    if (!buyer || buyer.accountState === 'suspended') {
      return NextResponse.json({ error: 'Buyer account is not currently active' }, { status: 403 })
    }

    if (senderRole === 'seller') {
      const existingThread = await messagesListThread(id, listing.sellerId, buyerId)
      if (existingThread.length === 0) {
        return NextResponse.json({ error: 'Seller replies require an existing buyer conversation' }, { status: 403 })
      }
    }

    const message = await messagesCreate({
      listingId: id,
      fromUserId: session.userId,
      toUserId: senderRole === 'buyer' ? listing.sellerId : buyerId,
      body: content,
    })

    return NextResponse.json(message)
  } catch (err) {
    console.error('POST /api/listings/[id]/messages error:', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
