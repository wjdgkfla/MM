import { MarketplaceDataAccess } from '@/lib/data/contracts'
import { mockDataAccess } from '@/lib/data/mockDataAccess'

// Single import point for data access. Swap this export to a DB implementation later.
export const dataAccess: MarketplaceDataAccess = mockDataAccess
