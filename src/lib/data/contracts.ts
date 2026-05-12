import {
  AdminActivityLog,
  Listing,
  ListingModerationState,
  ListingStatus,
  Message,
  Report,
  ReportReason,
  ReportStatus,
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
  search?: string
  minPrice?: number
  maxPrice?: number
  freeOnly?: boolean
  courseTag?: string
  sort?: 'newest' | 'price-asc' | 'price-desc'
  showHidden?: boolean
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
    | 'campusLocation'
    | 'pickupZone'
    | 'pickupNotes'
    | 'courseCode'
    | 'professorName'
    | 'edition'
    | 'bundleNotes'
    | 'tags'
    | 'imageUrls'
  >
>

export type Conversation = {
  id: string
  listingId: string
  participantIds: [string, string]
  lastMessagePreview: string
  lastMessageAt: string
}

export type CreateReportInput = {
  listingId: string
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
  reports: ReportsRepository
  adminActivity: AdminActivityRepository
}
