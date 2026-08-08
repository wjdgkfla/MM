import { Listing, PickupZone, TrustBadge, TRUST_BADGE_LABELS } from '@/lib/types'

export const badgeToneByTrust: Record<TrustBadge, string> = {
  'verified-gmu': 'bg-[var(--m-green-soft)] text-[var(--m-green)]',
  'trusted-seller': 'bg-emerald-100 text-emerald-700',
  'new-seller': 'bg-slate-100 text-slate-700',
  'verification-pending': 'bg-[var(--m-gold-soft)] text-[var(--m-gold-text)]',
}

export function trustBadgeLabel(trustBadge: TrustBadge) {
  return TRUST_BADGE_LABELS[trustBadge]
}

export function isCampusMeetupRecommended(pickupZone: PickupZone) {
  return pickupZone !== 'off-campus-fairfax'
}

export function meetupCue(pickupZone: PickupZone) {
  return isCampusMeetupRecommended(pickupZone)
    ? 'Campus meetup recommended'
    : 'Off-campus meetup: use caution'
}

export function listingTrustCues(listing: Listing) {
  return {
    gmuVerified: listing.sellerProfile.isGmuVerified,
    studentSeller: listing.sellerProfile.isStudentSeller,
    campusSeller: `${listing.sellerProfile.homeCampus.replace('-', ' ')} campus seller`,
    meetup: meetupCue(listing.pickupZone),
  }
}

export function mannerTemperature(reputationScore: number): number {
  return Math.round(Math.min(99, Math.max(0, 36.5 + reputationScore)) * 10) / 10
}

// Wilson-score lower bound (95% confidence), scaled to 0-100. Used instead of
// a raw positive-review percentage so a seller with 1/1 positive reviews
// doesn't outrank one with 95/100 — low review counts get pulled toward the
// middle until there's enough evidence. Replaces the old price-weighted
// adjust_reputation_score formula (P0-5): this is derived purely from review
// outcomes, not the dollar value of what was sold.
export function wilsonScore(positive: number, total: number): number {
  if (total <= 0) return 0
  const z = 1.96
  const phat = positive / total
  const z2 = z * z
  const denominator = 1 + z2 / total
  const centre = phat + z2 / (2 * total)
  const margin = z * Math.sqrt((phat * (1 - phat) + z2 / (4 * total)) / total)
  const lowerBound = Math.max(0, (centre - margin) / denominator)
  return Math.round(lowerBound * 1000) / 10
}

export interface ReputationStats {
  completedTransactionCount: number
  reviewCount: number
  positiveReviewPercentage: number
}

// Plain-language reputation summary — P0-5 replaces the single opaque
// "manner temperature" number with transparent components (completed
// transactions + review positivity) for user-facing display.
export function reputationLabel(stats: ReputationStats): string {
  const { completedTransactionCount, reviewCount, positiveReviewPercentage } = stats
  if (completedTransactionCount === 0) {
    return 'New trader — no completed transactions yet'
  }
  const transactionsPart = `${completedTransactionCount} completed transaction${completedTransactionCount === 1 ? '' : 's'}`
  if (reviewCount === 0) {
    return `Trader — ${transactionsPart}, no reviews yet`
  }
  const tag = completedTransactionCount >= 5 && positiveReviewPercentage >= 90 ? 'Reliable trader' : 'Trader'
  return `${tag} — ${transactionsPart}, ${positiveReviewPercentage}% positive`
}
