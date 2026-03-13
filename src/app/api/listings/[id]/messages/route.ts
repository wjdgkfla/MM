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

  if (viewerUserId) {
    db.messages.markThreadAsRead(params.id, buyerId, viewerUserId)
  }

  const messages = db.messages.getByListingAndBuyer(params.id, buyerId)
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
    const senderName = String(body.senderName || '').trim()
    const senderEmail = String(body.senderEmail || '').trim().toLowerCase()
    const content = String(body.content || '').trim()

    if (!senderId || !senderName || !senderEmail || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const senderRole = senderId === listing.sellerId ? 'seller' : 'buyer'
    const providedBuyerId = String(body.buyerId || '').trim()
    const providedBuyerEmail = String(body.buyerEmail || '').trim().toLowerCase()
    const buyerId = senderRole === 'buyer' ? senderId : providedBuyerId
    const buyerEmail = senderRole === 'buyer' ? senderEmail : providedBuyerEmail

    if (!buyerId || !buyerEmail || buyerId === listing.sellerId) {
      return NextResponse.json({ error: 'Valid buyer identity is required' }, { status: 400 })
    }

    const message = db.messages.create({
      threadId: `${params.id}:${buyerId}`,
      listingId: params.id,
      buyerId,
      buyerEmail,
      senderId,
      senderName,
      senderEmail,
      senderRole,
      content,
      readByUserIds: [senderId],
    })

    return NextResponse.json(message)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
