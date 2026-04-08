import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import {
  listingsFindMany,
  usersFindAll,
  reportsListAll,
  adminActivityListAll,
} from '@/lib/data/firestoreDataAccess'

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  try {
    const [listings, users, reports, activity] = await Promise.all([
      listingsFindMany(),
      usersFindAll(),
      reportsListAll(),
      adminActivityListAll(),
    ])

    return NextResponse.json({ listings, users, reports, activity })
  } catch (err) {
    console.error('GET /api/admin/moderation error:', err)
    return NextResponse.json({ error: 'Failed to load moderation data' }, { status: 500 })
  }
}
