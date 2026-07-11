import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { usersFindByEmail, usersBumpSessionVersion } from '@/lib/data/supabaseDataAccess'

// Called by the reset-password flow right after Supabase confirms the new
// password (and before the client's global signOut revokes its own access
// token). Bumps the user's session_version so every previously-issued
// Mason Market app cookie — not just Supabase refresh tokens — stops
// working on its very next request.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const accessToken = String(body?.accessToken || '').trim()
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing access token' }, { status: 400 })
    }

    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(accessToken)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const email = String(user.email || '').trim().toLowerCase()
    const dbUser = await usersFindByEmail(email)
    if (dbUser) {
      await usersBumpSessionVersion(dbUser.id)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/auth/invalidate-sessions error:', err)
    return NextResponse.json({ error: 'Failed to invalidate sessions' }, { status: 500 })
  }
}
