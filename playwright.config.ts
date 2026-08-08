import { defineConfig, devices } from '@playwright/test'

// E2E tests need a real dev server + a real (or seeded) Supabase project —
// see tests/e2e/README.md. `npm run test:e2e` starts `next dev` for you.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // buyer/seller flow tests share fixture data and mutate the same rows
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
