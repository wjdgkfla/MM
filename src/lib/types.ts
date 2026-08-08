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
  // Fairfax (existing)
  'jc-lobby',
  'fenwick-entrance',
  'sub1-desk',
  'engineering-atrium',
  'shenandoah-deck',
  'potomac-courtyard',
  // Arlington
  'van-metre-hall',
  'hazel-hall-lobby',
  'founders-hall-lobby',
  // Sci-Tech
  'sci-tech-kiosk',
  'innovation-hall-lobby',
  // Shared
  'off-campus-fairfax',
  'off-campus-arlington',
] as const

export const CAMPUS_ZONE_MAP: Record<string, string[]> = {
  fairfax:    ['jc-lobby', 'fenwick-entrance', 'sub1-desk', 'engineering-atrium', 'shenandoah-deck', 'potomac-courtyard', 'off-campus-fairfax'],
  arlington:  ['van-metre-hall', 'hazel-hall-lobby', 'founders-hall-lobby', 'off-campus-arlington'],
  'sci-tech': ['sci-tech-kiosk', 'innovation-hall-lobby', 'off-campus-fairfax'],
}

export const LISTING_STATUSES = ['available', 'reserved', 'sold'] as const
export const LISTING_KINDS = ['sell', 'wanted'] as const
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
export type ListingKind = (typeof LISTING_KINDS)[number]
export type ListingModerationState = (typeof LISTING_MODERATION_STATES)[number]
export type ReportReason = (typeof REPORT_REASONS)[number]
export type ReportStatus = (typeof REPORT_STATUSES)[number]
export type UserRole = 'student' | 'admin'
export type UserAccountState = 'active' | 'suspended'
export type TrustBadge = 'verified-gmu' | 'new-seller' | 'trusted-seller' | 'verification-pending'
export type CampusVerificationState = 'verified' | 'pending'

export interface SellerProfileSnapshot {
  displayName: string
  bio?: string
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
  listingKind: ListingKind
  moderationState: ListingModerationState
  imageUrls: string[]
  coverImageUrl?: string
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
  viewCount?: number
  isStale?: boolean
  isExpired?: boolean
  expiresAt?: string
  lastRefreshedAt?: string
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
  bio?: string
  marketingEmailOptIn?: boolean
  isStudentSeller: boolean
  homeCampus: CampusLocation
  campusVerification: CampusVerificationState
  lastActiveAt: string
  joinedAt: string
  trustBadge: TrustBadge
  reputationScore: number
  listingCount: number
  sessionVersion: number
}

export type MessageType = 'text' | 'offer' | 'meetup'
export type OfferStatus = 'pending' | 'accepted' | 'declined'
export const MEETUP_STATUSES = ['proposed', 'confirmed', 'rescheduled', 'cancelled', 'completed'] as const
export type MeetupStatus = (typeof MEETUP_STATUSES)[number]

export interface Message {
  id: string
  listingId: string
  fromUserId: string
  toUserId: string
  body: string
  type?: MessageType
  offerAmount?: number
  offerStatus?: OfferStatus
  meetupStatus?: MeetupStatus
  meetupZone?: PickupZone
  meetupTime?: string
  createdAt: string
}

export type NotificationType =
  | 'new-message'
  | 'offer-update'
  | 'meetup-update'
  | 'price-drop'
  | 'saved-search-match'
  | 'listing-expiry'
  | 'moderation'
  | 'account'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  link?: string
  meta?: Record<string, unknown>
  isRead: boolean
  createdAt: string
}

export interface SavedSearch {
  id: string
  userId: string
  label: string
  query: string
  filters: Record<string, unknown>
  createdAt: string
  lastNotifiedAt?: string
}

export interface PriceWatch {
  userId: string
  listingId: string
  lastSeenPrice: number
  createdAt: string
}

export const RATING_TAGS = [
  'fast-response',
  'item-as-described',
  'safe-meetup',
  'good-communication',
  'easy-transaction',
] as const
export type RatingTag = (typeof RATING_TAGS)[number]
export type RatingScore = 1 | -1

export interface Rating {
  id: string
  sellerId: string
  buyerId: string
  listingId: string
  score: RatingScore
  tags: RatingTag[]
  createdAt: string
}

export const RATING_TAG_LABELS: Record<RatingTag, string> = {
  'fast-response': 'Fast response',
  'item-as-described': 'Item as described',
  'safe-meetup': 'Safe meetup',
  'good-communication': 'Good communication',
  'easy-transaction': 'Easy transaction',
}

export interface SessionUser {
  id: string
  name: string
  email: string
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
  'hazel-hall-lobby':      'Hazel Hall Lobby (Arlington)',
  'founders-hall-lobby':   'Founders Hall Lobby — Law School',
  'sci-tech-kiosk': 'Sci-Tech Student Kiosk',
  'innovation-hall-lobby': 'Innovation Hall Lobby (Sci-Tech)',
  'off-campus-fairfax': 'Off-campus near Fairfax',
  'off-campus-arlington':  'Off-campus near Arlington',
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

export const TRANSACTION_STATUSES = [
  'initiated',
  'reserved',
  'meetup_scheduled',
  'completed',
  'cancelled',
  'disputed',
] as const
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number]

export interface Transaction {
  id: string
  listingId: string
  sellerId: string
  buyerId: string
  acceptedOfferMessageId?: string
  askingPrice: number
  agreedPrice?: number
  status: TransactionStatus
  meetupZone?: PickupZone
  meetupTime?: string
  sellerConfirmedAt?: string
  buyerConfirmedAt?: string
  completedAt?: string
  cancelledAt?: string
  cancellationReason?: string
  createdAt: string
  updatedAt: string
}
