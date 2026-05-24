import {
  CAMPUS_LOCATIONS,
  CAMPUS_ZONE_MAP,
  CATEGORIES,
  CONDITIONS,
  LISTING_KINDS,
  Category,
  CampusLocation,
  Condition,
  ListingKind,
  PickupZone,
} from '@/lib/types'

export type NormalizedListingInput = {
  title: string
  description: string
  price: number
  category: Category
  condition: Condition
  listingKind: ListingKind
  campusLocation: CampusLocation
  pickupZone: PickupZone
  pickupNotes: string
  imageUrls: string[]
  coverImageUrl?: string
  courseCode?: string
  professorName?: string
  edition?: string
  bundleNotes?: string
  tags: string[]
}

type Result =
  | { ok: true; value: NormalizedListingInput }
  | { ok: false; error: string }

function normalizeTags(tags: unknown): string[] {
  return Array.isArray(tags)
    ? tags
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''))
        .filter(Boolean)
        .slice(0, 5)
    : []
}

function isAllowedListingImageUrl(value: string): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return false

  try {
    const url = new URL(value)
    const allowedBase = new URL('/storage/v1/object/public/listings/', supabaseUrl)
    return (
      url.origin === allowedBase.origin &&
      url.pathname.startsWith(allowedBase.pathname) &&
      /\.(jpe?g|png|webp)$/i.test(url.pathname)
    )
  } catch {
    return false
  }
}

function normalizeImageUrls(imageUrls: unknown): Result | string[] {
  if (!Array.isArray(imageUrls)) return []
  const urls = imageUrls
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 4)

  if (urls.some((url) => !isAllowedListingImageUrl(url))) {
    return { ok: false, error: 'Invalid listing image URL' }
  }

  return urls
}

export function normalizeListingInput(input: Record<string, unknown>): Result {
  const title = String(input.title || '').trim()
  const description = String(input.description || '').trim()
  const pickupNotes = String(input.pickupNotes || '').trim()
  const price = Number(input.price)
  const category = input.category as Category
  const condition = input.condition as Condition
  const listingKind = (input.listingKind || 'sell') as ListingKind
  const campusLocation = input.campusLocation as CampusLocation
  const pickupZone = input.pickupZone as PickupZone
  const images = normalizeImageUrls(input.imageUrls)

  if (title.length < 5) return { ok: false, error: 'Title should be at least 5 characters' }
  if (description.length < 15) return { ok: false, error: 'Description should be at least 15 characters' }
  if (pickupNotes.length < 6) return { ok: false, error: 'Pickup notes should be at least 6 characters' }
  if (!Number.isFinite(price) || price < 0 || price > 50_000) {
    return { ok: false, error: 'Price must be between $0 and $50,000' }
  }
  if (!CATEGORIES.includes(category)) return { ok: false, error: 'Invalid category' }
  if (!CONDITIONS.includes(condition)) return { ok: false, error: 'Invalid condition' }
  if (!LISTING_KINDS.includes(listingKind)) return { ok: false, error: 'Invalid listing kind' }
  if (!CAMPUS_LOCATIONS.includes(campusLocation)) return { ok: false, error: 'Invalid campus location' }
  if (!CAMPUS_ZONE_MAP[campusLocation]?.includes(pickupZone)) {
    return { ok: false, error: `Pickup zone "${pickupZone}" is not available at ${campusLocation} campus` }
  }
  if (!Array.isArray(images)) return images
  if (listingKind === 'sell' && images.length === 0) {
    return { ok: false, error: 'At least 1 photo is required for selling listings' }
  }

  const courseCode = typeof input.courseCode === 'string' ? input.courseCode.trim().toUpperCase().slice(0, 24) : ''
  const professorName = typeof input.professorName === 'string' ? input.professorName.trim().slice(0, 80) : ''
  const edition = typeof input.edition === 'string' ? input.edition.trim().slice(0, 40) : ''
  const bundleNotes = typeof input.bundleNotes === 'string' ? input.bundleNotes.trim().slice(0, 200) : ''

  if (category === 'textbooks' && courseCode && !/^[A-Z]{2,5}\s?\d{3}$/.test(courseCode)) {
    return { ok: false, error: 'Course code must be in format: CS 112 or STAT250' }
  }

  return {
    ok: true,
    value: {
      title,
      description,
      price,
      category,
      condition,
      listingKind,
      campusLocation,
      pickupZone,
      pickupNotes,
      imageUrls: images,
      coverImageUrl: typeof input.coverImageUrl === 'string' && images.includes(input.coverImageUrl)
        ? input.coverImageUrl
        : images[0],
      courseCode: category === 'textbooks' ? courseCode || undefined : undefined,
      professorName: category === 'textbooks' ? professorName || undefined : undefined,
      edition: category === 'textbooks' ? edition || undefined : undefined,
      bundleNotes: category === 'textbooks' ? bundleNotes || undefined : undefined,
      tags: normalizeTags(input.tags),
    },
  }
}
