import { test, expect } from '@playwright/test'
import { sampleJpegBuffer } from './utils/fixtures'
import { TEST_USERS } from './utils/testUsers'

// Full campus transaction loop, driven by two real signed-in browser
// contexts (seller + buyer) so both sides of every hand-off — offer,
// acceptance/reservation, meetup, completion, review eligibility — go
// through the real API routes exactly as a browser would call them.
// See src/app/api/messages/[id]/route.ts (transactionsAcceptOffer) and
// src/app/api/transactions/[id]/route.ts for the server-side contract.

const listingTitle = `E2E test listing ${Date.now()}`

test.describe.configure({ mode: 'serial' })

test.describe('buyer/seller transaction flow', () => {
  let listingUrl = ''
  let transactionId = ''

  test('seller creates a listing', async ({ browser }) => {
    const context = await browser.newContext({ storageState: TEST_USERS.seller.authFile })
    const page = await context.newPage()
    await page.goto('/sell')

    await page.getByPlaceholder('e.g. TI-84 calculator used in STAT 250').fill(listingTitle)
    await page.setInputFiles('input[type="file"]', {
      name: 'listing.jpg',
      mimeType: 'image/jpeg',
      buffer: sampleJpegBuffer(),
    })
    await page.locator('input[type="number"]').first().fill('40')
    await page
      .getByPlaceholder('Condition details, what is included, and best pickup time.')
      .fill('E2E-created listing used for automated transaction-flow testing.')
    await page
      .getByPlaceholder('e.g. Johnson Center lobby near the info desk, weekdays after 2pm')
      .fill('Meet at Johnson Center lobby, weekdays after 2pm.')

    await page.getByRole('button', { name: /post listing/i }).first().click()

    await expect(page).toHaveURL(/\/my-listings\/.+\/edit\?posted=1/)
    // The post-creation redirect is the seller-only edit page
    // (/my-listings/{id}/edit) — the public listing page buyers browse is
    // /item/{id}, a different route entirely.
    const listingId = page.url().match(/\/my-listings\/([^/]+)\/edit/)![1]
    listingUrl = `/item/${listingId}`

    await context.close()
  })

  test('buyer finds the listing via search', async ({ browser }) => {
    const context = await browser.newContext({ storageState: TEST_USERS.buyer.authFile })
    const page = await context.newPage()
    await page.goto('/')

    await page.getByPlaceholder('What are you looking for?').fill(listingTitle)
    await page.keyboard.press('Enter')

    await expect(page.getByText(listingTitle).first()).toBeVisible()
    await context.close()
  })

  test('buyer messages the seller and sends an offer', async ({ browser }) => {
    const context = await browser.newContext({ storageState: TEST_USERS.buyer.authFile })
    const page = await context.newPage()
    await page.goto(listingUrl)

    await page.getByRole('button', { name: /make an offer|make offer/i }).click()
    await page.locator('input[type="number"]').fill('30')
    await page.getByRole('button', { name: /send offer/i }).click()

    // handleMakeOffer navigates to the thread on success — confirms the
    // offer POST (src/app/api/messages/route.ts) actually succeeded.
    await expect(page).toHaveURL(new RegExp(`/messages\\?listingId=`))
    await expect(page.getByText('$30')).toBeVisible()
    await context.close()
  })

  test('seller accepts the offer, reserving the listing and creating a transaction', async ({ browser }) => {
    const context = await browser.newContext({ storageState: TEST_USERS.seller.authFile })
    const page = await context.newPage()
    await page.goto('/messages')

    await page.getByText(listingTitle).first().click()
    await expect(page.getByText('$30')).toBeVisible()

    // PATCH /api/messages/[id] returns { ...message, transactionId } only on
    // acceptance (transactionsAcceptOffer) — capture it here so the review
    // step below can exercise the real completed-transaction rating gate
    // instead of guessing an id.
    const [acceptResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/messages/') && res.request().method() === 'PATCH'),
      page.getByRole('button', { name: 'Accept' }).click(),
    ])
    const acceptedMessage = await acceptResponse.json()
    transactionId = acceptedMessage.transactionId
    expect(transactionId).toBeTruthy()

    await expect(page.getByText('✓ Offer accepted')).toBeVisible()

    // Accepting reserves the listing for this specific buyer
    // (transactionsAcceptOffer) — confirm on the listing detail page too.
    await page.goto(listingUrl)
    await expect(page.getByText(/reserved/i).first()).toBeVisible()

    await context.close()
  })

  test('a meetup is proposed and confirmed', async ({ browser }) => {
    const sellerContext = await browser.newContext({ storageState: TEST_USERS.seller.authFile })
    const sellerPage = await sellerContext.newPage()
    await sellerPage.goto('/messages')
    await sellerPage.getByText(listingTitle).first().click()

    await sellerPage.getByRole('button', { name: /schedule meetup/i }).click()
    // Campus/zone default to Fairfax / JC lobby (openMeetupPicker) — only date/time are required.
    const meetupDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    await sellerPage.locator('input[type="date"]').fill(meetupDate)
    await sellerPage.locator('input[type="time"]').fill('14:00')
    await sellerPage.getByRole('button', { name: /propose meetup/i }).click()

    await expect(sellerPage.getByText(/meetup proposed/i)).toBeVisible()
    await sellerContext.close()

    const buyerContext = await browser.newContext({ storageState: TEST_USERS.buyer.authFile })
    const buyerPage = await buyerContext.newPage()
    await buyerPage.goto('/messages')
    await buyerPage.getByText(listingTitle).first().click()

    await buyerPage.getByRole('button', { name: 'Confirm' }).click()
    await expect(buyerPage.getByText(/meetup confirmed/i)).toBeVisible()
    await buyerContext.close()
  })

  test('both sides confirm completion and the transaction is marked completed', async ({ browser }) => {
    const sellerContext = await browser.newContext({ storageState: TEST_USERS.seller.authFile })
    const sellerPage = await sellerContext.newPage()
    await sellerPage.goto('/messages')
    await sellerPage.getByText(listingTitle).first().click()
    await sellerPage.getByRole('button', { name: /mark exchange complete/i }).click()
    await expect(sellerPage.getByText(/waiting for/i)).toBeVisible()
    await sellerContext.close()

    const buyerContext = await browser.newContext({ storageState: TEST_USERS.buyer.authFile })
    const buyerPage = await buyerContext.newPage()
    await buyerPage.goto('/messages')
    await buyerPage.getByText(listingTitle).first().click()
    await expect(buyerPage.getByText('Did you receive the item?')).toBeVisible()
    await buyerPage.getByRole('button', { name: 'Confirm' }).click()

    // Two elements legitimately match /transaction completed/i here: the
    // persistent status line ("Transaction completed on ...") and a
    // transient success toast ("Transaction completed!") — .first() is
    // enough to prove completion landed without racing the toast's
    // auto-dismiss.
    await expect(buyerPage.getByText(/transaction completed/i).first()).toBeVisible()
    await buyerContext.close()
  })

  test('a completed transaction makes the buyer eligible to review the seller', async ({ browser }) => {
    const context = await browser.newContext({ storageState: TEST_USERS.buyer.authFile })
    const page = await context.newPage()

    // Ratings gate on transaction.status === 'completed' and reviewer being a
    // participant (src/app/api/ratings/route.ts, the P0-4 fix). The previous
    // steps in this file drove the transaction through offer -> accept ->
    // meetup -> completed via the real UI/API, so this should now succeed.
    const ratingRes = await page.request.post('/api/ratings', {
      data: { transactionId, score: 1, tags: ['item-as-described'] },
    })
    expect(ratingRes.ok()).toBe(true)

    // Reviewing the same transaction twice is rejected.
    const duplicateRes = await page.request.post('/api/ratings', {
      data: { transactionId, score: 1, tags: [] },
    })
    expect(duplicateRes.status()).toBe(409)

    await context.close()
  })
})
