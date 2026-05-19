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
