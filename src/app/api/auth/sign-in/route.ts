import { NextRequest, NextResponse } from 'next/server'
import { dataAccess } from '@/lib/data'
import { isGmuEmail } from '@/lib/validators'
import { AuthSession } from '@/lib/auth/types'
import { setSessionCookie } from '@/lib/auth/session'
import { resolveSessionRole } from '@/lib/auth/devAdmin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = String(body?.email || '').trim().toLowerCase()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    if (!isGmuEmail(email)) {
      return NextResponse.json({ error: 'Only GMU emails are allowed (@gmu.edu or @masonlive.gmu.edu)' }, { status: 400 })
    }

    const existing = dataAccess.users.findByEmail(email)
    if (existing?.accountState === 'suspended') {
      return NextResponse.json({ error: 'This account is currently suspended' }, { status: 403 })
    }

    const user = dataAccess.users.upsert({
      email,
      displayName: existing?.displayName || String(body?.displayName || email.split('@')[0]),
      role: existing?.role || resolveSessionRole(email),
    })

    const session: AuthSession = {
      userId: user.id,
      role: user.role,
      email,
      displayName: user.displayName,
      gmuVerified: true,
      issuedAt: new Date().toISOString(),
    }

    const response = NextResponse.json({ session })
    setSessionCookie(response, session)
    return response
  } catch {
    return NextResponse.json({ error: 'Failed to sign in' }, { status: 500 })
  }
}
