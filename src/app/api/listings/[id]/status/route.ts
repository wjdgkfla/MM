import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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
    const status = String(body.status || '').trim() as 'available' | 'reserved' | 'sold'
    const actorId = String(body.actorId || '').trim()

    if (!['available', 'reserved', 'sold'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    if (!actorId || actorId !== listing.sellerId) {
      return NextResponse.json({ error: 'Only seller can update status' }, { status: 403 })
    }

    const updated = db.listings.updateStatus(params.id, status)
    if (!updated) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}
