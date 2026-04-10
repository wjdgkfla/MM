import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME } from '@/lib/auth/constants'
import { AuthSession } from '@/lib/auth/types'
import { UserRole } from '@/lib/types'

export function encodeSession(session: AuthSession) {
  return Buffer.from(JSON.stringify(session), 'utf8').toString('base64url')
}

const SESSION_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000 // 14 days

export function decodeSession(raw: string | undefined): AuthSession | null {
  if (!raw) return null

  try {
    const decoded = Buffer.from(raw, 'base64url').toString('utf8')
    const parsed = JSON.parse(decoded)

    const role: UserRole = parsed?.role === 'admin' ? 'admin' : 'student'

    if (
      typeof parsed?.userId === 'string' &&
      typeof parsed?.email === 'string' &&
      typeof parsed?.displayName === 'string' &&
      typeof parsed?.gmuVerified === 'boolean' &&
      typeof parsed?.issuedAt === 'string'
    ) {
      // Reject sessions older than 14 days even if the cookie hasn't expired
      const issuedAt = new Date(parsed.issuedAt).getTime()
      if (isNaN(issuedAt) || Date.now() - issuedAt > SESSION_MAX_AGE_MS) return null

      return {
        userId: parsed.userId,
        role,
        email: parsed.email,
        displayName: parsed.displayName,
        gmuVerified: parsed.gmuVerified,
        issuedAt: parsed.issuedAt,
      }
    }

    return null
  } catch {
    return null
  }
}

export function getSessionFromRequest(request: NextRequest) {
  const raw = request.cookies.get(AUTH_COOKIE_NAME)?.value
  return decodeSession(raw)
}

export function setSessionCookie(response: NextResponse, session: AuthSession) {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: encodeSession(session),
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 14,
  })
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}
