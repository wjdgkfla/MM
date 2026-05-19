import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import { CAMPUS_LOCATIONS } from '@/lib/types'
import { usersFindById, usersUpdateProfile } from '@/lib/data/supabaseDataAccess'

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const user = await usersFindById(session.userId)
  if (!user) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  return NextResponse.json({ user })
}

export async function PATCH(request: NextRequest) {
  const session = getSessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const body = await request.json()
  const displayName = typeof body.displayName === 'string' ? body.displayName.trim().slice(0, 100) : undefined
  const bio = typeof body.bio === 'string' ? body.bio.trim().slice(0, 300) : undefined
  const profileImageUrl = typeof body.profileImageUrl === 'string' ? body.profileImageUrl.trim() : undefined
  const homeCampus = CAMPUS_LOCATIONS.includes(body.homeCampus) ? body.homeCampus : undefined
  const marketingEmailOptIn =
    typeof body.marketingEmailOptIn === 'boolean' ? body.marketingEmailOptIn : undefined

  if (displayName !== undefined && displayName.length < 2) {
    return NextResponse.json({ error: 'Display name must be at least 2 characters' }, { status: 400 })
  }

  const updated = await usersUpdateProfile(session.userId, {
    displayName,
    bio,
    profileImageUrl,
    homeCampus,
    marketingEmailOptIn,
  })

  if (!updated) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  return NextResponse.json({ user: updated })
}
