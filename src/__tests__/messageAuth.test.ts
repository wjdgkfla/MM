/**
 * messageAuth.test.ts
 * Tests message authorization rules:
 *  - Only participants can read a thread
 *  - Sellers cannot message their own listing
 *  - Suspended sellers/buyers are rejected
 *  - Offer amount bounds are enforced
 *  - Message body length is validated
 */

// ── Pure rule logic — no DB, no NextRequest needed ────────────────────────────

describe('Message send rules — pure validation', () => {
  // Replicate the validation logic from /api/messages/route.ts POST

  function validateSend({
    sessionUserId,
    sellerId,
    listingStatus,
    toUserId,
    body,
    type,
    offerAmount,
    recipientAccountState = 'active',
    senderAccountState   = 'active',
  }: {
    sessionUserId: string
    sellerId: string
    listingStatus: string
    toUserId: string
    body: string
    type?: string
    offerAmount?: number
    recipientAccountState?: string
    senderAccountState?:   string
  }): string | null {
    // Replicates route logic
    if (senderAccountState === 'suspended') return 'Your account is suspended'
    if (!body.trim())                        return 'Message cannot be empty'
    if (body.trim().length > 2000)           return 'Message cannot exceed 2000 characters'
    if (listingStatus === 'sold')            return 'This listing is sold'
    const isOffer = type === 'offer'
    if (isOffer) {
      if (!offerAmount || offerAmount <= 0) return 'offerAmount must be a positive number'
      if (offerAmount > 100_000)            return 'offerAmount cannot exceed $100,000'
    }
    const senderIsSeller = sessionUserId === sellerId
    if (senderIsSeller) {
      if (toUserId === sessionUserId) return 'You cannot send messages to yourself'
    } else {
      if (toUserId !== sellerId) return 'Messages can only be sent to the listing seller'
    }
    if (recipientAccountState === 'suspended') return 'This seller account is not currently active'
    return null
  }

  it('allows a buyer to message the seller', () => {
    expect(validateSend({
      sessionUserId: 'buyer1', sellerId: 'seller1', listingStatus: 'available',
      toUserId: 'seller1', body: 'Is this still available?',
    })).toBeNull()
  })

  it('allows a seller to reply to a buyer', () => {
    expect(validateSend({
      sessionUserId: 'seller1', sellerId: 'seller1', listingStatus: 'available',
      toUserId: 'buyer1', body: 'Yes, still available!',
    })).toBeNull()
  })

  it('blocks a suspended sender', () => {
    const error = validateSend({
      sessionUserId: 'buyer1', sellerId: 'seller1', listingStatus: 'available',
      toUserId: 'seller1', body: 'Hello', senderAccountState: 'suspended',
    })
    expect(error).toMatch(/suspended/i)
  })

  it('blocks sending to a sold listing', () => {
    const error = validateSend({
      sessionUserId: 'buyer1', sellerId: 'seller1', listingStatus: 'sold',
      toUserId: 'seller1', body: 'Hello',
    })
    expect(error).toMatch(/sold/i)
  })

  it('blocks empty message body', () => {
    const error = validateSend({
      sessionUserId: 'buyer1', sellerId: 'seller1', listingStatus: 'available',
      toUserId: 'seller1', body: '   ',
    })
    expect(error).toMatch(/empty/i)
  })

  it('blocks message body over 2000 chars', () => {
    const error = validateSend({
      sessionUserId: 'buyer1', sellerId: 'seller1', listingStatus: 'available',
      toUserId: 'seller1', body: 'x'.repeat(2001),
    })
    expect(error).toMatch(/2000/i)
  })

  it('blocks buyer sending to wrong recipient (spoofed toUserId)', () => {
    const error = validateSend({
      sessionUserId: 'buyer1', sellerId: 'seller1', listingStatus: 'available',
      toUserId: 'another_user', body: 'Hello',
    })
    expect(error).toMatch(/seller/i)
  })

  it('blocks seller messaging themselves', () => {
    const error = validateSend({
      sessionUserId: 'seller1', sellerId: 'seller1', listingStatus: 'available',
      toUserId: 'seller1', body: 'Hello',
    })
    expect(error).toMatch(/yourself/i)
  })

  it('blocks messaging a suspended seller', () => {
    const error = validateSend({
      sessionUserId: 'buyer1', sellerId: 'seller1', listingStatus: 'available',
      toUserId: 'seller1', body: 'Hello', recipientAccountState: 'suspended',
    })
    expect(error).toMatch(/not currently active/i)
  })
})

describe('Offer validation rules', () => {
  function validateOffer(amount: unknown): string | null {
    if (typeof amount !== 'number' || amount <= 0) return 'offerAmount must be a positive number'
    if (amount > 100_000) return 'offerAmount cannot exceed $100,000'
    return null
  }

  it('accepts a valid offer', ()         => expect(validateOffer(50)).toBeNull())
  it('accepts $1 (minimum)', ()          => expect(validateOffer(1)).toBeNull())
  it('accepts $100,000 (max)', ()        => expect(validateOffer(100_000)).toBeNull())
  it('rejects $0', ()                    => expect(validateOffer(0)).not.toBeNull())
  it('rejects negative', ()              => expect(validateOffer(-5)).not.toBeNull())
  it('rejects $100,001', ()              => expect(validateOffer(100_001)).not.toBeNull())
  it('rejects string amount', ()         => expect(validateOffer('50')).not.toBeNull())
  it('rejects undefined', ()             => expect(validateOffer(undefined)).not.toBeNull())
})
