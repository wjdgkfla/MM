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
