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
  // Only sign-in and sign-up get the strict 5/min brute-force limit.
  // The session check (/api/auth/session) fires on every page navigation —
  // rate-limiting it at 5/min would sign users out after ~5 page loads.
  if (pathname === '/api/auth/sign-in' || pathname === '/api/auth/sign-up') return RATE_LIMITS.auth
  if (pathname.startsWith('/api/upload')) return RATE_LIMITS.upload
  if (pathname.startsWith('/api/messages')) return RATE_LIMITS.message
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only rate-limit API routes
  if (!pathname.startsWith('/api/')) return NextResponse.next()

  const ip = getIp(request)
  const config = getRateLimitConfig(pathname)
  // Auth routes use full pathname so sign-in and sign-up have separate buckets.
  // Other routes use a prefix key (covers all sub-paths together).
  const isAuth = pathname.startsWith('/api/auth/')
  const key = isAuth
    ? `${ip}:${pathname}` // e.g. "1.2.3.4:/api/auth/sign-in"
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
