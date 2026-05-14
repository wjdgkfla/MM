import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import { LISTING_MODERATION_STATES, LISTING_STATUSES, ListingModerationState, ListingStatus } from '@/lib/types'
import {
  listingsFindById,
  listingsUpdateModerationState,
  listingsUpdateStatus,
  listingsRemove,
  adminActivityCreate,
} from '@/lib/data/supabaseDataAccess'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const existing = await listingsFindById(params.id)
    if (!existing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    const body = await request.json()
    let updated = existing

    if (body?.moderationState !== undefined) {
      const moderationState = body.moderationState as ListingModerationState
      if (!LISTING_MODERATION_STATES.includes(moderationState)) {
        return NextResponse.json({ error: 'Invalid moderation state' }, { status: 400 })
      }
      const result = await listingsUpdateModerationState(existing.id, moderationState)
      if (!result) {
        return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
      }
      updated = result

      const action =
        moderationState === 'hidden'
          ? 'listing-hidden'
          : moderationState === 'flagged'
          ? 'listing-flagged'
          : 'listing-unhidden'

      await adminActivityCreate({
        actorUserId: session.userId,
        actorDisplayName: session.displayName,
        action,
        targetType: 'listing',
        targetId: existing.id,
        notes: `${existing.title}`,
      })
    }

    if (body?.status !== undefined) {
      const status = body.status as ListingStatus
      if (!LISTING_STATUSES.includes(status)) {
        return NextResponse.json({ error: 'Invalid listing status' }, { status: 400 })
      }
      const result = await listingsUpdateStatus(existing.id, status)
      if (!result) {
        return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
      }
      updated = result
      await adminActivityCreate({
        actorUserId: session.userId,
        actorDisplayName: session.displayName,
        action: 'listing-status-changed',
        targetType: 'listing',
        targetId: existing.id,
        notes: `${existing.title}: ${existing.status} -> ${status}`,
      })
    }

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Failed to update listing moderation' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const existing = await listingsFindById(params.id)
    if (!existing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    const removed = await listingsRemove(existing.id)
    if (!removed) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    await adminActivityCreate({
      actorUserId: session.userId,
      actorDisplayName: session.displayName,
      action: 'listing-removed',
      targetType: 'listing',
      targetId: existing.id,
      notes: existing.title,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to remove listing' }, { status: 500 })
  }
}
