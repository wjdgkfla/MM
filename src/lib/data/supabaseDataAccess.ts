/**
 * Supabase (Postgres) data access layer.
 * Drop-in replacement for firestoreDataAccess.ts — identical exported function signatures.
 */
import { getSupabaseAdmin } from '@/lib/supabase/server'
import {
  AdminActivityLog,
  Listing,
  ListingModerationState,
  ListingStatus,
  Message,
  Rating,
  RatingScore,
  RatingTag,
  Notification,
  PickupZone,
  PriceWatch,
  Report,
  ReportStatus,
  SavedSearch,
  Transaction,
  User,
  UserAccountState,
  UserRole,
} from '@/lib/types'
import {
  CreateListingInput,
  CreateNotificationInput,
  CreateReportInput,
  CreateSavedSearchInput,
  ListingQuery,
  UpdateListingInput,
  UpdateProfileInput,
} from '@/lib/data/contracts'
import {
  calculateListingLifecycle,
  getDefaultListingExpiry,
  shouldCreatePriceDropNotification,
} from '@/lib/marketplaceLifecycle'
import { conversationUnreadCount, recoverConversationSummariesFromMessages } from '@/lib/readState'
import { wilsonScore } from '@/lib/trust'

// ─── Helpers ───────────────────────────────────────────────────────────────

import { randomBytes } from 'crypto'

function nanoid(len = 20): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const charsLen = chars.length
  // Rejection sampling: discard bytes that would cause modulo bias
  // (256 % 62 = 10, so bytes 246-255 are slightly biased without this)
  const maxValid = 256 - (256 % charsLen)
  let result = ''
  while (result.length < len) {
    const batch = randomBytes(len * 2)
    for (let i = 0; i < batch.length && result.length < len; i++) {
      if (batch[i] < maxValid) result += chars[batch[i] % charsLen]
    }
  }
  return result
}

function buildConversationId(listingId: string, userA: string, userB: string): string {
  return `${listingId}:${[userA, userB].sort().join(':')}`
}

function rowToListing(row: Record<string, unknown>): Listing {
  const createdAt = row.created_at ? new Date(String(row.created_at)).toISOString() : new Date().toISOString()
  const updatedAt = row.updated_at ? new Date(String(row.updated_at)).toISOString() : new Date().toISOString()
  const lastRefreshedAt = row.last_refreshed_at
    ? new Date(String(row.last_refreshed_at)).toISOString()
    : createdAt
  const expiresAt = row.expires_at
    ? new Date(String(row.expires_at)).toISOString()
    : getDefaultListingExpiry(new Date(lastRefreshedAt)).toISOString()
  const lifecycle = calculateListingLifecycle({ expiresAt, lastRefreshedAt, createdAt })

  return {
    id: String(row.id),
    title: String(row.title || ''),
    description: String(row.description || ''),
    price: Number(row.price) || 0,
    category: (row.category as Listing['category']) || 'other',
    condition: (row.condition as Listing['condition']) || 'good',
    status: (row.status as ListingStatus) || 'available',
    listingKind: (row.listing_kind as Listing['listingKind']) || 'sell',
    moderationState: (row.moderation_state as ListingModerationState) || 'visible',
    imageUrls: Array.isArray(row.image_urls) ? (row.image_urls as string[]) : [],
    coverImageUrl: row.cover_image_url ? String(row.cover_image_url) : undefined,
    sellerId: String(row.seller_id || ''),
    sellerProfile: (row.seller_profile as Listing['sellerProfile']) || {
      displayName: 'Unknown',
      bio: '',
      trustBadge: 'new-seller',
      reputationScore: 0,
      isGmuVerified: false,
      isStudentSeller: true,
      homeCampus: 'fairfax',
      lastActiveAt: new Date().toISOString(),
      campusVerification: 'pending',
    },
    campusLocation: (row.campus_location as Listing['campusLocation']) || 'fairfax',
    pickupZone: (row.pickup_zone as Listing['pickupZone']) || 'jc-lobby',
    pickupNotes: String(row.pickup_notes || ''),
    courseCode: row.course_code ? String(row.course_code) : undefined,
    professorName: row.professor_name ? String(row.professor_name) : undefined,
    edition: row.edition ? String(row.edition) : undefined,
    bundleNotes: row.bundle_notes ? String(row.bundle_notes) : undefined,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    favoriteCount: Number(row.favorite_count) || 0,
    viewCount: Number(row.view_count) || 0,
    isStale: lifecycle.isStale,
    isExpired: lifecycle.isExpired,
    expiresAt,
    lastRefreshedAt,
    isFavorited: false,
    createdAt,
    updatedAt,
  }
}

function rowToUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    role: (row.role as UserRole) || 'student',
    accountState: (row.account_state as UserAccountState) || 'active',
    displayName: String(row.display_name || ''),
    gmuEmail: String(row.gmu_email || ''),
    gmuEmailVerified: Boolean(row.gmu_email_verified ?? true),
    profileImageUrl: row.profile_image_url ? String(row.profile_image_url) : undefined,
    bio: String(row.bio || ''),
    marketingEmailOptIn: Boolean(row.marketing_email_opt_in ?? false),
    isStudentSeller: Boolean(row.is_student_seller ?? true),
    homeCampus: (row.home_campus as User['homeCampus']) || 'fairfax',
    campusVerification: (row.campus_verification as User['campusVerification']) || 'pending',
    lastActiveAt: row.last_active_at ? new Date(String(row.last_active_at)).toISOString() : new Date().toISOString(),
    joinedAt: row.joined_at ? new Date(String(row.joined_at)).toISOString() : new Date().toISOString(),
    trustBadge: (row.trust_badge as User['trustBadge']) || 'new-seller',
    reputationScore: Number(row.reputation_score) || 0,
    listingCount: Number(row.listing_count) || 0,
    sessionVersion: Number(row.session_version) || 0,
  }
}

function rowToMessage(row: Record<string, unknown>): Message {
  return {
    id: String(row.id),
    listingId: String(row.listing_id || ''),
    fromUserId: String(row.from_user_id || ''),
    toUserId: String(row.to_user_id || ''),
    body: String(row.body || ''),
    type: row.type === 'offer' ? 'offer' : row.type === 'meetup' ? 'meetup' : 'text',
    offerAmount: row.offer_amount != null ? Number(row.offer_amount) : undefined,
    offerStatus: row.offer_status ? (row.offer_status as Message['offerStatus']) : undefined,
    parentOfferMessageId: row.parent_offer_message_id ? String(row.parent_offer_message_id) : undefined,
    expiresAt: row.expires_at ? new Date(String(row.expires_at)).toISOString() : undefined,
    meetupStatus: row.meetup_status ? (row.meetup_status as Message['meetupStatus']) : undefined,
    meetupZone: row.meetup_zone ? (row.meetup_zone as Message['meetupZone']) : undefined,
    meetupTime: row.meetup_time ? new Date(String(row.meetup_time)).toISOString() : undefined,
    presenceStatus: row.presence_status ? (row.presence_status as Message['presenceStatus']) : undefined,
    createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : new Date().toISOString(),
  }
}

function rowToNotification(row: Record<string, unknown>): Notification {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    type: row.type as Notification['type'],
    title: String(row.title || ''),
    body: String(row.body || ''),
    link: row.link ? String(row.link) : undefined,
    meta: row.meta && typeof row.meta === 'object' ? (row.meta as Record<string, unknown>) : undefined,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : new Date().toISOString(),
  }
}

function rowToSavedSearch(row: Record<string, unknown>): SavedSearch {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    label: String(row.label || ''),
    query: String(row.query || ''),
    filters: row.filters && typeof row.filters === 'object' ? (row.filters as Record<string, unknown>) : {},
    lastNotifiedAt: row.last_notified_at ? new Date(String(row.last_notified_at)).toISOString() : undefined,
    createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : new Date().toISOString(),
  }
}

function rowToPriceWatch(row: Record<string, unknown>): PriceWatch {
  return {
    userId: String(row.user_id),
    listingId: String(row.listing_id),
    lastSeenPrice: Number(row.last_seen_price) || 0,
    createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : new Date().toISOString(),
  }
}

function rowToReport(row: Record<string, unknown>): Report {
  return {
    id: String(row.id),
    listingId: String(row.listing_id || ''),
    sellerId: String(row.seller_id || ''),
    reportedByUserId: String(row.reported_by_user_id || ''),
    reason: (row.reason as Report['reason']) || 'spam',
    notes: row.notes ? String(row.notes) : undefined,
    includeSeller: Boolean(row.include_seller),
    status: (row.status as ReportStatus) || 'open',
    createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : new Date().toISOString(),
  }
}

function rowToAdminActivity(row: Record<string, unknown>): AdminActivityLog {
  return {
    id: String(row.id),
    actorUserId: String(row.actor_user_id || ''),
    actorDisplayName: String(row.actor_display_name || ''),
    action: row.action as AdminActivityLog['action'],
    targetType: row.target_type as AdminActivityLog['targetType'],
    targetId: String(row.target_id || ''),
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : new Date().toISOString(),
  }
}

function rowToRating(row: Record<string, unknown>): Rating {
  return {
    id: String(row.id),
    sellerId: String(row.seller_id || ''),
    buyerId: String(row.buyer_id || ''),
    listingId: String(row.listing_id || ''),
    transactionId: String(row.transaction_id || ''),
    reviewerId: String(row.reviewer_id || ''),
    revieweeId: String(row.reviewee_id || ''),
    score: Number(row.score) === -1 ? -1 : 1,
    tags: Array.isArray(row.tags) ? (row.tags as RatingTag[]) : [],
    createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : new Date().toISOString(),
  }
}

// ─── Listings ──────────────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 24

function buildListingsQuery(db: ReturnType<typeof getSupabaseAdmin>, query: ListingQuery | undefined) {
  let q = db.from('listings').select('*').is('deleted_at', null)

  // Non-admins never see hidden listings. Admins can opt in via showHidden
  // (e.g. the moderation queue) — otherwise they get the same visible+flagged
  // view as everyone else.
  if (!query?.showHidden) q = q.in('moderation_state', ['visible', 'flagged'])

  // Sold listings are excluded from the default browse feed so DB-level
  // pagination (hasMore) stays accurate. An explicit status filter (e.g. a
  // seller checking their own sold items) overrides this.
  if (query?.status)         q = q.eq('status', query.status)
  else if (!query?.showHidden) q = q.neq('status', 'sold')

  if (query?.category)       q = q.eq('category', query.category)
  if (query?.listingKind)    q = q.eq('listing_kind', query.listingKind)
  if (query?.campusLocation) q = q.eq('campus_location', query.campusLocation)
  if (query?.condition)      q = q.eq('condition', query.condition)
  if (query?.pickupZone)     q = q.eq('pickup_zone', query.pickupZone)
  if (query?.freeOnly)       q = q.eq('price', 0)
  if (query?.minPrice != null && query.minPrice >= 0) q = q.gte('price', query.minPrice)
  if (query?.maxPrice != null && query.maxPrice >= 0) q = q.lte('price', query.maxPrice)

  // courseTag matches against course_code_normalized and tags_normalized —
  // generated columns (see 20260704000000_search_and_pagination.sql) that
  // strip non-alphanumerics so the match is a real SQL WHERE clause instead
  // of pulling rows into JS to filter.
  if (query?.courseTag) {
    const normalized = query.courseTag.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (normalized) {
      q = q.or(`course_code_normalized.ilike.%${normalized}%,tags_normalized.ilike.%${normalized}%`)
    }
  }

  if (query?.search) {
    const term = query.search.trim().split(/\s+/).join(' & ')
    q = q.textSearch('search_vector', term, { type: 'websearch', config: 'english' })
  }

  // Cursor pagination keys off the same column used to sort, plus id as a
  // tiebreaker, so paging stays stable while listings change underneath it
  // (offset pagination can skip/duplicate rows when that happens).
  const sortsAscending = query?.sort === 'oldest' || query?.sort === 'price-asc'
  const cursorField = query?.sort === 'price-asc' || query?.sort === 'price-desc' ? 'price' : 'created_at'
  const cmp = sortsAscending ? 'gt' : 'lt'

  if (query?.cursor) {
    const value = cursorField === 'price' ? Number(query.cursor.value) : String(query.cursor.value)
    q = q.or(`${cursorField}.${cmp}.${value},and(${cursorField}.eq.${value},id.${cmp}.${query.cursor.id})`)
  }

  if (query?.sort === 'price-asc')       q = q.order('price', { ascending: true }).order('id', { ascending: true })
  else if (query?.sort === 'price-desc') q = q.order('price', { ascending: false }).order('id', { ascending: false })
  else if (query?.sort === 'oldest')     q = q.order('created_at', { ascending: true }).order('id', { ascending: true })
  else                                   q = q.order('created_at', { ascending: false }).order('id', { ascending: false })

  return q
}

export async function listingsFindMany(
  query?: ListingQuery
): Promise<{ listings: Listing[]; nextCursor: { value: string | number; id: string } | null }> {
  const db = getSupabaseAdmin()
  const pageSize = query?.pageSize ?? DEFAULT_PAGE_SIZE

  const q = buildListingsQuery(db, query).limit(pageSize)
  const { data, error } = await q
  if (error) {
    console.error('listingsFindMany error:', error)
    return { listings: [], nextCursor: null }
  }

  const rows = (data || []) as Record<string, unknown>[]
  const listings = rows.map((r) => rowToListing(r))

  let nextCursor: { value: string | number; id: string } | null = null
  if (listings.length === pageSize) {
    const lastRow = rows[rows.length - 1]
    const cursorField = query?.sort === 'price-asc' || query?.sort === 'price-desc' ? 'price' : 'created_at'
    const value = cursorField === 'price' ? Number(lastRow.price) : String(lastRow.created_at)
    nextCursor = { value, id: String(lastRow.id) }
  }

  return { listings, nextCursor }
}

export async function listingsFindById(id: string): Promise<Listing | undefined> {
  if (!id || id.trim().length === 0) return undefined
  const { data, error } = await getSupabaseAdmin()
    .from('listings')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  if (error || !data) return undefined
  return rowToListing(data as Record<string, unknown>)
}

export async function listingsFindByIds(ids: string[]): Promise<Listing[]> {
  if (ids.length === 0) return []
  const { data, error } = await getSupabaseAdmin()
    .from('listings')
    .select('*')
    .in('id', ids)
    .is('deleted_at', null)
  if (error) throw new Error(error.message)
  if (!data) return []
  const byId = new Map(
    (data as Record<string, unknown>[]).map((r) => {
      const l = rowToListing(r)
      return [l.id, l]
    })
  )
  return ids.map((id) => byId.get(id)).filter((l): l is Listing => l !== undefined)
}

// One grouped COUNT query for the number of visible, non-sold listings per
// category — backs SubNavRail hiding pills for categories with no listings.
export async function listingsCountByCategory(): Promise<Record<string, number>> {
  const { data, error } = await getSupabaseAdmin()
    .from('listings')
    .select('category, count:id.count()')
    .is('deleted_at', null)
    .in('moderation_state', ['visible', 'flagged'])
    .neq('status', 'sold')
  if (error) throw new Error(error.message)
  const counts: Record<string, number> = {}
  for (const row of (data || []) as Record<string, unknown>[]) {
    counts[String(row.category)] = Number(row.count) || 0
  }
  return counts
}

// Single count(*) query for a seller's active listing count — avoids
// fetching every listing by that seller into the app just to filter/count.
export async function listingsCountBySellerId(sellerId: string): Promise<number> {
  const { count, error } = await getSupabaseAdmin()
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('seller_id', sellerId)
    .neq('status', 'sold')
    .neq('moderation_state', 'hidden')
    .is('deleted_at', null)
  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function listingsFindBySellerId(sellerId: string): Promise<Listing[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('listings')
    .select('*')
    .eq('seller_id', sellerId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return ((data || []) as Record<string, unknown>[]).map(rowToListing)
}

// Admin/moderation view — intentionally includes soft-deleted listings so
// support can still see them for disputes/investigations. Do not add a
// deleted_at filter here.
export async function listingsListAllForAdmin(): Promise<Listing[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('listings')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return ((data || []) as Record<string, unknown>[]).map(rowToListing)
}

export async function listingsCreate(input: CreateListingInput): Promise<Listing> {
  const now = new Date().toISOString()
  const id = nanoid()
  const row = {
    id,
    title: input.title,
    description: input.description,
    price: input.price,
    category: input.category,
    condition: input.condition,
    status: input.status,
    listing_kind: input.listingKind || 'sell',
    moderation_state: input.moderationState,
    image_urls: input.imageUrls,
    cover_image_url: input.coverImageUrl ?? input.imageUrls[0] ?? null,
    seller_id: input.sellerId,
    seller_profile: input.sellerProfile,
    campus_location: input.campusLocation,
    pickup_zone: input.pickupZone,
    pickup_notes: input.pickupNotes,
    course_code: input.courseCode ?? null,
    professor_name: input.professorName ?? null,
    edition: input.edition ?? null,
    bundle_notes: input.bundleNotes ?? null,
    tags: input.tags,
    favorite_count: 0,
    view_count: 0,
    expires_at: input.expiresAt ?? getDefaultListingExpiry(new Date(now)).toISOString(),
    last_refreshed_at: input.lastRefreshedAt ?? now,
    created_at: now,
    updated_at: now,
  }
  const { data, error } = await getSupabaseAdmin()
    .from('listings')
    .insert(row)
    .select()
    .single()
  if (error || !data) throw new Error(error?.message || 'Failed to create listing')
  return rowToListing(data as Record<string, unknown>)
}

export async function listingsUpdate(id: string, input: UpdateListingInput): Promise<Listing | null> {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.title !== undefined)       updates.title = input.title
  if (input.description !== undefined) updates.description = input.description
  if (input.price !== undefined)       updates.price = input.price
  if (input.category !== undefined)    updates.category = input.category
  if (input.condition !== undefined)   updates.condition = input.condition
  if (input.listingKind !== undefined) updates.listing_kind = input.listingKind
  if (input.campusLocation !== undefined) updates.campus_location = input.campusLocation
  if (input.pickupZone !== undefined)  updates.pickup_zone = input.pickupZone
  if (input.pickupNotes !== undefined) updates.pickup_notes = input.pickupNotes
  if (input.tags !== undefined)        updates.tags = input.tags
  if (input.imageUrls !== undefined)   updates.image_urls = input.imageUrls
  if (input.coverImageUrl !== undefined) updates.cover_image_url = input.coverImageUrl
  if (input.expiresAt !== undefined) updates.expires_at = input.expiresAt
  if (input.lastRefreshedAt !== undefined) updates.last_refreshed_at = input.lastRefreshedAt
  if ('courseCode' in input)    updates.course_code = input.courseCode ?? null
  if ('professorName' in input) updates.professor_name = input.professorName ?? null
  if ('edition' in input)       updates.edition = input.edition ?? null
  if ('bundleNotes' in input)   updates.bundle_notes = input.bundleNotes ?? null

  const existing = await listingsFindById(id)

  const { data, error } = await getSupabaseAdmin()
    .from('listings')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error || !data) return null
  const updated = rowToListing(data as Record<string, unknown>)
  if (existing && shouldCreatePriceDropNotification(existing.price, updated.price)) {
    await notifyPriceWatchers(updated, existing.price).catch((notifyError) => {
      console.error('notifyPriceWatchers error:', notifyError)
    })
  }
  return updated
}

export async function listingsUpdateStatus(id: string, status: ListingStatus): Promise<Listing | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('listings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error || !data) return null
  return rowToListing(data as Record<string, unknown>)
}

export async function listingsUpdateModerationState(
  id: string,
  moderationState: ListingModerationState
): Promise<Listing | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('listings')
    .update({ moderation_state: moderationState, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error || !data) return null
  return rowToListing(data as Record<string, unknown>)
}

export async function listingsRemove(id: string, deletedBy: string): Promise<boolean> {
  const { error } = await getSupabaseAdmin()
    .from('listings')
    .update({ deleted_at: new Date().toISOString(), deleted_by: deletedBy })
    .eq('id', id)
    .is('deleted_at', null)
  return !error
}

export async function listingsIncrementViewCount(id: string): Promise<void> {
  // Use the Postgres RPC for an atomic increment (no read-modify-write race condition).
  // Run schema-addons.sql in Supabase to create this function if it's missing.
  const { error } = await getSupabaseAdmin().rpc('increment_view_count', { listing_id: id })
  if (error) {
    console.error(`increment_view_count(${id}) error:`, error.message)
  }
}

// ─── Users ─────────────────────────────────────────────────────────────────

export async function usersFindAll(): Promise<User[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .select('*')
    .order('joined_at', { ascending: false })
  if (error) throw new Error(error.message)
  return ((data || []) as Record<string, unknown>[]).map(rowToUser)
}

export async function usersFindById(id: string): Promise<User | undefined> {
  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return undefined
  return rowToUser(data as Record<string, unknown>)
}

export async function usersFindByEmail(email: string): Promise<User | undefined> {
  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .select('*')
    .eq('gmu_email', email.trim().toLowerCase())
    .single()
  if (error || !data) return undefined
  return rowToUser(data as Record<string, unknown>)
}

export async function usersUpsert(input: {
  email: string
  displayName: string
  role?: UserRole
  supabaseId: string
  marketingEmailOptIn?: boolean
}): Promise<User> {
  const normalized = input.email.trim().toLowerCase()
  const role = input.role || 'student'
  const now = new Date().toISOString()
  const db = getSupabaseAdmin()

  // Step 1: Try to find existing user by Supabase UUID (the fast, normal path)
  const { data: existingById } = await db
    .from('users').select('*').eq('id', input.supabaseId).single()

  if (existingById) {
    // User already exists — refresh last_active_at and return
    const { data, error } = await db
      .from('users')
      .update({ last_active_at: now, role })
      .eq('id', input.supabaseId)
      .select().single()
    if (error || !data) throw new Error(error?.message || 'Failed to update user')
    return rowToUser(data as Record<string, unknown>)
  }

  // Step 2: Try to find by email (handles re-created auth users with new UUID,
  // or any scenario where the supabaseId doesn't match the stored id)
  const { data: existingByEmail } = await db
    .from('users').select('*').eq('gmu_email', normalized).single()

  if (existingByEmail) {
    // User exists under a different id — return them as-is.
    // We don't update the PK because that would break all FK references
    // (listings, messages, favorites). Their existing id is still valid.
    await db.from('users').update({ last_active_at: now }).eq('gmu_email', normalized)
    return rowToUser(existingByEmail as Record<string, unknown>)
  }

  // Step 3: Brand-new user — insert
  const { data, error } = await db
    .from('users')
    .insert({
      id: input.supabaseId,
      role,
      account_state: 'active',
      display_name: input.displayName || normalized.split('@')[0],
      gmu_email: normalized,
      marketing_email_opt_in: Boolean(input.marketingEmailOptIn),
      gmu_email_verified: true,
      is_student_seller: role !== 'admin',
      home_campus: 'fairfax',
      campus_verification: 'verified',
      trust_badge: 'verified-gmu',
      reputation_score: role === 'admin' ? 5 : 0,
      last_active_at: now,
      joined_at: now,
      listing_count: 0,
    })
    .select().single()

  if (error || !data) throw new Error(error?.message || 'Failed to create user')
  return rowToUser(data as Record<string, unknown>)
}

// Bumps session_version so every previously-issued app session cookie for
// this user fails its version check on the next request — used on password
// reset so a cookie stolen before the reset can't keep working afterward.
export async function usersBumpSessionVersion(id: string): Promise<void> {
  await getSupabaseAdmin().rpc('increment_session_version', { user_id: id })
}

export async function usersUpdateRole(id: string, role: UserRole): Promise<User | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .update({ role, is_student_seller: role !== 'admin', last_active_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error || !data) return null
  return rowToUser(data as Record<string, unknown>)
}

export async function usersUpdateAccountState(id: string, accountState: UserAccountState): Promise<User | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .update({ account_state: accountState, last_active_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error || !data) return null
  return rowToUser(data as Record<string, unknown>)
}

export async function usersUpdateProfile(id: string, input: UpdateProfileInput): Promise<User | null> {
  const updates: Record<string, unknown> = { last_active_at: new Date().toISOString() }
  if (input.displayName !== undefined) updates.display_name = input.displayName
  if (input.bio !== undefined) updates.bio = input.bio
  if (input.profileImageUrl !== undefined) updates.profile_image_url = input.profileImageUrl || null
  if (input.homeCampus !== undefined) updates.home_campus = input.homeCampus
  if (input.marketingEmailOptIn !== undefined) updates.marketing_email_opt_in = input.marketingEmailOptIn

  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error || !data) return null
  return rowToUser(data as Record<string, unknown>)
}

// Recomputes reputation_score from scratch (Wilson-score lower bound over
// all reviews received) rather than applying an incremental delta — P0-5
// replaces the old price-weighted adjust_reputation_score RPC. Recomputing
// from the full review set is idempotent, so concurrent calls converging on
// a stale/overwritten value (unlike a delta) don't compound an error.
export async function usersRecomputeReputationScore(userId: string): Promise<void> {
  const { positive, total } = await ratingsCountsForReviewee(userId)
  const score = wilsonScore(positive, total)
  const { error } = await getSupabaseAdmin()
    .from('users')
    .update({ reputation_score: score })
    .eq('id', userId)
  if (error) {
    console.error(`usersRecomputeReputationScore(${userId}) update error:`, error.message)
  }
}

// ─── Messages ──────────────────────────────────────────────────────────────

export async function messagesListByListing(listingId: string, userId?: string): Promise<Message[]> {
  let q = getSupabaseAdmin()
    .from('messages')
    .select('*')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: true })

  if (userId) {
    q = q.or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
  }

  const { data, error } = await q
  if (error) throw new Error(error.message)
  return ((data || []) as Record<string, unknown>[]).map(rowToMessage)
}

export async function messagesListThread(listingId: string, userA: string, userB: string): Promise<Message[]> {
  const conversationId = buildConversationId(listingId, userA, userB)
  const db = getSupabaseAdmin()
  const { data, error } = await db
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (!error && data && data.length > 0) {
    return (data as Record<string, unknown>[]).map(rowToMessage)
  }

  const fallback = await db
    .from('messages')
    .select('*')
    .eq('listing_id', listingId)
    .or(
      `and(from_user_id.eq.${userA},to_user_id.eq.${userB}),and(from_user_id.eq.${userB},to_user_id.eq.${userA})`
    )
    .order('created_at', { ascending: true })
  if (fallback.error || !fallback.data) return []
  return (fallback.data as Record<string, unknown>[]).map(rowToMessage)
}

export async function messagesCreate(input: Omit<Message, 'id' | 'createdAt'>): Promise<Message> {
  const db = getSupabaseAdmin()
  const id = nanoid()
  const now = new Date().toISOString()
  const conversationId = buildConversationId(input.listingId, input.fromUserId, input.toUserId)

  const row = {
    id,
    listing_id: input.listingId,
    conversation_id: conversationId,
    from_user_id: input.fromUserId,
    to_user_id: input.toUserId,
    body: input.body,
    type: input.type || 'text',
    offer_amount: input.offerAmount ?? null,
    offer_status: input.offerStatus ?? null,
    parent_offer_message_id: input.parentOfferMessageId ?? null,
    expires_at: input.expiresAt ?? null,
    meetup_status: input.meetupStatus ?? null,
    meetup_zone: input.meetupZone ?? null,
    meetup_time: input.meetupTime ?? null,
    presence_status: input.presenceStatus ?? null,
    created_at: now,
  }

  const { data, error } = await db
    .from('messages')
    .insert(row)
    .select()
    .single()
  if (error || !data) throw new Error(error?.message || 'Failed to create message')

  // Upsert the conversation summary (best-effort — don't let this fail the message send)
  try {
    const listing = await listingsFindById(input.listingId)
    if (!listing) {
      // Listing was deleted between message save and conversation upsert — skip
      return rowToMessage(data as Record<string, unknown>)
    }
    const sellerId = listing.sellerId
    const buyerId = input.fromUserId === sellerId ? input.toUserId : input.fromUserId

    // Update the existing conversation, touching only the sender's own read
    // timestamp. A blind upsert here would overwrite the *recipient's*
    // last_read_at back to null on every message, making messages they'd
    // already read incorrectly reappear as unread.
    const readField = input.fromUserId === buyerId ? 'buyer_last_read_at' : 'seller_last_read_at'
    const { data: updated, error: updateErr } = await db
      .from('conversations')
      .update({
        last_message: input.body,
        is_active: true,
        updated_at: now,
        [readField]: now,
      })
      .eq('id', conversationId)
      .select('id')

    if (updateErr) {
      console.error('messagesCreate: conversation update failed (non-fatal):', updateErr.message)
    } else if (!updated || updated.length === 0) {
      // No existing conversation row — this is the first message. The
      // recipient hasn't read anything yet, so their timestamp starts null.
      const { error: insertErr } = await db.from('conversations').insert({
        id: conversationId,
        listing_id: input.listingId,
        buyer_id: buyerId,
        seller_id: sellerId,
        last_message: input.body,
        unread_count: 1,
        buyer_last_read_at: input.fromUserId === buyerId ? now : null,
        seller_last_read_at: input.fromUserId === sellerId ? now : null,
        is_active: true,
        participant_ids: [buyerId, sellerId].sort(),
        participants: {},
        updated_at: now,
        created_at: now,
      })
      if (insertErr) {
        console.error('messagesCreate: conversation insert failed (non-fatal):', insertErr.message)
      }
    }
  } catch (convErr) {
    // Log but don't throw — the message was saved; the conversation index is non-critical
    console.error('messagesCreate: conversation upsert failed (non-fatal):', convErr)
  }

  await createMessageNotification(input, id, conversationId).catch((notifyError) => {
    console.error('messagesCreate: notification failed (non-fatal):', notifyError)
  })

  return rowToMessage(data as Record<string, unknown>)
}

export async function messagesGetInboxByUser(userId: string): Promise<Message[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('messages')
    .select('*')
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(rowToMessage)
}

export async function messagesUpdateOfferStatus(
  messageId: string,
  status: 'accepted' | 'declined' | 'withdrawn'
): Promise<Message | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('messages')
    .update({ offer_status: status })
    .eq('id', messageId)
    .select()
    .single()
  if (error || !data) return null
  const updated = rowToMessage(data as Record<string, unknown>)
  // Withdrawal is the buyer acting on their own offer — nothing to notify them of.
  if (status !== 'withdrawn') {
    await notificationsCreate({
      userId: updated.fromUserId,
      type: 'offer-update',
      title: status === 'accepted' ? 'Offer accepted' : 'Offer declined',
      body: status === 'accepted' ? 'Your offer was accepted.' : 'Your offer was declined.',
      link: `/messages?listingId=${updated.listingId}`,
      meta: { messageId },
    }).catch((notifyError) => console.error('offer notification error:', notifyError))
  }
  return updated
}

// Atomic counteroffer: supersedes the parent offer and inserts a new pending
// offer in the same chain via counter_offer(), mirroring accept_offer()'s
// row-locked read/write pattern so only one offer per chain is ever pending.
export async function messagesCounterOffer(
  parentMessageId: string,
  actorUserId: string,
  amount: number,
  body: string
): Promise<Message> {
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
  const { data, error } = await getSupabaseAdmin().rpc('counter_offer', {
    parent_message_id: parentMessageId,
    actor_user_id: actorUserId,
    new_amount: amount,
    new_body: body,
    new_expires_at: expiresAt,
  })
  if (error) throw new Error(error.message)
  const created = await messagesFindById(data as string)
  if (!created) throw new Error('Counteroffer not found after creation')
  await notificationsCreate({
    userId: created.toUserId,
    type: 'offer-update',
    title: 'Counteroffer received',
    body: `New offer: $${amount}`,
    link: `/messages?listingId=${created.listingId}`,
    meta: { messageId: created.id },
  }).catch((notifyError) => console.error('counter-offer notification error:', notifyError))
  return created
}

async function createMessageNotification(
  input: Omit<Message, 'id' | 'createdAt'>,
  messageId: string,
  conversationId: string
): Promise<void> {
  const type = input.type === 'offer' ? 'offer-update' : input.type === 'meetup' ? 'meetup-update' : 'new-message'
  const title =
    input.type === 'offer'
      ? 'New offer'
      : input.type === 'meetup'
        ? 'Meetup update'
        : 'New message'

  await notificationsCreate({
    userId: input.toUserId,
    type,
    title,
    body: input.body,
    link: `/messages?listingId=${input.listingId}`,
    meta: { messageId, conversationId, listingId: input.listingId },
  })
}

// ─── Conversations ─────────────────────────────────────────────────────────

export async function conversationsListByUser(userId: string) {
  const db = getSupabaseAdmin()
  const { data, error } = await db
    .from('conversations')
    .select('*')
    .contains('participant_ids', [userId])
    .eq('is_active', true)
    .order('updated_at', { ascending: false })

  let rows = (data as Record<string, unknown>[]) || []
  if ((error || rows.length === 0)) {
    const fallback = await db
      .from('conversations')
      .select('*')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
    rows = (fallback.data as Record<string, unknown>[]) || []
  }

  if (rows.length === 0) {
    const legacyMessages = await messagesGetInboxByUser(userId)
    return recoverConversationSummariesFromMessages(legacyMessages, userId)
  }

  // Blocking someone removes their conversation from the active inbox, but
  // message history is preserved in the DB for reporting/support.
  const blockedIds = new Set(await blocksListByUser(userId))
  const visibleRows = blockedIds.size === 0
    ? rows
    : rows.filter((row) => {
        const buyerId = String(row.buyer_id)
        const sellerId = String(row.seller_id)
        const peerId = userId === buyerId ? sellerId : buyerId
        return !blockedIds.has(peerId)
      })

  // Single batched query for unread counts across every conversation instead
  // of one count query per row (P1-2) — mirrors the in-memory counting
  // readState.conversationUnreadCount already uses for the legacy-recovery path.
  const conversationIds = visibleRows.map((row) => String(row.id))
  const { data: incomingRows } = await db
    .from('messages')
    .select('conversation_id, to_user_id, created_at')
    .eq('to_user_id', userId)
    .in('conversation_id', conversationIds)

  const messagesByConversation = new Map<string, { toUserId: string; createdAt: string }[]>()
  for (const message of (incomingRows as Record<string, unknown>[]) || []) {
    const conversationId = String(message.conversation_id)
    const list = messagesByConversation.get(conversationId) || []
    list.push({ toUserId: String(message.to_user_id), createdAt: String(message.created_at) })
    messagesByConversation.set(conversationId, list)
  }

  return visibleRows.map((row) => {
    const id = String(row.id)
    const listingId = String(row.listing_id)
    const buyerId = String(row.buyer_id)
    const sellerId = String(row.seller_id)
    const lastReadAt = userId === buyerId ? row.buyer_last_read_at : row.seller_last_read_at
    const unreadCount = conversationUnreadCount(
      messagesByConversation.get(id) || [],
      userId,
      lastReadAt ? String(lastReadAt) : null
    )
    return {
      id,
      listingId,
      participantIds: Array.isArray(row.participant_ids)
        ? (row.participant_ids as [string, string])
        : ([buyerId, sellerId].sort() as [string, string]),
      lastMessagePreview: String(row.last_message || ''),
      lastMessageAt: row.updated_at ? new Date(String(row.updated_at)).toISOString() : new Date().toISOString(),
      unreadCount,
    }
  })
}

export async function conversationsMarkRead(conversationId: string, userId: string): Promise<boolean> {
  const db = getSupabaseAdmin()
  const { data, error } = await db
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single()
  if (error || !data) return false
  const row = data as Record<string, unknown>
  const buyerId = String(row.buyer_id)
  const sellerId = String(row.seller_id)
  if (userId !== buyerId && userId !== sellerId) return false
  const field = userId === buyerId ? 'buyer_last_read_at' : 'seller_last_read_at'
  const { error: updateError } = await db
    .from('conversations')
    .update({ [field]: new Date().toISOString() })
    .eq('id', conversationId)
  return !updateError
}

// ─── Favorites ─────────────────────────────────────────────────────────────

export async function favoritesListByUser(userId: string): Promise<string[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('favorites')
    .select('listing_id')
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
  return ((data || []) as Record<string, unknown>[]).map((r) => String(r.listing_id))
}

export async function favoritesAdd(userId: string, listingId: string): Promise<boolean> {
  // INSERT ON CONFLICT DO NOTHING — the DB trigger handles favorite_count increment
  const { error } = await getSupabaseAdmin()
    .from('favorites')
    .upsert({ user_id: userId, listing_id: listingId }, { onConflict: 'user_id,listing_id', ignoreDuplicates: true })
  if (error) {
    console.error('favoritesAdd error:', error)
    return false
  }
  return true
}

export async function favoritesRemove(userId: string, listingId: string): Promise<void> {
  // DELETE — the DB trigger handles favorite_count decrement
  const { error } = await getSupabaseAdmin()
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('listing_id', listingId)
  if (error) console.error('favoritesRemove error:', error)
}

// Notifications

export async function notificationsListByUser(userId: string): Promise<Notification[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(error.message)
  return ((data || []) as Record<string, unknown>[]).map(rowToNotification)
}

export async function notificationsCreate(input: CreateNotificationInput): Promise<Notification> {
  const id = nanoid()
  const { data, error } = await getSupabaseAdmin()
    .from('notifications')
    .insert({
      id,
      user_id: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link ?? null,
      meta: input.meta ?? null,
      is_read: input.isRead ?? false,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (error || !data) throw new Error(error?.message || 'Failed to create notification')
  return rowToNotification(data as Record<string, unknown>)
}

export async function notificationsMarkRead(userId: string, id: string): Promise<Notification | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()
  if (error || !data) return null
  return rowToNotification(data as Record<string, unknown>)
}

export async function notificationsMarkAllRead(userId: string): Promise<void> {
  await getSupabaseAdmin()
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
}

// Saved searches and price watches

export async function savedSearchesListByUser(userId: string): Promise<SavedSearch[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('saved_searches')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return ((data || []) as Record<string, unknown>[]).map(rowToSavedSearch)
}

// Stable JSON stringify (sorted keys) so the same query/filters always
// canonicalize to the same key regardless of key insertion order.
function canonicalizeSavedSearch(query: string, filters: Record<string, unknown>): string {
  const sortedFilters = Object.keys(filters)
    .filter((key) => filters[key] !== '' && filters[key] != null && filters[key] !== false)
    .sort()
    .reduce((acc, key) => {
      acc[key] = filters[key]
      return acc
    }, {} as Record<string, unknown>)
  return `${query.trim().toLowerCase()}|${JSON.stringify(sortedFilters)}`
}

export async function savedSearchesCreate(input: CreateSavedSearchInput): Promise<SavedSearch> {
  const normalizedKey = canonicalizeSavedSearch(input.query, input.filters)
  const db = getSupabaseAdmin()

  // Dedup on (user_id, normalized_key): if this user already saved the same
  // query/filters, return the existing row instead of inserting a duplicate.
  const { data: existing } = await db
    .from('saved_searches')
    .select('*')
    .eq('user_id', input.userId)
    .eq('normalized_key', normalizedKey)
    .single()
  if (existing) return rowToSavedSearch(existing as Record<string, unknown>)

  const { data, error } = await db
    .from('saved_searches')
    .insert({
      id: nanoid(),
      user_id: input.userId,
      label: input.label,
      query: input.query,
      filters: input.filters,
      normalized_key: normalizedKey,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (error || !data) throw new Error(error?.message || 'Failed to save search')
  return rowToSavedSearch(data as Record<string, unknown>)
}

export async function savedSearchesRemove(userId: string, id: string): Promise<boolean> {
  // .select() after .delete() returns the deleted rows, so we can tell "0
  // rows matched" (wrong id, or someone else's saved search) apart from
  // "deleted" — plain .delete() reports success either way.
  const { data, error } = await getSupabaseAdmin()
    .from('saved_searches')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')
  return !error && Array.isArray(data) && data.length > 0
}

export async function priceWatchesListByUser(userId: string): Promise<PriceWatch[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('price_watches')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return ((data || []) as Record<string, unknown>[]).map(rowToPriceWatch)
}

export async function priceWatchesUpsert(userId: string, listingId: string, lastSeenPrice: number): Promise<PriceWatch> {
  const { data, error } = await getSupabaseAdmin()
    .from('price_watches')
    .upsert({
      user_id: userId,
      listing_id: listingId,
      last_seen_price: lastSeenPrice,
      created_at: new Date().toISOString(),
    }, { onConflict: 'user_id,listing_id' })
    .select()
    .single()
  if (error || !data) throw new Error(error?.message || 'Failed to watch listing')
  return rowToPriceWatch(data as Record<string, unknown>)
}

export async function priceWatchesRemove(userId: string, listingId: string): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from('price_watches')
    .delete()
    .eq('user_id', userId)
    .eq('listing_id', listingId)
    .select('id')
  return !error && Array.isArray(data) && data.length > 0
}

async function notifyPriceWatchers(listing: Listing, previousPrice: number): Promise<void> {
  const { data, error } = await getSupabaseAdmin()
    .from('price_watches')
    .select('*')
    .eq('listing_id', listing.id)
  if (error || !data) return

  await Promise.all((data as Record<string, unknown>[]).map(async (row) => {
    const watch = rowToPriceWatch(row)
    if (!shouldCreatePriceDropNotification(watch.lastSeenPrice ?? previousPrice, listing.price)) return
    await notificationsCreate({
      userId: watch.userId,
      type: 'price-drop',
      title: 'Price dropped',
      body: `${listing.title} is now $${listing.price}.`,
      link: `/item/${listing.id}`,
      meta: { listingId: listing.id, previousPrice, nextPrice: listing.price },
    })
    await priceWatchesUpsert(watch.userId, listing.id, listing.price)
  }))
}

// Demand matching (P1-11/P1-12) — on a new sell listing, scan active wanted
// listings and saved searches for a match and notify. A single-listing scan
// against existing demand on creation, not a reverse index of every search
// against every listing.
// ponytail: O(active wanted + active saved searches) scan per new listing.
// Fine at this app's scale — move to normalized matching keys / an indexed
// job if either table grows large enough for this to show up in latency.

async function notifyWantedMatches(listing: Listing): Promise<void> {
  const { data, error } = await getSupabaseAdmin()
    .from('listings')
    .select('*')
    .eq('listing_kind', 'wanted')
    .eq('status', 'available')
    .eq('category', listing.category)
    .in('moderation_state', ['visible', 'flagged'])
    .is('deleted_at', null)
    .neq('seller_id', listing.sellerId)
    .gte('price', listing.price) // wanted listing's price doubles as the buyer's budget ceiling
  if (error || !data) return

  await Promise.all((data as Record<string, unknown>[]).map((row) => {
    const wanted = rowToListing(row)
    return notificationsCreate({
      userId: wanted.sellerId,
      type: 'wanted-match',
      title: 'A listing matching what you want was just posted',
      body: `${listing.title} — $${listing.price} matches your "${wanted.title}" wanted post.`,
      link: `/item/${listing.id}`,
      meta: { listingId: listing.id, wantedListingId: wanted.id },
    }).catch((err) => console.error('notifyWantedMatches notificationsCreate error:', err))
  }))
}

function savedSearchMatchesListing(search: SavedSearch, listing: Listing): boolean {
  const filters = search.filters || {}
  if (filters.category && filters.category !== listing.category) return false
  if (filters.campusLocation && filters.campusLocation !== listing.campusLocation) return false
  if (filters.pickupZone && filters.pickupZone !== listing.pickupZone) return false
  if (filters.condition && filters.condition !== listing.condition) return false
  if (filters.listingKind && filters.listingKind !== listing.listingKind) return false
  if (filters.freeOnly && listing.price !== 0) return false
  if (filters.minPrice != null && filters.minPrice !== '' && listing.price < Number(filters.minPrice)) return false
  if (filters.maxPrice != null && filters.maxPrice !== '' && listing.price > Number(filters.maxPrice)) return false
  if (filters.courseTag) {
    const tag = String(filters.courseTag).toLowerCase().replace(/[^a-z0-9]/g, '')
    const haystack = `${listing.courseCode || ''}${listing.tags.join('')}`.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (tag && !haystack.includes(tag)) return false
  }
  if (search.query.trim()) {
    const terms = search.query.toLowerCase().trim().split(/\s+/).filter(Boolean)
    const haystack = `${listing.title} ${listing.description} ${listing.courseCode || ''}`.toLowerCase()
    if (!terms.every((term) => haystack.includes(term))) return false
  }
  return true
}

async function notifySavedSearchMatches(listing: Listing): Promise<void> {
  const { data, error } = await getSupabaseAdmin()
    .from('saved_searches')
    .select('*')
    .neq('user_id', listing.sellerId)
  if (error || !data) return

  const matches = (data as Record<string, unknown>[])
    .map(rowToSavedSearch)
    .filter((search) => savedSearchMatchesListing(search, listing))

  await Promise.all(matches.map((search) =>
    notificationsCreate({
      userId: search.userId,
      type: 'saved-search-match',
      title: 'New match for your saved search',
      body: `${listing.title} — $${listing.price} matches "${search.label}".`,
      link: `/item/${listing.id}`,
      meta: { listingId: listing.id, savedSearchId: search.id },
    }).catch((err) => console.error('notifySavedSearchMatches notificationsCreate error:', err))
  ))
}

// Called fire-and-forget (caller awaits + .catch's) right after a sell
// listing is created — mirrors notifyPriceWatchers' best-effort pattern.
export async function matchNewListingToDemand(listing: Listing): Promise<void> {
  if (listing.listingKind !== 'sell') return
  await Promise.all([notifyWantedMatches(listing), notifySavedSearchMatches(listing)])
}

// ─── Reports ───────────────────────────────────────────────────────────────

export async function reportsListAll(): Promise<Report[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return ((data || []) as Record<string, unknown>[]).map(rowToReport)
}

export async function reportsFindByUserAndListing(userId: string, listingId: string): Promise<Report | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('reports')
    .select('*')
    .eq('reported_by_user_id', userId)
    .eq('listing_id', listingId)
    .single()
  if (error || !data) return null
  return rowToReport(data as Record<string, unknown>)
}

export async function reportsCreate(input: CreateReportInput): Promise<Report> {
  const id = nanoid()
  const { data, error } = await getSupabaseAdmin()
    .from('reports')
    .insert({
      id,
      listing_id: input.listingId,
      seller_id: input.sellerId,
      reported_by_user_id: input.reportedByUserId,
      reason: input.reason,
      notes: input.notes ?? null,
      include_seller: input.includeSeller,
      status: 'open',
      created_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (error || !data) throw new Error(error?.message || 'Failed to create report')
  return rowToReport(data as Record<string, unknown>)
}

export async function reportsUpdateStatus(id: string, status: ReportStatus): Promise<Report | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('reports')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  if (error || !data) return null
  return rowToReport(data as Record<string, unknown>)
}

// ─── Admin Activity ────────────────────────────────────────────────────────

export async function adminActivityListAll(): Promise<AdminActivityLog[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('admin_activity')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return ((data || []) as Record<string, unknown>[]).map(rowToAdminActivity)
}

export async function adminActivityCreate(
  input: Omit<AdminActivityLog, 'id' | 'createdAt'>
): Promise<AdminActivityLog> {
  const id = nanoid()
  const { data, error } = await getSupabaseAdmin()
    .from('admin_activity')
    .insert({
      id,
      actor_user_id: input.actorUserId,
      actor_display_name: input.actorDisplayName,
      action: input.action,
      target_type: input.targetType,
      target_id: input.targetId,
      notes: input.notes ?? null,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (error || !data) throw new Error(error?.message || 'Failed to create admin activity')
  return rowToAdminActivity(data as Record<string, unknown>)
}

// ─── Ratings ───────────────────────────────────────────────────────────────

export async function ratingsCreate(input: {
  sellerId: string
  buyerId: string
  listingId: string
  transactionId: string
  reviewerId: string
  revieweeId: string
  score: RatingScore
  tags: RatingTag[]
}): Promise<Rating> {
  const id = nanoid()
  const { data, error } = await getSupabaseAdmin()
    .from('ratings')
    .insert({
      id,
      seller_id: input.sellerId,
      buyer_id: input.buyerId,
      listing_id: input.listingId,
      transaction_id: input.transactionId,
      reviewer_id: input.reviewerId,
      reviewee_id: input.revieweeId,
      score: input.score,
      tags: input.tags,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (error || !data) throw new Error(error?.message || 'Failed to create rating')
  return rowToRating(data as Record<string, unknown>)
}

// Reviews received by a user, regardless of whether they were the buyer or
// the seller in the underlying transaction (two-way reviews — P0-4).
export async function ratingsFindByRevieweeId(revieweeId: string): Promise<Rating[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('ratings')
    .select('*')
    .eq('reviewee_id', revieweeId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return ((data || []) as Record<string, unknown>[]).map(rowToRating)
}

export async function ratingsFindByReviewerAndTransaction(
  reviewerId: string,
  transactionId: string
): Promise<Rating | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('ratings')
    .select('*')
    .eq('reviewer_id', reviewerId)
    .eq('transaction_id', transactionId)
    .single()
  if (error || !data) return null
  return rowToRating(data as Record<string, unknown>)
}

// Positive/total review counts for a user, as reviewee — shared by the
// reputation score recompute and the user-facing reputation summary below.
async function ratingsCountsForReviewee(userId: string): Promise<{ positive: number; total: number }> {
  const { data, error } = await getSupabaseAdmin()
    .from('ratings')
    .select('score')
    .eq('reviewee_id', userId)
  if (error) throw new Error(error.message)
  const scores = (data || []) as { score: number }[]
  return { total: scores.length, positive: scores.filter((s) => Number(s.score) === 1).length }
}

// Transparent reputation components (P0-5): completed transactions + review
// positivity, computed from real data instead of a price-weighted score.
export async function usersReputationSummary(userId: string): Promise<{
  completedTransactionCount: number
  reviewCount: number
  positiveReviewPercentage: number
}> {
  const [{ count: completedTransactionCount, error: txnError }, counts] = await Promise.all([
    getSupabaseAdmin()
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`),
    ratingsCountsForReviewee(userId),
  ])
  if (txnError) throw new Error(txnError.message)
  return {
    completedTransactionCount: completedTransactionCount || 0,
    reviewCount: counts.total,
    positiveReviewPercentage: counts.total > 0 ? Math.round((counts.positive / counts.total) * 100) : 0,
  }
}

// ─── Blocks ────────────────────────────────────────────────────────────────

export async function blocksCreate(blockerId: string, blockedId: string): Promise<boolean> {
  const { error } = await getSupabaseAdmin()
    .from('blocks')
    .upsert({ blocker_id: blockerId, blocked_id: blockedId }, { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true })
  if (error) {
    console.error('blocksCreate error:', error)
    return false
  }
  return true
}

export async function blocksRemove(blockerId: string, blockedId: string): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from('blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId)
    .select('blocker_id')
  return !error && Array.isArray(data) && data.length > 0
}

export async function blocksListByUser(userId: string): Promise<string[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('blocks')
    .select('blocked_id')
    .eq('blocker_id', userId)
  if (error) throw new Error(error.message)
  return ((data || []) as Record<string, unknown>[]).map((r) => String(r.blocked_id))
}

// Bidirectional: true if either user has blocked the other.
export async function blocksIsBlocked(userIdA: string, userIdB: string): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from('blocks')
    .select('blocker_id')
    .or(
      `and(blocker_id.eq.${userIdA},blocked_id.eq.${userIdB}),and(blocker_id.eq.${userIdB},blocked_id.eq.${userIdA})`
    )
    .limit(1)
  if (error) throw new Error(error.message)
  return Array.isArray(data) && data.length > 0
}

export async function messagesFindById(id: string): Promise<Message | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('messages')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return rowToMessage(data as Record<string, unknown>)
}

// ─── Transactions ──────────────────────────────────────────────────────────

function rowToTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: String(row.id),
    listingId: String(row.listing_id),
    sellerId: String(row.seller_id),
    buyerId: String(row.buyer_id),
    acceptedOfferMessageId: row.accepted_offer_message_id ? String(row.accepted_offer_message_id) : undefined,
    askingPrice: Number(row.asking_price) || 0,
    agreedPrice: row.agreed_price != null ? Number(row.agreed_price) : undefined,
    status: (row.status as Transaction['status']) || 'initiated',
    meetupZone: row.meetup_zone ? (row.meetup_zone as Transaction['meetupZone']) : undefined,
    meetupTime: row.meetup_time ? new Date(String(row.meetup_time)).toISOString() : undefined,
    sellerConfirmedAt: row.seller_confirmed_at ? new Date(String(row.seller_confirmed_at)).toISOString() : undefined,
    buyerConfirmedAt: row.buyer_confirmed_at ? new Date(String(row.buyer_confirmed_at)).toISOString() : undefined,
    completedAt: row.completed_at ? new Date(String(row.completed_at)).toISOString() : undefined,
    cancelledAt: row.cancelled_at ? new Date(String(row.cancelled_at)).toISOString() : undefined,
    cancellationReason: row.cancellation_reason ? String(row.cancellation_reason) : undefined,
    createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(String(row.updated_at)).toISOString() : new Date().toISOString(),
  }
}

export async function transactionsFindById(id: string): Promise<Transaction | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return rowToTransaction(data as Record<string, unknown>)
}

export async function transactionsFindByListingId(listingId: string): Promise<Transaction[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('transactions')
    .select('*')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return ((data || []) as Record<string, unknown>[]).map(rowToTransaction)
}

// Atomic accept-offer: marks the offer accepted, declines competing pending
// offers on the listing, creates the transaction row, and reserves the
// listing for the buyer — all inside the accept_offer() Postgres function so
// two concurrent accepts (or an accept racing a listing edit) can't both win.
export async function transactionsAcceptOffer(
  offerMessageId: string,
  actorUserId: string
): Promise<Transaction> {
  const { data, error } = await getSupabaseAdmin().rpc('accept_offer', {
    offer_message_id: offerMessageId,
    actor_user_id: actorUserId,
  })
  if (error) throw new Error(error.message)
  const transaction = await transactionsFindById(data as string)
  if (!transaction) throw new Error('Transaction not found after creation')
  return transaction
}

// The most recent reserved-or-later transaction between this buyer/seller
// pair on a listing — how the messages thread finds "the" transaction to
// attach meetup/completion actions to.
export async function transactionsFindActiveForListingAndUsers(
  listingId: string,
  userA: string,
  userB: string
): Promise<Transaction | null> {
  const all = await transactionsFindByListingId(listingId)
  return (
    all.find(
      (t) =>
        (t.buyerId === userA && t.sellerId === userB) ||
        (t.buyerId === userB && t.sellerId === userA)
    ) || null
  )
}

// Propose/update the meetup zone + time on the transaction. Low-stakes
// negotiation (either party can revise before confirming), so a plain update
// is enough — no row-locked RPC needed like accept_offer/confirm_completion.
export async function transactionsProposeMeetup(
  transactionId: string,
  zone: PickupZone,
  time: string
): Promise<Transaction | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('transactions')
    .update({ meetup_zone: zone, meetup_time: time, updated_at: new Date().toISOString() })
    .eq('id', transactionId)
    .select()
    .single()
  if (error || !data) return null
  return rowToTransaction(data as Record<string, unknown>)
}

// The other party confirms the proposed meetup — locks in meetup_scheduled.
export async function transactionsConfirmMeetup(transactionId: string): Promise<Transaction | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('transactions')
    .update({ status: 'meetup_scheduled', updated_at: new Date().toISOString() })
    .eq('id', transactionId)
    .select()
    .single()
  if (error || !data) return null
  return rowToTransaction(data as Record<string, unknown>)
}

// Either party cancels the proposed/confirmed meetup — clears the meetup
// fields and drops back to reserved (the sale itself isn't cancelled).
export async function transactionsCancelMeetup(transactionId: string): Promise<Transaction | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('transactions')
    .update({
      meetup_zone: null,
      meetup_time: null,
      status: 'reserved',
      updated_at: new Date().toISOString(),
    })
    .eq('id', transactionId)
    .select()
    .single()
  if (error || !data) return null
  return rowToTransaction(data as Record<string, unknown>)
}

// Atomic completion confirmation: records this participant's confirmation
// and, once both sides have confirmed, flips the transaction to completed.
// Row-locked in confirm_transaction_completion() so simultaneous buyer+seller
// confirms can't race each other into missing the other side's timestamp.
export async function transactionsConfirmCompletion(
  transactionId: string,
  actorUserId: string
): Promise<Transaction> {
  const { error } = await getSupabaseAdmin().rpc('confirm_transaction_completion', {
    txn_id: transactionId,
    actor_user_id: actorUserId,
  })
  if (error) throw new Error(error.message)
  const transaction = await transactionsFindById(transactionId)
  if (!transaction) throw new Error('Transaction not found after confirmation')
  return transaction
}
