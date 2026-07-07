import { NextRequest, NextResponse } from 'next/server'
import { LISTING_STATUSES, ListingStatus } from '@/lib/types'
import { getSessionFromRequest } from '@/lib/auth/session'
import { normalizeListingInput } from '@/lib/listingValidation'
import { canTransitionListingStatus } from '@/lib/marketplaceLifecycle'
import {
  listingsFindById,
  listingsFindBySellerId,
  listingsUpdateStatus,
  listingsUpdate,
  listingsRemove,
  listingsIncrementViewCount,
  usersFindById,
} from '@/lib/data/supabaseDataAccess'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = getSessionFromRequest(request)
    const listing = await listingsFindById(id)

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    const canViewHidden =
      listing.moderationState !== 'hidden' ||
      Boolean(session && (session.role === 'admin' || session.userId === listing.sellerId))

    if (!canViewHidden) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    const seller = await usersFindById(listing.sellerId)
    // users.listing_count is never actually incremented anywhere in the codebase — always 0.
    // Compute active listings live instead, matching the seller profile page's own logic.
    const sellerListings = await listingsFindBySellerId(listing.sellerId)
    const sellerListingCount = sellerListings.filter(
      (l) => l.moderationState !== 'hidden' && l.status !== 'sold'
    ).length

    // Fire-and-forget view count increment — skip for the seller viewing their own listing
    if (!session || session.userId !== listing.sellerId) {
      listingsIncrementViewCount(id)
    }

    return NextResponse.json({ listing, seller: seller || null, sellerListingCount })
  } catch (err) {
    console.error('GET /api/listings/[id] error:', err)
    return NextResponse.json({ error: 'Failed to load listing' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }

    const existing = await listingsFindById(id)
    if (!existing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    if (existing.sellerId !== session.userId) {
      return NextResponse.json({ error: 'Only the seller can update listing status' }, { status: 403 })
    }

    const sessionUser = await usersFindById(session.userId)
    if (sessionUser?.accountState === 'suspended') {
      return NextResponse.json({ error: 'Your account is suspended' }, { status: 403 })
    }

    const body = await request.json()
    const nextStatus = body.status as ListingStatus

    if (!LISTING_STATUSES.includes(nextStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    if (!canTransitionListingStatus(existing.status, nextStatus)) {
      return NextResponse.json(
        { error: `Invalid status transition from ${existing.status} to ${nextStatus}` },
        { status: 400 }
      )
    }

    const listing = await listingsUpdateStatus(id, nextStatus)
    return NextResponse.json(listing)
  } catch (err) {
    console.error('PATCH /api/listings/[id] error:', err)
    return NextResponse.json({ error: 'Failed to update listing status' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }

    const existing = await listingsFindById(id)
    if (!existing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    if (existing.sellerId !== session.userId) {
      return NextResponse.json({ error: 'Only the seller can edit this listing' }, { status: 403 })
    }

    const sessionUser = await usersFindById(session.userId)
    if (sessionUser?.accountState === 'suspended') {
      return NextResponse.json({ error: 'Your account is suspended' }, { status: 403 })
    }

    const body = await request.json()
    if (body?.action === 'refresh') {
      const now = new Date()
      const refreshed = await listingsUpdate(id, {
        lastRefreshedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      })
      return NextResponse.json(refreshed)
    }

    const normalized = normalizeListingInput({
      ...body,
      tags: Array.isArray(body?.tags) ? body.tags : existing.tags,
      imageUrls: Array.isArray(body?.imageUrls) ? body.imageUrls : existing.imageUrls,
      listingKind: typeof body?.listingKind === 'string' ? body.listingKind : existing.listingKind,
      coverImageUrl: typeof body?.coverImageUrl === 'string' ? body.coverImageUrl : existing.coverImageUrl,
      courseCode: typeof body?.courseCode === 'string' ? body.courseCode : existing.courseCode,
      professorName: typeof body?.professorName === 'string' ? body.professorName : existing.professorName,
      edition: typeof body?.edition === 'string' ? body.edition : existing.edition,
      bundleNotes: typeof body?.bundleNotes === 'string' ? body.bundleNotes : existing.bundleNotes,
    })
    if (!normalized.ok) {
      return NextResponse.json({ error: normalized.error }, { status: 400 })
    }
    const listingInput = normalized.value

    const listing = await listingsUpdate(id, {
      title: listingInput.title,
      description: listingInput.description,
      price: listingInput.price,
      category: listingInput.category,
      condition: listingInput.condition,
      listingKind: listingInput.listingKind,
      campusLocation: listingInput.campusLocation,
      pickupZone: listingInput.pickupZone,
      pickupNotes: listingInput.pickupNotes,
      courseCode: listingInput.courseCode,
      professorName: listingInput.professorName,
      edition: listingInput.edition,
      bundleNotes: listingInput.bundleNotes,
      tags: listingInput.tags,
      imageUrls: listingInput.imageUrls,
      coverImageUrl: listingInput.coverImageUrl,
    })

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    return NextResponse.json(listing)
  } catch (err) {
    console.error('PUT /api/listings/[id] error:', err)
    return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }

    const existing = await listingsFindById(id)
    if (!existing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    const sessionUser = await usersFindById(session.userId)
    if (sessionUser?.accountState === 'suspended') {
      return NextResponse.json({ error: 'Your account is suspended' }, { status: 403 })
    }

    if (existing.sellerId !== session.userId) {
      return NextResponse.json({ error: 'Only the seller can delete this listing' }, { status: 403 })
    }

    const deleted = await listingsRemove(id)
    if (!deleted) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/listings/[id] error:', err)
    return NextResponse.json({ error: 'Failed to delete listing' }, { status: 500 })
  }
}
