'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Listing, Message, REPORT_REASONS, REPORT_REASON_LABELS, ReportReason, Transaction } from '@/lib/types'
import { CAMPUS_ZONE_MAP, CampusLocation, LOCATION_LABELS, PICKUP_ZONE_LABELS, PickupZone } from '@/lib/types'
import { formatRecency } from '@/lib/time'
import { Conversation } from '@/lib/data/contracts'
import { useAuthSession } from '@/lib/auth/useAuthSession'
import { AuthRequiredCard } from '@/components/AuthRequiredCard'
import { showToast } from '@/components/Toast'
import { useLocale } from '@/lib/i18n/LocaleProvider'
import { getSupabaseClient, isSupabaseClientConfigured } from '@/lib/supabase/client'

// Mirrors supabaseDataAccess.ts's rowToMessage — Realtime delivers raw DB
// rows (snake_case), not the API's camelCase Message contract.
function rowToMessageClient(row: Record<string, unknown>): Message {
  return {
    id: String(row.id),
    listingId: String(row.listing_id || ''),
    fromUserId: String(row.from_user_id || ''),
    toUserId: String(row.to_user_id || ''),
    body: String(row.body || ''),
    type: row.type === 'offer' ? 'offer' : row.type === 'meetup' ? 'meetup' : 'text',
    offerAmount: row.offer_amount != null ? Number(row.offer_amount) : undefined,
    offerStatus: row.offer_status ? (row.offer_status as Message['offerStatus']) : undefined,
    parentOfferMessageId: row.parent_offer_message_id ? String(row.parent_offer_message_id) : undefined,
    expiresAt: row.expires_at ? new Date(String(row.expires_at)).toISOString() : undefined,
    meetupStatus: row.meetup_status ? (row.meetup_status as Message['meetupStatus']) : undefined,
    meetupZone: row.meetup_zone ? (row.meetup_zone as Message['meetupZone']) : undefined,
    meetupTime: row.meetup_time ? new Date(String(row.meetup_time)).toISOString() : undefined,
    presenceStatus: row.presence_status ? (row.presence_status as Message['presenceStatus']) : undefined,
    createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : new Date().toISOString(),
  }
}

type ConversationSummary = {
  key: string
  listingId: string
  listingTitle: string
  listingStatus: Listing['status']
  listingSellerId: string
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
  const [showReportForm, setShowReportForm] = useState(false)
  const [reportReason, setReportReason] = useState<ReportReason>('harassment')
  const [reportNotes, setReportNotes] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [blocking, setBlocking] = useState(false)
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [showMeetupPicker, setShowMeetupPicker] = useState(false)
  const [meetupCampus, setMeetupCampus] = useState<CampusLocation>('fairfax')
  const [meetupZone, setMeetupZone] = useState<PickupZone>('jc-lobby')
  const [meetupDate, setMeetupDate] = useState('')
  const [meetupTimeInput, setMeetupTimeInput] = useState('')
  const [schedulingMeetup, setSchedulingMeetup] = useState(false)
  const [counteringId, setCounteringId] = useState<string | null>(null)
  const [counterAmount, setCounterAmount] = useState('')
  const [offerActionPending, setOfferActionPending] = useState<string | null>(null)
  const [confirmingCompletion, setConfirmingCompletion] = useState(false)
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
              listingSellerId: '',
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
            listingSellerId: listing.sellerId,
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
                  listingSellerId: listing.sellerId,
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
        // Mark messages as seen so the header badge clears — after the inbox
        // actually finishes loading, not immediately on mount.
        localStorage.setItem('mm_msgs_last_seen', Date.now().toString())
      }
    }

    loadInbox()
  }, [currentUserId])

  useEffect(() => {
    let cancelled = false

    const loadThread = async () => {
      if (!selectedConversation) {
        setThread([])
        return
      }

      if (threadCountRef.current === 0) setLoadingThread(true)
      try {
        if (!selectedConversation.isSynthetic) await fetch('/api/messages', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mark-read', conversationId: selectedConversation.key }),
        }).catch(() => {})
        setConversations((current) => current.map((c) =>
          c.key === selectedConversation.key && c.unreadCount ? { ...c, unreadCount: 0 } : c
        ))
        const url = `/api/messages?listingId=${selectedConversation.listingId}&peerId=${selectedConversation.peerId}`
        const res = await fetch(url)
        if (!res.ok) return
        const data = (await res.json()) as Message[]
        if (!cancelled && Array.isArray(data)) setThread(data)
      } catch {
        // Silently ignore load errors — don't clear the thread
      } finally {
        if (!cancelled) setLoadingThread(false)
      }
    }

    setLoadingThread(threadCountRef.current === 0)
    loadThread()

    // Load the thread once, then rely on Supabase Realtime for new messages
    // instead of polling — appends incoming rows rather than refetching.
    // Push notifications (server-side) still cover users not on this screen.
    if (!selectedConversation || selectedConversation.isSynthetic || !isSupabaseClientConfigured()) {
      return () => { cancelled = true }
    }

    const channel = getSupabaseClient()
      .channel(`messages-${selectedConversation.key}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.key}`,
        },
        (payload) => {
          const message = rowToMessageClient(payload.new as Record<string, unknown>)
          setThread((current) => (current.some((m) => m.id === message.id) ? current : [...current, message]))
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      getSupabaseClient().removeChannel(channel)
    }
  }, [selectedConversation])

  // Reset the report form when switching conversations
  useEffect(() => {
    setShowReportForm(false)
    setReportNotes('')
    setShowMeetupPicker(false)
    setCounteringId(null)
  }, [selectedKey])

  // Load the transaction (if any) behind this conversation — it's what meetup
  // scheduling and completion confirmation act on.
  useEffect(() => {
    const loadTransaction = async () => {
      if (!selectedConversation || selectedConversation.isSynthetic) {
        setTransaction(null)
        return
      }
      try {
        const res = await fetch(
          `/api/transactions?listingId=${selectedConversation.listingId}&peerId=${selectedConversation.peerId}`
        )
        const data = res.ok ? await res.json().catch(() => null) : null
        setTransaction(data || null)
      } catch {
        setTransaction(null)
      }
    }
    loadTransaction()
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

  const handleSubmitReport = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedConversation) return
    setReportSubmitting(true)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportedUserId: selectedConversation.peerId,
          reason: reportReason,
          notes: reportNotes.trim(),
        }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        showToast(payload?.error || 'Could not submit report', 'error')
        return
      }
      showToast('Report submitted to Mason Market moderation')
      setShowReportForm(false)
      setReportNotes('')
    } catch {
      showToast('Could not submit report', 'error')
    } finally {
      setReportSubmitting(false)
    }
  }

  const handleBlockUser = async () => {
    if (!selectedConversation) return
    if (!window.confirm(`Block ${selectedConversation.peerLabel}? They will no longer be able to message you.`)) return
    setBlocking(true)
    try {
      const res = await fetch('/api/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedId: selectedConversation.peerId }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        showToast(payload?.error || 'Could not block user', 'error')
        return
      }
      showToast(`Blocked ${selectedConversation.peerLabel}`)
      const blockedKey = selectedConversation.key
      setConversations((current) => current.filter((c) => c.key !== blockedKey))
      setSelectedKey(null)
      setShowThread(false)
    } catch {
      showToast('Could not block user', 'error')
    } finally {
      setBlocking(false)
    }
  }

  const handleOfferResponse = async (messageId: string, status: 'accepted' | 'declined' | 'withdrawn') => {
    setOfferActionPending(messageId)
    try {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerStatus: status }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        showToast(payload?.error || 'Could not update the offer', 'error')
        return
      }
      const updated = (await res.json()) as Message
      setThread((current) => current.map((m) => (m.id === messageId ? updated : m)))
      if (status === 'accepted') showToast('Offer accepted')
      else if (status === 'withdrawn') showToast('Offer withdrawn', 'info')
      else showToast('Offer declined', 'info')
    } catch {
      showToast('Could not update the offer', 'error')
    } finally {
      setOfferActionPending(null)
    }
  }

  const handleCounterOffer = async (messageId: string) => {
    const amount = Number(counterAmount)
    if (!amount || amount <= 0) {
      showToast('Enter a valid counter amount', 'error')
      return
    }
    setOfferActionPending(messageId)
    try {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counterAmount: amount }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        showToast(payload?.error || 'Could not send counteroffer', 'error')
        return
      }
      const created = (await res.json()) as Message
      setThread((current) => [
        ...current.map((m) => (m.id === messageId ? { ...m, offerStatus: 'superseded' as const } : m)),
        created,
      ])
      setCounteringId(null)
      setCounterAmount('')
      showToast('Counteroffer sent')
    } catch {
      showToast('Could not send counteroffer', 'error')
    } finally {
      setOfferActionPending(null)
    }
  }

  const sendMeetup = async (status: Message['meetupStatus'], zone: PickupZone, time: string) => {
    if (!selectedConversation || !status) return
    const label = PICKUP_ZONE_LABELS[zone]
    const bodyText =
      status === 'proposed'
        ? `Proposed meetup: ${label} on ${new Date(time).toLocaleString()}.`
        : status === 'confirmed'
          ? `Meetup confirmed: ${label} on ${new Date(time).toLocaleString()}.`
          : 'Meetup cancelled.'
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listingId: selectedConversation.listingId,
        toUserId: selectedConversation.peerId,
        body: bodyText,
        type: 'meetup',
        meetupStatus: status,
        meetupZone: zone,
        meetupTime: time,
      }),
    }).catch(() => null)
    if (res?.ok) {
      const created = await res.json() as Message
      setThread((current) => [...current, created])
    } else {
      showToast('Could not send meetup update — try again', 'error')
    }
  }

  const handleProposeMeetup = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedConversation || !transaction) return
    if (!meetupDate || !meetupTimeInput) {
      showToast('Pick a date and time', 'error')
      return
    }
    const meetupTime = new Date(`${meetupDate}T${meetupTimeInput}`).toISOString()
    if (Number.isNaN(Date.parse(meetupTime))) {
      showToast('Invalid date or time', 'error')
      return
    }
    setSchedulingMeetup(true)
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'propose-meetup', meetupZone, meetupTime }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        showToast(payload?.error || 'Could not propose meetup', 'error')
        return
      }
      const updated = (await res.json()) as Transaction
      setTransaction(updated)
      setShowMeetupPicker(false)
      await sendMeetup('proposed', meetupZone, meetupTime)
    } catch {
      showToast('Could not propose meetup', 'error')
    } finally {
      setSchedulingMeetup(false)
    }
  }

  const handleConfirmMeetup = async () => {
    if (!transaction || !transaction.meetupZone || !transaction.meetupTime) return
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm-meetup' }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        showToast(payload?.error || 'Could not confirm meetup', 'error')
        return
      }
      const updated = (await res.json()) as Transaction
      setTransaction(updated)
      await sendMeetup('confirmed', transaction.meetupZone, transaction.meetupTime)
    } catch {
      showToast('Could not confirm meetup', 'error')
    }
  }

  const handleCancelMeetup = async () => {
    if (!transaction) return
    const zone = transaction.meetupZone || 'jc-lobby'
    const time = transaction.meetupTime || new Date().toISOString()
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel-meetup' }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        showToast(payload?.error || 'Could not cancel meetup', 'error')
        return
      }
      const updated = (await res.json()) as Transaction
      setTransaction(updated)
      await sendMeetup('cancelled', zone, time)
    } catch {
      showToast('Could not cancel meetup', 'error')
    }
  }

  const sendPresence = async (status: 'on_the_way' | 'arrived') => {
    if (!selectedConversation) return
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listingId: selectedConversation.listingId,
        toUserId: selectedConversation.peerId,
        body: status === 'on_the_way' ? "I'm on my way!" : "I'm here!",
        presenceStatus: status,
      }),
    }).catch(() => null)
    if (res?.ok) {
      const created = await res.json() as Message
      setThread((current) => [...current, created])
    } else {
      showToast('Could not send update — try again', 'error')
    }
  }

  const openMeetupPicker = () => {
    setMeetupCampus('fairfax')
    setMeetupZone('jc-lobby')
    setMeetupDate('')
    setMeetupTimeInput('')
    setShowMeetupPicker(true)
  }

  const handleConfirmCompletion = async () => {
    if (!transaction) return
    setConfirmingCompletion(true)
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm-completion' }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        showToast(payload?.error || 'Could not confirm', 'error')
        return
      }
      const updated = (await res.json()) as Transaction
      setTransaction(updated)
      showToast(updated.status === 'completed' ? 'Transaction completed!' : 'Confirmed — waiting on the other side')
    } catch {
      showToast('Could not confirm', 'error')
    } finally {
      setConfirmingCompletion(false)
    }
  }

  if (authLoading) {
    return <div className="max-w-content mx-auto px-4 py-10 text-sm" style={{ color: 'var(--m-muted)' }}>Loading…</div>
  }

  if (!session) {
    return (
      <div className="max-w-narrow mx-auto px-4 py-8">
        <AuthRequiredCard
          title="Sign in to access messages"
          description="Messaging is available for signed-in GMU users."
          redirectTo="/messages"
        />
      </div>
    )
  }

  return (
    <div className="max-w-content mx-auto px-4 py-8">
      <h1 className="font-display text-display-lg font-black mb-1" style={{ color: 'var(--m-ink)' }}>{t('messages.title')}</h1>
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
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15 18l-6-6 6-6"/></svg>
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
                       selectedConversation.listingSellerId === currentUserId && (
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
                      <button
                        type="button"
                        onClick={() => setShowReportForm((current) => !current)}
                        className="text-xs font-medium hover:underline"
                        style={{ color: 'var(--m-muted)' }}
                      >
                        {showReportForm ? 'Cancel report' : `Report ${selectedConversation.peerLabel}`}
                      </button>
                      <button
                        type="button"
                        onClick={handleBlockUser}
                        disabled={blocking}
                        className="text-xs font-medium hover:underline disabled:opacity-50"
                        style={{ color: 'var(--m-muted)' }}
                      >
                        {blocking ? 'Blocking…' : `Block ${selectedConversation.peerLabel}`}
                      </button>
                    </div>
                  </div>

                  {showReportForm ? (
                    <form onSubmit={handleSubmitReport} className="mt-3 space-y-3 rounded-xl border bg-[var(--m-soft)] p-3" style={{ borderColor: 'var(--m-line)' }}>
                      <div>
                        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--m-ink)' }}>Reason</label>
                        <select
                          value={reportReason}
                          onChange={(e) => setReportReason(e.target.value as ReportReason)}
                          className="ui-input"
                        >
                          {REPORT_REASONS.map((reason) => (
                            <option key={reason} value={reason}>
                              {REPORT_REASON_LABELS[reason]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--m-ink)' }}>Notes (optional)</label>
                        <textarea
                          rows={3}
                          maxLength={500}
                          value={reportNotes}
                          onChange={(e) => setReportNotes(e.target.value)}
                          placeholder="What happened?"
                          className="ui-input resize-none"
                        />
                      </div>
                      <button type="submit" disabled={reportSubmitting} className="ui-btn-secondary">
                        {reportSubmitting ? 'Submitting...' : 'Submit report'}
                      </button>
                    </form>
                  ) : null}
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
                          const isExpired = message.offerStatus === 'pending' && !!message.expiresAt && new Date(message.expiresAt) < new Date()
                          const isActionPending = offerActionPending === message.id
                          return (
                            <div key={message.id} className={`max-w-[90%] ${fromCurrentUser ? 'ml-auto' : 'mr-auto'}`}>
                              <div className={`rounded-2xl border-2 p-4 ${
                                message.offerStatus === 'accepted' ? 'border-[var(--m-green)]' :
                                message.offerStatus === 'declined' ? 'border-red-200 bg-red-50' :
                                ''
                              }`} style={
                                message.offerStatus === 'pending' && !isExpired
                                  ? { borderColor: 'var(--m-gold)', background: 'var(--m-soft-warm)' }
                                  : message.offerStatus === 'accepted'
                                  ? { background: 'var(--m-green-soft)' }
                                  : undefined
                              }>
                                <p className="font-mono-label text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--m-muted)' }}>
                                  {message.parentOfferMessageId ? 'Counteroffer' : 'Offer'}
                                </p>
                                <p className="font-display font-black text-display-md tabular-nums mt-1" style={{ color: 'var(--m-ink)' }}>${message.offerAmount}</p>
                                <p className="text-[12px] mt-0.5" style={{ color: 'var(--m-muted)' }}>{message.body}</p>
                                {message.offerStatus === 'pending' && !isExpired && !fromCurrentUser && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <button type="button" disabled={isActionPending} onClick={() => handleOfferResponse(message.id, 'accepted')} className="rounded-lg px-3 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50" style={{ background: 'var(--m-green)' }}>Accept</button>
                                    <button type="button" disabled={isActionPending} onClick={() => handleOfferResponse(message.id, 'declined')} className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Decline</button>
                                    <button type="button" disabled={isActionPending} onClick={() => { setCounteringId(message.id); setCounterAmount(String(message.offerAmount ?? '')) }} className="rounded-lg border px-3 py-1 text-xs font-semibold hover:bg-white disabled:opacity-50" style={{ borderColor: 'var(--m-line)', color: 'var(--m-ink)' }}>Counter</button>
                                  </div>
                                )}
                                {counteringId === message.id && (
                                  <form
                                    className="mt-2 flex items-center gap-2"
                                    onSubmit={(e) => { e.preventDefault(); handleCounterOffer(message.id) }}
                                  >
                                    <span className="text-xs" style={{ color: 'var(--m-muted)' }}>$</span>
                                    <input
                                      type="number"
                                      min={1}
                                      max={100000}
                                      value={counterAmount}
                                      onChange={(e) => setCounterAmount(e.target.value)}
                                      className="ui-input w-24 py-1 text-xs"
                                      autoFocus
                                    />
                                    <button type="submit" disabled={isActionPending} className="rounded-lg px-3 py-1 text-xs font-semibold text-white disabled:opacity-50" style={{ background: 'var(--m-ink)' }}>Send</button>
                                    <button type="button" onClick={() => setCounteringId(null)} className="text-xs" style={{ color: 'var(--m-muted)' }}>Cancel</button>
                                  </form>
                                )}
                                {message.offerStatus === 'accepted' && <p className="mt-2 text-xs font-semibold text-[var(--m-green)]">✓ Offer accepted</p>}
                                {message.offerStatus === 'declined' && <p className="mt-2 text-xs font-semibold text-red-600">✗ Offer declined</p>}
                                {message.offerStatus === 'withdrawn' && <p className="mt-2 text-xs font-semibold text-red-600">Offer withdrawn</p>}
                                {message.offerStatus === 'superseded' && <p className="mt-2 text-xs" style={{ color: 'var(--m-muted)' }}>Replaced by a counteroffer</p>}
                                {message.offerStatus === 'pending' && isExpired && <p className="mt-2 text-xs" style={{ color: 'var(--m-muted)' }}>Offer expired</p>}
                                {message.offerStatus === 'pending' && !isExpired && fromCurrentUser && (
                                  <div className="mt-2 flex items-center gap-3">
                                    <p className="text-xs text-amber-700">Waiting for response…</p>
                                    <button type="button" disabled={isActionPending} onClick={() => handleOfferResponse(message.id, 'withdrawn')} className="text-xs font-medium hover:underline disabled:opacity-50" style={{ color: 'var(--m-muted)' }}>Withdraw</button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        }
                        if (message.type === 'meetup') {
                          return (
                            <div key={message.id} className={`max-w-[90%] ${fromCurrentUser ? 'ml-auto' : 'mr-auto'}`}>
                              <div className="rounded-2xl border bg-white p-4" style={{ borderColor: 'var(--m-green)' }}>
                                <p className="font-mono-label text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--m-muted)' }}>
                                  Meetup {message.meetupStatus ? `— ${message.meetupStatus}` : ''}
                                </p>
                                <p className="mt-1 text-sm font-semibold text-[var(--m-ink)]">{message.body}</p>
                                {message.meetupZone ? <p className="mt-1 text-xs text-[var(--m-muted)]">{PICKUP_ZONE_LABELS[message.meetupZone]}</p> : null}
                                {message.meetupTime ? <p className="mt-0.5 text-xs text-[var(--m-muted)]">{new Date(message.meetupTime).toLocaleString()}</p> : null}
                              </div>
                            </div>
                          )
                        }
                        if (message.presenceStatus) {
                          return (
                            <div key={message.id} className="flex justify-center">
                              <span className="rounded-full bg-[var(--m-soft)] px-3 py-1 text-xs font-medium" style={{ color: 'var(--m-ink)' }}>
                                {fromCurrentUser ? 'You: ' : `${selectedConversation.peerLabel}: `}{message.body}
                              </span>
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
                </div>

                {/* Meetup scheduling + completion confirmation only apply once an
                    offer has been accepted and a transaction exists.
                    ponytail: transactions don't track who proposed the current
                    meetup time, so Confirm/Suggest-another/Cancel show to both
                    participants rather than just "the other party" — add a
                    proposed_by column if that distinction matters later. */}
                {transaction ? (
                  <div className="mt-3 space-y-2 rounded-xl border p-3" style={{ borderColor: 'var(--m-line)' }}>
                    {transaction.status === 'completed' ? (
                      <p className="text-xs font-semibold text-[var(--m-green)]">
                        ✓ Transaction completed{transaction.completedAt ? ` on ${new Date(transaction.completedAt).toLocaleDateString()}` : ''}
                      </p>
                    ) : (
                      <>
                        {transaction.meetupZone && transaction.meetupTime ? (
                          <div>
                            <p className="text-xs font-semibold" style={{ color: 'var(--m-ink)' }}>
                              Meetup {transaction.status === 'meetup_scheduled' ? 'confirmed' : 'proposed'}: {PICKUP_ZONE_LABELS[transaction.meetupZone]}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--m-muted)' }}>{new Date(transaction.meetupTime).toLocaleString()}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {transaction.status !== 'meetup_scheduled' && (
                                <button type="button" onClick={handleConfirmMeetup} className="rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ background: 'var(--m-green)' }}>
                                  Confirm
                                </button>
                              )}
                              <button type="button" onClick={openMeetupPicker} className="rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: 'var(--m-line)', color: 'var(--m-ink)' }}>
                                Suggest another time
                              </button>
                              <button type="button" onClick={handleCancelMeetup} className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50">
                                Cancel
                              </button>
                            </div>
                            {transaction.status === 'meetup_scheduled' && (
                              <div className="mt-2 flex gap-2">
                                <button type="button" onClick={() => sendPresence('on_the_way')} className="rounded-full bg-[var(--m-green-soft)] px-3 py-1 text-xs font-semibold text-[var(--m-ink)]">
                                  I&apos;m on my way
                                </button>
                                <button type="button" onClick={() => sendPresence('arrived')} className="rounded-full bg-[var(--m-green-soft)] px-3 py-1 text-xs font-semibold text-[var(--m-ink)]">
                                  I&apos;m here
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <button type="button" onClick={openMeetupPicker} className="rounded-full bg-[var(--m-green-soft)] px-3 py-1 text-xs font-semibold text-[var(--m-ink)]">
                            Schedule meetup
                          </button>
                        )}

                        {selectedConversation.listingSellerId === currentUserId ? (
                          !transaction.sellerConfirmedAt ? (
                            <button
                              type="button"
                              disabled={confirmingCompletion}
                              onClick={handleConfirmCompletion}
                              className="rounded-full px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                              style={{ background: 'var(--m-ink)' }}
                            >
                              Mark exchange complete
                            </button>
                          ) : !transaction.buyerConfirmedAt ? (
                            <p className="text-xs" style={{ color: 'var(--m-muted)' }}>Waiting for {selectedConversation.peerLabel} to confirm…</p>
                          ) : null
                        ) : transaction.sellerConfirmedAt && !transaction.buyerConfirmedAt ? (
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-medium" style={{ color: 'var(--m-ink)' }}>Did you receive the item?</p>
                            <button
                              type="button"
                              disabled={confirmingCompletion}
                              onClick={handleConfirmCompletion}
                              className="rounded-full px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                              style={{ background: 'var(--m-green)' }}
                            >
                              Confirm
                            </button>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : null}

                {showMeetupPicker && transaction ? (
                  <form onSubmit={handleProposeMeetup} className="mt-3 space-y-2 rounded-xl border bg-[var(--m-soft)] p-3" style={{ borderColor: 'var(--m-line)' }}>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--m-ink)' }}>Campus</label>
                        <select
                          value={meetupCampus}
                          onChange={(e) => {
                            const campus = e.target.value as CampusLocation
                            setMeetupCampus(campus)
                            setMeetupZone(CAMPUS_ZONE_MAP[campus][0] as PickupZone)
                          }}
                          className="ui-input"
                        >
                          {Object.keys(CAMPUS_ZONE_MAP).map((campus) => (
                            <option key={campus} value={campus}>{LOCATION_LABELS[campus as CampusLocation]}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--m-ink)' }}>Location</label>
                        <select value={meetupZone} onChange={(e) => setMeetupZone(e.target.value as PickupZone)} className="ui-input">
                          {CAMPUS_ZONE_MAP[meetupCampus].map((zone) => (
                            <option key={zone} value={zone}>{PICKUP_ZONE_LABELS[zone as PickupZone]}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--m-ink)' }}>Date</label>
                        <input type="date" value={meetupDate} onChange={(e) => setMeetupDate(e.target.value)} className="ui-input" required />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--m-ink)' }}>Time</label>
                        <input type="time" value={meetupTimeInput} onChange={(e) => setMeetupTimeInput(e.target.value)} className="ui-input" required />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="submit" disabled={schedulingMeetup} className="ui-btn-primary">
                        {schedulingMeetup ? 'Proposing…' : 'Propose meetup'}
                      </button>
                      <button type="button" onClick={() => setShowMeetupPicker(false)} className="text-xs" style={{ color: 'var(--m-muted)' }}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : null}

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
