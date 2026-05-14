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
  Report,
  ReportStatus,
  User,
  UserAccountState,
  UserRole,
} from '@/lib/types'
import {
  CreateListingInput,
  CreateReportInput,
  ListingQuery,
  UpdateListingInput,
} from '@/lib/data/contracts'

// ─── Helpers ───────────────────────────────────────────────────────────────

function nanoid(len = 20): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < len; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

function buildConversationId(listingId: string, userA: string, userB: string): string {
  return `${listingId}:${[userA, userB].sort().join(':')}`
}

function rowToListing(row: Record<string, unknown>): Listing {
  return {
    id: String(row.id),
    title: String(row.title || ''),
    description: String(row.description || ''),
    price: Number(row.price) || 0,
    category: (row.category as Listing['category']) || 'other',
    condition: (row.condition as Listing['condition']) || 'good',
    status: (row.status as ListingStatus) || 'available',
    moderationState: (row.moderation_state as ListingModerationState) || 'visible',
    imageUrls: Array.isArray(row.image_urls) ? (row.image_urls as string[]) : [],
    sellerId: String(row.seller_id || ''),
    sellerProfile: (row.seller_profile as Listing['sellerProfile']) || {
      displayName: 'Unknown',
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
    isFavorited: false,
    createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(String(row.updated_at)).toISOString() : new Date().toISOString(),
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

export async function listingsFindMany(query?: ListingQuery): Promise<Listing[]> {
  const db = getSupabaseAdmin()
  let q = db
    .from('listings')
    .select('*')
    .in('moderation_state', ['visible', 'flagged'])

  if (query?.category)       q = q.eq('category', query.category)
  if (query?.campusLocation) q = q.eq('campus_location', query.campusLocation)
  if (query?.condition)      q = q.eq('condition', query.condition)
  if (query?.status)         q = q.eq('status', query.status)
  if (query?.pickupZone)     q = q.eq('pickup_zone', query.pickupZone)
  if (query?.freeOnly)       q = q.eq('price', 0)
  if (query?.minPrice != null && query.minPrice >= 0) q = q.gte('price', query.minPrice)
  if (query?.maxPrice != null && query.maxPrice >= 0) q = q.lte('price', query.maxPrice)

  // Full-text search via Postgres tsvector
  if (query?.search) {
    const term = query.search.trim().split(/\s+/).join(' & ')
    q = q.textSearch('search_vector', term, { type: 'websearch', config: 'english' })
  }

  const needsPriceSort = query?.sort === 'price-asc' || query?.sort === 'price-desc'
  if (!needsPriceSort) {
    q = q.order('created_at', { ascending: false })
  }

  const { data, error } = await q
  if (error) {
    console.error('listingsFindMany error:', error)
    return []
  }

  let results = (data || []).map((r) => rowToListing(r as Record<string, unknown>))

  // courseTag filter: substring match on tags
  if (query?.courseTag) {
    const normalized = query.courseTag.toLowerCase().replace(/[^a-z0-9]/g, '')
    results = results.filter((l) =>
      l.tags.some((tag) => tag.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normalized))
    )
  }

  if (query?.sort === 'price-asc')  results.sort((a, b) => a.price - b.price)
  if (query?.sort === 'price-desc') results.sort((a, b) => b.price - a.price)

  return results
}

export async function listingsFindById(id: string): Promise<Listing | undefined> {
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
    moderation_state: input.moderationState,
    image_urls: input.imageUrls,
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
  if (input.campusLocation !== undefined) updates.campus_location = input.campusLocation
  if (input.pickupZone !== undefined)  updates.pickup_zone = input.pickupZone
  if (input.pickupNotes !== undefined) updates.pickup_notes = input.pickupNotes
  if (input.tags !== undefined)        updates.tags = input.tags
  if (input.imageUrls !== undefined)   updates.image_urls = input.imageUrls
  if ('courseCode' in input)    updates.course_code = input.courseCode ?? null
  if ('professorName' in input) updates.professor_name = input.professorName ?? null
  if ('edition' in input)       updates.edition = input.edition ?? null
  if ('bundleNotes' in input)   updates.bundle_notes = input.bundleNotes ?? null

  const { data, error } = await getSupabaseAdmin()
    .from('listings')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error || !data) return null
  return rowToListing(data as Record<string, unknown>)
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
  const { error } = await getSupabaseAdmin().rpc('increment_view_count', { listing_id: id })
  if (error) {
    // Fallback: direct update if RPC not available
    await getSupabaseAdmin()
      .from('listings')
      .update({ view_count: undefined }) // handled below via raw query
      .eq('id', id)
    // Use a direct SQL approach
    const { data: cur } = await getSupabaseAdmin().from('listings').select('view_count').eq('id', id).single()
    if (cur) {
      await getSupabaseAdmin()
        .from('listings')
        .update({ view_count: (Number((cur as Record<string, unknown>).view_count) || 0) + 1 })
        .eq('id', id)
    }
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
  supabaseId?: string
}): Promise<User> {
  const normalized = input.email.trim().toLowerCase()
  const role = input.role || 'student'
  const now = new Date().toISOString()

  // Use Supabase auth UUID as the user ID if provided, otherwise derive from email
  const id = input.supabaseId || `u_${normalized.replace(/[^a-z0-9]/g, '_')}`

  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .upsert(
      {
        id,
        role,
        account_state: 'active',
        display_name: input.displayName || normalized.split('@')[0],
        gmu_email: normalized,
        gmu_email_verified: true,
        is_student_seller: role !== 'admin',
        home_campus: 'fairfax',
        campus_verification: 'verified',
        trust_badge: 'verified-gmu',
        reputation_score: role === 'admin' ? 5 : 0,
        last_active_at: now,
        joined_at: now,
        listing_count: 0,
      },
      {
        onConflict: 'gmu_email',
        ignoreDuplicates: false,
      }
    )
    .select()
    .single()

  if (error || !data) throw new Error(error?.message || 'Failed to upsert user')
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
  const { data, error } = await getSupabaseAdmin()
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(rowToMessage)
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
    created_at: now,
  }

  const { data, error } = await db
    .from('messages')
    .insert(row)
    .select()
    .single()
  if (error || !data) throw new Error(error?.message || 'Failed to create message')

  // Upsert the conversation summary
  const listing = await listingsFindById(input.listingId)
  const sellerId = listing?.sellerId || ''
  const buyerId = input.fromUserId === sellerId ? input.toUserId : input.fromUserId

  await db.from('conversations').upsert(
    {
      id: conversationId,
      listing_id: input.listingId,
      buyer_id: buyerId,
      seller_id: sellerId,
      last_message: input.body,
      unread_count: 1,
      is_active: true,
      participant_ids: [buyerId, sellerId].sort(),
      updated_at: now,
      created_at: now,
    },
    { onConflict: 'id' }
  )

  // Update last_message + updated_at on subsequent messages
  await db
    .from('conversations')
    .update({ last_message: input.body, updated_at: now })
    .eq('id', conversationId)

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
  const { data, error } = await getSupabaseAdmin()
    .from('messages')
    .select('id')
    .eq('listing_id', listingId)
    .eq('from_user_id', userId)
    .limit(1)
    .single()
  return !error && Boolean(data)
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
  return rowToMessage(data as Record<string, unknown>)
}

// ─── Conversations ─────────────────────────────────────────────────────────

export async function conversationsListByUser(userId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from('conversations')
    .select('*')
    .contains('participant_ids', [userId])
    .eq('is_active', true)
    .order('updated_at', { ascending: false })

  if (error || !data) return []

  return (data as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    listingId: String(row.listing_id),
    participantIds: Array.isArray(row.participant_ids)
      ? (row.participant_ids as [string, string])
      : ([String(row.buyer_id), String(row.seller_id)].sort() as [string, string]),
    lastMessagePreview: String(row.last_message || ''),
    lastMessageAt: row.updated_at ? new Date(String(row.updated_at)).toISOString() : new Date().toISOString(),
  }))
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
