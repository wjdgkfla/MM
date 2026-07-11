import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, isMessageRoute, rateLimitKey, RATE_LIMITS } from '@/lib/rateLimit'

function getIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

function getRateLimitConfig(pathname: string, method: string) {
  // Session check and sign-out are cookie-only operations with no DB writes.
  // Throttling them breaks the app for normal users - exempt entirely.
  if (pathname === '/api/auth/session' || pathname === '/api/auth/sign-out') return null

  // Sign-in and sign-up: strict brute-force protection.
  if (pathname === '/api/auth/sign-in' || pathname === '/api/auth/sign-up') return RATE_LIMITS.auth

  if (pathname.startsWith('/api/upload')) return RATE_LIMITS.upload
  if (
    pathname.startsWith('/api/listings') ||
    pathname.startsWith('/api/favorites') ||
    pathname.startsWith('/api/reports') ||
    pathname.startsWith('/api/ratings')
  ) {
    // Browsing/reading (GET) shouldn't share a bucket with mutations — campus
    // wifi NATs many students behind one IP, so plain browsing traffic could
    // otherwise exhaust the write budget and block posting from that IP too.
    return method === 'GET' ? RATE_LIMITS.read : RATE_LIMITS.write
  }
  return RATE_LIMITS.read
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/api/')) return NextResponse.next()

  const ip = getIp(request)
  const messageMethod = request.method.toUpperCase()
  const config = isMessageRoute(pathname)
    ? (messageMethod === 'POST' ? RATE_LIMITS.message : RATE_LIMITS.messageRead)
    : getRateLimitConfig(pathname, messageMethod)

  if (config === null) return NextResponse.next()

  const key = rateLimitKey(ip, pathname)
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
