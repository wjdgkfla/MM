import {
  AdminActivityLog,
  Listing,
  ListingModerationState,
  Message,
  Report,
  ReportStatus,
  SellerProfileSnapshot,
  User,
  UserAccountState,
  UserRole,
} from './types'
import { UpdateListingInput } from './data/contracts'

const now = Date.now()

const users: User[] = [
  {
    id: 'u1',
    role: 'student',
    accountState: 'active',
    displayName: 'Ariana K.',
    gmuEmail: 'akim28@gmu.edu',
    gmuEmailVerified: true,
    profileImageUrl: '/profiles/u1.svg',
    isStudentSeller: true,
    homeCampus: 'fairfax',
    campusVerification: 'verified',
    lastActiveAt: new Date(now - 1000 * 60 * 18).toISOString(),
    joinedAt: new Date(now - 1000 * 60 * 60 * 24 * 380).toISOString(),
    trustBadge: 'trusted-seller',
    reputationScore: 4.9,
    listingCount: 0,
  },
  {
    id: 'u2',
    role: 'student',
    accountState: 'active',
    displayName: 'Luis M.',
    gmuEmail: 'lmartin13@gmu.edu',
    gmuEmailVerified: true,
    profileImageUrl: '/profiles/u2.svg',
    isStudentSeller: true,
    homeCampus: 'fairfax',
    campusVerification: 'verified',
    lastActiveAt: new Date(now - 1000 * 60 * 42).toISOString(),
    joinedAt: new Date(now - 1000 * 60 * 60 * 24 * 240).toISOString(),
    trustBadge: 'verified-gmu',
    reputationScore: 4.7,
    listingCount: 0,
  },
  {
    id: 'u3',
    role: 'student',
    accountState: 'active',
    displayName: 'Nina R.',
    gmuEmail: 'nrivera@masonlive.gmu.edu',
    gmuEmailVerified: true,
    profileImageUrl: '/profiles/u3.svg',
    isStudentSeller: true,
    homeCampus: 'arlington',
    campusVerification: 'verified',
    lastActiveAt: new Date(now - 1000 * 60 * 12).toISOString(),
    joinedAt: new Date(now - 1000 * 60 * 60 * 24 * 190).toISOString(),
    trustBadge: 'verified-gmu',
    reputationScore: 4.8,
    listingCount: 0,
  },
  {
    id: 'u4',
    role: 'student',
    accountState: 'active',
    displayName: 'Maya S.',
    gmuEmail: 'msharma@gmu.edu',
    gmuEmailVerified: true,
    profileImageUrl: '/profiles/u4.svg',
    isStudentSeller: true,
    homeCampus: 'fairfax',
    campusVerification: 'verified',
    lastActiveAt: new Date(now - 1000 * 60 * 90).toISOString(),
    joinedAt: new Date(now - 1000 * 60 * 60 * 24 * 420).toISOString(),
    trustBadge: 'trusted-seller',
    reputationScore: 5,
    listingCount: 0,
  },
  {
    id: 'u5',
    role: 'student',
    accountState: 'active',
    displayName: 'Theo B.',
    gmuEmail: 'tbaker@gmu.edu',
    gmuEmailVerified: true,
    profileImageUrl: '/profiles/u5.svg',
    isStudentSeller: true,
    homeCampus: 'sci-tech',
    campusVerification: 'verified',
    lastActiveAt: new Date(now - 1000 * 60 * 7).toISOString(),
    joinedAt: new Date(now - 1000 * 60 * 60 * 24 * 40).toISOString(),
    trustBadge: 'new-seller',
    reputationScore: 4.2,
    listingCount: 0,
  },
  {
    id: 'u6',
    role: 'student',
    accountState: 'active',
    displayName: 'Jordan P.',
    gmuEmail: 'jpark42@gmu.edu',
    gmuEmailVerified: true,
    profileImageUrl: '/profiles/u6.svg',
    isStudentSeller: true,
    homeCampus: 'fairfax',
    campusVerification: 'verified',
    lastActiveAt: new Date(now - 1000 * 60 * 5).toISOString(),
    joinedAt: new Date(now - 1000 * 60 * 60 * 24 * 120).toISOString(),
    trustBadge: 'verified-gmu',
    reputationScore: 4.6,
    listingCount: 0,
  },
  {
    id: 'u7',
    role: 'student',
    accountState: 'active',
    displayName: 'Sam T.',
    gmuEmail: 'sturner7@gmu.edu',
    gmuEmailVerified: true,
    profileImageUrl: '/profiles/u7.svg',
    isStudentSeller: true,
    homeCampus: 'fairfax',
    campusVerification: 'verified',
    lastActiveAt: new Date(now - 1000 * 60 * 150).toISOString(),
    joinedAt: new Date(now - 1000 * 60 * 60 * 24 * 86).toISOString(),
    trustBadge: 'new-seller',
    reputationScore: 4.1,
    listingCount: 0,
  },
  {
    id: 'u8',
    role: 'student',
    accountState: 'active',
    displayName: 'Chris L.',
    gmuEmail: 'clee19@gmu.edu',
    gmuEmailVerified: true,
    profileImageUrl: '/profiles/u8.svg',
    isStudentSeller: true,
    homeCampus: 'fairfax',
    campusVerification: 'pending',
    lastActiveAt: new Date(now - 1000 * 60 * 31).toISOString(),
    joinedAt: new Date(now - 1000 * 60 * 60 * 24 * 64).toISOString(),
    trustBadge: 'new-seller',
    reputationScore: 4,
    listingCount: 0,
  },
  {
    id: 'u_admin',
    role: 'admin',
    accountState: 'active',
    displayName: 'Mason Admin',
    gmuEmail: 'admin@gmu.edu',
    gmuEmailVerified: true,
    isStudentSeller: false,
    homeCampus: 'fairfax',
    campusVerification: 'verified',
    lastActiveAt: new Date(now - 1000 * 60 * 2).toISOString(),
    joinedAt: new Date(now - 1000 * 60 * 60 * 24 * 500).toISOString(),
    trustBadge: 'verified-gmu',
    reputationScore: 5,
    listingCount: 0,
  },
]

const toSellerProfile = (user: User): SellerProfileSnapshot => ({
  displayName: user.displayName,
  profileImageUrl: user.profileImageUrl,
  trustBadge: user.trustBadge,
  reputationScore: user.reputationScore,
  isGmuVerified: user.gmuEmailVerified,
  isStudentSeller: user.isStudentSeller,
  homeCampus: user.homeCampus,
  lastActiveAt: user.lastActiveAt,
  campusVerification: user.campusVerification,
})

const listings: Listing[] = [
  {
    id: 'l1',
    title: 'CS 112 + MATH 125 Textbook Bundle',
    description: 'Both books used one semester. Light highlighting, no torn pages. Great for first-year Mason students.',
    price: 48,
    category: 'textbooks',
    condition: 'good',
    status: 'available',
    moderationState: 'visible',
    imageUrls: ['/listings/textbook-bundle.svg'],
    sellerId: 'u1',
    sellerProfile: toSellerProfile(users[0]),
    campusLocation: 'fairfax',
    pickupZone: 'jc-lobby',
    pickupNotes: 'Meet inside Johnson Center lobby near the info desk between 12-2 PM.',
    courseCode: 'CS 112 / MATH 125',
    professorName: 'Any section',
    edition: 'Latest used on campus',
    bundleNotes: 'Includes both required books together as a starter bundle.',
    tags: ['textbook', 'freshman', 'bundle', 'CS112', 'MATH125'],
    favoriteCount: 6,
    createdAt: new Date(now - 1000 * 60 * 25).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 25).toISOString(),
  },
  {
    id: 'l2',
    title: 'Mini Fridge 3.2 cu ft (Dorm Move-Out)',
    description: 'Clean, quiet, and works perfectly. Pickup near Potomac Heights this week only.',
    price: 75,
    category: 'furniture',
    condition: 'like-new',
    status: 'reserved',
    moderationState: 'visible',
    imageUrls: ['/listings/mini-fridge.svg'],
    sellerId: 'u2',
    sellerProfile: toSellerProfile(users[1]),
    campusLocation: 'fairfax',
    pickupZone: 'potomac-courtyard',
    pickupNotes: 'Can help load into car after 5 PM.',
    tags: ['dorm', 'move-out'],
    favoriteCount: 12,
    createdAt: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 50).toISOString(),
  },
  {
    id: 'l3',
    title: '24" Dell Monitor + HDMI Cable',
    description: 'No dead pixels. Used for coding and lectures in my apartment. Includes stand + cable.',
    price: 95,
    category: 'electronics',
    condition: 'good',
    status: 'available',
    moderationState: 'visible',
    imageUrls: ['/listings/monitor.svg'],
    sellerId: 'u6',
    sellerProfile: toSellerProfile(users[5]),
    campusLocation: 'fairfax',
    pickupZone: 'engineering-atrium',
    pickupNotes: 'Pickup weekdays after class around 4:30 PM.',
    tags: ['monitor', 'coding'],
    favoriteCount: 8,
    createdAt: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: 'l4',
    title: 'TI-84 Plus Graphing Calculator',
    description: 'Used in STAT 250 and MATH 113. Battery cover intact and all buttons work.',
    price: 50,
    category: 'electronics',
    condition: 'good',
    status: 'available',
    moderationState: 'visible',
    imageUrls: ['/listings/calculator.svg'],
    sellerId: 'u3',
    sellerProfile: toSellerProfile(users[2]),
    campusLocation: 'arlington',
    pickupZone: 'van-metre-hall',
    pickupNotes: 'Can meet in Van Metre Hall lobby mornings.',
    tags: ['calculator', 'math', 'STAT250', 'MATH113'],
    favoriteCount: 10,
    createdAt: new Date(now - 1000 * 60 * 60 * 6).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    id: 'l5',
    title: 'Desk Lamp (Warm/White Modes)',
    description: 'Perfect for dorm desks. USB powered, two brightness modes, no issues.',
    price: 12,
    category: 'supplies',
    condition: 'like-new',
    status: 'available',
    moderationState: 'visible',
    imageUrls: ['/listings/desk-lamp.svg'],
    sellerId: 'u5',
    sellerProfile: toSellerProfile(users[4]),
    campusLocation: 'sci-tech',
    pickupZone: 'sci-tech-kiosk',
    pickupNotes: 'Available most afternoons near student kiosk.',
    tags: ['dorm', 'lamp'],
    favoriteCount: 3,
    createdAt: new Date(now - 1000 * 60 * 60 * 8).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 60 * 8).toISOString(),
  },
  {
    id: 'l6',
    title: 'IKEA Dorm Chair (Black)',
    description: 'Comfortable for study sessions. Some minor scratches on legs.',
    price: 30,
    category: 'furniture',
    condition: 'fair',
    status: 'available',
    moderationState: 'visible',
    imageUrls: ['/listings/dorm-chair.svg'],
    sellerId: 'u7',
    sellerProfile: toSellerProfile(users[6]),
    campusLocation: 'fairfax',
    pickupZone: 'shenandoah-deck',
    pickupNotes: 'Pickup in Shenandoah deck level 2 evenings.',
    tags: ['chair', 'apartment'],
    favoriteCount: 4,
    createdAt: new Date(now - 1000 * 60 * 60 * 20).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 60 * 20).toISOString(),
  },
  {
    id: 'l7',
    title: 'GMU Hoodie (Large, Forest Green)',
    description: 'Official bookstore hoodie. Worn a few times, still in great shape.',
    price: 22,
    category: 'clothing',
    condition: 'good',
    status: 'sold',
    moderationState: 'visible',
    imageUrls: ['/listings/hoodie.svg'],
    sellerId: 'u4',
    sellerProfile: toSellerProfile(users[3]),
    campusLocation: 'fairfax',
    pickupZone: 'fenwick-entrance',
    pickupNotes: 'Sold, kept for listing history.',
    tags: ['hoodie', 'gmu'],
    favoriteCount: 14,
    createdAt: new Date(now - 1000 * 60 * 60 * 29).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: 'l8',
    title: 'Free Moving Boxes (8 Medium)',
    description: 'Free pickup. Good for end-of-semester apartment move-out.',
    price: 0,
    category: 'free',
    condition: 'good',
    status: 'available',
    moderationState: 'visible',
    imageUrls: ['/listings/moving-boxes.svg'],
    sellerId: 'u8',
    sellerProfile: toSellerProfile(users[7]),
    campusLocation: 'fairfax',
    pickupZone: 'off-campus-fairfax',
    pickupNotes: 'Off-campus near Main St. DM before pickup.',
    tags: ['free', 'move-out', 'boxes'],
    favoriteCount: 7,
    createdAt: new Date(now - 1000 * 60 * 60 * 33).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 60 * 33).toISOString(),
  },
]

const refreshListingCounts = () => {
  users.forEach((user) => {
    user.listingCount = listings.filter((listing) => listing.sellerId === user.id).length
  })
}

refreshListingCounts()

const messages: Message[] = [
  {
    id: 'm1',
    listingId: 'l1',
    fromUserId: 'u6',
    toUserId: 'u1',
    body: 'Hi! Is this still available for pickup at JC tomorrow?',
    createdAt: new Date(now - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'm2',
    listingId: 'l1',
    fromUserId: 'u1',
    toUserId: 'u6',
    body: 'Yes, available. I can meet around 1:30 PM near the lobby doors.',
    createdAt: new Date(now - 1000 * 60 * 33).toISOString(),
  },
  {
    id: 'm3',
    listingId: 'l3',
    fromUserId: 'u2',
    toUserId: 'u6',
    body: 'Hi, is this still available?',
    createdAt: new Date(now - 1000 * 60 * 55).toISOString(),
  },
  {
    id: 'm4',
    listingId: 'l3',
    fromUserId: 'u6',
    toUserId: 'u2',
    body: 'Yep, still available. Can we meet at Johnson Center?',
    createdAt: new Date(now - 1000 * 60 * 47).toISOString(),
  },
  {
    id: 'm5',
    listingId: 'l3',
    fromUserId: 'u2',
    toUserId: 'u6',
    body: 'Can you do $25?',
    createdAt: new Date(now - 1000 * 60 * 41).toISOString(),
  },
  {
    id: 'm6',
    listingId: 'l3',
    fromUserId: 'u6',
    toUserId: 'u2',
    body: 'I can pick up this afternoon if $25 works for you.',
    createdAt: new Date(now - 1000 * 60 * 35).toISOString(),
  },
]

const reports: Report[] = []
const adminActivityLogs: AdminActivityLog[] = []

export const db = {
  listings: {
    getAll: () => [...listings].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    getById: (id: string) => listings.find((listing) => listing.id === id),
    getBySellerId: (sellerId: string) =>
      listings
        .filter((listing) => listing.sellerId === sellerId)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    countBySellerId: (sellerId: string) => listings.filter((listing) => listing.sellerId === sellerId).length,
    create: (listing: Omit<Listing, 'id' | 'createdAt' | 'updatedAt'>) => {
      const timestamp = new Date().toISOString()
      const newListing: Listing = {
        ...listing,
        moderationState: listing.moderationState || 'visible',
        id: `l${Date.now()}`,
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      listings.unshift(newListing)
      refreshListingCounts()
      return newListing
    },
    update: (id: string, updates: UpdateListingInput) => {
      const listing = listings.find((item) => item.id === id)
      if (!listing) return null

      const nextListing: Listing = {
        ...listing,
        ...updates,
        updatedAt: new Date().toISOString(),
      }

      const index = listings.findIndex((item) => item.id === id)
      listings[index] = nextListing
      return nextListing
    },
    updateStatus: (id: string, status: Listing['status']) => {
      const listing = listings.find((item) => item.id === id)
      if (!listing) return null
      listing.status = status
      listing.updatedAt = new Date().toISOString()
      return listing
    },
    updateModerationState: (id: string, moderationState: ListingModerationState) => {
      const listing = listings.find((item) => item.id === id)
      if (!listing) return null
      listing.moderationState = moderationState
      listing.updatedAt = new Date().toISOString()
      return listing
    },
    remove: (id: string) => {
      const index = listings.findIndex((item) => item.id === id)
      if (index < 0) return false

      listings.splice(index, 1)
      for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
        if (messages[messageIndex].listingId === id) {
          messages.splice(messageIndex, 1)
        }
      }
      refreshListingCounts()
      return true
    },
  },
  users: {
    getAll: () => [...users],
    getById: (id: string) => users.find((user) => user.id === id),
    updateRole: (id: string, role: UserRole) => {
      const user = users.find((item) => item.id === id)
      if (!user) return null
      user.role = role
      return user
    },
    updateAccountState: (id: string, accountState: UserAccountState) => {
      const user = users.find((item) => item.id === id)
      if (!user) return null
      user.accountState = accountState
      return user
    },
  },
  messages: {
    getByListing: (listingId: string, buyerId?: string) =>
      messages
        .filter((m) => m.listingId === listingId && (!buyerId || m.fromUserId === buyerId || m.toUserId === buyerId))
        .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    getThread: (listingId: string, userA: string, userB: string) =>
      messages
        .filter(
          (m) =>
            m.listingId === listingId &&
            ((m.fromUserId === userA && m.toUserId === userB) ||
              (m.fromUserId === userB && m.toUserId === userA))
        )
        .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    create: (payload: Omit<Message, 'id' | 'createdAt'>) => {
      const newMessage: Message = {
        ...payload,
        id: `m${Date.now()}`,
        createdAt: new Date().toISOString(),
      }
      messages.push(newMessage)
      return newMessage
    },
    getInboxByUser: (userId: string) => {
      return messages
        .filter((m) => m.fromUserId === userId || m.toUserId === userId)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .map((message) => {
          const key = `${message.listingId}-${[message.fromUserId, message.toUserId].sort().join('-')}`
          return { key, message }
        })
        .filter((entry, index, arr) => arr.findIndex((candidate) => candidate.key === entry.key) === index)
        .map(({ message }) => message)
    },
  },
  reports: {
    getAll: () => [...reports].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    create: (payload: Omit<Report, 'id' | 'createdAt' | 'status'>) => {
      const newReport: Report = {
        ...payload,
        id: `r${Date.now()}`,
        status: 'open',
        createdAt: new Date().toISOString(),
      }
      reports.unshift(newReport)
      return newReport
    },
    updateStatus: (id: string, status: ReportStatus) => {
      const report = reports.find((item) => item.id === id)
      if (!report) return null
      report.status = status
      return report
    },
  },
  adminActivity: {
    getAll: () => [...adminActivityLogs].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    create: (payload: Omit<AdminActivityLog, 'id' | 'createdAt'>) => {
      const entry: AdminActivityLog = {
        ...payload,
        id: `a${Date.now()}`,
        createdAt: new Date().toISOString(),
      }
      adminActivityLogs.unshift(entry)
      return entry
    },
  },
}
