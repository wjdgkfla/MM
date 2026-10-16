# Mason Market

GMU-only student marketplace (textbooks, electronics, furniture, pickup on campus). Next.js 16 App Router, React 18, TypeScript, Supabase (Postgres, Storage), Tailwind 3, Web Push. Deployed on Vercel.

General coding rules live in the user-level `~/CLAUDE.md`. This file only covers what is specific to this repo.

## Commands

| Task | Command |
|---|---|
| Dev server | `npm run dev` |
| Typecheck | `npx tsc --noEmit` |
| Lint | `npm run lint` |
| Unit tests | `npm test` (jest in `src/__tests__/` plus `tests/deployment-hardening.test.ts` via tsx) |
| E2E | `npm run test:e2e` (needs real Supabase env; see `tests/e2e/`) |
| Build | `npm run build` |

CI runs lint, tsc, test, build, and applies every `supabase/migrations/*.sql` to an empty Postgres 16. A change is done when the first four pass locally.

## Architecture

- **Auth is custom, not Supabase Auth.** Signed session cookie `mason_market_session` (`src/lib/auth/session.ts`, signed with `SESSION_SECRET`). Server helpers: `requireActiveAdmin` in `src/lib/auth/admin.ts`. Only `@gmu.edu` / `@masonlive.gmu.edu` emails are valid.
- **Data access:** all DB reads and writes go through `src/lib/data/supabaseDataAccess.ts` using the service-role client (`src/lib/supabase/server.ts`). Because it bypasses RLS, every API route must check ownership and role itself.
- `src/lib/data/contracts.ts` holds shared input/query types only. There is no repository interface layer; don't add one.
- **API routes:** `src/app/api/**/route.ts`, thin handlers. Validation lives in `src/lib/validators.ts`, `listingValidation.ts`, `uploadValidation.ts`.
- **Rate limiting:** `src/proxy.ts` (Next 16 replaces `middleware.ts`) buckets `/api/*` by IP. Reads and writes use separate buckets on purpose, since campus wifi puts many students behind one IP.
- **Admin:** emails come from the `ADMIN_EMAILS` env var. `src/lib/auth/devAdmin.ts` is imported by client pages, so keep server-only imports out of it.
- **i18n:** `src/lib/i18n/` (`LocaleProvider`, `translations.ts`). New user-facing strings go through it.

## Database

- Migrations in `supabase/migrations/`, named `YYYYMMDDHHMMSS_name.sql`, applied in order. Never edit an applied migration; add a new one.
- Migrations must run on a bare Postgres 16 with only `pgcrypto` (CI smoke test).
- Prefer the Supabase MCP (`list_tables`, `get_advisors`) to inspect the live schema before changing it.

## Env

Copy `.env.local.example` to `.env.local`. Needs Supabase URL/keys, `SESSION_SECRET` (required in production), optional `ADMIN_EMAILS`, and the VAPID keys for push. Never print or commit secret values.

## Gotchas

- README still says Next.js 14; the real version is 16 (see `package.json`).
- E2E tests run serially (`workers: 1`) and create real rows; `global-teardown.ts` must clean up everything a run creates.
- `test-results/` and `tsconfig.tsbuildinfo` are git-ignored; don't commit them.

## Wrap-up

After any turn that changes Mason Market code, end with a paste-ready GitHub Desktop commit: a short imperative **Summary** (under ~70 chars) and a bulleted **Description** of what changed and why. Skip it for discussion-only turns.
