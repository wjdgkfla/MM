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
  PriceWatch,
  Report,
  ReportStatus,
  SavedSearch,
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
import { recoverConversationSummariesFromMessages } from '@/lib/readState'

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
  }
}

function rowToMessage(row: Record<string, unknown>): Message {
  return {
    id: String(row.id),
    listingId: String(row.listing_id || ''),
    fromUserId: String(row.from_user_id || ''),
    toUserId: String(row.to_user_id || ''),
    body: String(row.body || ''),
    type: row.type === 'offer' ? 'offer' : 'text',
    offerAmount: row.offer_amount != null ? Number(row.offer_amount) : undefined,
    offerStatus: row.offer_status ? (row.offer_status as Message['offerStatus']) : undefined,
    meetupStatus: row.meetup_status ? (row.meetup_status as Message['meetupStatus']) : undefined,
    meetupZone: row.meetup_zone ? (row.meetup_zone as Message['meetupZone']) : undefined,
    meetupTime: row.meetup_time ? new Date(String(row.meetup_time)).toISOString() : undefined,
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
    score: Number(row.score) === -1 ? -1 : 1,
    tags: Array.isArray(row.tags) ? (row.tags as RatingTag[]) : [],
    createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : new Date().toISOString(),
  }
}

// ─── Listings ──────────────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 24

export async function listingsFindMany(query?: ListingQuery): Promise<Listing[]> {
  const db = getSupabaseAdmin()
  const pageSize = query?.pageSize ?? DEFAULT_PAGE_SIZE
  const page = query?.page ?? 0
  const from = page * pageSize
  const to = from + pageSize - 1

  let q = db
    .from('listings')
    .select('*')
    .in('moderation_state', ['visible', 'flagged'])

  if (query?.category)       q = q.eq('category', query.category)
  if (query?.listingKind)    q = q.eq('listing_kind', query.listingKind)
  if (query?.campusLocation) q = q.eq('campus_location', query.campusLocation)
  if (query?.condition)      q = q.eq('condition', query.condition)
  if (query?.status)         q = q.eq('status', query.status)
  if (query?.pickupZone)     q = q.eq('pickup_zone', query.pickupZone)
  if (query?.freeOnly)       q = q.eq('price', 0)
  if (query?.minPrice != null && query.minPrice >= 0) q = q.gte('price', query.minPrice)
  if (query?.maxPrice != null && query.maxPrice >= 0) q = q.lte('price', query.maxPrice)

  if (query?.search) {
    const term = query.search.trim().split(/\s+/).join(' & ')
    q = q.textSearch('search_vector', term, { type: 'websearch', config: 'english' })
  }

  if (query?.sort === 'price-asc')  q = q.order('price', { ascending: true })
  else if (query?.sort === 'price-desc') q = q.order('price', { ascending: false })
  else q = q.order('created_at', { ascending: false })

  // Apply pagination at the DB level
  q = q.range(from, to)

  const { data, error } = await q
  if (error) {
    console.error('listingsFindMany error:', error)
    return []
  }

  let results = (data || []).map((r) => rowToListing(r as Record<string, unknown>))

  if (query?.courseTag) {
    const normalized = query.courseTag.toLowerCase().replace(/[^a-z0-9]/g, '')
    results = results.filter((l) =>
      l.tags.some((tag) => tag.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normalized))
    )
  }

  // Price sort is now applied at the DB level above — no JS sort needed

  return results
}

export async function listingsFindById(id: string): Promise<Listing | undefined> {
  if (!id || id.trim().length === 0) return undefined
  const { data, error } = await getSupabaseAdmin()
    .from('listings')
    .select('*')
    .eq('id', id)
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
  if (error || !data) return []
  const byId = new Map(
    (data as Record<string, unknown>[]).map((r) => {
      const l = rowToListing(r)
      return [l.id, l]
    })
  )
  return ids.map((id) => byId.get(id)).filter((l): l is Listing => l !== undefined)
}

export async function listingsFindBySellerId(sellerId: string): Promise<Listing[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('listings')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(rowToListing)
}

export async function listingsListAllForAdmin(): Promise<Listing[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('listings')
    .select('*')
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(rowToListing)
}

export async function listingsCountBySellerId(sellerId: string): Promise<number> {
  const { count, error } = await getSupabaseAdmin()
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('seller_id', sellerId)
  if (error) return 0
  return count ?? 0
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

export async function listingsRemove(id: string): Promise<boolean> {
  const { error } = await getSupabaseAdmin()
    .from('listings')
    .delete()
    .eq('id', id)
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
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(rowToUser)
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
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(rowToMessage)
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
    meetup_status: input.meetupStatus ?? null,
    meetup_zone: input.meetupZone ?? null,
    meetup_time: input.meetupTime ?? null,
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

    await db.from('conversations').upsert(
      {
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
      },
      { onConflict: 'id' }
    )
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

export async function messagesExistsByUserAndListing(userId: string, listingId: string): Promise<boolean> {
  // Use count query — .single() throws when 0 rows found, which breaks the ratings flow
  const { count, error } = await getSupabaseAdmin()
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('listing_id', listingId)
    .eq('from_user_id', userId)
  return !error && (count ?? 0) > 0
}

export async function messagesUpdateOfferStatus(
  messageId: string,
  status: 'accepted' | 'declined'
): Promise<Message | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('messages')
    .update({ offer_status: status })
    .eq('id', messageId)
    .select()
    .single()
  if (error || !data) return null
  const updated = rowToMessage(data as Record<string, unknown>)
  await notificationsCreate({
    userId: updated.fromUserId,
    type: 'offer-update',
    title: status === 'accepted' ? 'Offer accepted' : 'Offer declined',
    body: status === 'accepted' ? 'Your offer was accepted.' : 'Your offer was declined.',
    link: `/messages?listingId=${updated.listingId}`,
    meta: { messageId },
  }).catch((notifyError) => console.error('offer notification error:', notifyError))
  return updated
}

async function messagesUnreadCountForThread(
  listingId: string,
  userId: string,
  lastReadAt?: string | null
): Promise<number> {
  let q = getSupabaseAdmin()
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('listing_id', listingId)
    .eq('to_user_id', userId)

  if (lastReadAt) q = q.gt('created_at', lastReadAt)

  const { count, error } = await q
  return error ? 0 : count ?? 0
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

  return Promise.all(rows.map(async (row) => {
    const listingId = String(row.listing_id)
    const buyerId = String(row.buyer_id)
    const sellerId = String(row.seller_id)
    const lastReadAt = userId === buyerId ? row.buyer_last_read_at : row.seller_last_read_at
    const unreadCount = await messagesUnreadCountForThread(listingId, userId, lastReadAt ? String(lastReadAt) : null)
    return {
      id: String(row.id),
      listingId,
      participantIds: Array.isArray(row.participant_ids)
        ? (row.participant_ids as [string, string])
        : ([buyerId, sellerId].sort() as [string, string]),
      lastMessagePreview: String(row.last_message || ''),
      lastMessageAt: row.updated_at ? new Date(String(row.updated_at)).toISOString() : new Date().toISOString(),
      unreadCount,
    }
  }))
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
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map((r) => String(r.listing_id))
}

export async function favoritesAdd(userId: string, listingId: string): Promise<void> {
  // INSERT ON CONFLICT DO NOTHING — the DB trigger handles favorite_count increment
  const { error } = await getSupabaseAdmin()
    .from('favorites')
    .upsert({ user_id: userId, listing_id: listingId }, { onConflict: 'user_id,listing_id', ignoreDuplicates: true })
  if (error) console.error('favoritesAdd error:', error)
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
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(rowToNotification)
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
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(rowToSavedSearch)
}

export async function savedSearchesCreate(input: CreateSavedSearchInput): Promise<SavedSearch> {
  const id = nanoid()
  const { data, error } = await getSupabaseAdmin()
    .from('saved_searches')
    .insert({
      id,
      user_id: input.userId,
      label: input.label,
      query: input.query,
      filters: input.filters,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (error || !data) throw new Error(error?.message || 'Failed to save search')
  return rowToSavedSearch(data as Record<string, unknown>)
}

export async function savedSearchesRemove(userId: string, id: string): Promise<boolean> {
  const { error } = await getSupabaseAdmin()
    .from('saved_searches')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  return !error
}

export async function priceWatchesListByUser(userId: string): Promise<PriceWatch[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('price_watches')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(rowToPriceWatch)
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
  const { error } = await getSupabaseAdmin()
    .from('price_watches')
    .delete()
    .eq('user_id', userId)
    .eq('listing_id', listingId)
  return !error
}

async function notifyPriceWatchers(listing: Listing, previousPrice: number): Promise<void> {
  const { data, error } = await getSupabaseAdmin()
    .from('price_watches')
    .select('*')
    .eq('listing_id', listing.id)
  if (error || !data) return

  await Promise.all((data as Record<string, unknown>[]).map(async (row) => {
    const watch = rowToPriceWatch(row)
    if (!shouldCreatePriceDropNotification(watch.lastSeenPrice || previousPrice, listing.price)) return
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

// ─── Reports ───────────────────────────────────────────────────────────────

export async function reportsListAll(): Promise<Report[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(rowToReport)
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
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(rowToAdminActivity)
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
      score: input.score,
      tags: input.tags,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (error || !data) throw new Error(error?.message || 'Failed to create rating')
  return rowToRating(data as Record<string, unknown>)
}

export async function ratingsFindBySellerId(sellerId: string): Promise<Rating[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('ratings')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(rowToRating)
}

export async function ratingsFindByBuyerAndListing(
  buyerId: string,
  listingId: string
): Promise<Rating | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('ratings')
    .select('*')
    .eq('buyer_id', buyerId)
    .eq('listing_id', listingId)
    .single()
  if (error || !data) return null
  return rowToRating(data as Record<string, unknown>)
}
