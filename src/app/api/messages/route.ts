import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import {
  listingsFindById,
  messagesListByListing,
  messagesListThread,
  messagesCreate,
  conversationsListByUser,
  usersFindById,
} from '@/lib/data/supabaseDataAccess'

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)
    const { searchParams } = new URL(request.url)
    const listingId = searchParams.get('listingId')
    const userId = searchParams.get('userId')
    const peerId = searchParams.get('peerId')

    if (listingId && userId && peerId) {
      if (!session || session.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const thread = await messagesListThread(listingId, userId, peerId)
      return NextResponse.json(thread)
    }

    if (listingId) {
      if (!userId) {
        return NextResponse.json({ error: 'userId required for listing messages' }, { status: 400 })
      }
      if (!session || session.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const messages = await messagesListByListing(listingId, userId)
      return NextResponse.json(messages)
    }

    if (userId) {
      if (!session || session.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const inbox = await conversationsListByUser(userId)
      return NextResponse.json(inbox)
    }

    return NextResponse.json({ error: 'Pass listingId or userId' }, { status: 400 })
  } catch (err) {
    console.error('GET /api/messages error:', err)
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }

    const sessionUser = await usersFindById(session.userId)
    if (sessionUser?.accountState === 'suspended') {
      return NextResponse.json({ error: 'Your account is suspended' }, { status: 403 })
    }

    const body = await request.json()
    const { listingId, toUserId, body: messageBody, type, offerAmount } = body

    if (!listingId || !toUserId || !messageBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const isOffer = type === 'offer'
    if (isOffer) {
      if (typeof offerAmount !== 'number' || offerAmount <= 0) {
        return NextResponse.json({ error: 'offerAmount must be a positive number' }, { status: 400 })
      }
      if (offerAmount > 100_000) {
        return NextResponse.json({ error: 'offerAmount cannot exceed $100,000' }, { status: 400 })
      }
    }

    const listing = await listingsFindById(String(listingId))
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }
    if (listing.status === 'sold') {
      return NextResponse.json({ error: 'This listing is sold and no longer accepts new messages' }, { status: 409 })
    }

    const senderIsSeller = session.userId === listing.sellerId

    if (senderIsSeller) {
      // Seller replying to a buyer — recipient must not be themselves
      if (String(toUserId) === session.userId) {
        return NextResponse.json({ error: 'You cannot send messages to yourself' }, { status: 400 })
      }
    } else {
      // Buyer sending — recipient must be the listing seller
      if (String(toUserId) !== listing.sellerId) {
        return NextResponse.json({ error: 'Messages can only be sent to the listing seller' }, { status: 400 })
      }
    }

    // Validate message body length
    const trimmedBody = String(messageBody).trim()
    if (trimmedBody.length === 0) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
    }
    if (trimmedBody.length > 2000) {
      return NextResponse.json({ error: 'Message cannot exceed 2000 characters' }, { status: 400 })
    }

    // Verify the recipient user exists and is not suspended
    const recipient = await usersFindById(String(toUserId))
    if (!recipient) {
      return NextResponse.json({ error: 'Recipient user not found' }, { status: 404 })
    }
    if (recipient.accountState === 'suspended') {
      return NextResponse.json({ error: 'This seller account is not currently active' }, { status: 403 })
    }

    const message = await messagesCreate({
      listingId: String(listingId),
      fromUserId: String(session.userId),
      toUserId: String(toUserId),
      body: String(messageBody),
      type: isOffer ? 'offer' : 'text',
      offerAmount: isOffer ? Number(offerAmount) : undefined,
      offerStatus: isOffer ? 'pending' : undefined,
    })

    return NextResponse.json(message)
  } catch (err) {
    console.error('POST /api/messages error:', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
