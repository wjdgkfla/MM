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
import { isGmuEmail } from '@/lib/validators'
import { getSessionFromRequest } from '@/lib/auth/session'
import {
  listingsFindMany,
  listingsFindBySellerId,
  listingsFindByIds,
  listingsCreate,
  usersFindById,
} from '@/lib/data/firestoreDataAccess'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mine = searchParams.get('mine')
  const session = getSessionFromRequest(request)
  const category = searchParams.get('category')
  const search = searchParams.get('search')
  const campusLocation = searchParams.get('campusLocation')
  const pickupZone = searchParams.get('pickupZone')
  const condition = searchParams.get('condition')
  const status = searchParams.get('status')
  const minPrice = searchParams.get('minPrice')
  const maxPrice = searchParams.get('maxPrice')
  const freeOnly = searchParams.get('freeOnly')
  const courseTag = searchParams.get('courseTag')
  const sort = (searchParams.get('sort') || 'newest') as 'newest' | 'price-asc' | 'price-desc'

  const ids = searchParams.get('ids')
  const usingProtectedQuery =
    Boolean(category) ||
    Boolean(search) ||
    Boolean(campusLocation) ||
    Boolean(pickupZone) ||
    Boolean(condition) ||
    Boolean(status) ||
    Boolean(minPrice) ||
    Boolean(maxPrice) ||
    freeOnly === 'true' ||
    Boolean(courseTag) ||
    sort !== 'newest'

  try {
    if (!session && usingProtectedQuery) {
      return NextResponse.json({ error: 'Sign in required for filters and search' }, { status: 401 })
    }

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
      if (session?.role !== 'admin') {
        listings = listings.filter((l) => l.moderationState !== 'hidden' && l.status !== 'sold')
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
      search: search || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      freeOnly: freeOnly === 'true' || undefined,
      courseTag: courseTag || undefined,
      sort,
    }

    let listings = await listingsFindMany(query)

    if (session?.role !== 'admin') {
      listings = listings.filter((listing) => listing.moderationState !== 'hidden' && listing.status !== 'sold')
    }

    return NextResponse.json(listings)
  } catch (err) {
    console.error('GET /api/listings error:', err)
    return NextResponse.json({ error: 'Failed to load listings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)
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
    const {
      title,
      description,
      price,
      category,
      condition,
      campusLocation,
      pickupZone,
      pickupNotes,
      imageUrls,
      courseCode,
      professorName,
      edition,
      bundleNotes,
      tags,
    } = body

    if (
      !title ||
      !description ||
      price === undefined ||
      !category ||
      !condition ||
      !campusLocation ||
      !pickupZone ||
      !pickupNotes
    ) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!CATEGORIES.includes(category as Category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }
    if (!CONDITIONS.includes(condition as Condition)) {
      return NextResponse.json({ error: 'Invalid condition' }, { status: 400 })
    }
    if (!CAMPUS_LOCATIONS.includes(campusLocation as CampusLocation)) {
      return NextResponse.json({ error: 'Invalid location' }, { status: 400 })
    }
    if (!PICKUP_ZONES.includes(pickupZone as PickupZone)) {
      return NextResponse.json({ error: 'Invalid pickup zone' }, { status: 400 })
    }

    const parsedPrice = Number(price)
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
    }

    const parsedTags = Array.isArray(tags)
      ? tags
          .filter((value: unknown) => typeof value === 'string')
          .map((value: string) => value.trim())
          .filter(Boolean)
          .slice(0, 5)
      : []
    const parsedImageUrls = Array.isArray(imageUrls)
      ? imageUrls.filter((value: unknown) => typeof value === 'string' && (value as string).trim().length > 0)
      : []
    const parsedCourseCode = typeof courseCode === 'string' ? courseCode.trim().toUpperCase().slice(0, 24) : undefined
    const parsedProfessorName = typeof professorName === 'string' ? professorName.trim().slice(0, 80) : undefined
    const parsedEdition = typeof edition === 'string' ? edition.trim().slice(0, 40) : undefined
    const parsedBundleNotes = typeof bundleNotes === 'string' ? bundleNotes.trim().slice(0, 200) : undefined
    const shouldKeepTextbookFields = category === 'textbooks'

    const seller = await usersFindById(session.userId)
    const sellerProfile = seller
      ? {
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
      : {
          displayName: session.displayName,
          profileImageUrl: undefined,
          trustBadge: 'verification-pending' as const,
          reputationScore: 0,
          isGmuVerified: false,
          isStudentSeller: true,
          homeCampus: campusLocation as CampusLocation,
          lastActiveAt: new Date().toISOString(),
          campusVerification: 'pending' as const,
        }

    const listing = await listingsCreate({
      title: String(title),
      description: String(description),
      price: parsedPrice,
      category: category as Category,
      condition: condition as Condition,
      moderationState: 'visible',
      campusLocation: campusLocation as CampusLocation,
      pickupZone: pickupZone as PickupZone,
      pickupNotes: String(pickupNotes),
      courseCode: shouldKeepTextbookFields ? parsedCourseCode || undefined : undefined,
      professorName: shouldKeepTextbookFields ? parsedProfessorName || undefined : undefined,
      edition: shouldKeepTextbookFields ? parsedEdition || undefined : undefined,
      bundleNotes: shouldKeepTextbookFields ? parsedBundleNotes || undefined : undefined,
      sellerId: session.userId,
      sellerProfile,
      imageUrls: parsedImageUrls,
      tags: parsedTags,
      favoriteCount: 0,
      isFavorited: false,
      status: 'available',
    })

    return NextResponse.json(listing)
  } catch (err) {
    console.error('POST /api/listings error:', err)
    return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 })
  }
}
