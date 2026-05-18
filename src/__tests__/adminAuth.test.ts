/**
 * adminAuth.test.ts
 * Tests requireActiveAdmin() — verifies that DB role + account state
 * are checked, not just the session cookie.
 *
 * Key scenario: admin demoted or suspended after issuing a cookie.
 * Their cookie still says 'admin' but the DB says otherwise.
 */

process.env.SESSION_SECRET = 'test-secret-that-is-long-enough-32ch'

import { NextRequest } from 'next/server'
import { isActiveAdminUser } from '@/lib/auth/admin'
import type { AuthSession } from '@/lib/auth/types'
import type { User } from '@/lib/types'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const ADMIN_SESSION: AuthSession = {
  userId: 'u_admin',
  role: 'admin',
  email: 'admin@gmu.edu',
  displayName: 'Admin User',
  gmuVerified: true,
  issuedAt: new Date().toISOString(),
}

const ADMIN_DB_USER: User = {
  id: 'u_admin',
  role: 'admin',
  accountState: 'active',
  displayName: 'Admin User',
  gmuEmail: 'admin@gmu.edu',
  gmuEmailVerified: true,
  isStudentSeller: false,
  homeCampus: 'fairfax',
  campusVerification: 'verified',
  lastActiveAt: new Date().toISOString(),
  joinedAt: new Date().toISOString(),
  trustBadge: 'verified-gmu',
  reputationScore: 5,
  listingCount: 0,
}

// ── isActiveAdminUser ─────────────────────────────────────────────────────────

describe('isActiveAdminUser — happy path', () => {
  it('returns true when both session and DB record are admin + active', () => {
    expect(isActiveAdminUser(ADMIN_SESSION, ADMIN_DB_USER)).toBe(true)
  })
})

describe('isActiveAdminUser — cookie still says admin but DB changed', () => {
  it('returns false when DB role is student (demoted)', () => {
    const demoted: User = { ...ADMIN_DB_USER, role: 'student' }
    expect(isActiveAdminUser(ADMIN_SESSION, demoted)).toBe(false)
  })

  it('returns false when DB accountState is suspended', () => {
    const suspended: User = { ...ADMIN_DB_USER, accountState: 'suspended' }
    expect(isActiveAdminUser(ADMIN_SESSION, suspended)).toBe(false)
  })

  it('returns false when user not found in DB (null)', () => {
    expect(isActiveAdminUser(ADMIN_SESSION, null)).toBe(false)
    expect(isActiveAdminUser(ADMIN_SESSION, undefined)).toBe(false)
  })

  it('returns false when session userId does not match DB id (spoofed session)', () => {
    const wrongUser: User = { ...ADMIN_DB_USER, id: 'u_different_user' }
    expect(isActiveAdminUser(ADMIN_SESSION, wrongUser)).toBe(false)
  })
})

describe('isActiveAdminUser — session role', () => {
  it('returns false when session role is student, even if DB is admin', () => {
    const studentSession: AuthSession = { ...ADMIN_SESSION, role: 'student' }
    expect(isActiveAdminUser(studentSession, ADMIN_DB_USER)).toBe(false)
  })

  it('returns false for null session', () => {
    expect(isActiveAdminUser(null, ADMIN_DB_USER)).toBe(false)
  })
})

// ── requireActiveAdmin integration ───────────────────────────────────────────
// We test the helper independently rather than mocking the full DAL,
// since isActiveAdminUser covers the core logic and is already unit-tested.

describe('requireActiveAdmin — request parsing', () => {
  it('rejects a request with no session cookie', async () => {
    // Import requireActiveAdmin after env vars are set
    const { requireActiveAdmin } = await import('@/lib/auth/admin')
    // Mock usersFindById to avoid DB calls
    jest.mock('@/lib/data/supabaseDataAccess', () => ({
      usersFindById: jest.fn().mockResolvedValue(null),
    }))

    const request = new NextRequest('http://localhost/api/admin/test', { method: 'GET' })
    const result = await requireActiveAdmin(request)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.response.status).toBe(401)
  })
})
