import { NextRequest, NextResponse } from 'next/server'
import { resolveSessionRole } from '@/lib/auth/devAdmin'
import { isGmuEmail } from '@/lib/validators'
import { AuthSession } from '@/lib/auth/types'
import { setSessionCookie } from '@/lib/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { usersFindByEmail, usersUpsert } from '@/lib/data/supabaseDataAccess'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const accessToken = String(body?.accessToken || '').trim()
    const requestedDisplayName = String(body?.displayName || '').trim()
    const marketingEmailOptIn = body?.marketingEmailOptIn === true

    if (!accessToken) {
      return NextResponse.json({ error: 'Missing access token' }, { status: 400 })
    }

    // Verify the Supabase JWT and get the newly created user
    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(accessToken)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const email = String(user.email || '').trim().toLowerCase()
    const displayName = requestedDisplayName || (user.user_metadata?.display_name as string) || email.split('@')[0]

    if (!email) {
      return NextResponse.json({ error: 'Email is missing in token' }, { status: 400 })
    }

    if (!isGmuEmail(email)) {
      return NextResponse.json({ error: 'Sign-up is limited to GMU emails' }, { status: 400 })
    }

    // In production, email must be confirmed before a session is issued.
    // In development, Supabase has email confirmation disabled so we skip this check.
    if (process.env.NODE_ENV === 'production' && !user.email_confirmed_at) {
      return NextResponse.json(
        { error: 'Please check your email and confirm your address before signing in.' },
        { status: 403 }
      )
    }

    // Same guards as sign-in: suspended accounts get no session, and an existing
    // user's role is preserved (e.g. admins promoted via the admin panel must not
    // be demoted just because this endpoint ran for their account again).
    const existing = await usersFindByEmail(email)
    if (existing?.accountState === 'suspended') {
      return NextResponse.json({ error: 'This account is currently suspended' }, { status: 403 })
    }

    const dbUser = await usersUpsert({
      supabaseId: user.id,
      email,
      displayName,
      role: existing?.role || resolveSessionRole(email),
      marketingEmailOptIn,
    })

    const session: AuthSession = {
      userId: dbUser.id,
      role: dbUser.role,
      email,
      displayName: dbUser.displayName,
      gmuVerified: true,
      issuedAt: new Date().toISOString(),
    }

    const response = NextResponse.json({ session })
    setSessionCookie(response, session)
    return response
  } catch (err) {
    console.error('POST /api/auth/sign-up error:', err)
    return NextResponse.json({ error: 'Failed to sign up' }, { status: 500 })
  }
}
