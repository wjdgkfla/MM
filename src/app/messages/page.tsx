'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Listing, Message } from '@/lib/types'
import { formatRecency } from '@/lib/time'
import { Conversation } from '@/lib/data/contracts'
import { useAuthSession } from '@/lib/auth/useAuthSession'
import { AuthRequiredCard } from '@/components/AuthRequiredCard'

type ListingPayload = {
  listing: Listing
}

type ConversationSummary = {
  key: string
  listingId: string
  listingTitle: string
  listingStatus: Listing['status']
  peerId: string
  peerLabel: string
  lastMessage: string
  lastMessageAt: string
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
  const { session, loading: authLoading } = useAuthSession()
  const currentUserId = session?.userId || ''
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [thread, setThread] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [loadingInbox, setLoadingInbox] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [sending, setSending] = useState(false)
  const didAutoSend = useRef(false)

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

        const inboxRes = await fetch(`/api/messages?userId=${currentUserId}`)
        const inbox = (await inboxRes.json()) as Conversation[]

        const summaries: ConversationSummary[] = []

        for (const conversation of Array.isArray(inbox) ? inbox : []) {
          try {
            const listingRes = await fetch(`/api/listings/${conversation.listingId}`)
            if (!listingRes.ok) continue

            const payload = (await listingRes.json()) as ListingPayload
            const listing = payload.listing
            const peerId = conversation.participantIds.find((participantId) => participantId !== currentUserId)
            if (!peerId) continue

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
            })
          } catch {
            // Ignore invalid listing rows in demo mode.
          }
        }

        let merged = summaries

        if (listingIdFromDetail) {
          const listingRes = await fetch(`/api/listings/${listingIdFromDetail}`)
          if (listingRes.ok) {
            const payload = (await listingRes.json()) as ListingPayload
            const listing = payload.listing
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
                },
                ...summaries,
              ]
            }
          }
        }

        setConversations(merged)
        setSelectedKey(merged[0]?.key || null)

        // Auto-send "Still available?" if navigated here via that button
        const isQuickAvailable = params.get('quick') === 'available'
        if (isQuickAvailable && listingIdFromDetail && merged[0] && !didAutoSend.current) {
          didAutoSend.current = true
          const conv = merged.find((c) => c.listingId === listingIdFromDetail)
          if (conv && conv.peerId) {
            await fetch('/api/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                listingId: conv.listingId,
                toUserId: conv.peerId,
                body: 'Hi, is this still available?',
              }),
            }).catch(() => {})
          }
        }
      } catch {
        setConversations([])
      } finally {
        setLoadingInbox(false)
      }
    }

    loadInbox()
  }, [currentUserId])

  useEffect(() => {
    const loadThread = async () => {
      if (!selectedConversation) {
        setThread([])
        return
      }

      setLoadingThread(true)
      try {
        const url = `/api/messages?listingId=${selectedConversation.listingId}&userId=${currentUserId}&peerId=${selectedConversation.peerId}`
        const res = await fetch(url)
        const data = (await res.json()) as Message[]
        setThread(Array.isArray(data) ? data : [])
      } catch {
        setThread([])
      } finally {
        setLoadingThread(false)
      }
    }

    loadThread()
  }, [selectedConversation, currentUserId])

  const handleSend = async (messageBody: string) => {
    if (!selectedConversation || !messageBody.trim()) return

    setSending(true)
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

      if (!res.ok) throw new Error('send failed')

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
    } finally {
      setSending(false)
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
    } catch {
      // silently fail; thread refreshes on next load
    }
  }

  if (authLoading) {
    return <div className="max-w-6xl mx-auto px-4 py-10 text-sm text-gray-500">Loading…</div>
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
      <h1 className="text-2xl font-bold text-[#006633]">Messages</h1>
      <p className="mt-1 text-sm text-gray-600">Transaction chat for listing questions, pickup timing, and final price agreement.</p>

      {loadingInbox ? (
        <div className="mt-6 space-y-3">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-gray-300 p-8 text-center">
          <p className="text-gray-600">No conversations yet.</p>
          <Link href="/" className="mt-3 inline-block text-sm font-medium text-[#006633]">
            Browse listings
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-2xl border border-gray-200 bg-white p-2">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500">Conversations</div>
            <ul className="space-y-1">
              {conversations.map((conversation) => (
                <li key={conversation.key}>
                  <button
                    type="button"
                    onClick={() => setSelectedKey(conversation.key)}
                    className={`w-full rounded-xl px-3 py-3 text-left ${
                      selectedKey === conversation.key ? 'bg-[#eaf4ef]' : 'hover:bg-gray-50'
                    }`}
                  >
                    <p className="text-xs text-gray-500">{conversation.listingTitle}</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">{conversation.peerLabel}</p>
                    <p className="mt-1 truncate text-xs text-gray-600">{conversation.lastMessage}</p>
                    <p className="mt-1 text-[11px] text-gray-500">{formatRecency(conversation.lastMessageAt)}</p>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <section className="rounded-2xl border border-gray-200 bg-white p-4">
            {selectedConversation ? (
              <>
                <div className="border-b border-gray-100 pb-3">
                  <p className="text-xs text-gray-500">Listing</p>
                  <p className="font-semibold text-gray-900">{selectedConversation.listingTitle}</p>
                  <p className="text-xs text-gray-500">
                    Chat with {selectedConversation.peerLabel} • Status: {selectedConversation.listingStatus}
                  </p>
                </div>

                <div className="mt-4 h-[340px] overflow-y-auto rounded-xl bg-gray-50 p-3">
                  {loadingThread ? (
                    <p className="text-sm text-gray-500">Loading conversation…</p>
                  ) : thread.length === 0 ? (
                    <p className="text-sm text-gray-500">No messages yet. Send the first message about pickup or price.</p>
                  ) : (
                    <div className="space-y-2">
                      {thread.map((message) => {
                        const fromCurrentUser = message.fromUserId === currentUserId
                        if (message.type === 'offer') {
                          return (
                            <div key={message.id} className={`max-w-[90%] ${fromCurrentUser ? 'ml-auto' : 'mr-auto'}`}>
                              <div className={`rounded-xl border-2 p-3 ${
                                message.offerStatus === 'accepted' ? 'border-[#006633] bg-[#006633]/5' :
                                message.offerStatus === 'declined' ? 'border-red-200 bg-red-50' :
                                'border-amber-200 bg-amber-50'
                              }`}>
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Offer</p>
                                <p className="mt-1 text-2xl font-bold text-gray-900">${message.offerAmount}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{message.body}</p>
                                {message.offerStatus === 'pending' && !fromCurrentUser && (
                                  <div className="mt-2 flex gap-2">
                                    <button type="button" onClick={() => handleOfferResponse(message.id, 'accepted')} className="rounded-lg bg-[#006633] px-3 py-1 text-xs font-semibold text-white hover:bg-[#004d26]">Accept</button>
                                    <button type="button" onClick={() => handleOfferResponse(message.id, 'declined')} className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50">Decline</button>
                                  </div>
                                )}
                                {message.offerStatus === 'accepted' && <p className="mt-2 text-xs font-semibold text-[#006633]">✓ Offer accepted</p>}
                                {message.offerStatus === 'declined' && <p className="mt-2 text-xs font-semibold text-red-600">✗ Offer declined</p>}
                                {message.offerStatus === 'pending' && fromCurrentUser && <p className="mt-2 text-xs text-amber-700">Waiting for response…</p>}
                              </div>
                            </div>
                          )
                        }
                        return (
                          <div
                            key={message.id}
                            className={`max-w-[82%] rounded-xl px-3 py-2 text-sm ${
                              fromCurrentUser
                                ? 'ml-auto bg-[#006633] text-white'
                                : 'mr-auto border border-gray-200 bg-white text-gray-800'
                            }`}
                          >
                            {message.body}
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
                      className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700 hover:bg-gray-200"
                    >
                      {starter}
                    </button>
                  ))}
                </div>

                <form
                  className="mt-3 flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    handleSend(draft)
                  }}
                >
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Message about availability, meetup, or price..."
                    className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    className="rounded-xl bg-[#006633] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Send
                  </button>
                </form>
              </>
            ) : (
              <p className="text-sm text-gray-500">Select a conversation.</p>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
