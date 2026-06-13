import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import {
  listingsFindById,
  priceWatchesListByUser,
  priceWatchesRemove,
  priceWatchesUpsert,
} from '@/lib/data/supabaseDataAccess'

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  return NextResponse.json(await priceWatchesListByUser(session.userId))
}

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    const body = await request.json()
    const listingId = String(body.listingId || '')
    const listing = await listingsFindById(listingId)
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    return NextResponse.json(await priceWatchesUpsert(session.userId, listing.id, listing.price))
  } catch (err) {
    console.error('POST /api/price-watches error:', err)
    return NextResponse.json({ error: 'Failed to watch listing' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = getSessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const listingId = searchParams.get('listingId')
  if (!listingId) return NextResponse.json({ error: 'Missing listing id' }, { status: 400 })
  return NextResponse.json({ ok: await priceWatchesRemove(session.userId, listingId) })
}
