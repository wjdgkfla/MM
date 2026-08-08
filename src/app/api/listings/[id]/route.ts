import { NextRequest, NextResponse } from 'next/server'
import { LISTING_STATUSES, ListingStatus } from '@/lib/types'
import { getSessionFromRequest } from '@/lib/auth/session'
import { normalizeListingInput } from '@/lib/listingValidation'
import { deleteListingStorageObjects } from '@/lib/uploadValidation'
import { canTransitionListingStatus } from '@/lib/marketplaceLifecycle'
import {
  listingsFindById,
  listingsCountBySellerId,
  listingsUpdateStatus,
  listingsUpdate,
  listingsRemove,
  listingsIncrementViewCount,
  usersFindById,
  usersReputationSummary,
  transactionsFindByListingId,
  ratingsFindByReviewerAndTransaction,
} from '@/lib/data/supabaseDataAccess'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getSessionFromRequest(request)
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
    // Use a single count(*) query instead of fetching every listing by this seller.
    const sellerListingCount = await listingsCountBySellerId(listing.sellerId)
    const sellerReputation = await usersReputationSummary(listing.sellerId)

    // Reviewable transaction for the signed-in user on this listing (P0-4):
    // the most recent completed transaction where they were a participant
    // and haven't already reviewed it. Drives whether the item page shows
    // "rate this trade" for either the buyer or the seller side.
    let myReview: { transactionId: string; eligible: boolean } | null = null
    if (session) {
      const transactions = await transactionsFindByListingId(id)
      const myTransaction = transactions.find(
        (t) =>
          t.status === 'completed' &&
          (t.buyerId === session.userId || t.sellerId === session.userId)
      )
      if (myTransaction) {
        const existingReview = await ratingsFindByReviewerAndTransaction(session.userId, myTransaction.id)
        myReview = { transactionId: myTransaction.id, eligible: !existingReview }
      }
    }

    // Fire-and-forget view count increment — skip for the seller viewing their own listing
    if (!session || session.userId !== listing.sellerId) {
      listingsIncrementViewCount(id)
    }

    return NextResponse.json({ listing, seller: seller || null, sellerListingCount, sellerReputation, myReview })
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
    const session = await getSessionFromRequest(request)
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
    const session = await getSessionFromRequest(request)
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

    // Clean up storage objects for images that were removed by this edit (P1-8: avoid orphans).
    // Runs after the DB update succeeds so we never delete a file the listing still references.
    const removedImageUrls = existing.imageUrls.filter((url) => !listingInput.imageUrls.includes(url))
    if (removedImageUrls.length > 0) {
      await deleteListingStorageObjects(removedImageUrls)
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
    const session = await getSessionFromRequest(request)
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

    // listingsRemove soft-deletes (sets deleted_at) rather than dropping the row — see P0-6.
    // Deliberately not deleting the listing's storage objects here: a soft-deleted listing may
    // still need admin review or restoration, and the images are evidence for that. Storage
    // cleanup for soft-deleted listings belongs in a later hard-delete/retention pass, not here.
    const deleted = await listingsRemove(id, session.userId)
    if (!deleted) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/listings/[id] error:', err)
    return NextResponse.json({ error: 'Failed to delete listing' }, { status: 500 })
  }
}
