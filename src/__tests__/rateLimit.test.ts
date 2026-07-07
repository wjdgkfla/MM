import { rateLimitKey } from '@/lib/rateLimit'

describe('rateLimitKey', () => {
  test('two different listing ids from the same IP share one bucket', () => {
    const keyA = rateLimitKey('1.2.3.4', '/api/listings/listing-a')
    const keyB = rateLimitKey('1.2.3.4', '/api/listings/listing-b')
    expect(keyA).toBe(keyB)
    expect(keyA).toBe('1.2.3.4:/api/listings')
  })

  test('nested id routes still collapse to the route class', () => {
    expect(rateLimitKey('1.2.3.4', '/api/messages/msg-123')).toBe('1.2.3.4:/api/messages')
    expect(rateLimitKey('1.2.3.4', '/api/admin/users/user-1')).toBe('1.2.3.4:/api/admin')
  })

  test('the alternate message-send endpoint shares one bucket with /api/messages, not with /api/listings', () => {
    // Both routes call messagesCreate — sharing a bucket prevents a client
    // from doubling their effective send rate by alternating endpoints.
    expect(rateLimitKey('1.2.3.4', '/api/listings/listing-a/messages')).toBe(
      rateLimitKey('1.2.3.4', '/api/messages')
    )
    expect(rateLimitKey('1.2.3.4', '/api/listings/listing-a/messages')).not.toBe(
      rateLimitKey('1.2.3.4', '/api/listings/listing-a')
    )
  })

  test('different route classes get different buckets', () => {
    expect(rateLimitKey('1.2.3.4', '/api/listings')).not.toBe(rateLimitKey('1.2.3.4', '/api/favorites'))
  })

  test('different IPs never share a bucket for the same route', () => {
    expect(rateLimitKey('1.1.1.1', '/api/listings')).not.toBe(rateLimitKey('2.2.2.2', '/api/listings'))
  })

  test('auth routes keep their exact path (short, fixed list of endpoints)', () => {
    expect(rateLimitKey('1.2.3.4', '/api/auth/sign-in')).toBe('1.2.3.4:/api/auth/sign-in')
    expect(rateLimitKey('1.2.3.4', '/api/auth/sign-up')).toBe('1.2.3.4:/api/auth/sign-up')
  })
})
