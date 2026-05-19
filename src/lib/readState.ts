export function conversationUnreadCount(
  messages: Array<{ toUserId: string; createdAt: string }>,
  userId: string,
  lastReadAt?: string | null
): number {
  const lastReadTime = lastReadAt ? new Date(lastReadAt).getTime() : 0
  return messages.filter((message) => (
    message.toUserId === userId && new Date(message.createdAt).getTime() > lastReadTime
  )).length
}

export function getConversationReadUpdate(userId: string, buyerId: string) {
  return {
    field: userId === buyerId ? 'buyer_last_read_at' : 'seller_last_read_at',
    value: new Date().toISOString(),
  }
}

type RecoverableMessage = {
  id?: string
  listingId: string
  fromUserId: string
  toUserId: string
  body: string
  createdAt: string
}

export function recoverConversationSummariesFromMessages(messages: RecoverableMessage[], userId: string) {
  const byThread = new Map<string, RecoverableMessage[]>()

  for (const message of messages) {
    const peerId = message.fromUserId === userId ? message.toUserId : message.fromUserId
    const key = `${message.listingId}:${[userId, peerId].sort().join(':')}`
    const thread = byThread.get(key) || []
    thread.push(message)
    byThread.set(key, thread)
  }

  return Array.from(byThread.entries())
    .map(([id, thread]) => {
      const sorted = [...thread].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
      const last = sorted[sorted.length - 1]
      const peerId = last.fromUserId === userId ? last.toUserId : last.fromUserId
      return {
        id,
        listingId: last.listingId,
        participantIds: [userId, peerId].sort() as [string, string],
        lastMessagePreview: last.body,
        lastMessageAt: last.createdAt,
        unreadCount: sorted.filter((message) => message.toUserId === userId).length,
      }
    })
    .sort((a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt))
}
