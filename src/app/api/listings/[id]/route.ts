import { NextRequest, NextResponse } from 'next/server'
import {
  CAMPUS_LOCATIONS,
  CATEGORIES,
  CONDITIONS,
  LISTING_STATUSES,
  PICKUP_ZONES,
  Category,
  CampusLocation,
  Condition,
  ListingStatus,
  PickupZone,
} from '@/lib/types'
import { getSessionFromRequest } from '@/lib/auth/session'
import {
  listingsFindById,
  listingsUpdateStatus,
  listingsUpdate,
  listingsRemove,
  listingsIncrementViewCount,
  usersFindById,
  listingsCountBySellerId,
} from '@/lib/data/firestoreDataAccess'

const canTransitionStatus = (from: ListingStatus, to: ListingStatus) => {
  if (from === to) return true
  if (from === 'available') return to === 'reserved'
  if (from === 'reserved') return to === 'available' || to === 'sold'
  if (from === 'sold') return to === 'available'
  return false
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(request)
    const listing = await listingsFindById(params.id)

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    const canViewHidden =
      listing.moderationState !== 'hidden' ||
      Boolean(session && (session.role === 'admin' || session.userId === listing.sellerId))

    if (!canViewHidden) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    const [seller, sellerListingCount] = await Promise.all([
      usersFindById(listing.sellerId),
      listingsCountBySellerId(listing.sellerId),
    ])

    // Fire-and-forget view count increment (don't await — keeps response fast)
    listingsIncrementViewCount(params.id)

    return NextResponse.json({ listing, seller: seller || null, sellerListingCount })
  } catch (err) {
    console.error('GET /api/listings/[id] error:', err)
    return NextResponse.json({ error: 'Failed to load listing' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }

    const existing = await listingsFindById(params.id)
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

    if (!canTransitionStatus(existing.status, nextStatus)) {
      return NextResponse.json(
        { error: `Invalid status transition from ${existing.status} to ${nextStatus}` },
        { status: 400 }
      )
    }

    const listing = await listingsUpdateStatus(params.id, nextStatus)
    return NextResponse.json(listing)
  } catch (err) {
    console.error('PATCH /api/listings/[id] error:', err)
    return NextResponse.json({ error: 'Failed to update listing status' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }

    const existing = await listingsFindById(params.id)
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
    const title = String(body?.title || '').trim()
    const description = String(body?.description || '').trim()
    const pickupNotes = String(body?.pickupNotes || '').trim()
    const price = Number(body?.price)
    const category = body?.category as Category
    const condition = body?.condition as Condition
    const campusLocation = body?.campusLocation as CampusLocation
    const pickupZone = body?.pickupZone as PickupZone
    const tags = Array.isArray(body?.tags)
      ? body.tags
          .filter((value: unknown) => typeof value === 'string')
          .map((value: string) => value.trim())
          .filter(Boolean)
          .slice(0, 5)
      : existing.tags
    const imageUrls = Array.isArray(body?.imageUrls)
      ? body.imageUrls.filter((value: unknown) => typeof value === 'string' && (value as string).trim().length > 0)
      : existing.imageUrls
    const courseCode =
      typeof body?.courseCode === 'string'
        ? body.courseCode.trim().toUpperCase().slice(0, 24)
        : existing.courseCode
    const professorName =
      typeof body?.professorName === 'string'
        ? body.professorName.trim().slice(0, 80)
        : existing.professorName
    const edition =
      typeof body?.edition === 'string'
        ? body.edition.trim().slice(0, 40)
        : existing.edition
    const bundleNotes =
      typeof body?.bundleNotes === 'string'
        ? body.bundleNotes.trim().slice(0, 200)
        : existing.bundleNotes

    if (title.length < 5) {
      return NextResponse.json({ error: 'Title should be at least 5 characters' }, { status: 400 })
    }
    if (description.length < 15) {
      return NextResponse.json({ error: 'Description should be at least 15 characters' }, { status: 400 })
    }
    if (pickupNotes.length < 6) {
      return NextResponse.json({ error: 'Pickup notes should be at least 6 characters' }, { status: 400 })
    }
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: 'Price must be 0 or higher' }, { status: 400 })
    }
    if (!CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }
    if (!CONDITIONS.includes(condition)) {
      return NextResponse.json({ error: 'Invalid condition' }, { status: 400 })
    }
    if (!CAMPUS_LOCATIONS.includes(campusLocation)) {
      return NextResponse.json({ error: 'Invalid campus location' }, { status: 400 })
    }
    if (!PICKUP_ZONES.includes(pickupZone)) {
      return NextResponse.json({ error: 'Invalid pickup zone' }, { status: 400 })
    }

    const listing = await listingsUpdate(params.id, {
      title,
      description,
      price,
      category,
      condition,
      campusLocation,
      pickupZone,
      pickupNotes,
      courseCode: category === 'textbooks' ? courseCode || undefined : undefined,
      professorName: category === 'textbooks' ? professorName || undefined : undefined,
      edition: category === 'textbooks' ? edition || undefined : undefined,
      bundleNotes: category === 'textbooks' ? bundleNotes || undefined : undefined,
      tags,
      imageUrls,
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
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }

    const existing = await listingsFindById(params.id)
    if (!existing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    if (existing.sellerId !== session.userId) {
      return NextResponse.json({ error: 'Only the seller can delete this listing' }, { status: 403 })
    }

    const deleted = await listingsRemove(params.id)
    if (!deleted) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/listings/[id] error:', err)
    return NextResponse.json({ error: 'Failed to delete listing' }, { status: 500 })
  }
}
