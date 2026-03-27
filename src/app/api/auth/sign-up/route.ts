import { NextRequest, NextResponse } from 'next/server'
import { dataAccess } from '@/lib/data'
import { resolveSessionRole } from '@/lib/auth/devAdmin'
import { isGmuEmail } from '@/lib/validators'
import { AuthSession } from '@/lib/auth/types'
import { setSessionCookie } from '@/lib/auth/session'
import { getFirebaseAdminAuth } from '@/lib/firebase/admin'
import { syncUserToFirebase } from '@/lib/firebase/users'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const idToken = String(body?.idToken || '').trim()
    const requestedDisplayName = String(body?.displayName || '').trim()
    if (!idToken) {
      return NextResponse.json({ error: 'Missing Firebase ID token' }, { status: 400 })
    }

    const adminAuth = getFirebaseAdminAuth()
    if (!adminAuth) {
      return NextResponse.json(
        { error: 'Firebase Admin is not configured on the server' },
        { status: 500 }
      )
    }

    const decoded = await adminAuth.verifyIdToken(idToken)
    const email = String(decoded.email || '').trim().toLowerCase()
    const tokenDisplayName = String(decoded.name || '').trim()
    const displayName = requestedDisplayName || tokenDisplayName || email.split('@')[0]

    if (!email) {
      return NextResponse.json({ error: 'Email is missing in Firebase token' }, { status: 400 })
    }

    if (!isGmuEmail(email)) {
      return NextResponse.json({ error: 'Sign-up is limited to GMU emails' }, { status: 400 })
    }

    const user = dataAccess.users.upsert({
      email,
      displayName,
      role: resolveSessionRole(email),
    })

    const session: AuthSession = {
      userId: user.id,
      role: user.role,
      email,
      displayName: user.displayName,
      gmuVerified: true,
      issuedAt: new Date().toISOString(),
    }

    await syncUserToFirebase({
      id: user.id,
      email: user.gmuEmail,
      displayName: user.displayName,
      role: user.role,
      gmuVerified: user.gmuEmailVerified,
    })

    const response = NextResponse.json({ session, note: 'Demo sign-up completed with local dev persistence.' })
    setSessionCookie(response, session)
    return response
  } catch {
    return NextResponse.json({ error: 'Failed to sign up' }, { status: 500 })
  }
}
