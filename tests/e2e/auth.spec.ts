import { test, expect } from '@playwright/test'
import { getE2eSupabaseAdmin } from './utils/supabaseAdmin'
import { TEST_PASSWORD, TEST_USERS } from './utils/testUsers'

test.describe('auth flow', () => {
  test('signing up with a non-university email is rejected', async ({ page }) => {
    await page.goto('/sign-up')

    await page.getByPlaceholder('Your name').fill('Not A Patriot')
    await page.getByPlaceholder('you@gmu.edu').fill('someone@gmail.com')
    await page.getByPlaceholder('At least 6 characters').fill('password123')

    // This is a client-side guard (src/app/sign-up/page.tsx) that runs before
    // any Supabase/API call is made, so this assertion holds even with no
    // Supabase project configured for this run.
    await page.getByRole('button', { name: /create account|sign up/i }).click()

    await expect(page.getByText(/Only GMU email addresses are allowed/i)).toBeVisible()
    // Still on the sign-up form — no OTP step was reached.
    await expect(page.getByPlaceholder('123456')).toHaveCount(0)
  })

  test('session is invalidated after a password reset', async ({ page, baseURL, browser }) => {
    const subject = TEST_USERS.resetSubject
    const admin = getE2eSupabaseAdmin()

    // Snapshot the pre-reset session cookie in its own context so we can
    // prove it stops working *after* the reset below — this is the
    // browser-driven counterpart to the session_version check already unit
    // tested in tests/deployment-hardening.test.ts.
    const staleContext = await browser.newContext({ storageState: subject.authFile })
    const stalePage = await staleContext.newPage()
    const beforeReset = await stalePage.request.get('/api/auth/session')
    expect((await beforeReset.json()).session).not.toBeNull()

    // Simulate clicking the emailed recovery link: generate it via the admin
    // API (no live mail inbox in this environment) and drive the real
    // reset-password page exactly as a user would.
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: subject.email,
      options: { redirectTo: `${baseURL}/reset-password` },
    })
    expect(error).toBeNull()
    const actionLink = data?.properties?.action_link
    expect(actionLink).toBeTruthy()

    await page.goto(actionLink!)
    await expect(page.getByRole('heading', { name: 'New password' })).toBeVisible()

    const newPassword = `${TEST_PASSWORD}-reset`
    await page.getByPlaceholder('At least 6 characters').fill(newPassword)
    await page.getByPlaceholder('Repeat password').fill(newPassword)
    await page.getByRole('button', { name: /set new password/i }).click()

    await expect(page).toHaveURL(/\/sign-in\?reset=success/)
    await expect(page.getByText(/Password reset successfully/i)).toBeVisible()

    // The cookie issued before the reset must now be rejected — that's the
    // session_version bump doing its job end to end.
    const afterReset = await stalePage.request.get('/api/auth/session')
    expect((await afterReset.json()).session).toBeNull()
    await staleContext.close()
  })
})
