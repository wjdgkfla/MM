'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Listing, Message } from '@/lib/types'
import { PICKUP_ZONE_LABELS, PickupZone } from '@/lib/types'
import { formatRecency } from '@/lib/time'
import { Conversation } from '@/lib/data/contracts'
import { useAuthSession } from '@/lib/auth/useAuthSession'
import { AuthRequiredCard } from '@/components/AuthRequiredCard'
import { showToast } from '@/components/Toast'
import { useLocale } from '@/lib/i18n/LocaleProvider'

type ConversationSummary = {
  key: string
  listingId: string
  listingTitle: string
  listingStatus: Listing['status']
  peerId: string
  peerLabel: string
  lastMessage: string
  lastMessageAt: string
  unreadCount?: number
  // True for a conversation injected client-side before any message has been
  // sent (arriving from a listing page with no existing thread). Its key is
  // a locally-derived placeholder, not a real conversation row, so it can't
  // be marked read server-side.
  isSynthetic?: boolean
}

const STARTER_MESSAGES = [
  'Hi, is this still available?',
  'Can we meet at Johnson Center?',
  'Can you do $25?',
  'I can pick up this afternoon.',
]

function conversationKey(listingId: string, a: string, b: string) {
  return `${listingId}:${[a, b].sort().join(':')}`
}

export default function MessagesPage() {
  const { t } = useLocale()
  const { session, loading: authLoading } = useAuthSession()
  const currentUserId = session?.userId || ''
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [showThread, setShowThread] = useState(false) // mobile: true = thread view, false = list view
  const [thread, setThread] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [loadingInbox, setLoadingInbox] = useState(true)
  const [inboxError, setInboxError] = useState(false)
  const [loadingThread, setLoadingThread] = useState(false)
  const [sending, setSending] = useState(false)
  const [markingSold, setMarkingSold] = useState(false)
  const didAutoSend = useRef(false)
  const isSendingRef = useRef(false)
  const threadScrollRef = useRef<HTMLDivElement>(null)
  const threadCountRef = useRef(0)

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.key === selectedKey) || null,
    [conversations, selectedKey]
  )

  useEffect(() => {
    const loadInbox = async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const listingIdFromDetail = params.get('listingId')

        if (!currentUserId) return

        setInboxError(false)
        const inboxRes = await fetch(`/api/messages?userId=${currentUserId}`)
        if (!inboxRes.ok) throw new Error('Failed to load conversations')
        const inbox = (await inboxRes.json()) as Conversation[]
        const conversationList = Array.isArray(inbox) ? inbox : []

        // Batch-fetch every conversation's listing in one request instead of
        // one fetch per conversation — avoids N+1 round-trips (slow inboxes,
        // and risked tripping the per-route rate limit on busy accounts).
        const listingIds = Array.from(
          new Set([
            ...conversationList.map((c) => c.listingId),
            ...(listingIdFromDetail ? [listingIdFromDetail] : []),
          ])
        )
        const listingsById = new Map<string, Listing>()
        if (listingIds.length > 0) {
          const listingsRes = await fetch(`/api/listings?ids=${listingIds.join(',')}`).catch(() => null)
          if (listingsRes?.ok) {
            const listings = (await listingsRes.json().catch(() => [])) as Listing[]
            if (Array.isArray(listings)) {
              for (const listing of listings) listingsById.set(listing.id, listing)
            }
          }
        }

        const summaries: ConversationSummary[] = []

        for (const conversation of conversationList) {
          const peerId = conversation.participantIds.find((participantId) => participantId !== currentUserId)
          if (!peerId) continue

          const listing = listingsById.get(conversation.listingId)

          if (!listing) {
            summaries.push({
              key: conversation.id,
              listingId: conversation.listingId,
              listingTitle: 'Listing unavailable',
              listingStatus: 'available',
              peerId,
              peerLabel: 'Marketplace user',
              lastMessage: conversation.lastMessagePreview,
              lastMessageAt: conversation.lastMessageAt,
              unreadCount: conversation.unreadCount || 0,
            })
            continue
          }

          summaries.push({
            key: conversation.id,
            listingId: conversation.listingId,
            listingTitle: listing.title,
            listingStatus: listing.status,
            peerId,
            peerLabel:
              peerId === listing.sellerId ? listing.sellerProfile.displayName : 'Interested buyer',
            lastMessage: conversation.lastMessagePreview,
            lastMessageAt: conversation.lastMessageAt,
            unreadCount: conversation.unreadCount || 0,
          })
        }

        let merged = summaries

        if (listingIdFromDetail) {
          const listing = listingsById.get(listingIdFromDetail)
          if (listing) {
            const peerId = listing.sellerId
            const key = conversationKey(listing.id, currentUserId, peerId)

            if (!summaries.some((conversation) => conversation.key === key)) {
              merged = [
                {
                  key,
                  listingId: listing.id,
                  listingTitle: listing.title,
                  listingStatus: listing.status,
                  peerId,
                  peerLabel: listing.sellerProfile.displayName,
                  lastMessage: 'Start a conversation about this listing.',
                  lastMessageAt: listing.updatedAt,
                  isSynthetic: true,
                },
                ...summaries,
              ]
            }
          }
        }

        setConversations(merged)
        // Only auto-open when navigating from a specific listing page
        setSelectedKey(listingIdFromDetail ? (merged[0]?.key || null) : null)

        // Auto-send "Still available?" if navigated here via that button.
        // Fetch the thread first to avoid sending a duplicate if the user navigates back.
        const isQuickAvailable = params.get('quick') === 'available'
        if (isQuickAvailable && listingIdFromDetail && !didAutoSend.current) {
          didAutoSend.current = true
          const conv = merged.find((c) => c.listingId === listingIdFromDetail)
          if (conv && conv.peerId) {
            const threadRes = await fetch(
              `/api/messages?listingId=${conv.listingId}&userId=${currentUserId}&peerId=${conv.peerId}`
            ).catch(() => null)
            const existingThread = threadRes?.ok ? await threadRes.json().catch(() => []) : []
            if (Array.isArray(existingThread) && existingThread.length === 0) {
              await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  listingId: conv.listingId,
                  toUserId: conv.peerId,
                  body: 'Hi, is this still available?',
                }),
              }).catch(() => { /* auto-send is best-effort */ })
            }
          }
        }
      } catch {
        setConversations([])
        setInboxError(true)
      } finally {
        setLoadingInbox(false)
      }
    }

    loadInbox()
    // Mark messages as seen so the header badge clears
    localStorage.setItem('mm_msgs_last_seen', Date.now().toString())
  }, [currentUserId])

  useEffect(() => {
    const loadThread = async (showLoadingSpinner = true) => {
      if (!selectedConversation) {
        setThread([])
        return
      }

      if (showLoadingSpinner && threadCountRef.current === 0) setLoadingThread(true)
      try {
        if (showLoadingSpinner && !selectedConversation.isSynthetic) await fetch('/api/messages', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mark-read', conversationId: selectedConversation.key }),
        }).catch(() => {})
        if (showLoadingSpinner) {
          setConversations((current) => current.map((c) =>
            c.key === selectedConversation.key && c.unreadCount ? { ...c, unreadCount: 0 } : c
          ))
        }
        const url = `/api/messages?listingId=${selectedConversation.listingId}&peerId=${selectedConversation.peerId}`
        const res = await fetch(url)
        if (!res.ok) return
        const data = (await res.json()) as Message[]
        if (Array.isArray(data)) {
          setThread((prev) => {
            if (data.length === 0 && prev.length > 0) return prev
            if (data.length !== prev.length) return data
            const previousLast = prev[prev.length - 1]?.id
            const nextLast = data[data.length - 1]?.id
            return previousLast !== nextLast ? data : prev
          })
        }
      } catch {
        // Silently ignore poll errors — don't clear the thread
      } finally {
        if (showLoadingSpinner) setLoadingThread(false)
      }
    }

    const shouldShowInitialLoader = threadCountRef.current === 0
    setLoadingThread(shouldShowInitialLoader)
    loadThread(shouldShowInitialLoader)

    // Poll every 2s when tab is visible, pause when hidden — feels near real-time
    let pollInterval: ReturnType<typeof setInterval> | null = null

    const startPolling = () => {
      if (pollInterval) return
      pollInterval = setInterval(() => loadThread(false), 2000)
    }
    const stopPolling = () => {
      if (pollInterval) { clearInterval(pollInterval); pollInterval = null }
    }

    startPolling()
    const onVisibility = () => document.hidden ? stopPolling() : startPolling()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [selectedConversation])

  // Auto-scroll thread to bottom when new messages arrive
  useEffect(() => {
    if (threadScrollRef.current) {
      threadScrollRef.current.scrollTop = threadScrollRef.current.scrollHeight
    }
    threadCountRef.current = thread.length
  }, [thread.length])

  const [sendError, setSendError] = useState('')

  const handleSend = async (messageBody: string) => {
    if (!selectedConversation || !messageBody.trim()) return
    // Ref-level guard prevents duplicate sends from rapid double-clicks
    // before the React state update (setSending) can propagate.
    if (isSendingRef.current) return
    isSendingRef.current = true

    setSending(true)
    setSendError('')
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: selectedConversation.listingId,
          toUserId: selectedConversation.peerId,
          body: messageBody.trim(),
        }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        setSendError(payload?.error || 'Failed to send message. Please try again.')
        return
      }

      const created = (await res.json()) as Message
      setThread((current) => [...current, created])
      setConversations((current) => {
        const next = current.map((conversation) =>
          conversation.key === selectedConversation.key
            ? {
                ...conversation,
                lastMessage: created.body,
                lastMessageAt: created.createdAt,
              }
            : conversation
        )

        return [...next].sort(
          (a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt)
        )
      })
      setDraft('')
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send message.')
    } finally {
      setSending(false)
      isSendingRef.current = false
    }
  }

  const handleMarkSold = async () => {
    if (!selectedConversation || markingSold) return
    const ok = window.confirm(`Mark "${selectedConversation.listingTitle}" as sold? This closes it to new messages.`)
    if (!ok) return
    setMarkingSold(true)
    try {
      const res = await fetch(`/api/listings/${selectedConversation.listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sold' }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        showToast(payload?.error || 'Could not mark as sold — try from the listing page', 'error')
        return
      }
      // Update local conversation status so button disappears
      setConversations(prev => prev.map(c =>
        c.key === selectedConversation.key ? { ...c, listingStatus: 'sold' } : c
      ))
      showToast('Listing marked as sold')
    } catch {
      showToast('Could not mark as sold — try from the listing page', 'error')
    } finally {
      setMarkingSold(false)
    }
  }

  const handleOfferResponse = async (messageId: string, status: 'accepted' | 'declined') => {
    try {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerStatus: status }),
      })
      if (!res.ok) return
      const updated = (await res.json()) as Message
      setThread((current) => current.map((m) => (m.id === messageId ? updated : m)))
      if (status === 'accepted') showToast('Offer accepted')
      else showToast('Offer declined', 'info')
    } catch {
      // silently fail; thread refreshes on next load
    }
  }

  const sendMeetup = async (status: Message['meetupStatus'], zone: PickupZone = 'jc-lobby') => {
    if (!selectedConversation || !status) return
    const time = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listingId: selectedConversation.listingId,
        toUserId: selectedConversation.peerId,
        body: `Meetup ${status}: ${PICKUP_ZONE_LABELS[zone]} tomorrow.`,
        type: 'meetup',
        meetupStatus: status,
        meetupZone: zone,
        meetupTime: time,
      }),
    }).catch(() => null)
    if (res?.ok) {
      const created = await res.json() as Message
      setThread((current) => [...current, created])
    }
  }

  if (authLoading) {
    return <div className="max-w-6xl mx-auto px-4 py-10 text-sm" style={{ color: 'var(--m-muted)' }}>Loading…</div>
  }

  if (!session) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <AuthRequiredCard
          title="Sign in to access messages"
          description="Messaging is available for signed-in GMU users."
          redirectTo="/messages"
        />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="font-display text-[36px] font-black mb-1" style={{ color: 'var(--m-ink)' }}>{t('messages.title')}</h1>
      <p className="text-[13px] mt-1" style={{ color: 'var(--m-muted)' }}>
        {t('messages.subtitle')}
      </p>

      {loadingInbox ? (
        <div className="mt-6 space-y-3">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="h-20 rounded-2xl bg-[var(--m-soft)] animate-pulse" />
          ))}
        </div>
      ) : inboxError ? (
        <div className="mt-8 rounded-2xl border border-dashed p-8 text-center" style={{ borderColor: 'var(--m-line)' }}>
          <p style={{ color: 'var(--m-muted)' }}>Couldn&apos;t load your conversations.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 inline-block text-sm font-medium text-[var(--m-green)]"
          >
            Retry
          </button>
        </div>
      ) : conversations.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed p-8 text-center" style={{ borderColor: 'var(--m-line)' }}>
          <p style={{ color: 'var(--m-muted)' }}>{t('messages.empty')}</p>
          <Link href="/" className="mt-3 inline-block text-sm font-medium text-[var(--m-green)]">
            {t('messages.browseListings')}
          </Link>
        </div>
      ) : (
        <div
          className="mt-6 overflow-hidden rounded-[var(--r-lg)] border lg:grid lg:grid-cols-[320px_1fr]"
          style={{ borderColor: 'var(--m-line)', minHeight: 560 }}
        >
          <aside className={`overflow-y-auto border-r bg-white ${showThread ? 'hidden lg:block' : 'block'}`} style={{ borderColor: 'var(--m-line)' }}>
            <div className="px-3 py-2 text-[11px] font-semibold" style={{ color: 'var(--m-muted)' }}>
              Conversations
            </div>
            <ul className="space-y-1 px-1">
              {conversations.map((conversation) => (
                <li key={conversation.key}>
                  <button
                    type="button"
                    onClick={() => { setSelectedKey(conversation.key); setShowThread(true) }}
                    className={`w-full rounded-xl px-3 py-3 text-left transition-colors ${
                      selectedKey === conversation.key
                        ? 'bg-[var(--m-soft)]'
                        : 'hover:bg-[var(--m-soft)]'
                    }`}
                  >
                    <p className="text-xs" style={{ color: 'var(--m-muted)' }}>{conversation.listingTitle}</p>
                    <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--m-ink)' }}>{conversation.peerLabel}</p>
                    <p className="mt-1 truncate text-xs" style={{ color: 'var(--m-muted)' }}>{conversation.lastMessage}</p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="text-[11px]" style={{ color: 'var(--m-muted)' }}>{formatRecency(conversation.lastMessageAt)}</p>
                      {conversation.unreadCount ? <span className="rounded-full bg-[var(--m-pop)] px-1.5 py-0.5 text-[10px] font-bold text-white">{conversation.unreadCount}</span> : null}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <section className={`flex flex-col rounded-none border-0 bg-white p-4 ${showThread ? 'block' : 'hidden lg:flex'}`}>
            {selectedConversation ? (
              <>
                <div className="border-b pb-3" style={{ borderColor: 'var(--m-line)' }}>
                  <button
                    type="button"
                    onClick={() => setShowThread(false)}
                    className="mb-2 flex items-center gap-1 text-xs font-medium lg:hidden"
                    style={{ color: 'var(--m-green)' }}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                    Back to conversations
                  </button>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs" style={{ color: 'var(--m-muted)' }}>Listing</p>
                      <p className="font-semibold" style={{ color: 'var(--m-ink)' }}>{selectedConversation.listingTitle}</p>
                      <p className="text-xs" style={{ color: 'var(--m-muted)' }}>
                        Chat with {selectedConversation.peerLabel} •{' '}
                        <span style={{ color: selectedConversation.listingStatus === 'sold' ? '#c0392b' : selectedConversation.listingStatus === 'reserved' ? '#b45309' : 'var(--m-green)' }}>
                          {selectedConversation.listingStatus}
                        </span>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {/* Seller-only: mark listing as sold directly from the chat */}
                      {selectedConversation.listingStatus === 'available' &&
                       selectedConversation.peerId !== currentUserId && (
                        <button
                          type="button"
                          onClick={handleMarkSold}
                          disabled={markingSold}
                          className="rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors hover:bg-[var(--m-soft)] disabled:opacity-50"
                          style={{ borderColor: 'var(--m-line)', color: 'var(--m-ink)' }}
                        >
                          {markingSold ? 'Marking…' : '✓ Mark sold'}
                        </button>
                      )}
                      <Link href={`/item/${selectedConversation.listingId}`} className="text-xs font-medium hover:underline" style={{ color: 'var(--m-green)' }}>
                        View listing →
                      </Link>
                    </div>
                  </div>
                </div>

                <div ref={threadScrollRef} className="mt-4 flex-1 min-h-[280px] overflow-y-auto rounded-xl bg-[var(--m-soft)] p-3">
                  {loadingThread ? (
                    <p className="text-sm" style={{ color: 'var(--m-muted)' }}>{t('messages.loading')}</p>
                  ) : thread.length === 0 ? (
                    <p className="text-sm" style={{ color: 'var(--m-muted)' }}>{t('messages.noMessages')}</p>
                  ) : (
                    <div className="space-y-2">
                      {thread.map((message) => {
                        const fromCurrentUser = message.fromUserId === currentUserId
                        if (message.type === 'offer') {
                          return (
                            <div key={message.id} className={`max-w-[90%] ${fromCurrentUser ? 'ml-auto' : 'mr-auto'}`}>
                              <div className={`rounded-2xl border-2 p-4 ${
                                message.offerStatus === 'accepted' ? 'border-[var(--m-green)]' :
                                message.offerStatus === 'declined' ? 'border-red-200 bg-red-50' :
                                ''
                              }`} style={
                                message.offerStatus === 'pending'
                                  ? { borderColor: 'var(--m-gold)', background: 'var(--m-soft-warm)' }
                                  : message.offerStatus === 'accepted'
                                  ? { background: 'var(--m-green-soft)' }
                                  : undefined
                              }>
                                <p className="font-mono-label text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--m-muted)' }}>Offer</p>
                                <p className="font-display font-black text-[28px] tabular-nums mt-1" style={{ color: 'var(--m-ink)' }}>${message.offerAmount}</p>
                                <p className="text-[12px] mt-0.5" style={{ color: 'var(--m-muted)' }}>{message.body}</p>
                                {message.offerStatus === 'pending' && !fromCurrentUser && (
                                  <div className="mt-2 flex gap-2">
                                    <button type="button" onClick={() => handleOfferResponse(message.id, 'accepted')} className="rounded-lg px-3 py-1 text-xs font-semibold text-white hover:opacity-90" style={{ background: 'var(--m-green)' }}>Accept</button>
                                    <button type="button" onClick={() => handleOfferResponse(message.id, 'declined')} className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50">Decline</button>
                                  </div>
                                )}
                                {message.offerStatus === 'accepted' && <p className="mt-2 text-xs font-semibold text-[var(--m-green)]">✓ Offer accepted</p>}
                                {message.offerStatus === 'declined' && <p className="mt-2 text-xs font-semibold text-red-600">✗ Offer declined</p>}
                                {message.offerStatus === 'pending' && fromCurrentUser && <p className="mt-2 text-xs text-amber-700">Waiting for response…</p>}
                              </div>
                            </div>
                          )
                        }
                        if (message.type === 'meetup') {
                          return (
                            <div key={message.id} className={`max-w-[90%] ${fromCurrentUser ? 'ml-auto' : 'mr-auto'}`}>
                              <div className="rounded-2xl border bg-white p-4" style={{ borderColor: 'var(--m-green)' }}>
                                <p className="font-mono-label text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--m-muted)' }}>Meetup</p>
                                <p className="mt-1 text-sm font-semibold text-[var(--m-ink)]">{message.body}</p>
                                {message.meetupZone ? <p className="mt-1 text-xs text-[var(--m-muted)]">{PICKUP_ZONE_LABELS[message.meetupZone]}</p> : null}
                              </div>
                            </div>
                          )
                        }
                        return (
                          <div key={message.id} className={`flex flex-col ${fromCurrentUser ? 'items-end' : 'items-start'}`}>
                            <div
                              className={
                                fromCurrentUser
                                  ? 'max-w-[60%] rounded-[20px] rounded-br-[6px] px-4 py-2.5 text-sm text-white'
                                  : 'max-w-[60%] rounded-[20px] rounded-bl-[6px] border bg-white px-4 py-2.5 text-sm'
                              }
                              style={
                                fromCurrentUser
                                  ? { background: 'var(--m-ink)' }
                                  : { borderColor: 'var(--m-line)', color: 'var(--m-ink)' }
                              }
                            >
                              {message.body}
                            </div>
                            <p className="mt-0.5 text-[10px]" style={{ color: 'var(--m-muted)' }}>{formatRecency(message.createdAt)}</p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {STARTER_MESSAGES.map((starter) => (
                    <button
                      key={starter}
                      type="button"
                      onClick={() => setDraft(starter)}
                      className="rounded-full bg-[var(--m-soft)] px-3 py-1 text-xs hover:opacity-80"
                      style={{ color: 'var(--m-ink)' }}
                    >
                      {starter}
                    </button>
                  ))}
                  <button type="button" onClick={() => sendMeetup('proposed')} className="rounded-full bg-[var(--m-green-soft)] px-3 py-1 text-xs font-semibold text-[var(--m-ink)]">
                    Suggest meetup
                  </button>
                  <button type="button" onClick={() => sendMeetup('confirmed')} className="rounded-full bg-[var(--m-green-soft)] px-3 py-1 text-xs font-semibold text-[var(--m-ink)]">
                    Confirm meetup
                  </button>
                </div>

                <form
                  className="mt-3 flex gap-2 border-t pt-3"
                  style={{ borderColor: 'var(--m-line)' }}
                  onSubmit={(event) => {
                    event.preventDefault()
                    handleSend(draft)
                  }}
                >
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Message about availability, meetup, or price..."
                    className="flex-1 rounded-full border px-4 py-2.5 text-[13px] outline-none"
                    style={{ borderColor: 'var(--m-line)', color: 'var(--m-ink)' }}
                  />
                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    className="rounded-full px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
                    style={{ background: 'var(--m-pop)' }}
                  >
                    Send
                  </button>
                </form>
                {sendError ? (
                  <p className="mt-2 text-xs text-red-600">{sendError}</p>
                ) : null}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-16" style={{ color: 'var(--m-muted)' }}>
                <svg viewBox="0 0 24 24" className="h-10 w-10 mb-3" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <p className="text-sm font-medium">Select a conversation to read it</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
