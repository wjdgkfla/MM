import { NextRequest, NextResponse } from 'next/server'
import { isGmuEmail } from '@/lib/validators'
import { AuthSession } from '@/lib/auth/types'
import { setSessionCookie } from '@/lib/auth/session'
import { resolveSessionRole } from '@/lib/auth/devAdmin'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { usersFindByEmail, usersUpsert } from '@/lib/data/supabaseDataAccess'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const accessToken = String(body?.accessToken || '').trim()
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing access token' }, { status: 400 })
    }

    // Verify the Supabase JWT and get the authenticated user
    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(accessToken)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const email = String(user.email || '').trim().toLowerCase()
    if (!email) {
      return NextResponse.json({ error: 'Email is missing in token' }, { status: 400 })
    }

    if (!isGmuEmail(email)) {
      return NextResponse.json({ error: 'Only GMU emails are allowed (@gmu.edu or @masonlive.gmu.edu)' }, { status: 400 })
    }

    // Defense-in-depth: require confirmed email in production even if Supabase
    // is already configured to block unconfirmed sign-ins.
    if (process.env.NODE_ENV === 'production' && !user.email_confirmed_at) {
      return NextResponse.json(
        { error: 'Please check your email and confirm your address before signing in.' },
        { status: 403 }
      )
    }

    const existing = await usersFindByEmail(email)
    if (existing?.accountState === 'suspended') {
      return NextResponse.json({ error: 'This account is currently suspended' }, { status: 403 })
    }

    const dbUser = await usersUpsert({
      supabaseId: user.id,
      email,
      displayName: existing?.displayName || (user.user_metadata?.display_name as string) || email.split('@')[0],
      role: existing?.role || resolveSessionRole(email),
    })

    const session: AuthSession = {
      userId: dbUser.id,
      role: dbUser.role,
      email,
      displayName: dbUser.displayName,
      gmuVerified: true,
      issuedAt: new Date().toISOString(),
      sessionVersion: dbUser.sessionVersion,
    }

    const response = NextResponse.json({ session })
    setSessionCookie(response, session)
    return response
  } catch (err) {
    console.error('POST /api/auth/sign-in error:', err)
    return NextResponse.json({ error: 'Failed to sign in' }, { status: 500 })
  }
}
