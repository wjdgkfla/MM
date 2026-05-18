/**
 * listingValidation.test.ts
 * Tests the shared normalizeListingInput() helper used by both
 * POST /api/listings (create) and PUT /api/listings/[id] (edit).
 */

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fnunijtdaepvmetdabik.supabase.co'

import { normalizeListingInput } from '@/lib/listingValidation'

const VALID_BASE = {
  title: 'TI-84 Plus CE Calculator',
  description: 'Barely used, slide cover included. Perfect for STAT 250.',
  price: 45,
  category: 'electronics',
  condition: 'like-new',
  campusLocation: 'fairfax',
  pickupZone: 'jc-lobby',
  pickupNotes: 'Meet at JC lobby weekdays',
  imageUrls: [
    'https://fnunijtdaepvmetdabik.supabase.co/storage/v1/object/public/listings/user1/photo.jpg',
  ],
  tags: ['calculator', 'stat-250'],
}

describe('normalizeListingInput — happy path', () => {
  it('accepts a valid listing and returns normalised fields', () => {
    const result = normalizeListingInput(VALID_BASE)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.title).toBe(VALID_BASE.title)
    expect(result.value.price).toBe(45)
    expect(result.value.tags).toEqual(['calculator', 'stat-250'])
  })

  it('accepts price = 0 (free item)', () => {
    const result = normalizeListingInput({ ...VALID_BASE, price: 0, category: 'free' })
    expect(result.ok).toBe(true)
  })

  it('strips non-alphanumeric characters from tags', () => {
    // regex is [^a-z0-9-] — spaces are stripped, hyphens are kept
    const result = normalizeListingInput({ ...VALID_BASE, tags: ['MATH 113!', 'calc$%', 'dorm-chair'] })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.tags).toEqual(['math113', 'calc', 'dorm-chair'])
  })

  it('caps tags at 5', () => {
    const result = normalizeListingInput({ ...VALID_BASE, tags: ['a','b','c','d','e','f'] })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.tags).toHaveLength(5)
  })

  it('accepts a textbook with valid course code', () => {
    const result = normalizeListingInput({
      ...VALID_BASE,
      category: 'textbooks',
      courseCode: 'CS 310',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.courseCode).toBe('CS 310')
  })
})

describe('normalizeListingInput — title / description / pickupNotes', () => {
  it('rejects title shorter than 5 chars', () => {
    const result = normalizeListingInput({ ...VALID_BASE, title: 'Ti' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/title/i)
  })

  it('rejects description shorter than 15 chars', () => {
    const result = normalizeListingInput({ ...VALID_BASE, description: 'Too short' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/description/i)
  })

  it('rejects pickupNotes shorter than 6 chars', () => {
    const result = normalizeListingInput({ ...VALID_BASE, pickupNotes: 'JC' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/pickup/i)
  })
})

describe('normalizeListingInput — price', () => {
  it('rejects negative price', () => {
    expect(normalizeListingInput({ ...VALID_BASE, price: -1 }).ok).toBe(false)
  })

  it('rejects price above $50,000', () => {
    expect(normalizeListingInput({ ...VALID_BASE, price: 50_001 }).ok).toBe(false)
  })

  it('accepts $50,000 exactly (boundary)', () => {
    expect(normalizeListingInput({ ...VALID_BASE, price: 50_000 }).ok).toBe(true)
  })

  it('rejects NaN price', () => {
    expect(normalizeListingInput({ ...VALID_BASE, price: NaN }).ok).toBe(false)
  })
})

describe('normalizeListingInput — campus / zone pairing', () => {
  it('rejects a pickup zone that does not belong to the campus', () => {
    const result = normalizeListingInput({
      ...VALID_BASE,
      campusLocation: 'arlington',
      pickupZone: 'jc-lobby', // Fairfax-only zone
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/pickup zone/i)
  })

  it('accepts a zone that belongs to the campus', () => {
    const result = normalizeListingInput({
      ...VALID_BASE,
      campusLocation: 'arlington',
      pickupZone: 'van-metre-hall',
    })
    expect(result.ok).toBe(true)
  })
})

describe('normalizeListingInput — imageUrls', () => {
  it('rejects images from an external domain', () => {
    const result = normalizeListingInput({
      ...VALID_BASE,
      imageUrls: ['https://evil.com/malware.jpg'],
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/image/i)
  })

  it('rejects data: URLs', () => {
    const result = normalizeListingInput({
      ...VALID_BASE,
      imageUrls: ['data:image/png;base64,abc123'],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects an empty imageUrls array', () => {
    const result = normalizeListingInput({ ...VALID_BASE, imageUrls: [] })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/photo/i)
  })

  it('accepts up to 4 images from the correct bucket', () => {
    const base = 'https://fnunijtdaepvmetdabik.supabase.co/storage/v1/object/public/listings/u/'
    const result = normalizeListingInput({
      ...VALID_BASE,
      imageUrls: [`${base}a.jpg`, `${base}b.png`, `${base}c.webp`, `${base}d.jpg`],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.imageUrls).toHaveLength(4)
  })
})

describe('normalizeListingInput — course code', () => {
  it('rejects malformed course code on textbook listings', () => {
    const result = normalizeListingInput({
      ...VALID_BASE,
      category: 'textbooks',
      courseCode: 'NOTACOURSE!!!',
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/course/i)
  })

  it('ignores course code on non-textbook listings', () => {
    // A bad courseCode on electronics should be silently dropped, not error
    const result = normalizeListingInput({
      ...VALID_BASE,
      category: 'electronics',
      courseCode: 'NOTACOURSE!!!',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.courseCode).toBeUndefined()
  })
})
