import {
  applyPhotoAction,
  getCoverImageUrl,
} from '@/lib/photoCollection'
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
})
