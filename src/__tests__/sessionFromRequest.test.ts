import { NextRequest } from 'next/server'
import { encodeSession, getSessionFromRequest } from '@/lib/auth/session'
import { AUTH_COOKIE_NAME } from '@/lib/auth/constants'
import { usersFindById } from '@/lib/data/supabaseDataAccess'

jest.mock('@/lib/data/supabaseDataAccess', () => ({
  usersFindById: jest.fn(),
}))

const mockUsersFindById = jest.mocked(usersFindById)

function requestWithCookie(role: 'admin' | 'student', sessionVersion = 0) {
  const cookie = encodeSession({
    userId: 'u1',
    role,
    email: 'a@gmu.edu',
    displayName: 'A',
    gmuVerified: true,
    issuedAt: new Date().toISOString(),
    sessionVersion,
  })
  return new NextRequest('http://localhost/api/x', { headers: { cookie: `${AUTH_COOKIE_NAME}=${cookie}` } })
}

describe('getSessionFromRequest', () => {
  beforeEach(() => jest.clearAllMocks())

  test('uses the current DB role, so a demoted admin loses admin immediately', async () => {
    mockUsersFindById.mockResolvedValue({ id: 'u1', role: 'student', sessionVersion: 0 } as never)

    const session = await getSessionFromRequest(requestWithCookie('admin'))

    expect(session?.role).toBe('student')
  })

  test('uses the current DB role, so a promoted admin gains admin immediately', async () => {
    mockUsersFindById.mockResolvedValue({ id: 'u1', role: 'admin', sessionVersion: 0 } as never)

    const session = await getSessionFromRequest(requestWithCookie('student'))

    expect(session?.role).toBe('admin')
  })

  test('rejects a cookie whose session version is stale', async () => {
    mockUsersFindById.mockResolvedValue({ id: 'u1', role: 'student', sessionVersion: 1 } as never)

    expect(await getSessionFromRequest(requestWithCookie('student', 0))).toBeNull()
  })
})
