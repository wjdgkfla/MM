export const CATEGORIES = [
  'textbooks',
  'electronics',
  'furniture',
  'clothing',
  'supplies',
  'free',
  'other',
] as const

export const CONDITIONS = ['new', 'like-new', 'good', 'fair'] as const

export const CAMPUS_LOCATIONS = ['fairfax', 'arlington', 'sci-tech'] as const

export const PICKUP_ZONES = [
  'jc-lobby',
  'fenwick-entrance',
  'sub1-desk',
  'engineering-atrium',
  'shenandoah-deck',
  'potomac-courtyard',
  'van-metre-hall',
  'sci-tech-kiosk',
  'off-campus-fairfax',
] as const

export const LISTING_STATUSES = ['available', 'reserved', 'sold'] as const
export const LISTING_MODERATION_STATES = ['visible', 'flagged', 'hidden'] as const
export const REPORT_REASONS = [
  'spam',
  'scam-concern',
  'prohibited-item',
  'misleading-description',
  'harassment',
  'duplicate-listing',
] as const
export const REPORT_STATUSES = ['open', 'reviewed', 'resolved'] as const

export type Category = (typeof CATEGORIES)[number]
export type Condition = (typeof CONDITIONS)[number]
export type CampusLocation = (typeof CAMPUS_LOCATIONS)[number]
export type PickupZone = (typeof PICKUP_ZONES)[number]
export type ListingStatus = (typeof LISTING_STATUSES)[number]
export type ListingModerationState = (typeof LISTING_MODERATION_STATES)[number]
export type ReportReason = (typeof REPORT_REASONS)[number]
export type ReportStatus = (typeof REPORT_STATUSES)[number]
export type UserRole = 'student' | 'admin'
export type UserAccountState = 'active' | 'suspended'
export type TrustBadge = 'verified-gmu' | 'new-seller' | 'trusted-seller' | 'verification-pending'
export type CampusVerificationState = 'verified' | 'pending'

export interface SellerProfileSnapshot {
  displayName: string
  profileImageUrl?: string
  trustBadge: TrustBadge
  reputationScore: number
  isGmuVerified: boolean
  isStudentSeller: boolean
  homeCampus: CampusLocation
  lastActiveAt: string
  campusVerification: CampusVerificationState
}

export interface Listing {
  id: string
  title: string
  description: string
  price: number
  category: Category
  condition: Condition
  status: ListingStatus
  moderationState: ListingModerationState
  imageUrls: string[]
  sellerId: string
  sellerProfile: SellerProfileSnapshot
  campusLocation: CampusLocation
  pickupZone: PickupZone
  pickupNotes: string
  courseCode?: string
  professorName?: string
  edition?: string
  bundleNotes?: string
  tags: string[]
  favoriteCount: number
  isFavorited?: boolean
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  role: UserRole
  accountState: UserAccountState
  displayName: string
  gmuEmail: string
  gmuEmailVerified: boolean
  profileImageUrl?: string
  isStudentSeller: boolean
  homeCampus: CampusLocation
  campusVerification: CampusVerificationState
  lastActiveAt: string
  joinedAt: string
  trustBadge: TrustBadge
  reputationScore: number
  listingCount: number
}

export interface Message {
  id: string
  listingId: string
  fromUserId: string
  toUserId: string
  body: string
  createdAt: string
}

export interface Report {
  id: string
  listingId: string
  sellerId: string
  reportedByUserId: string
  reason: ReportReason
  notes?: string
  includeSeller: boolean
  status: ReportStatus
  createdAt: string
}

export type AdminActivityAction =
  | 'listing-flagged'
  | 'listing-hidden'
  | 'listing-unhidden'
  | 'listing-removed'
  | 'listing-status-changed'
  | 'user-role-promoted'
  | 'user-role-demoted'
  | 'user-suspended'
  | 'user-activated'
  | 'report-reviewed'
  | 'report-resolved'
  | 'report-reopened'

export interface AdminActivityLog {
  id: string
  actorUserId: string
  actorDisplayName: string
  action: AdminActivityAction
  targetType: 'listing' | 'user' | 'report'
  targetId: string
  notes?: string
  createdAt: string
}

export const CATEGORY_LABELS: Record<Category, string> = {
  textbooks: 'Textbooks',
  electronics: 'Electronics',
  furniture: 'Furniture',
  clothing: 'Clothing',
  supplies: 'School Supplies',
  free: 'Free Stuff',
  other: 'Other',
}

export const CONDITION_LABELS: Record<Condition, string> = {
  new: 'Brand New',
  'like-new': 'Like New',
  good: 'Good',
  fair: 'Fair',
}

export const LOCATION_LABELS: Record<CampusLocation, string> = {
  fairfax: 'Fairfax Campus',
  arlington: 'Arlington Campus',
  'sci-tech': 'Sci-Tech Campus',
}

export const PICKUP_ZONE_LABELS: Record<PickupZone, string> = {
  'jc-lobby': 'Johnson Center Lobby',
  'fenwick-entrance': 'Fenwick Library Entrance',
  'sub1-desk': 'SUB I Front Desk',
  'engineering-atrium': 'Engineering Atrium',
  'shenandoah-deck': 'Shenandoah Parking Deck',
  'potomac-courtyard': 'Potomac Heights Courtyard',
  'van-metre-hall': 'Van Metre Hall (Arlington)',
  'sci-tech-kiosk': 'Sci-Tech Student Kiosk',
  'off-campus-fairfax': 'Off-campus near Fairfax',
}

export const STATUS_LABELS: Record<ListingStatus, string> = {
  available: 'Available',
  reserved: 'Reserved',
  sold: 'Sold',
}

export const TRUST_BADGE_LABELS: Record<TrustBadge, string> = {
  'verified-gmu': 'Verified GMU',
  'new-seller': 'New Seller',
  'trusted-seller': 'Trusted Seller',
  'verification-pending': 'Verification Pending',
}

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: 'Spam',
  'scam-concern': 'Scam concern',
  'prohibited-item': 'Prohibited item',
  'misleading-description': 'Misleading description',
  harassment: 'Harassment',
  'duplicate-listing': 'Duplicate listing',
}
