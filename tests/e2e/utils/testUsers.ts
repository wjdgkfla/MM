// Test-user identities shared between global-setup (which creates them and
// saves signed-in storage state) and the spec files (which need the raw
// credentials for the auth flow tests, or just the storage-state paths for
// the transaction/safety flows).

const RUN_ID = process.env.PLAYWRIGHT_RUN_ID || Date.now().toString(36)

export const TEST_PASSWORD = 'E2E-test-password-1!'

export const TEST_USERS = {
  seller: {
    email: `e2e.seller.${RUN_ID}@gmu.edu`,
    displayName: 'E2E Seller',
    password: TEST_PASSWORD,
    authFile: 'tests/e2e/.auth/seller.json',
  },
  buyer: {
    email: `e2e.buyer.${RUN_ID}@gmu.edu`,
    displayName: 'E2E Buyer',
    password: TEST_PASSWORD,
    authFile: 'tests/e2e/.auth/buyer.json',
  },
  reporter: {
    email: `e2e.reporter.${RUN_ID}@gmu.edu`,
    displayName: 'E2E Reporter',
    password: TEST_PASSWORD,
    authFile: 'tests/e2e/.auth/reporter.json',
  },
  reported: {
    email: `e2e.reported.${RUN_ID}@gmu.edu`,
    displayName: 'E2E Reported',
    password: TEST_PASSWORD,
    authFile: 'tests/e2e/.auth/reported.json',
  },
  resetSubject: {
    email: `e2e.reset.${RUN_ID}@gmu.edu`,
    displayName: 'E2E Reset Subject',
    password: TEST_PASSWORD,
    authFile: 'tests/e2e/.auth/reset-subject.json',
  },
} as const

export type TestUserKey = keyof typeof TEST_USERS
