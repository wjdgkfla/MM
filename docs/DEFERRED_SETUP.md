# Deferred setup — Redis rate limiter, Sentry, AI listing assistant

These three items from the [product/backend audit](PRODUCT_BACKEND_AUDIT_2026-08-07.md) need an external account/credential, so they were skipped during implementation rather than faked. Each is a real gap worth closing before a real public launch — this is the "how" for when you're ready.

---

## 1. Shared rate limiter (Upstash Redis)

**Why it matters:** `src/lib/rateLimit.ts` currently uses an in-process `Map`. On Vercel, each serverless function instance has its own memory, so the same client can get a different effective limit depending on which instance handles the request — the limiter isn't actually global.

**Setup:**
1. Go to [upstash.com](https://upstash.com), create a free account, create a Redis database (pick a region close to your Vercel deployment region).
2. On the database's dashboard, copy the **REST URL** and **REST Token**.
3. Add to Vercel (Project Settings → Environment Variables) and to your local `.env.local`:
   ```
   UPSTASH_REDIS_REST_URL=...
   UPSTASH_REDIS_REST_TOKEN=...
   ```
4. Install the client: `npm install @upstash/redis`
5. In `src/lib/rateLimit.ts`, replace the in-memory `Map` store with `@upstash/redis`'s `Redis.fromEnv()` client, using `INCR` + `EXPIRE` (or Upstash's `Ratelimit` helper package, `@upstash/ratelimit`, which wraps this for you) keyed on `${userId or ip}:${routeClass}`.
6. Keep the existing key strategy from the audit: `user_id + route class` for authenticated mutation routes, `IP + route class` separately for abuse-sensitive routes (so shared campus Wi-Fi NAT doesn't punish an entire dorm).

If the env vars are unset, you can keep a fallback to the current in-memory limiter for local dev without Redis configured.

---

## 2. Structured error monitoring (Sentry)

**Why it matters:** the backend currently only has `console.error` calls — fine locally, useless in production once something breaks for a real user and nobody's watching logs.

**Setup:**
1. Go to [sentry.io](https://sentry.io), create a free account, create a new project (framework: Next.js).
2. Sentry gives you a DSN (looks like `https://xxxx@xxxx.ingest.sentry.io/xxxx`).
3. Run `npx @sentry/wizard@latest -i nextjs` in the project root — it installs `@sentry/nextjs`, creates `sentry.client.config.ts`/`sentry.server.config.ts`/`sentry.edge.config.ts`, and wires them into `next.config.ts` automatically.
4. Add to Vercel and `.env.local`:
   ```
   NEXT_PUBLIC_SENTRY_DSN=...
   SENTRY_AUTH_TOKEN=...   # for source-map upload, from Sentry's org settings
   ```
5. Once wired, replace the `console.error(...)` calls in API routes with `Sentry.captureException(err)` (or leave `console.error` in place alongside it — Sentry's Next.js SDK also auto-captures unhandled errors and API route exceptions without you touching every call site, so the wizard install alone gets you most of the value).
6. **Don't log private message content** — if you add custom `Sentry.setContext(...)` calls, stick to route, request ID, user ID, error class, latency — not message bodies or offer amounts.

Also worth adding once this is in place: the product analytics events listed in the audit (`signup_completed`, `search_zero_results`, `offer_accepted`, `transaction_completed`, etc.) — Sentry isn't an analytics tool, so this would be a separate lightweight event log (even just writing rows to a Postgres `analytics_events` table is enough at this scale — no need for a dedicated analytics SaaS yet).

---

## 3. AI photo-to-listing assistant

**Why it matters:** after a seller uploads photos, suggest category/title/description/tags via an LLM call, cutting listing-creation friction. Purely a convenience feature — the audit is explicit this isn't a competitive moat, just conversion polish.

**Setup:**
1. Get an API key from whichever provider you want to use — Anthropic (console.anthropic.com) is the natural fit given the rest of this stack, but OpenAI works too.
2. Add to Vercel and `.env.local`:
   ```
   ANTHROPIC_API_KEY=...
   ```
3. Add a new route, e.g. `src/app/api/listings/suggest/route.ts`, that takes an uploaded image URL (from the existing `/api/upload` flow) and calls the Claude API with vision input, asking for a JSON suggestion: `{ category, title, description, tags }`.
4. Wire it into `src/app/sell/page.tsx`: after photos are uploaded, show a "Fill in for me" button that calls this route and populates the form fields — but leave them editable and require the seller to actually submit, don't auto-post. The audit is explicit that seller confirmation must stay mandatory.
5. Keep the prompt tightly scoped (item identification + campus-marketplace tone) and cap it to a single suggestion call per listing draft to control cost.

Once this exists, the `Photo-to-listing assistant` task can move from "deferred" to "done" without needing anything else from this list.
