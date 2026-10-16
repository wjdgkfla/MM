import { NextRequest } from 'next/server'
import { POST } from '@/app/api/push/subscribe/route'
import { getSessionFromRequest } from '@/lib/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase/server'

jest.mock('@/lib/auth/session', () => ({ getSessionFromRequest: jest.fn() }))
jest.mock('@/lib/supabase/server', () => ({ getSupabaseAdmin: jest.fn() }))

const upsert = jest.fn()

function post(endpoint: unknown) {
  return POST(
    new NextRequest('http://localhost/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint, keys: { p256dh: 'k', auth: 'a' } }),
    })
  )
}

describe('POST /api/push/subscribe endpoint validation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    upsert.mockResolvedValue({ error: null })
    jest.mocked(getSessionFromRequest).mockResolvedValue({ userId: 'u1' } as never)
    jest.mocked(getSupabaseAdmin).mockReturnValue({ from: () => ({ upsert }) } as never)
  })

  test.each([
    'http://fcm.googleapis.com/send/abc',
    'https://127.0.0.1/send',
    'https://localhost/send',
    'https://169.254.169.254/latest/meta-data',
    'not a url',
    { evil: true },
    `https://example.com/${'a'.repeat(3000)}`,
  ])('rejects %p', async (endpoint) => {
    const response = await post(endpoint)

    expect(response.status).toBe(400)
    expect(upsert).not.toHaveBeenCalled()
  })

  test('accepts a real https push-service endpoint', async () => {
    const response = await post('https://fcm.googleapis.com/fcm/send/abc123')

    expect(response.status).toBe(200)
    expect(upsert).toHaveBeenCalled()
  })
})
