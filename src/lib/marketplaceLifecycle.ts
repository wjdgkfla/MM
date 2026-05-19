const DEFAULT_LISTING_DAYS = 60
const STALE_LISTING_DAYS = 30

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

export function getDefaultListingExpiry(now = new Date()): Date {
  return addDays(now, DEFAULT_LISTING_DAYS)
}

export function calculateListingLifecycle(input: {
  now?: Date
  expiresAt?: string | null
  lastRefreshedAt?: string | null
  createdAt?: string | null
}) {
  const now = input.now ?? new Date()
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null
  const lastActivityAt = input.lastRefreshedAt || input.createdAt
  const staleAfter = lastActivityAt ? addDays(new Date(lastActivityAt), STALE_LISTING_DAYS) : null

  return {
    isExpired: Boolean(expiresAt && expiresAt.getTime() <= now.getTime()),
    isStale: Boolean(staleAfter && staleAfter.getTime() <= now.getTime()),
  }
}

export function shouldCreatePriceDropNotification(previousPrice: number, nextPrice: number): boolean {
  return Number.isFinite(previousPrice) && Number.isFinite(nextPrice) && nextPrice >= 0 && nextPrice < previousPrice
}
