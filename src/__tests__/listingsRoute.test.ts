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
    mockListingsFindMany.mockResolvedValue([])
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

  test('still requires sign-in for private listing collections', async () => {
    const response = await GET(new NextRequest('http://localhost/api/listings?mine=true'))

    expect(response.status).toBe(401)
    expect(mockListingsFindMany).not.toHaveBeenCalled()
  })
})
