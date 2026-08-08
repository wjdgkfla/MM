import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import { CAMPUS_LOCATIONS } from '@/lib/types'
import { isAllowedListingImageUrl } from '@/lib/listingValidation'
import { usersFindById, usersUpdateProfile } from '@/lib/data/supabaseDataAccess'

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const user = await usersFindById(session.userId)
  if (!user) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  return NextResponse.json({ user })
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
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

    // Empty string clears the photo; anything else must point into our own Supabase Storage
    // bucket (same managed-upload path used for listing images — P1-9) rather than an arbitrary
    // external URL. The profile page's upload flow already goes through /api/upload for this.
    if (profileImageUrl !== undefined && profileImageUrl !== '') {
      if (!isAllowedListingImageUrl(profileImageUrl)) {
        return NextResponse.json({ error: 'Profile image must be uploaded through Mason Market' }, { status: 400 })
      }
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
  } catch (err) {
    console.error('PATCH /api/profile error:', err)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
