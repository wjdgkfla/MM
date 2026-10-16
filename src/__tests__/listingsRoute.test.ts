import { NextRequest } from 'next/server'
import { GET } from '@/app/api/listings/route'
import { getSessionFromRequest } from '@/lib/auth/session'
import { listingsFindMany } from '@/lib/data/supabaseDataAccess'

jest.mock('@/lib/auth/session', () => ({
  getSessionFromRequest: jest.fn(),
}))

jest.mock('@/lib/data/supabaseDataAccess', () => ({
  listingsFindMany: jest.fn(),
  listingsFindBySellerId: jest.fn(),
  listingsFindByIds: jest.fn(),
  listingsCreate: jest.fn(),
  usersFindById: jest.fn(),
}))

const mockGetSessionFromRequest = jest.mocked(getSessionFromRequest)
const mockListingsFindMany = jest.mocked(listingsFindMany)

describe('GET /api/listings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSessionFromRequest.mockResolvedValue(null)
    mockListingsFindMany.mockResolvedValue({ listings: [], nextCursor: null })
  })

  test('lets anonymous shoppers browse by category filter', async () => {
    const response = await GET(new NextRequest('http://localhost/api/listings?category=textbooks'))

    expect(response.status).toBe(200)
    expect(mockListingsFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'textbooks' })
    )
  })

  test('lets anonymous shoppers use drawer filters and sort for public browsing', async () => {
    const response = await GET(
      new NextRequest(
        'http://localhost/api/listings?campusLocation=fairfax&condition=good&minPrice=10&maxPrice=50&sort=price-asc'
      )
    )

    expect(response.status).toBe(200)
    expect(mockListingsFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        campusLocation: 'fairfax',
        condition: 'good',
        minPrice: 10,
        maxPrice: 50,
        sort: 'price-asc',
      })
    )
  })

  const cursorOf = (value: unknown, id: unknown) =>
    Buffer.from(JSON.stringify({ value, id }), 'utf8').toString('base64')

  test('drops cursors whose id or value carry PostgREST filter syntax', async () => {
    const bad = [
      cursorOf('2026-10-01T12:00:00+00:00', 'x),id.not.is.null,and(id.eq.y'),
      cursorOf('1),id.not.is.null,and(id.eq.1', 'abc-123'),
    ]
    for (const cursor of bad) {
      mockListingsFindMany.mockClear()
      const response = await GET(new NextRequest(`http://localhost/api/listings?cursor=${encodeURIComponent(cursor)}`))

      expect(response.status).toBe(200)
      expect(mockListingsFindMany).toHaveBeenCalledWith(expect.objectContaining({ cursor: undefined }))
    }
  })

  test('keeps a well-formed timestamp cursor and a numeric price cursor', async () => {
    const timestamp = cursorOf('2026-10-01T12:00:00.123456+00:00', 'abc-123')
    await GET(new NextRequest(`http://localhost/api/listings?cursor=${encodeURIComponent(timestamp)}`))
    expect(mockListingsFindMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: { value: '2026-10-01T12:00:00.123456+00:00', id: 'abc-123' } })
    )

    const price = cursorOf(25.5, 'abc-123')
    await GET(new NextRequest(`http://localhost/api/listings?sort=price-asc&cursor=${encodeURIComponent(price)}`))
    expect(mockListingsFindMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: { value: 25.5, id: 'abc-123' } })
    )
  })

  test('still requires sign-in for private listing collections', async () => {
    const response = await GET(new NextRequest('http://localhost/api/listings?mine=true'))

    expect(response.status).toBe(401)
    expect(mockListingsFindMany).not.toHaveBeenCalled()
  })
})
