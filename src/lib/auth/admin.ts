import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import { AuthSession } from '@/lib/auth/types'
import { usersFindById } from '@/lib/data/supabaseDataAccess'
import { User } from '@/lib/types'

export function isActiveAdminUser(session: AuthSession | null, user: User | null | undefined): boolean {
  return Boolean(
    session?.role === 'admin' &&
    user?.id === session.userId &&
    user.role === 'admin' &&
    user.accountState === 'active'
  )
}

export async function requireActiveAdmin(request: NextRequest): Promise<
  | { ok: true; session: AuthSession; user: User }
  | { ok: false; response: NextResponse }
> {
  const session = getSessionFromRequest(request)
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: 'Sign in required' }, { status: 401 }) }
  }

  const user = await usersFindById(session.userId)
  if (!user || !isActiveAdminUser(session, user)) {
    return { ok: false, response: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) }
  }

  return { ok: true, session, user }
}
