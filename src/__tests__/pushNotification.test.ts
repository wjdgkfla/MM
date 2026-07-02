process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fnunijtdaepvmetdabik.supabase.co'

import { isGoneSubscription } from '@/lib/pushNotification'

describe('isGoneSubscription', () => {
  test('404 and 410 from the push service mean the subscription is permanently dead', () => {
    expect(isGoneSubscription({ statusCode: 404 })).toBe(true)
    expect(isGoneSubscription({ statusCode: 410 })).toBe(true)
  })

  test('other errors (network blips, 5xx, rate limits) are not treated as dead', () => {
    expect(isGoneSubscription({ statusCode: 500 })).toBe(false)
    expect(isGoneSubscription({ statusCode: 429 })).toBe(false)
    expect(isGoneSubscription(new Error('network error'))).toBe(false)
    expect(isGoneSubscription(null)).toBe(false)
    expect(isGoneSubscription(undefined)).toBe(false)
  })
})
