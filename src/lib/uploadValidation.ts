import { getSupabaseAdmin } from '@/lib/supabase/server'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

type ValidationResult = { ok: true } | { ok: false; error: string }

function hasJpegSignature(bytes: Uint8Array) {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
}

function hasPngSignature(bytes: Uint8Array) {
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  return png.every((value, index) => bytes[index] === value)
}

function hasWebpSignature(bytes: Uint8Array) {
  return (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
}

function typeMatchesBytes(type: string, bytes: Uint8Array) {
  if (type === 'image/jpeg') return hasJpegSignature(bytes)
  if (type === 'image/png') return hasPngSignature(bytes)
  if (type === 'image/webp') return hasWebpSignature(bytes)
  return false
}

export async function validateImageFile(file: File): Promise<ValidationResult> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return { ok: false, error: 'Only JPG, PNG, and WebP images are allowed.' }
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: `"${file.name}" exceeds the 5MB limit. Please resize it and try again.` }
  }

  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  if (!typeMatchesBytes(file.type, header)) {
    return { ok: false, error: `"${file.name}" does not appear to be a valid image file.` }
  }

  return { ok: true }
}

export function extensionForImageType(type: string) {
  if (type === 'image/png') return 'png'
  if (type === 'image/webp') return 'webp'
  return 'jpg'
}

/** Maps a public listings-bucket URL back to its storage object path, or null if it doesn't match. */
function listingStoragePath(url: string): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return null
  try {
    const parsed = new URL(url)
    const prefix = new URL('/storage/v1/object/public/listings/', supabaseUrl)
    if (parsed.origin !== prefix.origin || !parsed.pathname.startsWith(prefix.pathname)) return null
    return decodeURIComponent(parsed.pathname.slice(prefix.pathname.length))
  } catch {
    return null
  }
}

/**
 * Deletes listing images from Supabase Storage given their public URLs.
 * Used when an edit replaces images (P1-8) so old files don't become orphans.
 * Best-effort: logs and swallows storage errors rather than failing the caller's request,
 * since the DB update (source of truth) has already succeeded by the time this runs.
 */
export async function deleteListingStorageObjects(urls: string[]): Promise<void> {
  const paths = urls.map(listingStoragePath).filter((p): p is string => Boolean(p))
  if (paths.length === 0) return
  const { error } = await getSupabaseAdmin().storage.from('listings').remove(paths)
  if (error) console.error('Listing storage cleanup error:', error)
}

// TODO(scheduled cleanup): This only handles the "images replaced on edit" case. Uploads that
// succeed but never get attached to a listing (upload succeeds, listing creation abandoned) are
// not cleaned up here — that needs a scheduled job that lists objects under `listings/<userId>/`,
// diffs them against `image_urls` actually referenced across all listings for that user, and
// removes objects older than some grace period (e.g. 24h) with no referencing listing.
