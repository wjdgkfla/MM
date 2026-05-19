import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit'

function getIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

function getRateLimitConfig(pathname: string) {
  // Session check and sign-out are cookie-only operations with no DB writes.
  // Throttling them breaks the app for normal users - exempt entirely.
  if (pathname === '/api/auth/session' || pathname === '/api/auth/sign-out') return null

  // Sign-in and sign-up: strict brute-force protection.
  if (pathname === '/api/auth/sign-in' || pathname === '/api/auth/sign-up') return RATE_LIMITS.auth

  if (pathname.startsWith('/api/upload')) return RATE_LIMITS.upload
  if (pathname.startsWith('/api/messages')) return null
  if (
    pathname.startsWith('/api/listings') ||
    pathname.startsWith('/api/favorites') ||
    pathname.startsWith('/api/reports') ||
    pathname.startsWith('/api/ratings')
  ) {
    return RATE_LIMITS.write
  }
  return RATE_LIMITS.read
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/api/')) return NextResponse.next()

  const ip = getIp(request)
  const messageMethod = request.method.toUpperCase()
  const config = pathname.startsWith('/api/messages')
    ? (messageMethod === 'POST' ? RATE_LIMITS.message : RATE_LIMITS.messageRead)
    : getRateLimitConfig(pathname)

  if (config === null) return NextResponse.next()

  const isAuth = pathname.startsWith('/api/auth/')
  const key = isAuth
    ? `${ip}:${pathname}`
    : `${ip}:${pathname.split('/').slice(0, 4).join('/')}`

  const { allowed, remaining, resetAt } = checkRateLimit(key, config)

  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down and try again.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(config.limit),
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }

  const response = NextResponse.next()
  response.headers.set('X-RateLimit-Limit', String(config.limit))
  response.headers.set('X-RateLimit-Remaining', String(remaining))
  return response
}

export const config = {
  matcher: '/api/:path*',
}
