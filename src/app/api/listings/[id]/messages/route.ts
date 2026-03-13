import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const listing = db.listings.getById(params.id)
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
    ? db.messages.getThread(params.id, listing.sellerId, buyerId)
    : db.messages.getByListing(params.id, buyerId)
  return NextResponse.json(messages)
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const listing = db.listings.getById(params.id)
  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  try {
    const body = await request.json()
    const senderId = String(body.senderId || '').trim()
    const senderEmail = String(body.senderEmail || '').trim().toLowerCase()
    const content = String(body.content || '').trim()

    if (!senderId || !senderEmail || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const senderRole = senderId === listing.sellerId ? 'seller' : 'buyer'
    const providedBuyerId = String(body.buyerId || '').trim()
    const buyerId = senderRole === 'buyer' ? senderId : providedBuyerId

    if (!buyerId || buyerId === listing.sellerId) {
      return NextResponse.json({ error: 'Valid buyer identity is required' }, { status: 400 })
    }

    const message = db.messages.create({
      listingId: params.id,
      fromUserId: senderId,
      toUserId: senderRole === 'buyer' ? listing.sellerId : buyerId,
      body: content,
    })

    return NextResponse.json(message)
  } catch {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
