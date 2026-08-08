import {
  AdminActivityLog,
  Listing,
  ListingModerationState,
  ListingStatus,
  Message,
  Notification,
  PriceWatch,
  Report,
  ReportReason,
  ReportStatus,
  SavedSearch,
  User,
  UserAccountState,
  UserRole,
} from '@/lib/types'

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

export interface ListingsRepository {
  findMany(query?: ListingQuery): Listing[]
  findById(id: string): Listing | undefined
  findBySellerId(sellerId: string): Listing[]
  create(input: CreateListingInput): Listing
  update(id: string, input: UpdateListingInput): Listing | null
  updateStatus(id: string, status: ListingStatus): Listing | null
  updateModerationState(id: string, moderationState: ListingModerationState): Listing | null
  remove(id: string): boolean
  countBySellerId(sellerId: string): number
}

export interface UsersRepository {
  findAll(): User[]
  findById(id: string): User | undefined
  findByEmail(email: string): User | undefined
  upsert(input: { email: string; displayName: string; role?: UserRole }): User
  updateRole(id: string, role: UserRole): User | null
  updateAccountState(id: string, accountState: UserAccountState): User | null
  updateProfile(id: string, input: UpdateProfileInput): User | null
}

// Placeholder interface for future DB-backed favorites table.
export interface FavoritesRepository {
  listListingIdsByUser(userId: string): string[]
  add(userId: string, listingId: string): void
  remove(userId: string, listingId: string): void
}

export interface ConversationsRepository {
  listByUser(userId: string): Conversation[]
}

export interface MessagesRepository {
  listByListing(listingId: string, userId?: string): Message[]
  listThread(listingId: string, userA: string, userB: string): Message[]
  create(input: Omit<Message, 'id' | 'createdAt'>): Message
}

export interface NotificationsRepository {
  listByUser(userId: string): Notification[]
  create(input: CreateNotificationInput): Notification
  markRead(userId: string, id: string): Notification | null
  markAllRead(userId: string): void
}

export interface SavedSearchesRepository {
  listByUser(userId: string): SavedSearch[]
  create(input: CreateSavedSearchInput): SavedSearch
  remove(userId: string, id: string): boolean
}

export interface PriceWatchesRepository {
  listByUser(userId: string): PriceWatch[]
  upsert(userId: string, listingId: string, lastSeenPrice: number): PriceWatch
  remove(userId: string, listingId: string): boolean
}

export interface ReportsRepository {
  listAll(): Report[]
  create(input: CreateReportInput): Report
  updateStatus(id: string, status: ReportStatus): Report | null
}

export interface AdminActivityRepository {
  listAll(): AdminActivityLog[]
  create(input: Omit<AdminActivityLog, 'id' | 'createdAt'>): AdminActivityLog
}

export interface MarketplaceDataAccess {
  listings: ListingsRepository
  users: UsersRepository
  favorites: FavoritesRepository
  conversations: ConversationsRepository
  messages: MessagesRepository
  notifications: NotificationsRepository
  savedSearches: SavedSearchesRepository
  priceWatches: PriceWatchesRepository
  reports: ReportsRepository
  adminActivity: AdminActivityRepository
}
