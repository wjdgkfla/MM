import { createHmac, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME } from '@/lib/auth/constants'
import { AuthSession } from '@/lib/auth/types'
import { UserRole } from '@/lib/types'

// SESSION_SECRET must be set in production.
// Generate with: openssl rand -hex 32
function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      // Hard fail in production — unsafe to run without a real secret
      throw new Error(
        'FATAL: SESSION_SECRET env var is required in production. ' +
        'Generate with: openssl rand -hex 32'
      )
    }
    // Dev warning — doesn't block local development
    console.warn(
      '[Mason Market] WARNING: SESSION_SECRET is not set. ' +
      'Using insecure dev default. This is a security risk if deployed.'
    )
    return 'dev-secret-change-me-in-production'
  }
  if (secret.length < 32) {
    console.warn('[Mason Market] WARNING: SESSION_SECRET is too short. Use at least 32 characters.')
  }
  return secret
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

export function encodeSession(session: AuthSession): string {
  const payload = Buffer.from(JSON.stringify(session), 'utf8').toString('base64url')
  const sig = sign(payload)
  return `${payload}.${sig}`
}

const SESSION_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000 // 14 days

export function decodeSession(raw: string | undefined): AuthSession | null {
  if (!raw) return null

  try {
    const dotIndex = raw.lastIndexOf('.')
    if (dotIndex === -1) return null // no signature — reject legacy unsigned cookies

    const payload = raw.slice(0, dotIndex)
    const sig = raw.slice(dotIndex + 1)

    // Verify HMAC signature using timing-safe comparison
    const expectedSig = sign(payload)
    const sigBuf = Buffer.from(sig, 'base64url')
    const expectedBuf = Buffer.from(expectedSig, 'base64url')
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
      return null // tampered cookie
    }

    const decoded = Buffer.from(payload, 'base64url').toString('utf8')
    const parsed = JSON.parse(decoded)

    const role: UserRole = parsed?.role === 'admin' ? 'admin' : 'student'

    if (
      typeof parsed?.userId === 'string' &&
      typeof parsed?.email === 'string' &&
      typeof parsed?.displayName === 'string' &&
      typeof parsed?.gmuVerified === 'boolean' &&
      typeof parsed?.issuedAt === 'string'
    ) {
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
