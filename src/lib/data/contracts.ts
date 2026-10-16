import { Listing, Notification, ReportReason, SavedSearch, User } from '@/lib/types'

export type ListingQuery = {
  category?: Listing['category']
  campusLocation?: Listing['campusLocation']
  pickupZone?: Listing['pickupZone']
  condition?: Listing['condition']
  status?: Listing['status']
  listingKind?: Listing['listingKind']
  search?: string
  minPrice?: number
  maxPrice?: number
  freeOnly?: boolean
  courseTag?: string
  sort?: 'newest' | 'oldest' | 'price-asc' | 'price-desc'
  showHidden?: boolean
  cursor?: { value: string | number; id: string }
  pageSize?: number
}

export type CreateListingInput = Omit<Listing, 'id' | 'createdAt' | 'updatedAt' | 'favoriteCount' | 'isFavorited'>
export type UpdateListingInput = Partial<
  Pick<
    Listing,
    | 'title'
    | 'description'
    | 'price'
    | 'category'
    | 'condition'
    | 'listingKind'
    | 'campusLocation'
    | 'pickupZone'
    | 'pickupNotes'
    | 'courseCode'
    | 'professorName'
    | 'edition'
    | 'bundleNotes'
    | 'tags'
    | 'imageUrls'
    | 'coverImageUrl'
    | 'expiresAt'
    | 'lastRefreshedAt'
  >
>

export type Conversation = {
  id: string
  listingId: string
  participantIds: [string, string]
  lastMessagePreview: string
  lastMessageAt: string
  unreadCount?: number
}

export type UpdateProfileInput = {
  displayName?: string
  bio?: string
  profileImageUrl?: string
  homeCampus?: User['homeCampus']
  marketingEmailOptIn?: boolean
}

export type CreateNotificationInput = Omit<Notification, 'id' | 'createdAt' | 'isRead'> & {
  isRead?: boolean
}

export type CreateSavedSearchInput = Omit<SavedSearch, 'id' | 'createdAt' | 'lastNotifiedAt'>

export type CreateReportInput = {
  listingId: string | null
  sellerId: string
  reportedByUserId: string
  reason: ReportReason
  notes?: string
  includeSeller: boolean
}
