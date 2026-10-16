import { NextRequest } from 'next/server'
import { POST } from '@/app/api/listings/[id]/messages/route'
import { getSessionFromRequest } from '@/lib/auth/session'
import {
  blocksIsBlocked,
  listingsFindById,
  messagesCreate,
  messagesListThread,
  usersFindById,
} from '@/lib/data/supabaseDataAccess'

jest.mock('@/lib/auth/session', () => ({ getSessionFromRequest: jest.fn() }))
jest.mock('@/lib/data/supabaseDataAccess', () => ({
  listingsFindById: jest.fn(),
  messagesListThread: jest.fn(),
  messagesCreate: jest.fn(),
  usersFindById: jest.fn(),
  blocksIsBlocked: jest.fn(),
}))

const mockSession = jest.mocked(getSessionFromRequest)
const mockListing = jest.mocked(listingsFindById)
const mockUser = jest.mocked(usersFindById)
const mockBlocked = jest.mocked(blocksIsBlocked)
const mockCreate = jest.mocked(messagesCreate)
const mockThread = jest.mocked(messagesListThread)

function post(body: Record<string, unknown>) {
  return POST(
    new NextRequest('http://localhost/api/listings/l1/messages', { method: 'POST', body: JSON.stringify(body) }),
    { params: Promise.resolve({ id: 'l1' }) }
  )
}

describe('POST /api/listings/[id]/messages', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockListing.mockResolvedValue({ id: 'l1', sellerId: 'seller', status: 'available' } as never)
    mockUser.mockResolvedValue({ id: 'x', accountState: 'active' } as never)
    mockThread.mockResolvedValue([{ id: 'm' }] as never)
    mockCreate.mockResolvedValue({ id: 'new' } as never)
    mockBlocked.mockResolvedValue(false)
  })

  test('buyer blocked by (or blocking) the seller cannot message', async () => {
    mockSession.mockResolvedValue({ userId: 'buyer' } as never)
    mockBlocked.mockResolvedValue(true)

    const response = await post({ content: 'hi' })

    expect(response.status).toBe(403)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  test('seller cannot reply to a buyer who is blocked', async () => {
    mockSession.mockResolvedValue({ userId: 'seller' } as never)
    mockBlocked.mockResolvedValue(true)

    const response = await post({ content: 'hi', buyerId: 'buyer' })

    expect(response.status).toBe(403)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  test('unblocked buyer can still message', async () => {
    mockSession.mockResolvedValue({ userId: 'buyer' } as never)

    const response = await post({ content: 'hi' })

    expect(response.status).toBe(200)
    expect(mockCreate).toHaveBeenCalled()
  })
})
