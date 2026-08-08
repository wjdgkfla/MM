import { getE2eSupabaseAdmin } from './utils/supabaseAdmin'
import { TEST_USERS } from './utils/testUsers'

// ponytail: only deletes the auth.users rows for the accounts this run
// created. It doesn't cascade-clean the listings/messages/transactions they
// created in the app's own tables — add that if repeated E2E runs against a
// long-lived project start accumulating meaningful clutter.
export default async function globalTeardown() {
  const admin = getE2eSupabaseAdmin()
  for (const user of Object.values(TEST_USERS)) {
    const { data } = await admin.auth.admin.listUsers()
    const match = data?.users.find((u) => u.email === user.email)
    if (match) await admin.auth.admin.deleteUser(match.id)
  }
}
