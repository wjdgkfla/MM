'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AuthRequiredCard } from '@/components/AuthRequiredCard'
import { useAuthSession } from '@/lib/auth/useAuthSession'
import { Notification } from '@/lib/types'
import { formatRecency } from '@/lib/time'

export default function NotificationsPage() {
  const { session, loading } = useAuthSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loadingList, setLoadingList] = useState(true)

  const load = () => {
    if (!session) return
    setLoadingList(true)
    fetch('/api/notifications')
      .then((res) => res.json())
      .then((data) => setNotifications(Array.isArray(data) ? data : []))
      .finally(() => setLoadingList(false))
  }

  useEffect(load, [session])

  const markRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setNotifications((current) => current.map((n) => n.id === id ? { ...n, isRead: true } : n))
  }

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
    setNotifications((current) => current.map((n) => ({ ...n, isRead: true })))
  }

  if (loading) return <div className="mx-auto max-w-3xl px-6 py-10 text-sm text-[var(--m-muted)]">Loading...</div>
  if (!session) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <AuthRequiredCard title="Sign in to view notifications" description="Notifications are available for signed-in GMU users." redirectTo="/notifications" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[36px] font-black text-[var(--m-ink)]">Notifications</h1>
          <p className="mt-1 text-sm text-[var(--m-muted)]">Messages, offers, saved searches, price drops, and listing reminders.</p>
        </div>
        <button type="button" onClick={markAllRead} className="ui-btn-secondary">Mark all read</button>
      </div>

      <div className="mt-6 space-y-2">
        {loadingList ? (
          <div className="h-28 rounded-xl bg-[var(--m-soft)] animate-pulse" />
        ) : notifications.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-[var(--m-muted)]" style={{ borderColor: 'var(--m-line)' }}>
            No notifications yet.
          </div>
        ) : notifications.map((notification) => (
          <div key={notification.id} className="rounded-xl border bg-white p-4" style={{ borderColor: notification.isRead ? 'var(--m-line)' : 'var(--m-green)' }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-[var(--m-ink)]">{notification.title}</p>
                <p className="mt-1 text-sm text-[var(--m-muted)]">{notification.body}</p>
                <p className="mt-2 text-xs text-[var(--m-muted)]">{formatRecency(notification.createdAt)}</p>
              </div>
              {!notification.isRead ? <span className="mt-1 h-2 w-2 rounded-full bg-[var(--m-pop)]" /> : null}
            </div>
            <div className="mt-3 flex gap-3">
              {notification.link ? (
                <Link href={notification.link} onClick={() => markRead(notification.id)} className="text-sm font-medium text-[var(--m-green)]">Open</Link>
              ) : null}
              {!notification.isRead ? (
                <button type="button" onClick={() => markRead(notification.id)} className="text-sm font-medium text-[var(--m-muted)]">Mark read</button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
