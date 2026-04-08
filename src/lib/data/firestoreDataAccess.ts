import { FieldPath, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import {
  AdminActivityLog,
  Listing,
  ListingModerationState,
  ListingStatus,
  Message,
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

function toISOString(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value
  return new Date().toISOString()
}

function docToListing(data: FirebaseFirestore.DocumentData): Listing {
  return {
    id: data.id,
    title: data.title || '',
    description: data.description || '',
    price: Number(data.price) || 0,
    category: data.category || 'other',
    condition: data.condition || 'good',
    status: data.status || 'available',
    moderationState: data.moderationState || 'visible',
    imageUrls: Array.isArray(data.imageUrls) ? data.imageUrls : [],
    sellerId: data.sellerId || '',
    sellerProfile: data.sellerProfile || {
      displayName: 'Unknown',
      trustBadge: 'new-seller',
      reputationScore: 0,
      isGmuVerified: false,
      isStudentSeller: true,
      homeCampus: 'fairfax',
      lastActiveAt: new Date().toISOString(),
      campusVerification: 'pending',
    },
    campusLocation: data.campusLocation || 'fairfax',
    pickupZone: data.pickupZone || 'jc-lobby',
    pickupNotes: data.pickupNotes || '',
    courseCode: data.courseCode || undefined,
    professorName: data.professorName || undefined,
    edition: data.edition || undefined,
    bundleNotes: data.bundleNotes || undefined,
    tags: Array.isArray(data.tags) ? data.tags : [],
    favoriteCount: Number(data.favoriteCount) || 0,
    isFavorited: data.isFavorited || false,
    createdAt: toISOString(data.createdAt),
    updatedAt: toISOString(data.updatedAt),
  }
}

function docToUser(data: FirebaseFirestore.DocumentData): User {
  return {
    id: data.id,
    role: data.role || 'student',
    accountState: data.accountState || 'active',
    displayName: data.displayName || '',
    gmuEmail: data.gmuEmail || data.email || '',
    gmuEmailVerified: data.gmuEmailVerified ?? true,
    profileImageUrl: data.profileImageUrl,
    isStudentSeller: data.isStudentSeller ?? true,
    homeCampus: data.homeCampus || 'fairfax',
    campusVerification: data.campusVerification || 'pending',
    lastActiveAt: toISOString(data.lastActiveAt),
    joinedAt: toISOString(data.joinedAt),
    trustBadge: data.trustBadge || 'new-seller',
    reputationScore: Number(data.reputationScore) || 0,
    listingCount: Number(data.listingCount) || 0,
  }
}

function docToMessage(data: FirebaseFirestore.DocumentData): Message {
  return {
    id: data.id,
    listingId: data.listingId || '',
    fromUserId: data.fromUserId || '',
    toUserId: data.toUserId || '',
    body: data.body || '',
    createdAt: toISOString(data.createdAt),
  }
}

function docToReport(data: FirebaseFirestore.DocumentData): Report {
  return {
    id: data.id,
    listingId: data.listingId || '',
    sellerId: data.sellerId || '',
    reportedByUserId: data.reportedByUserId || '',
    reason: data.reason || 'spam',
    notes: data.notes || undefined,
    includeSeller: data.includeSeller ?? false,
    status: data.status || 'open',
    createdAt: toISOString(data.createdAt),
  }
}

function docToAdminActivity(data: FirebaseFirestore.DocumentData): AdminActivityLog {
  return {
    id: data.id,
    actorUserId: data.actorUserId || '',
    actorDisplayName: data.actorDisplayName || '',
    action: data.action,
    targetType: data.targetType,
    targetId: data.targetId || '',
    notes: data.notes || undefined,
    createdAt: toISOString(data.createdAt),
  }
}

function getDb() {
  const db = getFirebaseAdminDb()
  if (!db) throw new Error('Firebase Admin Firestore is not available')
  return db
}

// All API routes import the async functions below directly.
// The old synchronous MarketplaceDataAccess interface is not used for Firestore.

export async function listingsFindMany(query?: ListingQuery): Promise<Listing[]> {
  const db = getDb()
  let ref: FirebaseFirestore.Query = db.collection('listings').orderBy('createdAt', 'desc')

  const snap = await ref.get()
  let results = snap.docs.map((doc) => docToListing({ id: doc.id, ...doc.data() }))

  if (query?.category) results = results.filter((l) => l.category === query.category)
  if (query?.campusLocation) results = results.filter((l) => l.campusLocation === query.campusLocation)
  if (query?.pickupZone) results = results.filter((l) => l.pickupZone === query.pickupZone)
  if (query?.condition) results = results.filter((l) => l.condition === query.condition)
  if (query?.status) results = results.filter((l) => l.status === query.status)
  if (query?.freeOnly) results = results.filter((l) => l.price === 0)
  if (query?.minPrice !== undefined && query.minPrice >= 0) results = results.filter((l) => l.price >= query.minPrice!)
  if (query?.maxPrice !== undefined && query.maxPrice >= 0) results = results.filter((l) => l.price <= query.maxPrice!)

  if (query?.search) {
    const term = query.search.toLowerCase().trim()
    results = results.filter(
      (l) =>
        l.title.toLowerCase().includes(term) ||
        l.description.toLowerCase().includes(term) ||
        (l.courseCode || '').toLowerCase().includes(term) ||
        (l.professorName || '').toLowerCase().includes(term) ||
        l.category.toLowerCase().includes(term) ||
        l.campusLocation.toLowerCase().includes(term) ||
        l.pickupZone.toLowerCase().includes(term) ||
        l.pickupNotes.toLowerCase().includes(term) ||
        l.tags.some((tag) => tag.toLowerCase().includes(term))
    )
  }

  if (query?.courseTag) {
    const normalized = query.courseTag.toLowerCase().replace(/[^a-z0-9]/g, '')
    results = results.filter((l) =>
      l.tags.some((tag) => tag.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normalized))
    )
  }

  if (query?.sort === 'price-asc') results.sort((a, b) => a.price - b.price)
  else if (query?.sort === 'price-desc') results.sort((a, b) => b.price - a.price)

  return results
}

export async function listingsFindById(id: string): Promise<Listing | undefined> {
  const db = getDb()
  const doc = await db.collection('listings').doc(id).get()
  if (!doc.exists) return undefined
  return docToListing({ id: doc.id, ...doc.data() })
}

export async function listingsFindByIds(ids: string[]): Promise<Listing[]> {
  if (ids.length === 0) return []
  const db = getDb()
  // Firestore `in` queries are capped at 30 items per call
  const CHUNK = 30
  const chunks: string[][] = []
  for (let i = 0; i < ids.length; i += CHUNK) {
    chunks.push(ids.slice(i, i + CHUNK))
  }
  const results = await Promise.all(
    chunks.map((chunk) =>
      db.collection('listings').where(FieldPath.documentId(), 'in', chunk).get()
    )
  )
  const byId = new Map<string, Listing>()
  for (const snap of results) {
    for (const doc of snap.docs) {
      byId.set(doc.id, docToListing({ id: doc.id, ...doc.data() }))
    }
  }
  // Preserve the original order of ids
  return ids.map((id) => byId.get(id)).filter((l): l is Listing => l !== undefined)
}

export async function listingsFindBySellerId(sellerId: string): Promise<Listing[]> {
  const db = getDb()
  // No orderBy here — avoids requiring a composite index on sellerId+createdAt.
  // Sorting is done in JS after fetch.
  const snap = await db.collection('listings').where('sellerId', '==', sellerId).get()
  const listings = snap.docs.map((doc) => docToListing({ id: doc.id, ...doc.data() }))
  listings.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  return listings
}

export async function listingsCountBySellerId(sellerId: string): Promise<number> {
  const db = getDb()
  const snap = await db.collection('listings').where('sellerId', '==', sellerId).count().get()
  return snap.data().count
}

export async function listingsCreate(input: CreateListingInput): Promise<Listing> {
  const db = getDb()
  const now = new Date()
  const ref = db.collection('listings').doc()
  const data = {
    ...input,
    id: ref.id,
    createdAt: now,
    updatedAt: now,
  }
  await ref.set(data)
  return docToListing({ ...data, createdAt: now, updatedAt: now })
}

export async function listingsUpdate(id: string, input: UpdateListingInput): Promise<Listing | null> {
  const db = getDb()
  const ref = db.collection('listings').doc(id)
  const doc = await ref.get()
  if (!doc.exists) return null
  await ref.update({ ...input, updatedAt: new Date() })
  const updated = await ref.get()
  return docToListing({ id: updated.id, ...updated.data() })
}

export async function listingsUpdateStatus(id: string, status: ListingStatus): Promise<Listing | null> {
  const db = getDb()
  const ref = db.collection('listings').doc(id)
  const doc = await ref.get()
  if (!doc.exists) return null
  await ref.update({ status, updatedAt: new Date() })
  const updated = await ref.get()
  return docToListing({ id: updated.id, ...updated.data() })
}

export async function listingsUpdateModerationState(
  id: string,
  moderationState: ListingModerationState
): Promise<Listing | null> {
  const db = getDb()
  const ref = db.collection('listings').doc(id)
  const doc = await ref.get()
  if (!doc.exists) return null
  await ref.update({ moderationState, updatedAt: new Date() })
  const updated = await ref.get()
  return docToListing({ id: updated.id, ...updated.data() })
}

export async function listingsRemove(id: string): Promise<boolean> {
  const db = getDb()
  const ref = db.collection('listings').doc(id)
  const doc = await ref.get()
  if (!doc.exists) return false
  await ref.delete()
  return true
}

// ─── Users ─────────────────────────────────────────────────────────────────

export async function usersFindAll(): Promise<User[]> {
  const db = getDb()
  const snap = await db.collection('users').get()
  return snap.docs.map((doc) => docToUser({ id: doc.id, ...doc.data() }))
}

export async function usersFindById(id: string): Promise<User | undefined> {
  const db = getDb()
  const doc = await db.collection('users').doc(id).get()
  if (!doc.exists) return undefined
  return docToUser({ id: doc.id, ...doc.data() })
}

export async function usersFindByEmail(email: string): Promise<User | undefined> {
  const db = getDb()
  const normalized = email.trim().toLowerCase()
  const snap = await db.collection('users').where('gmuEmail', '==', normalized).limit(1).get()
  if (snap.empty) return undefined
  const doc = snap.docs[0]
  return docToUser({ id: doc.id, ...doc.data() })
}

export async function usersUpsert(input: {
  email: string
  displayName: string
  role?: UserRole
}): Promise<User> {
  const db = getDb()
  const normalized = input.email.trim().toLowerCase()
  const role = input.role || 'student'

  const existing = await usersFindByEmail(normalized)
  const nowIso = new Date().toISOString()

  if (existing) {
    const ref = db.collection('users').doc(existing.id)
    await ref.update({
      displayName: input.displayName || existing.displayName,
      role,
      gmuEmailVerified: true,
      isStudentSeller: role !== 'admin',
      lastActiveAt: new Date(),
    })
    const updated = await ref.get()
    return docToUser({ id: updated.id, ...updated.data() })
  }

  const id = `u_${normalized.replace(/[^a-z0-9]/g, '_')}`
  const newUser = {
    id,
    role,
    accountState: 'active',
    displayName: input.displayName || normalized.split('@')[0],
    gmuEmail: normalized,
    gmuEmailVerified: true,
    isStudentSeller: role !== 'admin',
    homeCampus: 'fairfax',
    campusVerification: 'verified',
    lastActiveAt: new Date(),
    joinedAt: new Date(),
    trustBadge: 'verified-gmu',
    reputationScore: role === 'admin' ? 5 : 0,
    listingCount: 0,
  }
  await db.collection('users').doc(id).set(newUser)
  return docToUser(newUser)
}

export async function usersUpdateRole(id: string, role: UserRole): Promise<User | null> {
  const db = getDb()
  const ref = db.collection('users').doc(id)
  const doc = await ref.get()
  if (!doc.exists) return null
  await ref.update({ role, isStudentSeller: role !== 'admin', lastActiveAt: new Date() })
  const updated = await ref.get()
  return docToUser({ id: updated.id, ...updated.data() })
}

export async function usersUpdateAccountState(id: string, accountState: UserAccountState): Promise<User | null> {
  const db = getDb()
  const ref = db.collection('users').doc(id)
  const doc = await ref.get()
  if (!doc.exists) return null
  await ref.update({ accountState, lastActiveAt: new Date() })
  const updated = await ref.get()
  return docToUser({ id: updated.id, ...updated.data() })
}

// ─── Messages ──────────────────────────────────────────────────────────────

export async function messagesListByListing(listingId: string, userId?: string): Promise<Message[]> {
  const db = getDb()
  let snap: FirebaseFirestore.QuerySnapshot

  if (userId) {
    const [sentSnap, receivedSnap] = await Promise.all([
      db.collection('messages')
        .where('listingId', '==', listingId)
        .where('fromUserId', '==', userId)
        .get(),
      db.collection('messages')
        .where('listingId', '==', listingId)
        .where('toUserId', '==', userId)
        .get(),
    ])
    const allDocs = [...sentSnap.docs, ...receivedSnap.docs]
    const unique = new Map(allDocs.map((d) => [d.id, d]))
    const messages = Array.from(unique.values()).map((d) => docToMessage({ id: d.id, ...d.data() }))
    messages.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
    return messages
  }

  snap = await db.collection('messages').where('listingId', '==', listingId).orderBy('createdAt', 'asc').get()
  return snap.docs.map((d) => docToMessage({ id: d.id, ...d.data() }))
}

export async function messagesListThread(listingId: string, userA: string, userB: string): Promise<Message[]> {
  const db = getDb()
  const snap = await db.collection('messages').where('listingId', '==', listingId).get()
  const messages = snap.docs
    .map((d) => docToMessage({ id: d.id, ...d.data() }))
    .filter(
      (m) =>
        (m.fromUserId === userA && m.toUserId === userB) ||
        (m.fromUserId === userB && m.toUserId === userA)
    )
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
  return messages
}

export async function messagesCreate(input: Omit<Message, 'id' | 'createdAt'>): Promise<Message> {
  const db = getDb()
  const ref = db.collection('messages').doc()
  const data = {
    ...input,
    id: ref.id,
    createdAt: new Date(),
  }
  await ref.set(data)
  return docToMessage({ ...data })
}

export async function messagesGetInboxByUser(userId: string): Promise<Message[]> {
  const db = getDb()
  const [sentSnap, receivedSnap] = await Promise.all([
    db.collection('messages').where('fromUserId', '==', userId).get(),
    db.collection('messages').where('toUserId', '==', userId).get(),
  ])
  const allDocs = [...sentSnap.docs, ...receivedSnap.docs]
  const unique = new Map(allDocs.map((d) => [d.id, d]))
  const messages = Array.from(unique.values())
    .map((d) => docToMessage({ id: d.id, ...d.data() }))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  return messages
}

// ─── Reports ───────────────────────────────────────────────────────────────

export async function reportsListAll(): Promise<Report[]> {
  const db = getDb()
  const snap = await db.collection('reports').orderBy('createdAt', 'desc').get()
  return snap.docs.map((d) => docToReport({ id: d.id, ...d.data() }))
}

export async function reportsCreate(input: CreateReportInput): Promise<Report> {
  const db = getDb()
  const ref = db.collection('reports').doc()
  const data = {
    ...input,
    id: ref.id,
    status: 'open',
    createdAt: new Date(),
  }
  await ref.set(data)
  return docToReport(data)
}

export async function reportsUpdateStatus(id: string, status: ReportStatus): Promise<Report | null> {
  const db = getDb()
  const ref = db.collection('reports').doc(id)
  const doc = await ref.get()
  if (!doc.exists) return null
  await ref.update({ status })
  const updated = await ref.get()
  return docToReport({ id: updated.id, ...updated.data() })
}

// ─── Admin Activity ────────────────────────────────────────────────────────

export async function adminActivityListAll(): Promise<AdminActivityLog[]> {
  const db = getDb()
  const snap = await db.collection('adminActivity').orderBy('createdAt', 'desc').get()
  return snap.docs.map((d) => docToAdminActivity({ id: d.id, ...d.data() }))
}

export async function adminActivityCreate(
  input: Omit<AdminActivityLog, 'id' | 'createdAt'>
): Promise<AdminActivityLog> {
  const db = getDb()
  const ref = db.collection('adminActivity').doc()
  const data = {
    ...input,
    id: ref.id,
    createdAt: new Date(),
  }
  await ref.set(data)
  return docToAdminActivity(data)
}

// ─── Favorites ─────────────────────────────────────────────────────────────

export async function favoritesListByUser(userId: string): Promise<string[]> {
  const db = getDb()
  const doc = await db.collection('favorites').doc(userId).get()
  if (!doc.exists) return []
  const data = doc.data()
  return Array.isArray(data?.listingIds) ? data.listingIds : []
}

export async function favoritesAdd(userId: string, listingId: string): Promise<void> {
  const db = getDb()
  const ref = db.collection('favorites').doc(userId)
  const doc = await ref.get()
  if (!doc.exists) {
    await ref.set({ listingIds: [listingId] })
  } else {
    await ref.update({ listingIds: FieldValue.arrayUnion(listingId) })
  }
}

export async function favoritesRemove(userId: string, listingId: string): Promise<void> {
  const db = getDb()
  const ref = db.collection('favorites').doc(userId)
  const doc = await ref.get()
  if (!doc.exists) return
  await ref.update({ listingIds: FieldValue.arrayRemove(listingId) })
}

// ─── Conversations (derived from messages) ─────────────────────────────────

export async function conversationsListByUser(userId: string) {
  const messages = await messagesGetInboxByUser(userId)
  return messages
    .map((message) => {
      const peerId = message.fromUserId === userId ? message.toUserId : message.fromUserId
      return {
        key: `${message.listingId}:${[userId, peerId].sort().join(':')}`,
        message,
        peerId,
      }
    })
    .filter((entry, index, arr) => arr.findIndex((c) => c.key === entry.key) === index)
    .map(({ message, peerId }) => ({
      id: `${message.listingId}:${[userId, peerId].sort().join(':')}`,
      listingId: message.listingId,
      participantIds: [userId, peerId].sort() as [string, string],
      lastMessagePreview: message.body,
      lastMessageAt: message.createdAt,
    }))
}
