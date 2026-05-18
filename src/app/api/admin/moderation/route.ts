import { NextRequest, NextResponse } from 'next/server'
import { requireActiveAdmin } from '@/lib/auth/admin'
import {
  listingsListAllForAdmin,
  usersFindAll,
  reportsListAll,
  adminActivityListAll,
} from '@/lib/data/supabaseDataAccess'

export async function GET(request: NextRequest) {
  const admin = await requireActiveAdmin(request)
  if (!admin.ok) return admin.response

  try {
    const [listings, users, reports, activity] = await Promise.all([
      listingsListAllForAdmin(),
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
