import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import { isValidEntityId } from '@/lib/validators'
import { MEETUP_STATUSES, PICKUP_ZONES } from '@/lib/types'
import {
  listingsFindById,
  messagesListByListing,
  messagesListThread,
  messagesCreate,
  conversationsListByUser,
  conversationsMarkRead,
  usersFindById,
} from '@/lib/data/supabaseDataAccess'
import { sendPushToUser } from '@/lib/pushNotification'

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)

    // All message reads require authentication
    if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const listingId = searchParams.get('listingId')
    const peerId = searchParams.get('peerId')

    // Reject ids that aren't plain UUIDs/nanoids — these values are interpolated
    // into PostgREST .or() filter strings and must never carry filter syntax.
    if ((listingId && !isValidEntityId(listingId)) || (peerId && !isValidEntityId(peerId))) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    // Always use session.userId — never trust userId from query params for authorization.
    // Passing userId param is still accepted for compatibility, but the session is the source of truth.
    if (listingId && peerId) {
      // Load a specific thread: session user ↔ peerId
      const thread = await messagesListThread(listingId, session.userId, peerId)
      return NextResponse.json(thread)
    }

    if (listingId) {
      const messages = await messagesListByListing(listingId, session.userId)
      return NextResponse.json(messages)
    }

    // No listingId — return full inbox for the session user
    const inbox = await conversationsListByUser(session.userId)
    return NextResponse.json(inbox)
  } catch (err) {
    console.error('GET /api/messages error:', err)
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }

    const sessionUser = await usersFindById(session.userId)
    if (sessionUser?.accountState === 'suspended') {
      return NextResponse.json({ error: 'Your account is suspended' }, { status: 403 })
    }

    const body = await request.json()
    const { listingId, toUserId, body: messageBody, type, offerAmount, meetupStatus, meetupZone, meetupTime } = body

    if (!listingId || !toUserId || !messageBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!isValidEntityId(String(listingId)) || !isValidEntityId(String(toUserId))) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    const isOffer = type === 'offer'
    const isMeetup = type === 'meetup'
    if (isOffer) {
      if (typeof offerAmount !== 'number' || offerAmount <= 0) {
        return NextResponse.json({ error: 'offerAmount must be a positive number' }, { status: 400 })
      }
      if (offerAmount > 100_000) {
        return NextResponse.json({ error: 'offerAmount cannot exceed $100,000' }, { status: 400 })
      }
    }
    if (isMeetup) {
      if (!MEETUP_STATUSES.includes(meetupStatus)) {
        return NextResponse.json({ error: 'Invalid meetupStatus' }, { status: 400 })
      }
      if (meetupZone !== undefined && !PICKUP_ZONES.includes(meetupZone)) {
        return NextResponse.json({ error: 'Invalid meetupZone' }, { status: 400 })
      }
      if (meetupTime !== undefined && Number.isNaN(Date.parse(String(meetupTime)))) {
        return NextResponse.json({ error: 'Invalid meetupTime' }, { status: 400 })
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
      const existingThread = await messagesListThread(String(listingId), listing.sellerId, String(toUserId))
      if (existingThread.length === 0) {
        return NextResponse.json({ error: 'Seller replies require an existing buyer conversation' }, { status: 403 })
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
      type: isOffer ? 'offer' : isMeetup ? 'meetup' : 'text',
      offerAmount: isOffer ? Number(offerAmount) : undefined,
      offerStatus: isOffer ? 'pending' : undefined,
      meetupStatus: isMeetup ? meetupStatus : undefined,
      meetupZone: isMeetup ? meetupZone : undefined,
      meetupTime: isMeetup ? meetupTime : undefined,
    })

    // Fire push notification to recipient (non-blocking)
    sendPushToUser(String(toUserId), {
      title: 'New message on Mason Market',
      body: String(messageBody).slice(0, 100),
      url: '/messages',
      tag: `msg-${String(listingId)}`,
    }).catch(() => {})

    return NextResponse.json(message)
  } catch (err) {
    console.error('POST /api/messages error:', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const body = await request.json()
    if (body?.action !== 'mark-read' || typeof body.conversationId !== 'string') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const ok = await conversationsMarkRead(body.conversationId, session.userId)
    if (!ok) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('PATCH /api/messages error:', err)
    return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 })
  }
}
