import { isGmuEmail, isValidEntityId, sanitizeRedirectPath } from '@/lib/validators'

describe('isGmuEmail', () => {
  it('accepts gmu.edu and masonlive.gmu.edu addresses', () => {
    expect(isGmuEmail('student@gmu.edu')).toBe(true)
    expect(isGmuEmail('  Student@MasonLive.GMU.edu ')).toBe(true)
  })

  it('rejects non-GMU addresses', () => {
    expect(isGmuEmail('someone@gmail.com')).toBe(false)
    expect(isGmuEmail('fake@gmu.edu.evil.com')).toBe(false)
  })
})

describe('isValidEntityId', () => {
  it('accepts Supabase UUIDs and internal nanoids', () => {
    expect(isValidEntityId('0b9c1a2d-3e4f-5a6b-7c8d-9e0f1a2b3c4d')).toBe(true)
    expect(isValidEntityId('Ab3dEf6hIj9kLm2nOp5q')).toBe(true)
  })

  it('rejects PostgREST filter syntax and empty/oversized values', () => {
    expect(isValidEntityId('x),or(to_user_id.neq.x')).toBe(false)
    expect(isValidEntityId('a.b,c')).toBe(false)
    expect(isValidEntityId('')).toBe(false)
    expect(isValidEntityId('a'.repeat(65))).toBe(false)
  })
})

describe('sanitizeRedirectPath', () => {
  it('allows same-origin relative paths', () => {
    expect(sanitizeRedirectPath('/sell')).toBe('/sell')
    expect(sanitizeRedirectPath('/item/abc?from=saved')).toBe('/item/abc?from=saved')
  })

  it('falls back to / for absolute URLs and protocol-relative escapes', () => {
    expect(sanitizeRedirectPath('https://evil.com')).toBe('/')
    expect(sanitizeRedirectPath('//evil.com')).toBe('/')
    expect(sanitizeRedirectPath('/\\evil.com')).toBe('/')
    expect(sanitizeRedirectPath(null)).toBe('/')
    expect(sanitizeRedirectPath('')).toBe('/')
  })
})
