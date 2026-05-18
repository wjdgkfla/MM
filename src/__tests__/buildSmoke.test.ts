/**
 * buildSmoke.test.ts
 * Checks that all critical modules can be imported without errors.
 * Catches broken imports, missing files, and circular dependencies
 * before a full build.
 */

describe('Module import smoke tests', () => {
  it('imports session module without throwing', async () => {
    process.env.SESSION_SECRET = 'test-smoke-secret-at-least-32-chars'
    await expect(import('@/lib/auth/session')).resolves.toBeDefined()
  })

  it('imports listingValidation without throwing', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fnunijtdaepvmetdabik.supabase.co'
    await expect(import('@/lib/listingValidation')).resolves.toBeDefined()
  })

  it('imports uploadValidation without throwing', async () => {
    await expect(import('@/lib/uploadValidation')).resolves.toBeDefined()
  })

  it('imports types without throwing', async () => {
    await expect(import('@/lib/types')).resolves.toBeDefined()
  })

  it('imports rateLimit without throwing', async () => {
    await expect(import('@/lib/rateLimit')).resolves.toBeDefined()
  })

  it('CAMPUS_ZONE_MAP is defined and non-empty', async () => {
    const { CAMPUS_ZONE_MAP } = await import('@/lib/types')
    expect(CAMPUS_ZONE_MAP).toBeDefined()
    expect(Object.keys(CAMPUS_ZONE_MAP).length).toBeGreaterThan(0)
  })

  it('RATING_TAGS has 5 entries', async () => {
    const { RATING_TAGS } = await import('@/lib/types')
    expect(RATING_TAGS).toHaveLength(5)
  })

  it('all CATEGORIES have a label', async () => {
    const { CATEGORIES, CATEGORY_LABELS } = await import('@/lib/types')
    for (const cat of CATEGORIES) {
      expect(CATEGORY_LABELS[cat]).toBeTruthy()
    }
  })

  it('all CONDITIONS have a label', async () => {
    const { CONDITIONS, CONDITION_LABELS } = await import('@/lib/types')
    for (const cond of CONDITIONS) {
      expect(CONDITION_LABELS[cond]).toBeTruthy()
    }
  })

  it('all CAMPUS_LOCATIONS have a label', async () => {
    const { CAMPUS_LOCATIONS, LOCATION_LABELS } = await import('@/lib/types')
    for (const loc of CAMPUS_LOCATIONS) {
      expect(LOCATION_LABELS[loc]).toBeTruthy()
    }
  })

  it('all PICKUP_ZONES have a label', async () => {
    const { PICKUP_ZONES, PICKUP_ZONE_LABELS } = await import('@/lib/types')
    for (const zone of PICKUP_ZONES) {
      expect(PICKUP_ZONE_LABELS[zone]).toBeTruthy()
    }
  })
})
