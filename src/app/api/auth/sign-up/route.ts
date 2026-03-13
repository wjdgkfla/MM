import { NextRequest, NextResponse } from 'next/server'
import { isGmuEmail } from '@/lib/validators'
import { AuthSession } from '@/lib/auth/types'
import { setSessionCookie } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = String(body?.email || '').trim().toLowerCase()
    const displayName = String(body?.displayName || '').trim()

    if (!email || !displayName) {
      return NextResponse.json({ error: 'Display name and email are required' }, { status: 400 })
    }

    if (!isGmuEmail(email)) {
      return NextResponse.json({ error: 'Sign-up is limited to GMU emails' }, { status: 400 })
    }

    // Stub sign-up: this creates a session now; user persistence comes later.
    const session: AuthSession = {
      userId: `stub-${email.split('@')[0]}`,
      role: 'student',
      email,
      displayName,
      gmuVerified: true,
      issuedAt: new Date().toISOString(),
    }

    const response = NextResponse.json({ session, note: 'Stub sign-up completed. Persist users in DB later.' })
    setSessionCookie(response, session)
    return response
  } catch {
    return NextResponse.json({ error: 'Failed to sign up' }, { status: 500 })
  }
}
