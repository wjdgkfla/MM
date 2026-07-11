import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  return NextResponse.json({ session })
}
