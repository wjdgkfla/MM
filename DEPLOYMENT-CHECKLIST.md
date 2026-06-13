# Mason Market — Deployment Checklist

## Build & Code Status

| Check | Status |
|-------|--------|
| `npm run build` | ✅ Passes |
| TypeScript (`tsc --noEmit`) | ✅ No errors |
| ESLint | ✅ No errors |
| Session hard-fails in production without `SESSION_SECRET` | ✅ Verified |
| Dev admin fallback only runs in non-production | ✅ Verified |
| Email confirmation required before session (sign-up) | ✅ Verified |
| Email confirmation required before session (sign-in) | ✅ Fixed (defense-in-depth check added) |
| Messages use `session.userId` from cookie, never query param | ✅ Verified |
| `usersUpsert` uses Supabase UUID as primary key | ✅ Verified |
| `/api/auth/session` and `/api/auth/sign-out` exempt from rate limiting | ✅ Verified |
| Admin routes double-check role in database (not just cookie) | ✅ Verified |
| Listing POST shows error string on failure | ✅ Verified |
| Message polling does not repeat mark-read on every poll | ✅ Verified |

---

## Manual Steps Required Before Deploying

### 1. Supabase — Email Confirmation

Go to: **Supabase Dashboard → Authentication → Email**

- [ ] Enable **"Confirm email"** (disabled by default in new projects)
- [ ] Set **Site URL** to your production domain (e.g. `https://mason-market.vercel.app`)
- [ ] Add your production domain to **Redirect URLs**
  - Example: `https://mason-market.vercel.app/**`
- [ ] Set a custom **"Confirm signup"** email template if desired (optional)

> Why: Without email confirmation enabled, anyone can create a Supabase account without verifying their GMU email. The app enforces this server-side in production, but Supabase must also enforce it for full protection.

---

### 2. Supabase — Database Schema

Run these SQL files in order in the **Supabase SQL Editor**:

1. `supabase/schema.sql` — base schema (if this is a new project)
2. `supabase/schema-addons.sql` — additive columns, indexes, constraints, and new tables
3. `supabase/schema-security.sql` — **required**: enables RLS on all tables and locks down function privileges. Without this, anyone with the anon key (which ships in the browser bundle) can read/write every table directly via the REST API.

> These are idempotent (`IF NOT EXISTS`, `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object`), so safe to re-run.

---

### 3. Vercel — Environment Variables

Set these in **Vercel Dashboard → Project → Settings → Environment Variables**:

#### Required

| Variable | Description | How to get |
|----------|-------------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (secret) | Supabase Dashboard → Settings → API |
| `SESSION_SECRET` | Random 32+ char hex string | Run: `openssl rand -hex 32` |

#### Recommended

| Variable | Description | How to get |
|----------|-------------|------------|
| `ADMIN_EMAILS` | Comma-separated admin emails (e.g. `you@gmu.edu`) | Set to your GMU email(s) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push public key | Run: `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | Web Push private key | Same command as above |
| `VAPID_SUBJECT` | VAPID contact email | e.g. `mailto:admin@gmu.edu` |

> Without `ADMIN_EMAILS`: no user will get the admin role in production (safe default). Set it to your email to get admin access after first sign-in.

> Without VAPID keys: push notifications are silently disabled — app still works.

---

### 4. Rate Limiter — Multi-Instance Warning

The current rate limiter (`src/lib/rateLimit.ts`) uses **in-memory state**.

- **Vercel Serverless**: Each function instance has separate memory. Rate limits are per-instance, not global.
- **Impact**: Rate limiting still works as a basic DoS guard, but a determined attacker hitting different instances won't be blocked.

**For production hardening** (optional): Replace with [Upstash Redis rate limiter](https://github.com/upstash/ratelimit) — the file has a comment pointing there. This requires adding `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` env vars.

---

### 5. Supabase Row-Level Security (RLS)

Check that RLS is enabled on sensitive tables in **Supabase Dashboard → Table Editor**:

- [ ] `users` table — restrict reads/writes to service role or authenticated users
- [ ] `messages` table — users should only read their own messages
- [ ] `conversations` table — users should only read their own conversations

> The app uses the **service role key** server-side (which bypasses RLS), so RLS is a defense-in-depth layer for direct database access attempts. If you're using the anon key anywhere client-side for data reads, RLS is required.

---

### 6. Vercel — Deployment Settings

- [ ] Set **Node.js version** to 20.x (in Vercel project settings)
- [ ] Set **Framework Preset** to `Next.js`
- [ ] Verify the **Root Directory** is the project root (not a subdirectory)
- [ ] Enable **Fluid Compute** or standard Serverless Functions (default is fine)

---

### 7. Post-Deploy Smoke Test

After deploying:

1. Visit the site and confirm the home page loads
2. Sign up with a GMU email — confirm the verification email arrives
3. Confirm the email and complete sign-up
4. Create a test listing
5. Open a second browser/incognito window, sign in as a different user, and send a message
6. Confirm both users see the message thread
7. Sign in with your admin email and verify `/admin` loads the moderation dashboard
