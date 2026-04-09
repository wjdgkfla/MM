import { MarketplaceDataAccess } from '@/lib/data/contracts'

// Deprecated sync access point kept only to prevent accidental local/mock usage.
// Runtime routes should use async Firebase functions from `firestoreDataAccess.ts`.
export const dataAccess: MarketplaceDataAccess = new Proxy(
  {},
  {
    get() {
      throw new Error('dataAccess is deprecated. Use firestoreDataAccess (Firebase) APIs directly.')
    },
  }
) as MarketplaceDataAccess
