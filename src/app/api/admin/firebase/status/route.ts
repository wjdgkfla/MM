import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import { getFirebaseAdminStatus } from '@/lib/firebase/admin'

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request)
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const status = await getFirebaseAdminStatus()
  return NextResponse.json(status)
}

