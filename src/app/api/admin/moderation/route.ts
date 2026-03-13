import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import { dataAccess } from '@/lib/data'

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  return NextResponse.json({
    listings: dataAccess.listings.findMany(),
    users: dataAccess.users.findAll(),
    reports: dataAccess.reports.listAll(),
    activity: dataAccess.adminActivity.listAll(),
  })
}
