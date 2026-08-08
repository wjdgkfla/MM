import { test, expect } from '@playwright/test'
import { sampleJpegBuffer } from './utils/fixtures'
import { TEST_USERS } from './utils/testUsers'

// Report + block, driven through the real conversation UI on /messages
// (src/app/messages/page.tsx) and the guard in the message-creation route
// (src/app/api/messages/route.ts, blocksIsBlocked).

test.describe('safety flow', () => {
  test('a user reports another user, then blocking them prevents further messages', async ({ browser }) => {
    const reportedContext = await browser.newContext({ storageState: TEST_USERS.reported.authFile })
    const reportedPage = await reportedContext.newPage()

    // Create a listing for "reported" via the API directly — the sell-form
    // UI flow is already exercised end to end in transaction-flow.spec.ts.
    const upload = await reportedPage.request.post('/api/upload', {
      multipart: { files: { name: 'listing.jpg', mimeType: 'image/jpeg', buffer: sampleJpegBuffer() } },
    })
    expect(upload.ok()).toBe(true)
    const { urls } = await upload.json()

    const listingRes = await reportedPage.request.post('/api/listings', {
      data: {
        title: `E2E safety-flow listing ${Date.now()}`,
        description: 'Listing used only to open a conversation for safety-flow testing.',
        price: 10,
        category: 'other',
        condition: 'good',
        campusLocation: 'fairfax',
        pickupZone: 'jc-lobby',
        pickupNotes: 'Meet at the JC lobby info desk.',
        listingKind: 'sell',
        imageUrls: urls,
        coverImageUrl: urls[0],
      },
    })
    expect(listingRes.ok()).toBe(true)
    const listing = await listingRes.json()

    const reportedSession = await (await reportedPage.request.get('/api/auth/session')).json()
    const reportedUserId = reportedSession.session.userId

    const reporterContext = await browser.newContext({ storageState: TEST_USERS.reporter.authFile })
    const reporterPage = await reporterContext.newPage()
    const reporterSession = await (await reporterPage.request.get('/api/auth/session')).json()
    const reporterUserId = reporterSession.session.userId

    // Open the conversation the same way the item page's "Message seller" does.
    const firstMessage = await reporterPage.request.post('/api/messages', {
      data: { listingId: listing.id, toUserId: reportedUserId, body: 'Hi, is this still available?' },
    })
    expect(firstMessage.ok()).toBe(true)

    await reporterPage.goto(`/messages?listingId=${listing.id}`)
    await expect(reporterPage.getByText(listing.title).first()).toBeVisible()

    await reporterPage.getByRole('button', { name: /^Report /i }).click()
    await reporterPage.getByPlaceholder('What happened?').fill('Suspicious behavior during E2E safety testing.')
    await reporterPage.getByRole('button', { name: /submit report/i }).click()
    await expect(reporterPage.getByText(/Report submitted to Mason Market moderation/i)).toBeVisible()

    reporterPage.once('dialog', (dialog) => dialog.accept())
    await reporterPage.getByRole('button', { name: /^Block /i }).click()
    await expect(reporterPage.getByText(/^Blocked /i)).toBeVisible()

    // Blocking is enforced server-side, not just hidden client-side controls
    // (P0-8) — the blocked user's reply attempt must be rejected outright.
    const blockedReplyAttempt = await reportedPage.request.post('/api/messages', {
      data: { listingId: listing.id, toUserId: reporterUserId, body: 'Are you still there?' },
    })
    expect(blockedReplyAttempt.status()).toBe(403)
    const blockedReplyBody = await blockedReplyAttempt.json()
    expect(blockedReplyBody.error).toMatch(/cannot message this user/i)

    // And the reporter can no longer message the blocked user either.
    const reporterRetry = await reporterPage.request.post('/api/messages', {
      data: { listingId: listing.id, toUserId: reportedUserId, body: 'One more thing...' },
    })
    expect(reporterRetry.status()).toBe(403)

    await reportedContext.close()
    await reporterContext.close()
  })
})
