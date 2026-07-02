import { canTransitionListingStatus } from '@/lib/marketplaceLifecycle'

describe('canTransitionListingStatus', () => {
  test('a seller can mark an available listing sold directly (walk-up sale)', () => {
    expect(canTransitionListingStatus('available', 'sold')).toBe(true)
  })

  test('a seller can still reserve an available listing', () => {
    expect(canTransitionListingStatus('available', 'reserved')).toBe(true)
  })

  test('a reserved listing can become available or sold', () => {
    expect(canTransitionListingStatus('reserved', 'available')).toBe(true)
    expect(canTransitionListingStatus('reserved', 'sold')).toBe(true)
  })

  test('a sold listing can only be relisted as available', () => {
    expect(canTransitionListingStatus('sold', 'available')).toBe(true)
    expect(canTransitionListingStatus('sold', 'reserved')).toBe(false)
  })

  test('same-status transitions are always allowed (idempotent)', () => {
    expect(canTransitionListingStatus('available', 'available')).toBe(true)
    expect(canTransitionListingStatus('reserved', 'reserved')).toBe(true)
    expect(canTransitionListingStatus('sold', 'sold')).toBe(true)
  })
})
