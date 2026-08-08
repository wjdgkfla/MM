import { defineConfig, devices } from '@playwright/test'
import { loadEnvConfig } from '@next/env'

// `next dev` loads .env.local automatically; this config runs as a plain
// Node process outside Next's runtime (global-setup.ts needs
// SUPABASE_SERVICE_ROLE_KEY before the dev server even starts), so it has
// to load the same file itself. @next/env is already a transitive
// dependency of Next.js — reusing it instead of adding a new one.
loadEnvConfig(process.cwd())

// Computed once here (main process, loaded before workers spawn) and
// inherited by every worker/global-setup/global-teardown process. Without
// this, tests/e2e/utils/testUsers.ts's `Date.now().toString(36)` fallback
// produces a different run ID per process, so global-setup creates users
// under one email and the spec files look for a different one.
process.env.PLAYWRIGHT_RUN_ID = process.env.PLAYWRIGHT_RUN_ID || Date.now().toString(36)

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
