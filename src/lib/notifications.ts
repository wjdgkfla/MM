import { randomUUID } from 'crypto'
import { Notification, NotificationType } from '@/lib/types'

export function buildNotification(input: {
  userId: string
  type: NotificationType
  title: string
  body: string
  link?: string
  meta?: Record<string, unknown>
}): Notification {
  return {
    id: randomUUID(),
    userId: input.userId,
    type: input.type,
    title: input.title.trim(),
    body: input.body.trim(),
    link: input.link,
    meta: input.meta,
    isRead: false,
    createdAt: new Date().toISOString(),
  }
}

export function canReadNotification(notification: Pick<Notification, 'userId'>, userId: string): boolean {
  return notification.userId === userId
}
