import fs from 'node:fs'
import path from 'node:path'
import { request, type FullConfig } from '@playwright/test'
import { getE2eSupabaseAdmin, getE2eSupabaseAnon } from './utils/supabaseAdmin'
import { TEST_USERS } from './utils/testUsers'

// Creates the E2E test accounts directly via the Supabase admin API (rather
// than driving the real signup + email-confirmation UI, which needs a mail
// inbox) and signs each one in through the app's real sign-in endpoint so
// its Mason Market session cookie ends up in a saved storageState file —
// the same cookie the app's own middleware/session checks expect.
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000'
  const authDir = path.join(__dirname, '.auth')
  fs.mkdirSync(authDir, { recursive: true })

  const admin = getE2eSupabaseAdmin()
  const anon = getE2eSupabaseAnon()

  for (const user of Object.values(TEST_USERS)) {
    const { error: createError } = await admin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { display_name: user.displayName },
    })
    if (createError) {
      throw new Error(`Failed to create E2E test user ${user.email}: ${createError.message}`)
    }

    const { data: signInData, error: signInError } = await anon.auth.signInWithPassword({
      email: user.email,
      password: user.password,
    })
    if (signInError || !signInData.session) {
      throw new Error(`Failed to sign in E2E test user ${user.email}: ${signInError?.message}`)
    }

    const requestContext = await request.newContext({ baseURL })
    const sessionRes = await requestContext.post('/api/auth/sign-in', {
      data: { accessToken: signInData.session.access_token },
    })
    if (!sessionRes.ok()) {
      throw new Error(`Failed to establish app session for ${user.email}: ${await sessionRes.text()}`)
    }
    await requestContext.storageState({ path: user.authFile })
    await requestContext.dispose()
  }
}
