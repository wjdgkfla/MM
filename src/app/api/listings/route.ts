import { NextRequest, NextResponse } from 'next/server'
import { dataAccess } from '@/lib/data'
import {
  CAMPUS_LOCATIONS,
  CATEGORIES,
  CONDITIONS,
  LISTING_STATUSES,
  PICKUP_ZONES,
  Category,
  Condition,
  CampusLocation,
  PickupZone,
} from '@/lib/types'
import { isGmuEmail } from '@/lib/validators'
import { DEMO_SELLER } from '@/lib/config'
import { getSessionFromRequest } from '@/lib/auth/session'

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
  const sort = searchParams.get('sort') || 'newest'

  let listings = dataAccess.listings.findMany()

  if (mine === 'true') {
    if (!session) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }
    listings = dataAccess.listings.findBySellerId(session.userId)
  }

  if (mine !== 'true' && session?.role !== 'admin') {
    listings = listings.filter((listing) => listing.moderationState !== 'hidden')
  }

  if (category && CATEGORIES.includes(category as Category)) {
    listings = listings.filter((listing) => listing.category === category)
  }

  if (campusLocation && CAMPUS_LOCATIONS.includes(campusLocation as CampusLocation)) {
    listings = listings.filter((listing) => listing.campusLocation === campusLocation)
  }

  if (pickupZone && PICKUP_ZONES.includes(pickupZone as PickupZone)) {
    listings = listings.filter((listing) => listing.pickupZone === pickupZone)
  }

  if (condition && CONDITIONS.includes(condition as Condition)) {
    listings = listings.filter((listing) => listing.condition === condition)
  }

  if (status && LISTING_STATUSES.includes(status as (typeof LISTING_STATUSES)[number])) {
    listings = listings.filter((listing) => listing.status === status)
  }

  if (freeOnly === 'true') {
    listings = listings.filter((listing) => listing.price === 0)
  }

  const parsedMinPrice = Number(minPrice)
  if (minPrice && Number.isFinite(parsedMinPrice) && parsedMinPrice >= 0) {
    listings = listings.filter((listing) => listing.price >= parsedMinPrice)
  }

  const parsedMaxPrice = Number(maxPrice)
  if (maxPrice && Number.isFinite(parsedMaxPrice) && parsedMaxPrice >= 0) {
    listings = listings.filter((listing) => listing.price <= parsedMaxPrice)
  }

  if (search) {
    const term = search.toLowerCase().trim()
    listings = listings.filter(
      (listing) =>
        listing.title.toLowerCase().includes(term) ||
        listing.description.toLowerCase().includes(term) ||
        (listing.courseCode || '').toLowerCase().includes(term) ||
        (listing.professorName || '').toLowerCase().includes(term) ||
        (listing.edition || '').toLowerCase().includes(term) ||
        listing.sellerProfile.displayName.toLowerCase().includes(term) ||
        listing.category.toLowerCase().includes(term) ||
        listing.campusLocation.toLowerCase().includes(term) ||
        listing.pickupZone.toLowerCase().includes(term) ||
        listing.pickupNotes.toLowerCase().includes(term) ||
        (listing.tags || []).some((tag) => tag.toLowerCase().includes(term))
    )
  }

  if (courseTag) {
    const normalizedCourseTag = courseTag.toLowerCase().replace(/[^a-z0-9]/g, '')
    listings = listings.filter((listing) =>
      listing.tags.some((tag) => tag.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normalizedCourseTag))
    )
  }

  if (sort === 'price-asc') {
    listings = [...listings].sort((a, b) => a.price - b.price)
  } else if (sort === 'price-desc') {
    listings = [...listings].sort((a, b) => b.price - a.price)
  } else {
    listings = [...listings].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  }

  return NextResponse.json(listings)
}

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Sign in required before posting. Your session may have expired.' }, { status: 401 })
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
      isFavorited,
      tags,
      favoriteCount,
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

    const resolvedSellerId = String(session.userId || DEMO_SELLER.id)
    const resolvedSellerName = String(session.displayName || DEMO_SELLER.name)
    const resolvedSellerEmail = String(session.email || DEMO_SELLER.email).toLowerCase()

    if (!isGmuEmail(resolvedSellerEmail)) {
      return NextResponse.json({ error: 'Only GMU student emails are allowed' }, { status: 400 })
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
          .filter((value) => typeof value === 'string')
          .map((value) => value.trim())
          .filter(Boolean)
          .slice(0, 5)
      : []
    const parsedImageUrls = Array.isArray(imageUrls)
      ? imageUrls.filter((value) => typeof value === 'string' && value.trim().length > 0)
      : []
    const parsedCourseCode = typeof courseCode === 'string' ? courseCode.trim().toUpperCase().slice(0, 24) : undefined
    const parsedProfessorName = typeof professorName === 'string' ? professorName.trim().slice(0, 80) : undefined
    const parsedEdition = typeof edition === 'string' ? edition.trim().slice(0, 40) : undefined
    const parsedBundleNotes = typeof bundleNotes === 'string' ? bundleNotes.trim().slice(0, 200) : undefined
    const shouldKeepTextbookFields = category === 'textbooks'

    const seller = dataAccess.users.findById(resolvedSellerId)
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
          displayName: resolvedSellerName,
          profileImageUrl: undefined,
          trustBadge: 'verification-pending' as const,
          reputationScore: 0,
          isGmuVerified: false,
          isStudentSeller: true,
          homeCampus: campusLocation as CampusLocation,
          lastActiveAt: new Date().toISOString(),
          campusVerification: 'pending' as const,
        }

    const listing = dataAccess.listings.create({
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
      sellerId: resolvedSellerId,
      sellerProfile,
      imageUrls: parsedImageUrls,
      tags: parsedTags,
      favoriteCount: Number.isFinite(Number(favoriteCount)) ? Math.max(0, Number(favoriteCount)) : 0,
      isFavorited: Boolean(isFavorited),
      status: 'available',
    })

    return NextResponse.json(listing)
  } catch {
    return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 })
  }
}
