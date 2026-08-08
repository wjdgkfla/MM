import { NextRequest, NextResponse } from 'next/server'
import {
  CAMPUS_LOCATIONS,
  CATEGORIES,
  CONDITIONS,
  LISTING_STATUSES,
  LISTING_KINDS,
  PICKUP_ZONES,
  Category,
  CampusLocation,
  Condition,
  ListingStatus,
  ListingKind,
  PickupZone,
} from '@/lib/types'
import { isGmuEmail } from '@/lib/validators'
import { getSessionFromRequest } from '@/lib/auth/session'
import { normalizeListingInput } from '@/lib/listingValidation'
import {
  listingsFindMany,
  listingsFindBySellerId,
  listingsFindByIds,
  listingsCreate,
  usersFindById,
  matchNewListingToDemand,
} from '@/lib/data/supabaseDataAccess'

// Opaque cursor: base64 of {"value": string|number, "id": string}, where
// value is the created_at/price of the last row on the previous page.
function decodeCursor(raw: string | null): { value: string | number; id: string } | undefined {
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'))
    if (parsed && typeof parsed.id === 'string' && (typeof parsed.value === 'string' || typeof parsed.value === 'number')) {
      return { value: parsed.value, id: parsed.id }
    }
  } catch {
    // ignore malformed cursor, fall back to first page
  }
  return undefined
}

function encodeCursor(cursor: { value: string | number; id: string }): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64')
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mine = searchParams.get('mine')
  const session = await getSessionFromRequest(request)
  const category = searchParams.get('category')
  const search = searchParams.get('search')
  const campusLocation = searchParams.get('campusLocation')
  const pickupZone = searchParams.get('pickupZone')
  const condition = searchParams.get('condition')
  const status = searchParams.get('status')
  const listingKind = searchParams.get('listingKind')
  const minPrice = searchParams.get('minPrice')
  const maxPrice = searchParams.get('maxPrice')
  const freeOnly = searchParams.get('freeOnly')
  const courseTag = searchParams.get('courseTag')
  const sort = (searchParams.get('sort') || 'newest') as 'newest' | 'oldest' | 'price-asc' | 'price-desc'
  const cursorParam = searchParams.get('cursor')

  const ids = searchParams.get('ids')

  try {
    if (mine === 'true') {
      if (!session) {
        return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
      }
      const listings = await listingsFindBySellerId(session.userId)
      return NextResponse.json(listings)
    }

    if (ids) {
      if (!session) {
        return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
      }
      const idList = ids
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
        .slice(0, 100)
      if (idList.length === 0) return NextResponse.json([])
      let listings = await listingsFindByIds(idList)
      // Sold listings are intentionally kept here (unlike the browse feed) — this
      // endpoint backs saved items and message threads, where a sold listing is
      // still relevant context, not something to silently disappear.
      if (session?.role !== 'admin') {
        listings = listings.filter((l) => l.moderationState !== 'hidden')
      }
      return NextResponse.json(listings)
    }

    const query = {
      category: category && CATEGORIES.includes(category as Category) ? (category as Category) : undefined,
      campusLocation:
        campusLocation && CAMPUS_LOCATIONS.includes(campusLocation as CampusLocation)
          ? (campusLocation as CampusLocation)
          : undefined,
      pickupZone:
        pickupZone && PICKUP_ZONES.includes(pickupZone as PickupZone) ? (pickupZone as PickupZone) : undefined,
      condition: condition && CONDITIONS.includes(condition as Condition) ? (condition as Condition) : undefined,
      status: status && LISTING_STATUSES.includes(status as ListingStatus) ? (status as ListingStatus) : undefined,
      listingKind: listingKind && LISTING_KINDS.includes(listingKind as ListingKind) ? (listingKind as ListingKind) : undefined,
      search: search || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      freeOnly: freeOnly === 'true' || undefined,
      courseTag: courseTag || undefined,
      sort,
      showHidden: session?.role === 'admin',
      cursor: decodeCursor(cursorParam),
      pageSize: 24,
    }

    const { listings, nextCursor } = await listingsFindMany(query)
    return NextResponse.json({ listings, nextCursor: nextCursor ? encodeCursor(nextCursor) : null })
  } catch (err) {
    console.error('GET /api/listings error:', err)
    return NextResponse.json({ error: 'Failed to load listings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json(
        { error: 'Sign in required before posting. Your session may have expired.' },
        { status: 401 }
      )
    }

    if (!isGmuEmail(session.email) || !session.gmuVerified) {
      return NextResponse.json(
        {
          error: `GMU verified session required for posting. Signed in as ${session.email}. Try signing out and back in with a GMU email.`,
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    const normalized = normalizeListingInput(body)
    if (!normalized.ok) {
      return NextResponse.json({ error: normalized.error }, { status: 400 })
    }
    const listingInput = normalized.value

    const seller = await usersFindById(session.userId)
    if (!seller) {
      // User profile missing from DB — session is stale or account was deleted
      return NextResponse.json(
        { error: 'User profile not found. Please sign out and sign in again.' },
        { status: 403 }
      )
    }
    if (seller.accountState === 'suspended') {
      return NextResponse.json({ error: 'Your account is suspended' }, { status: 403 })
    }
    // seller is guaranteed non-null here (returned 403 above if missing)
    const sellerProfile = {
      displayName: seller.displayName,
      profileImageUrl: seller.profileImageUrl,
      trustBadge: seller.trustBadge,
      reputationScore: seller.reputationScore,
      isGmuVerified: seller.gmuEmailVerified,
      isStudentSeller: seller.isStudentSeller,
      homeCampus: seller.homeCampus,
      lastActiveAt: seller.lastActiveAt,
      campusVerification: seller.campusVerification,
    }

    const listing = await listingsCreate({
      title: listingInput.title,
      description: listingInput.description,
      price: listingInput.price,
      category: listingInput.category,
      condition: listingInput.condition,
      listingKind: listingInput.listingKind,
      moderationState: 'visible',
      campusLocation: listingInput.campusLocation,
      pickupZone: listingInput.pickupZone,
      pickupNotes: listingInput.pickupNotes,
      courseCode: listingInput.courseCode,
      professorName: listingInput.professorName,
      edition: listingInput.edition,
      bundleNotes: listingInput.bundleNotes,
      sellerId: session.userId,
      sellerProfile,
      imageUrls: listingInput.imageUrls,
      coverImageUrl: listingInput.coverImageUrl,
      tags: listingInput.tags,
      status: 'available',
    })

    await matchNewListingToDemand(listing).catch((matchError) => {
      console.error('matchNewListingToDemand error:', matchError)
    })

    return NextResponse.json(listing)
  } catch (err) {
    console.error('POST /api/listings error:', err)
    return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 })
  }
}
