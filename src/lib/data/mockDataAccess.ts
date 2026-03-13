import { db } from '@/lib/db'
import { MarketplaceDataAccess } from '@/lib/data/contracts'

export const mockDataAccess: MarketplaceDataAccess = {
  listings: {
    findMany: () => db.listings.getAll(),
    findById: (id) => db.listings.getById(id),
    findBySellerId: (sellerId) => db.listings.getBySellerId(sellerId),
    create: (input) => db.listings.create(input),
    update: (id, input) => db.listings.update(id, input),
    updateStatus: (id, status) => db.listings.updateStatus(id, status),
    updateModerationState: (id, moderationState) =>
      db.listings.updateModerationState(id, moderationState),
    remove: (id) => db.listings.remove(id),
    countBySellerId: (sellerId) => db.listings.countBySellerId(sellerId),
  },
  users: {
    findAll: () => db.users.getAll(),
    findById: (id) => db.users.getById(id),
    findByEmail: (email) => db.users.getByEmail(email),
    upsert: (input) => db.users.upsert(input),
    updateRole: (id, role) => db.users.updateRole(id, role),
    updateAccountState: (id, accountState) =>
      db.users.updateAccountState(id, accountState),
  },
  favorites: {
    // Client-side local storage handles favorites for now.
    // Replace with DB-backed implementation later.
    listListingIdsByUser: () => [],
    add: () => {},
    remove: () => {},
  },
  conversations: {
    listByUser: (userId) => {
      return db.messages.getInboxByUser(userId).map((message) => {
        const peerId = message.fromUserId === userId ? message.toUserId : message.fromUserId
        return {
          id: `${message.listingId}:${[userId, peerId].sort().join(':')}`,
          listingId: message.listingId,
          participantIds: [userId, peerId].sort() as [string, string],
          lastMessagePreview: message.body,
          lastMessageAt: message.createdAt,
        }
      })
    },
  },
  messages: {
    listByListing: (listingId, userId) => db.messages.getByListing(listingId, userId),
    listThread: (listingId, userA, userB) => db.messages.getThread(listingId, userA, userB),
    create: (input) => db.messages.create(input),
  },
  reports: {
    listAll: () => db.reports.getAll(),
    create: (input) => db.reports.create(input),
    updateStatus: (id, status) => db.reports.updateStatus(id, status),
  },
  adminActivity: {
    listAll: () => db.adminActivity.getAll(),
    create: (input) => db.adminActivity.create(input),
  },
}
