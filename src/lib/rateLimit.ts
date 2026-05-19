/**
 * Simple in-memory rate limiter.
 * For production with multiple instances, replace with Upstash Redis:
 * https://github.com/upstash/ratelimit
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    store.forEach((entry, key) => {
      if (entry.resetAt < now) store.delete(key)
    })
  }, 5 * 60 * 1000)
}

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  limit: number
  /** Window duration in seconds */
  windowSecs: number
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const windowMs = config.windowSecs * 1000

  const existing = store.get(key)

  if (!existing || existing.resetAt < now) {
    // New window
    const entry: RateLimitEntry = { count: 1, resetAt: now + windowMs }
    store.set(key, entry)
    return { allowed: true, remaining: config.limit - 1, resetAt: entry.resetAt }
  }

  existing.count++
  const allowed = existing.count <= config.limit
  return {
    allowed,
    remaining: Math.max(0, config.limit - existing.count),
    resetAt: existing.resetAt,
  }
}

/** Rate limit configs per route group */
export const RATE_LIMITS = {
  auth:    { limit: 5,  windowSecs: 60 },  // 5/min — brute force protection
  upload:  { limit: 6,  windowSecs: 60 },  // 6 uploads/min (max 4 files each)
  message: { limit: 15, windowSecs: 60 },  // 15 message sends/min
  messageRead: { limit: 180, windowSecs: 60 }, // inbox/thread polling + read receipts
  write:   { limit: 30, windowSecs: 60 },  // 30 writes/min (listings, favorites, reports)
  read:    { limit: 120, windowSecs: 60 }, // 120 reads/min
} as const
