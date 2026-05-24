import {
  applyPhotoAction,
  getCoverImageUrl,
} from '@/lib/photoCollection'
import { mannerTemperature } from '@/lib/trust'
import {
  calculateListingLifecycle,
  getDefaultListingExpiry,
  shouldCreatePriceDropNotification,
} from '@/lib/marketplaceLifecycle'
import {
  buildNotification,
  canReadNotification,
} from '@/lib/notifications'
import {
  conversationUnreadCount,
  getConversationReadUpdate,
  recoverConversationSummariesFromMessages,
} from '@/lib/readState'

describe('marketplace feature helpers', () => {
  test('photo actions can reorder, remove, and choose a cover image', () => {
    const initial = ['a.jpg', 'b.jpg', 'c.jpg']

    const reordered = applyPhotoAction(initial, { type: 'move', from: 2, to: 0 })
    expect(reordered).toEqual(['c.jpg', 'a.jpg', 'b.jpg'])

    const removed = applyPhotoAction(reordered, { type: 'remove', index: 1 })
    expect(removed).toEqual(['c.jpg', 'b.jpg'])

    expect(getCoverImageUrl(removed, 'b.jpg')).toBe('b.jpg')
    expect(getCoverImageUrl(removed, 'missing.jpg')).toBe('c.jpg')
  })

  test('listing lifecycle marks stale and expired listings from timestamps', () => {
    const now = new Date('2026-05-19T12:00:00.000Z')

    expect(getDefaultListingExpiry(now).toISOString()).toBe('2026-07-18T12:00:00.000Z')
    expect(
      calculateListingLifecycle({
        now,
        expiresAt: '2026-05-18T12:00:00.000Z',
        lastRefreshedAt: '2026-03-01T12:00:00.000Z',
      })
    ).toEqual({ isExpired: true, isStale: true })
    expect(
      calculateListingLifecycle({
        now,
        expiresAt: '2026-07-18T12:00:00.000Z',
        lastRefreshedAt: '2026-05-01T12:00:00.000Z',
      })
    ).toEqual({ isExpired: false, isStale: false })
  })

  test('price drop notifications only trigger on actual decreases', () => {
    expect(shouldCreatePriceDropNotification(40, 35)).toBe(true)
    expect(shouldCreatePriceDropNotification(40, 40)).toBe(false)
    expect(shouldCreatePriceDropNotification(40, 45)).toBe(false)
  })

  test('notifications are user-owned and deep-linkable', () => {
    const notification = buildNotification({
      userId: 'user-a',
      type: 'new-message',
      title: 'New message',
      body: 'Someone asked about your listing.',
      link: '/messages?thread=abc',
      meta: { conversationId: 'abc' },
    })

    expect(notification.userId).toBe('user-a')
    expect(notification.isRead).toBe(false)
    expect(notification.link).toBe('/messages?thread=abc')
    expect(canReadNotification(notification, 'user-a')).toBe(true)
    expect(canReadNotification(notification, 'user-b')).toBe(false)
  })

  test('read state derives unread counts and update payloads per participant role', () => {
    const messages = [
      { toUserId: 'buyer', createdAt: '2026-05-19T12:01:00.000Z' },
      { toUserId: 'seller', createdAt: '2026-05-19T12:02:00.000Z' },
      { toUserId: 'buyer', createdAt: '2026-05-19T12:03:00.000Z' },
    ]

    expect(
      conversationUnreadCount(messages, 'buyer', '2026-05-19T12:02:30.000Z')
    ).toBe(1)
    expect(
      conversationUnreadCount(messages, 'seller', '2026-05-19T12:02:30.000Z')
    ).toBe(0)
    expect(getConversationReadUpdate('buyer', 'buyer').field).toBe('buyer_last_read_at')
    expect(getConversationReadUpdate('seller', 'buyer').field).toBe('seller_last_read_at')
  })

  test('mannerTemperature clamps and computes correctly', () => {
    expect(mannerTemperature(0)).toBe(36.5)
    expect(mannerTemperature(10)).toBe(46.5)
    expect(mannerTemperature(-36.5)).toBe(0)
    expect(mannerTemperature(62.5)).toBe(99)
    expect(mannerTemperature(-40)).toBe(0)
    expect(mannerTemperature(100)).toBe(99)
    expect(mannerTemperature(-5)).toBe(31.5)
  })

  test('recovers conversation summaries from legacy message rows', () => {
    const summaries = recoverConversationSummariesFromMessages([
      {
        id: 'm1',
        listingId: 'listing-a',
        fromUserId: 'buyer',
        toUserId: 'seller',
        body: 'Still available?',
        createdAt: '2026-05-19T12:00:00.000Z',
      },
      {
        id: 'm2',
        listingId: 'listing-a',
        fromUserId: 'seller',
        toUserId: 'buyer',
        body: 'Yes',
        createdAt: '2026-05-19T12:05:00.000Z',
      },
      {
        id: 'm3',
        listingId: 'listing-b',
        fromUserId: 'other',
        toUserId: 'buyer',
        body: 'Can meet today',
        createdAt: '2026-05-19T12:10:00.000Z',
      },
    ], 'buyer')

    expect(summaries).toHaveLength(2)
    expect(summaries[0]).toMatchObject({
      listingId: 'listing-b',
      participantIds: ['buyer', 'other'],
      lastMessagePreview: 'Can meet today',
      unreadCount: 1,
    })
    expect(summaries[1]).toMatchObject({
      listingId: 'listing-a',
      participantIds: ['buyer', 'seller'],
      lastMessagePreview: 'Yes',
      unreadCount: 1,
    })
  })
})
