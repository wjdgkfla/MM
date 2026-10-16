import { NextRequest } from 'next/server'
import { PATCH } from '@/app/api/transactions/[id]/route'
import { getSessionFromRequest } from '@/lib/auth/session'
import {
  transactionsCancelMeetup,
  transactionsConfirmMeetup,
  transactionsFindById,
} from '@/lib/data/supabaseDataAccess'

jest.mock('@/lib/auth/session', () => ({
  getSessionFromRequest: jest.fn(),
}))

jest.mock('@/lib/data/supabaseDataAccess', () => ({
  transactionsFindById: jest.fn(),
  transactionsProposeMeetup: jest.fn(),
  transactionsConfirmMeetup: jest.fn(),
  transactionsCancelMeetup: jest.fn(),
  transactionsConfirmCompletion: jest.fn(),
}))

const mockSession = jest.mocked(getSessionFromRequest)
const mockFind = jest.mocked(transactionsFindById)
const mockConfirmMeetup = jest.mocked(transactionsConfirmMeetup)
const mockCancelMeetup = jest.mocked(transactionsCancelMeetup)

function patch(action: string) {
  return PATCH(
    new NextRequest('http://localhost/api/transactions/t1', {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    }),
    { params: Promise.resolve({ id: 't1' }) }
  )
}

function transaction(status: string) {
  return {
    id: 't1',
    buyerId: 'buyer',
    sellerId: 'seller',
    status,
    meetupZone: 'johnson-center',
    meetupTime: '2030-01-01T12:00:00Z',
  } as unknown as Awaited<ReturnType<typeof transactionsFindById>>
}

describe('PATCH /api/transactions/[id] meetup actions on finished transactions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSession.mockResolvedValue({ userId: 'buyer' } as never)
  })

  test.each(['completed', 'cancelled'])('cancel-meetup is rejected when %s', async (status) => {
    mockFind.mockResolvedValue(transaction(status))

    const response = await patch('cancel-meetup')

    expect(response.status).toBe(409)
    expect(mockCancelMeetup).not.toHaveBeenCalled()
  })

  test.each(['completed', 'cancelled'])('confirm-meetup is rejected when %s', async (status) => {
    mockFind.mockResolvedValue(transaction(status))

    const response = await patch('confirm-meetup')

    expect(response.status).toBe(409)
    expect(mockConfirmMeetup).not.toHaveBeenCalled()
  })
})
