'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Conversation } from '@/lib/data/contracts'
import { useAuthSession } from '@/lib/auth/useAuthSession'

const UnreadMessagesContext = createContext<boolean>(false)

export function UnreadMessagesProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuthSession()
  const pathname = usePathname()
  const [hasUnread, setHasUnread] = useState(false)
  const userId = session?.userId

  useEffect(() => {
    if (!userId) return

    const checkUnread = async () => {
      try {
        const res = await fetch('/api/messages')
        if (!res.ok) return
        const conversations = (await res.json()) as Conversation[]
        if (!Array.isArray(conversations) || conversations.length === 0) return
        const apiUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
        if (apiUnread > 0) {
          setHasUnread(true)
          return
        }
        const lastSeen = parseInt(localStorage.getItem('mm_msgs_last_seen') || '0', 10)
        const hasNew = conversations.some(
          (c) => c.lastMessageAt && new Date(c.lastMessageAt).getTime() > lastSeen
        )
        setHasUnread(hasNew)
      } catch {
        // silently ignore — unread dot is non-critical
      }
    }

    checkUnread()
    // Poll every 30s so the badge updates without a page reload — a single
    // shared poll for the whole app, rather than one per consumer component.
    const interval = setInterval(checkUnread, 30_000)
    return () => clearInterval(interval)
  }, [userId])

  useEffect(() => {
    if (pathname === '/messages') {
      setHasUnread(false)
    }
  }, [pathname])

  return (
    <UnreadMessagesContext.Provider value={hasUnread}>
      {children}
    </UnreadMessagesContext.Provider>
  )
}

export function useUnreadMessages(): boolean {
  return useContext(UnreadMessagesContext)
}
