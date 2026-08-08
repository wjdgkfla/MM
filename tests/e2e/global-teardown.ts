import { getE2eSupabaseAdmin } from './utils/supabaseAdmin'
import { TEST_USERS } from './utils/testUsers'

// A prior run confirmed the clutter this warned about: leftover "E2E test
// listing" rows and orphaned public.users mirrors showed up on the live
// site after auth.users cleanup alone. Delete everything a test user
// created (in FK-safe order — transactions before listings, listings
// before the seller's own row) before removing the auth account.
export default async function globalTeardown() {
  const admin = getE2eSupabaseAdmin()
  const { data } = await admin.auth.admin.listUsers()

  for (const user of Object.values(TEST_USERS)) {
    const match = data?.users.find((u) => u.email === user.email)
    if (!match) continue
    const userId = match.id

    const { data: ownListings } = await admin.from('listings').select('id').eq('seller_id', userId)
    const listingIds = (ownListings ?? []).map((l) => l.id as string)

    if (listingIds.length > 0) {
      const { data: txns } = await admin.from('transactions').select('id').in('listing_id', listingIds)
      const txnIds = (txns ?? []).map((t) => t.id as string)
      if (txnIds.length > 0) await admin.from('ratings').delete().in('transaction_id', txnIds)
      await admin.from('transactions').delete().in('listing_id', listingIds)
      await admin.from('messages').delete().in('listing_id', listingIds)
      await admin.from('favorites').delete().in('listing_id', listingIds)
      await admin.from('reports').delete().in('listing_id', listingIds)
      await admin.from('listings').delete().in('id', listingIds)
    }

    await admin.from('ratings').delete().or(`reviewer_id.eq.${userId},reviewee_id.eq.${userId}`)
    await admin.from('reports').delete().or(`seller_id.eq.${userId},reported_by_user_id.eq.${userId}`)
    await admin.from('blocks').delete().or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`)
    await admin.from('users').delete().eq('id', userId)
    await admin.auth.admin.deleteUser(userId)
  }
}
