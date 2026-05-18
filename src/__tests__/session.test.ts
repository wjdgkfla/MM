/**
 * session.test.ts
 * Tests HMAC session signing, tampering detection, expiry, and cookie round-trip.
 */

// Set SESSION_SECRET before importing session module
process.env.SESSION_SECRET = 'test-secret-that-is-long-enough-32ch'

import { encodeSession, decodeSession } from '@/lib/auth/session'
import type { AuthSession } from '@/lib/auth/types'

const BASE_SESSION: AuthSession = {
  userId: 'user_abc123',
  role: 'student',
  email: 'student@gmu.edu',
  displayName: 'Test Student',
  gmuVerified: true,
  issuedAt: new Date().toISOString(),
}

describe('Session HMAC — encode + decode round-trip', () => {
  it('decodes a freshly encoded session correctly', () => {
    const token = encodeSession(BASE_SESSION)
    const decoded = decodeSession(token)
    expect(decoded).not.toBeNull()
    expect(decoded?.userId).toBe(BASE_SESSION.userId)
    expect(decoded?.email).toBe(BASE_SESSION.email)
    expect(decoded?.role).toBe('student')
    expect(decoded?.gmuVerified).toBe(true)
  })

  it('preserves admin role', () => {
    const adminSession = { ...BASE_SESSION, role: 'admin' as const }
    const token = encodeSession(adminSession)
    const decoded = decodeSession(token)
    expect(decoded?.role).toBe('admin')
  })

  it('returns null for empty/undefined input', () => {
    expect(decodeSession(undefined)).toBeNull()
    expect(decodeSession('')).toBeNull()
  })

  it('returns null for a plain base64url cookie with no signature dot', () => {
    // Simulates a legacy unsigned cookie — must be rejected
    const unsigned = Buffer.from(JSON.stringify(BASE_SESSION), 'utf8').toString('base64url')
    expect(decodeSession(unsigned)).toBeNull()
  })

  it('rejects a tampered payload', () => {
    const token = encodeSession(BASE_SESSION)
    const [payload, sig] = token.split('.')
    // Flip one character in the payload
    const tampered = payload.slice(0, -1) + (payload.slice(-1) === 'A' ? 'B' : 'A')
    expect(decodeSession(`${tampered}.${sig}`)).toBeNull()
  })

  it('rejects a tampered signature', () => {
    const token = encodeSession(BASE_SESSION)
    const dotIndex = token.lastIndexOf('.')
    const payload = token.slice(0, dotIndex)
    const sig = token.slice(dotIndex + 1)
    // Flip a character from the MIDDLE of the signature (not the last char —
    // HMAC-SHA256 is 32 bytes = 43 base64url chars, the last 2 bits are
    // ignored padding so flipping only the last char can be a no-op).
    const mid = Math.floor(sig.length / 2)
    const tamperedSig = sig.slice(0, mid) + (sig[mid] === 'A' ? 'B' : 'A') + sig.slice(mid + 1)
    expect(decodeSession(`${payload}.${tamperedSig}`)).toBeNull()
  })

  it('rejects a session with a signature from a different secret', () => {
    // Sign with one secret, verify with another
    const originalEnv = process.env.SESSION_SECRET
    process.env.SESSION_SECRET = 'other-secret-totally-different-00'
    const tokenWithWrongSecret = encodeSession(BASE_SESSION)
    process.env.SESSION_SECRET = originalEnv // restore
    expect(decodeSession(tokenWithWrongSecret)).toBeNull()
  })

  it('rejects a session issued more than 14 days ago', () => {
    const old = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    const expired = { ...BASE_SESSION, issuedAt: old }
    const token = encodeSession(expired)
    expect(decodeSession(token)).toBeNull()
  })

  it('accepts a session issued exactly 13 days ago', () => {
    const recent = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString()
    const session = { ...BASE_SESSION, issuedAt: recent }
    const token = encodeSession(session)
    expect(decodeSession(token)).not.toBeNull()
  })

  it('always defaults unknown roles to student', () => {
    // Manually craft a payload with an unknown role
    const session = { ...BASE_SESSION, role: 'superadmin' as 'admin' }
    const token = encodeSession(session)
    const decoded = decodeSession(token)
    expect(decoded?.role).toBe('student')
  })
})
