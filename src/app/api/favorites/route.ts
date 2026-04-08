import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import { favoritesListByUser, favoritesAdd, favoritesRemove } from '@/lib/data/firestoreDataAccess'

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }

    const listingIds = await favoritesListByUser(session.userId)
    return NextResponse.json({ listingIds })
  } catch (err) {
    console.error('GET /api/favorites error:', err)
    return NextResponse.json({ error: 'Failed to load favorites' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }

    const body = await request.json()
    const listingId = String(body?.listingId || '').trim()
    const action = String(body?.action || 'add').trim()

    if (!listingId) {
      return NextResponse.json({ error: 'listingId is required' }, { status: 400 })
    }

    if (action === 'remove') {
      await favoritesRemove(session.userId, listingId)
    } else {
      await favoritesAdd(session.userId, listingId)
    }

    const listingIds = await favoritesListByUser(session.userId)
    return NextResponse.json({ listingIds })
  } catch (err) {
    console.error('POST /api/favorites error:', err)
    return NextResponse.json({ error: 'Failed to update favorites' }, { status: 500 })
  }
}
