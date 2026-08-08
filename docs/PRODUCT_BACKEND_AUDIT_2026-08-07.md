# Mason Market — Objective Product, Backend & Growth Audit

**Repository reviewed:** `wjdgkfla/MM`  
**Production site:** `masonmarket-seven.vercel.app`  
**Audit date:** August 7, 2026  
**Review basis:** Static review of the current `main` branch through the connected GitHub repository, plus a current competitor scan. This is not a penetration test, load test, or independently executed production build.

---

## Executive Summary

Mason Market is materially further along than a simple student marketplace prototype.

The current repository already contains:

- GMU-restricted authentication
- verified-email checks
- signed application sessions with session invalidation
- seller and wanted listings
- Postgres full-text search
- category, campus, condition, price, pickup-zone, and course filters
- favorites
- saved searches
- price-drop watches
- structured offers
- messaging
- meetup message data
- reserved and sold states
- seller ratings / manner-style reputation
- listing and user reports
- an admin moderation area
- notifications
- push-notification infrastructure
- PWA assets and a service worker
- listing expiry / refresh behavior
- a seasonal marketplace banner
- automated tests for several security and marketplace behaviors

That changes the product recommendation substantially.

The main question is no longer:

> "What features can Mason Market add?"

The better question is:

> "What needs to become reliable, trustworthy, measurable, and scalable before Mason Market can credibly launch beyond a portfolio/demo product?"

### Overall assessment

| Area | Current assessment | Main reason |
|---|---:|---|
| Core marketplace completeness | **8/10** | Strong feature coverage for an MVP |
| Transaction integrity | **5/10** | No authoritative transaction entity |
| Trust & safety | **6/10** | Good moderation foundation, but ratings/deletion weaken trust |
| Backend security fundamentals | **7/10** | Several good controls; a few serious operational gaps |
| Backend scalability | **5.5/10** | Polling, N+1 reads, offset pagination, in-memory rate limiting |
| Data-model extensibility | **5/10** | GMU/campuses are hard-coded; no first-class transaction model |
| Reliability & observability | **4.5/10** | Mostly `console.error`, no visible production observability pipeline |
| Automated testing | **7/10** | Good unit/security coverage; no visible CI/E2E workflow |
| Competitive differentiation today | **6/10** | Student verification is now table stakes |
| Potential after P0/P1 roadmap | **8+/10** | Strong campus-specific transaction product is achievable |

### The most important conclusion

Mason Market should **not** immediately become a student super-app.

Do not make housing, jobs, services, events, payments, social feeds, and AI assistants the near-term focus.

The strongest path is to make Mason Market the **best verified campus transaction network**:

> Discover → Match → Offer → Reserve → Meet → Complete → Review

The current application already covers pieces of this loop. The next stage is to make the loop authoritative in the backend and noticeably easier for the user.

---

# 1. What Is Actually Implemented Today

A major reason for reviewing the repository was to avoid recommending features that already exist.

## 1.1 Authentication and identity

The codebase currently supports:

- GMU-domain restriction
- production email-confirmation checks
- Supabase Auth for identity
- a separate Mason Market signed session cookie
- HMAC signature verification
- `HttpOnly` cookies
- `SameSite=Strict`
- secure cookies in production
- a 14-day application session lifetime
- `session_version` invalidation after password reset
- database-backed role/account checks in important actions
- suspended-user protections

Relevant areas:

- `src/lib/auth/session.ts`
- `src/app/api/auth/*`
- `src/lib/auth/devAdmin.ts`
- `src/lib/validators.ts`
- `supabase/schema-fixes.sql`

This is more security work than many early-stage marketplace prototypes have.

## 1.2 Marketplace inventory

The listing model already supports:

- `sell`
- `wanted`
- available / reserved / sold
- moderation state
- multiple images
- cover image
- title
- description
- price
- category
- condition
- campus
- pickup zone
- pickup notes
- textbook course code
- professor
- edition
- bundle notes
- tags
- favorite count
- view count
- listing expiration
- listing refresh

Relevant areas:

- `supabase/schema.sql`
- `supabase/schema-addons.sql`
- `src/lib/types.ts`
- `src/lib/listingValidation.ts`
- `src/app/api/listings/*`

This means **Wanted listings are not a future idea**. They already exist structurally.

The next opportunity is to make wanted listings actually create marketplace liquidity through matching and notifications.

## 1.3 Search and discovery

The current backend supports:

- native Postgres `tsvector` full-text search
- category filtering
- listing-kind filtering
- campus filtering
- pickup-zone filtering
- condition filtering
- status filtering
- min/max price
- free-only
- course tag
- price/newest/oldest sorting
- pagination
- saved searches
- price watches
- type-ahead UI
- seasonal UI

Relevant areas:

- `src/app/api/listings/route.ts`
- `src/lib/data/supabaseDataAccess.ts`
- `src/app/page.tsx`
- `src/app/api/saved-searches/route.ts`
- `src/app/api/price-watches/*`

## 1.4 Messaging and negotiation

The app already has:

- marketplace conversations
- starter message prompts
- offer messages
- accept/decline offer flow
- meetup messages
- seller-side mark-sold action
- message reporting
- unread state
- push-notification hooks
- database notifications

Relevant areas:

- `src/app/messages/page.tsx`
- `src/app/api/messages/route.ts`
- `src/app/api/messages/[id]/route.ts`
- `src/lib/data/supabaseDataAccess.ts`

## 1.5 Trust and moderation

Current functionality includes:

- GMU verification
- trust badges
- seller reputation score
- rating tags
- listing reports
- direct user reports
- user suspension
- listing moderation
- admin action logs

Relevant areas:

- `src/app/api/ratings/route.ts`
- `src/app/api/reports/*`
- `src/app/api/admin/*`
- `supabase/schema.sql`
- `supabase/schema-fixes.sql`

## 1.6 Notifications and PWA

The repository includes:

- notification rows in Postgres
- price-drop notifications
- message notifications
- offer notifications
- push subscriptions
- web push
- service worker
- PWA manifest

However, the repository itself notes that real VAPID keys still have to be configured for production push delivery.

The current service worker handles push and notification clicks. It does **not** provide a meaningful offline caching strategy, so Mason Market should be described as PWA-capable/installable rather than as a fully offline-capable application.

---

# 2. Immediate Findings That Matter More Than New Features

These are the issues I would address before broad user acquisition.

---

# P0-1. Remove and rotate the public admin test credential

## Finding

The public repository README publishes an admin test login with a plaintext password.

Because the repository is public, that password should be treated as compromised regardless of whether the account is only intended for demonstration.

## Why this matters

A public test credential can become dangerous when:

- the demo account is accidentally connected to production data
- the same password is reused elsewhere
- the account has admin privileges
- old deployments still accept it
- screenshots/search indexes preserve the credential even after later deletion

## Recommendation

Immediately:

1. Delete or rotate the exposed test/admin password.
2. Verify that the associated account cannot access production administration unless intentionally configured.
3. Remove plaintext passwords from `README.md`.
4. Put demo credentials in a private team document or use an intentionally low-privilege seeded demo environment.
5. Review Git history for other credentials.
6. Enable GitHub secret scanning / push protection if available.

**Priority: P0 / immediate**

---

# P0-2. Fix the database migration/deployment story

## Finding

The database is currently assembled from multiple manually run SQL files:

1. `schema.sql`
2. `schema-addons.sql`
3. `schema-security.sql`
4. `schema-fixes.sql`

But the README and deployment checklist do not consistently instruct a new deployment to run `schema-fixes.sql`.

That last file is not optional.

It:

- changes `reputation_score` from integer to numeric
- enables user-only reports
- creates an atomic reputation adjustment function
- adds `session_version`
- creates the session-version increment function

The file itself documents a prior defect where fractional reputation changes could fail.

## Why this matters

A fresh environment created from the public setup instructions can behave differently from the existing production database.

That creates:

- difficult-to-reproduce bugs
- schema drift
- security drift
- failed password-session invalidation
- broken reputation behavior
- production-only failures

## Recommendation

Replace the manual "run these SQL files in this order" model with real migrations.

Suggested structure:

```text
supabase/
  migrations/
    202603130001_initial_schema.sql
    202604010001_marketplace_addons.sql
    202605010001_security_hardening.sql
    202607010001_reputation_and_sessions.sql
```

Then:

- never modify a historical migration after it has shipped
- add new migrations for every schema change
- test migrations from an empty database
- document one command/process to reproduce the database
- add a migration smoke test to CI

**Priority: P0**

---

# P0-3. Add a first-class `transactions` table

This is the single biggest structural backend improvement.

## Current problem

Today, transaction state is spread across:

- a listing `status`
- offer messages
- meetup messages
- conversation state
- seller ratings

But there is no authoritative record answering:

> Who bought this item, for what agreed price, and was the transaction actually completed?

An accepted offer only changes the message's `offer_status`.

It does not atomically:

- reserve the listing
- assign the buyer
- store the agreed price
- create a transaction
- reject/expire competing offers
- link the later review to the completed exchange

## Why this matters

Without a transaction entity, Mason Market cannot reliably calculate:

- completed transactions
- true sold price
- conversion rate
- buyer/seller reliability
- no-show rate
- time from offer to completion
- verified reviews
- campus-level price history
- later AI pricing
- dispute history

## Recommended table

```sql
transactions (
  id                       text primary key,
  listing_id               text not null,
  seller_id                text not null,
  buyer_id                 text not null,
  accepted_offer_message_id text,
  asking_price             numeric(10,2) not null,
  agreed_price             numeric(10,2),
  status                   text not null,
  meetup_zone              text,
  meetup_time              timestamptz,
  seller_confirmed_at      timestamptz,
  buyer_confirmed_at       timestamptz,
  completed_at             timestamptz,
  cancelled_at             timestamptz,
  cancellation_reason      text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
)
```

Suggested statuses:

```text
initiated
reserved
meetup_scheduled
completed
cancelled
disputed
```

## Required behavior

When a seller accepts an offer:

**One backend transaction should:**

1. verify the offer is still pending
2. verify the listing is still available
3. mark the offer accepted
4. create a `transactions` row
5. assign buyer + seller
6. set the agreed price
7. set listing to reserved
8. expire/decline conflicting active offers as appropriate
9. create notifications
10. commit everything atomically

Do not implement these as a chain of unrelated HTTP calls from the browser.

Use a Postgres transaction/RPC or a server-side database transaction mechanism.

**Priority: P0**

---

# P0-4. Reviews must require a completed transaction

## Finding

The current rating route checks whether the buyer has messaged about the listing.

That means a person may become eligible to rate a seller without actually buying the item.

## Why this is a trust problem

A rating system is only valuable if users understand what it represents.

"Messaged seller once" is not strong evidence of:

- item quality
- meetup reliability
- transaction behavior
- seller honesty
- successful completion

## Recommendation

Change rating authorization to:

```text
transaction.status === "completed"
AND current user was one of the transaction participants
AND current user has not already reviewed this transaction
```

### Also change the relationship

Instead of:

```text
rating → listing
```

make the core relationship:

```text
rating → transaction
```

A listing can still be referenced for display, but the transaction should establish eligibility.

## Consider two-way reviews

Allow:

- buyer → seller
- seller → buyer

That creates a network-level reputation system rather than only seller reviews.

---

# P0-5. Redesign the reputation formula

## Current behavior

The code adjusts seller reputation by an amount based on:

```text
listing price / 10 × positive-or-negative rating
```

A high-price transaction therefore has dramatically more influence than a small transaction.

## Why I would change it

Trustworthiness is not proportional to product price.

A person successfully selling a $1,000 laptop is not automatically ten times more trustworthy than someone completing a $100 textbook transaction.

Likewise, a disputed expensive transaction should not immediately overwhelm an entire history.

## Better initial approach

Use transparent components:

- successful completed transactions
- positive review percentage
- negative review percentage
- review count
- response rate
- cancellation/no-show behavior
- account age

For the user-facing product, keep it simple:

> **Reliable trader**  
> 18 completed transactions  
> 96% positive

If you want a numeric score later, use a Bayesian/Wilson-style reputation model so low-volume accounts do not appear perfect from one transaction.

---

# P0-6. Stop hard-deleting listings and transaction evidence

## Finding

A seller can hard-delete a listing.

The schema uses cascading foreign keys from listings into:

- favorites
- messages
- conversations
- ratings
- reports

This means physical listing deletion can erase data that is valuable for:

- safety investigations
- transaction history
- user reputation
- moderation
- support
- dispute review

## Why this is serious

A marketplace should not allow a bad actor to remove the historical evidence related to their transaction simply by deleting the original listing.

## Recommendation

Move to soft deletion:

```sql
alter table listings
  add column deleted_at timestamptz,
  add column deleted_by text,
  add column delete_reason text;
```

Normal browse queries exclude soft-deleted rows.

The seller sees:

> Delete listing

but the backend records:

> `deleted_at = now()`

instead of physically destroying the row.

### Retention policy

Define a deliberate retention policy for:

- messages
- completed transactions
- ratings
- reports
- admin logs
- deleted listings
- images

Do not let cascade behavior decide the business policy accidentally.

**Priority: P0**

---

# P0-7. Fix the meetup-message type conversion bug

## Finding

`MessageType` supports:

```text
text
offer
meetup
```

The messages UI sends meetup messages and contains a specific meetup-card renderer.

However, the row converter in `src/lib/data/supabaseDataAccess.ts` maps:

```text
offer → offer
anything else → text
```

So a database row with `type = meetup` is converted to `text`.

## Expected consequence

Meetup messages can be stored with meetup fields but come back to the UI as normal text messages, preventing the intended meetup-card presentation and behavior.

## Fix

Use an explicit conversion:

```ts
const type =
  row.type === 'offer'
    ? 'offer'
    : row.type === 'meetup'
      ? 'meetup'
      : 'text'
```

Add regression tests covering:

- saving a meetup
- reading a meetup
- UI contract expecting `type === "meetup"`

**Priority: P0 / small fix**

---

# P0-8. Add blocking, not only reporting

## Current state

Reporting exists, including direct user reporting from a conversation.

That is good.

But the core trust flow should also allow a user to immediately stop interaction.

## Add

```sql
blocks (
  blocker_id text not null,
  blocked_id text not null,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
)
```

## Enforce it server-side

Before message creation:

```text
if sender blocked recipient OR recipient blocked sender:
    reject message
```

The backend must enforce this. Hiding a chat button in the browser is not sufficient.

Optional product behavior:

- remove blocked user's conversation from active inbox
- hide blocked user's future listings
- prevent seller from initiating replies after block
- retain past messages for reporting/support

**Priority: P0/P1**

---

# 3. Backend Scalability Review

The backend is suitable for a small campus MVP, but several patterns should be changed before meaningful scale.

---

# P1-1. Replace 2-second chat polling with Supabase Realtime

## Current behavior

The selected message thread is polled every 2 seconds while the browser tab is visible.

That feels near-realtime at low usage.

It is not an efficient real-time architecture.

### Rough load example

If 100 people have active chat tabs:

```text
100 active clients / 2 seconds = ~50 thread requests per second
```

That is before:

- inbox traffic
- listing traffic
- notifications
- auth/session DB checks
- unread calculations

## Recommendation

Use Supabase Realtime for new-message events.

Pattern:

1. load historical thread once
2. subscribe to new rows/events for the active conversation
3. append incoming messages
4. unsubscribe when leaving thread
5. keep push notifications for users who are not actively connected

Benefits:

- lower API traffic
- lower DB query traffic
- lower Vercel function usage
- faster message delivery
- cleaner typing/read-state features later

**Priority: P1**

---

# P1-2. Remove the inbox unread-count N+1 query

## Current behavior

The inbox loads conversations.

Then the backend computes an unread count separately for each conversation.

If a user has 30 conversations, the inbox can require roughly:

- one conversation query
- plus 30 unread-count queries
- plus related app work

## Better options

### Option A — maintain unread counters

Add authoritative unread counters per participant and update them atomically when messages arrive/read.

### Option B — one SQL/RPC aggregation

Return:

```text
conversation
last message
unread count
```

for all conversations in one database call.

### Recommended index

If unread count remains query-driven:

```sql
(conversation_id, to_user_id, created_at)
```

The current code already has a conversation table; use it as a real summary table rather than recomputing one property per row.

**Priority: P1**

---

# P1-3. Make message + conversation + notification updates consistent

## Current behavior

A message insert is authoritative.

Updating the conversation summary is described in the code as best-effort.

Notification creation is also performed separately.

This means a possible state exists where:

- message saved
- conversation summary failed
- inbox appears stale/missing
- notification failed

## Recommendation

For core transaction/message state, prefer one of:

### Database RPC transaction

One database function:

```text
create_message(...)
```

which:

- inserts message
- updates conversation
- updates unread count
- creates notification row

all in one transaction.

### Or an outbox model

If notifications must be asynchronous:

- core message transaction succeeds
- an `outbox_events` record is committed with it
- a worker delivers push/email
- failed external delivery can retry

Do not make the chat thread depend on a best-effort follow-up operation.

---

# P1-4. Replace the in-memory rate limiter

## Current behavior

`src/lib/rateLimit.ts` explicitly uses a process-local `Map`.

The code and deployment checklist both acknowledge that this is not global across serverless instances.

## Why it matters on Vercel

Different function instances do not share the same memory.

An attacker can receive different effective limits across instances.

The state also disappears with instance lifecycle.

## Recommendation

Use a shared store such as:

- Upstash Redis
- Vercel-compatible Redis/KV
- another centralized rate-limit backend

### Improve the key strategy

Campus Wi-Fi may place many users behind one public IP.

For authenticated mutation routes, use a combination such as:

```text
user_id + route class
```

and separately maintain:

```text
IP + abuse-sensitive route class
```

This avoids punishing an entire residence hall because students share NAT while still providing IP-based brute-force protection where appropriate.

**Priority: P1**

---

# P1-5. Fix seller listing-count retrieval

## Current behavior

When a listing detail is loaded, the route fetches all listings by that seller and filters them in application code just to calculate the seller's active listing count.

The source comment also says `users.listing_count` is not actually maintained.

## Recommendation

Choose one source of truth.

### Option A — query count

```text
SELECT count(*)
WHERE seller_id = ?
AND status != sold
AND moderation_state != hidden
```

### Option B — maintained statistic

Use database triggers to maintain `users.listing_count`.

For an MVP, Option A is simpler and harder to desynchronize.

Then remove the unused/dead counter if it has no purpose.

---

# P1-6. Move course filtering fully into Postgres

## Current behavior

Course-tag filtering loads up to a hard cap of rows and performs part of the matching in JavaScript.

The code explicitly notes that this is intended for campus-marketplace scale and not very large listing counts.

## Problem

At sufficient inventory volume:

- relevant results after the cap can disappear
- application memory/CPU rises
- pagination becomes less predictable

## Recommendation

Normalize searchable textbook/course data.

For example:

```text
course_code_normalized
```

and include it in:

- the search vector
- an indexed field
- trigram search where useful

Then keep filtering in the database.

---

# P1-7. Move from offset/page pagination to cursor pagination

## Current behavior

The API uses page numbers and ranges.

That is acceptable now.

As listings change while users browse, offset pagination can:

- skip rows
- duplicate rows
- become slower for deeper pages

## Recommendation

Use cursor/keyset pagination:

```text
(created_at, id)
```

Example cursor:

```json
{
  "createdAt": "2026-08-07T10:12:44Z",
  "id": "..."
}
```

Request:

```text
listings older than cursor
ORDER BY created_at DESC, id DESC
LIMIT 24
```

This also works naturally with infinite scroll if Mason Market later chooses to add it.

---

# P1-8. Treat uploaded images as managed resources

## Strength today

Image uploads already perform useful validation:

- only JPG/PNG/WebP
- 5 MB maximum
- file-signature checks
- maximum listing image count
- listing image URLs are restricted to the expected Supabase bucket

That is good.

## Missing lifecycle

Uploaded files can become orphaned when:

- upload succeeds but listing creation fails
- user uploads photos and leaves
- listing is deleted
- images are replaced on edit

## Recommendation

Add:

- object metadata table or deterministic storage IDs
- cleanup after listing edit/delete
- scheduled cleanup of unreferenced uploads
- thumbnail generation
- dimensions
- optimized formats
- image CDN transformations where available

Also consider a short-lived upload state:

```text
pending
attached
orphaned
```

---

# P1-9. Restrict profile images to Mason-controlled storage

## Current behavior

Listing images are strongly restricted.

Profile image updates, however, accept an arbitrary HTTP(S) URL.

## Why tighten it

External profile images create:

- privacy leakage to third-party hosts
- broken-image reliability issues
- arbitrary large image fetches
- difficult content moderation
- URL persistence outside Mason's control

## Recommendation

Use the same managed upload pattern for profile photos.

---

# P1-10. Do not depend on unawaited serverless work for important metrics

Listing detail triggers view-count increment without awaiting it.

In a traditional long-running server this often completes.

In serverless environments, work after a response lifecycle can be less predictable.

## Recommendation

Use:

- an awaited lightweight RPC
- a supported post-response primitive
- or batched analytics events

Also decide what a "view" means.

Avoid inflating view count from repeated refreshes by the same person if that number is later shown as marketplace demand.

---

# 4. Authentication and Security Architecture

---

# 4.1 What is good today

The session implementation contains several thoughtful safeguards:

- HMAC signatures
- timing-safe comparison
- production secret requirement
- session issue timestamp
- explicit expiry
- `HttpOnly`
- secure cookies in production
- `SameSite=Strict`
- version-based invalidation
- database user lookup during authenticated requests

The server-side Supabase service-role key is isolated to a server helper.

The database hardening script enables RLS on the tables while service-role API calls intentionally bypass it.

These are good foundations.

---

# 4.2 Main architectural risk: service-role API means route authorization is everything

All application database access goes through a service-role Supabase client.

That is a valid backend-for-frontend architecture.

But the service role bypasses RLS.

Therefore:

> A single API route that forgets an ownership/authorization check can have more impact than it would under user-scoped RLS.

## Recommendation

Centralize authorization helpers.

Instead of repeating patterns in each route, build:

```text
requireSession(request)
requireActiveUser(request)
requireAdmin(request)
requireListingOwner(request, listingId)
requireConversationParticipant(request, conversationId)
```

Each returns an authorized domain object or an error response.

Benefits:

- less duplicated auth logic
- fewer forgotten checks
- easier auditing
- easier tests

Keep route-level tests asserting that cross-user access fails.

---

# 4.3 Consider whether custom application sessions remain necessary long term

Mason Market currently combines:

- Supabase Auth
- custom Mason HMAC cookie

This works, but it means Mason maintains additional authentication logic.

There are two reasonable paths.

## Path A — keep it

If custom sessions provide product value, keep them but:

- centralize them
- document threat model
- monitor session failures
- rotate `SESSION_SECRET`
- test revocation
- add device/session management later

## Path B — use Supabase server-side auth sessions directly

This reduces custom security surface and can enable user-scoped RLS.

Do not migrate simply because "less custom code is always better." The current system is already reasonably hardened. Change only if the simplification is worth the migration cost.

---

# 4.4 Add defense-in-depth mutation origin validation

`SameSite=Strict` provides strong CSRF protection for the application cookie.

For additional defense in depth, mutation routes can validate:

- `Origin`
- expected host
- `Content-Type`

This is especially useful if future auth/session behavior changes.

---

# 4.5 Add account privacy lifecycle

Before public growth, Mason Market should visibly support:

- account deletion request
- data export/request
- notification preferences
- marketing opt-out
- privacy policy
- terms
- prohibited-item policy
- content/report retention policy

A student marketplace handles private messages and reputation data. That makes a documented data lifecycle important even before enterprise-level compliance work.

---

# 5. Rebuild the Transaction Loop Around Backend Truth

This is the product and engineering centerpiece.

---

## Current flow

```text
Listing
  ↓
Message
  ↓
Offer
  ↓
Accept/decline
  ↓
Reserved/sold manually
  ↓
Rating if buyer messaged
```

## Recommended flow

```text
Listing
  ↓
Message
  ↓
Offer
  ↓
Offer accepted
  ↓
Transaction created
  ↓
Listing reserved for that buyer
  ↓
Meetup scheduled
  ↓
Buyer + seller confirm exchange
  ↓
Transaction completed
  ↓
Review unlocked
  ↓
Reputation updated
```

This gives the application a reliable event chain.

---

# 5.1 Counteroffers

The current offer flow has accept/decline.

Add:

- counteroffer
- expiration
- offer withdrawn
- offer superseded

Do not model negotiation only as free-text chat.

A possible model:

```sql
offers (
  id,
  transaction_or_listing_id,
  buyer_id,
  seller_id,
  amount,
  status,
  parent_offer_id,
  expires_at,
  created_at
)
```

If you prefer to keep offers inside the messages table for now, at least support a chain relationship and enforce one active state.

---

# 5.2 Reserve for a specific buyer

A listing's current `reserved` status does not identify the intended buyer.

That is not enough for reliable transactions.

Reservation should come from the transaction:

```text
transaction.buyer_id = X
transaction.status = reserved
listing.status = reserved
```

Then the seller can:

- cancel reservation
- complete sale
- return to available

---

# 5.3 Complete transaction with confirmation

Do not use QR codes immediately unless testing shows users need them.

A simpler first version:

Seller:

> Mark exchange complete

Buyer receives:

> Did you receive the item?

Buyer:

> Confirm

Then:

```text
transaction.status = completed
```

Reviews unlock.

If only one side confirms, display a pending state.

Later, a QR meetup confirmation can be added if it materially reduces fraud/no-shows.

---

# 5.4 Improve meetup scheduling

The backend already has:

- meetup status
- meetup zone
- meetup time

The UI currently creates a basic meetup message using a default "tomorrow" time.

Turn this existing structure into a real workflow.

### UI

Choose:

- campus
- safe meetup location
- date
- time

Then:

> Propose meetup

Other user:

- Confirm
- Suggest another time
- Cancel

Then near the meeting:

- I'm on my way
- I'm here

This is much more defensible than simply adding another unrelated vertical.

---

# 6. Liquidity: The Actual Marketplace Growth Problem

Marketplace success depends on useful supply and demand matching.

The biggest failure mode is:

1. student hears about Mason Market
2. opens site
3. searches for something
4. sees nothing relevant
5. leaves
6. never develops a habit

Mason Market already contains two powerful building blocks:

- wanted listings
- saved searches

But they are not yet connected into a strong matching engine.

---

# P1-11. Turn Wanted into a real demand system

Today, `listing_kind = wanted` exists.

Use it actively.

Example:

> **Wanted: TI-84 Plus**  
> Budget: $50–70  
> Fairfax campus

Then show sellers:

> 7 Mason students are looking for calculators.

This can create supply that would never have been listed otherwise.

---

# P1-12. Match new sell listings to existing demand

When a listing is created:

```text
New TI-84 Plus — $55
```

match it against:

- wanted listings
- saved searches
- optionally category demand

Then notify relevant students:

> A new TI-84 matching your request was just listed for $55.

## Implementation

For the MVP, a server-side matcher or Supabase Edge Function is enough.

At larger scale, do not repeatedly scan every search against every listing.

Move toward normalized matching keys / event-driven processing.

---

# P1-13. Do not silently auto-save zero-result searches

## Current behavior

The home page automatically creates a saved search when:

- user is logged in
- typed search has zero results

That is clever in intent but risky in UX.

The saved-search table has no obvious unique constraint preventing duplicates for the same user/query/filter set.

A user repeatedly searching for the same missing item can accumulate duplicate saved searches.

The notification matching engine is also not yet complete.

## Better UX

When results are zero:

> No listings yet for "TI-84"

Then show:

> **Notify me when one is posted**

That creates explicit user intent.

Backend:

- canonicalize query/filter JSON
- unique on user + normalized search definition
- upsert instead of duplicate insert

---

# P1-14. External sharing should be a growth feature

Student marketplaces should exploit the networks students already use.

Add first-class share behavior for:

- iMessage/SMS
- GroupMe
- Discord
- Instagram
- Snapchat
- copy link

Provide strong Open Graph metadata:

```text
LG 27" Monitor — $100
GMU Fairfax
Mason Market
```

The goal is not to replace existing student group chats.

The goal is to make those group chats distribute Mason Market listings.

---

# 7. Product Backlog: What I Would Re-Prioritize

The repo's existing `FEATURES_TODO.md` marks items such as public comments/Q&A and swipeable image carousel as high impact.

I would change that priority.

---

## P0 — before a real campus push

| Item | Reason |
|---|---|
| Rotate/remove public admin credential | Security |
| Unify DB migrations | Environment correctness |
| Fix meetup type mapping | Current functionality bug |
| Add transaction entity | Core trust/data foundation |
| Gate ratings on completed transactions | Reputation integrity |
| Replace hard-delete with soft-delete/retention | Trust/safety evidence |
| Add user blocking | Immediate safety control |
| Make accepted offer reserve for a real buyer | Transaction integrity |
| Verify real VAPID configuration | Existing notification system should actually work |

---

## P1 — make Mason Market excellent at campus transactions

| Item | Reason |
|---|---|
| Supabase Realtime messaging | Eliminate heavy polling |
| One-query/maintained unread counts | Backend efficiency |
| Atomic message/conversation state | Reliability |
| Counteroffers | Complete negotiation loop |
| Real meetup scheduler | Campus-specific value |
| Completion confirmation | Verified transaction data |
| Wanted → sell matching | Liquidity |
| Saved-search match engine | Re-engagement |
| Share/OG optimization | Distribution |
| Shared Redis rate limiting | Production hardening |
| Cursor pagination | Scalability |
| DB-native course search | Scalability |
| Upload cleanup/optimization | Storage reliability |
| Structured logs + error monitoring | Operations |
| Product analytics | PMF measurement |
| CI pipeline | Engineering quality |
| E2E marketplace tests | Regression prevention |

---

## P2 — differentiation after marketplace usage exists

| Item | Recommendation |
|---|---|
| AI photo-to-listing | Useful convenience, but not a moat |
| Smart pricing | Build only from real transaction data |
| Demand heatmaps | Strong when real demand volume exists |
| Dorm/move-in bundles | Relevant campus-specific feature |
| Personalized recommendations | Useful after sufficient inventory |
| Reliable Trader badges | Derive from completed transactions |
| Rich safe-meetup experience | Expand after basic workflow is proven |
| Public listing Q&A | Later; adds moderation burden |
| Infinite scroll | UX polish, not business-critical |

---

## Not now

I would **not** prioritize:

- housing marketplace
- campus jobs marketplace
- broad services marketplace
- social feed
- follower system
- campus influencer profiles
- auctions
- integrated payments
- full AI campus assistant
- national university rollout

These add major surface area without solving Mason Market's core marketplace challenge.

---

# 8. Competitor Reality Check

The campus marketplace concept is validated, but it is not unique.

Current competitors and adjacent apps already advertise combinations of:

- university verification
- campus-only buying/selling
- services
- housing/subleases
- jobs
- wanted requests
- ratings
- reporting
- meetup coordination
- transaction tracking
- payments
- AI-assisted listing creation

Examples reviewed include:

- Unilist
- UniExchange
- Handoff
- UListed
- WIP Marketplace
- Quadsale
- Versa
- GathrU
- CampEx

## Important conclusion

### University verification is table stakes

Mason Market cannot rely on:

> "Only verified college students"

as its primary moat.

That remains an important trust feature, but competitors already make similar claims.

### AI listing generation is also not a moat

Some competitors already market AI-assisted listing workflows.

AI can still improve Mason Market, but it should be treated as:

> conversion / convenience infrastructure

not:

> the reason the startup wins.

### Payments are not a differentiator either

At least one campus competitor already advertises integrated payments.

Payments would introduce:

- disputes
- refunds
- chargebacks
- payout failures
- fraud
- compliance
- support overhead

For a campus MVP, letting users choose Venmo/Zelle/cash/etc. is reasonable.

---

# 9. The Strongest Positioning

Do not pitch the current product as:

> "Facebook Marketplace, but for college students."

Do not yet pitch it as:

> "The everything app for university life."

The strongest middle position is:

> **The trusted marketplace built around how students actually exchange things on campus.**

That supports concrete differentiation:

- verified campus identity
- campus-specific inventory
- wanted requests
- demand matching
- structured offers
- reserved buyer
- safe meetup locations
- transaction completion
- verified reviews
- local price history
- student-seasonality

---

# 10. Multi-University Architecture Must Be Designed Before Expansion

Mason Market currently hard-codes GMU-specific concepts in both product and backend.

Examples include:

- GMU email validator
- GMU verification language
- Fairfax / Arlington / Sci-Tech enums
- pickup-zone enums
- GMU naming in trust badges and copy

This is fine for proving the product at Mason.

It becomes technical debt before adding GWU, Virginia Tech, UVA, Maryland, etc.

---

# P1/P2. Normalize universities and campuses

Before opening a second university, move toward:

```sql
universities (
  id,
  slug,
  name,
  short_name,
  active
)

university_domains (
  university_id,
  domain
)

campuses (
  id,
  university_id,
  slug,
  name,
  latitude,
  longitude,
  active
)

pickup_zones (
  id,
  campus_id,
  name,
  safety_label,
  active
)
```

Then users:

```text
university_id
home_campus_id
```

Listings:

```text
university_id
campus_id
pickup_zone_id
```

## Verification

Replace:

```ts
isGmuEmail(email)
```

with a university/domain verifier:

```text
email domain → university
```

This allows:

- GMU
- GWU
- UVA
- Virginia Tech
- UMD
- future schools

without changing source-code enums for every expansion.

---

# 11. Seller Profile Snapshot Needs a Deliberate Policy

Listings store a JSON `seller_profile` snapshot.

That is convenient for rendering.

But it creates possible stale data.

If the seller later changes:

- name
- photo
- trust badge
- reputation
- verification status

old listings can continue displaying the older snapshot unless explicitly synchronized.

## Recommendation

Separate fields into two classes.

### Snapshot-friendly

- display name at listing creation, if desired
- historical image, if intentionally preserved

### Must be current

- account suspension
- verification
- current trust/reputation

For trust information, query current user data or maintain it through a deliberate sync process.

Do not let a listing permanently display a "trusted" badge after the user is suspended.

---

# 12. Observability Is the Biggest Missing Engineering Layer

The backend contains many `console.error` calls.

That is useful locally.

It is not enough for a real campus marketplace.

---

# P1-15. Add structured error monitoring

Use a service such as Sentry or another error/APM platform.

Capture:

- route
- request ID
- authenticated user ID hash/internal ID
- error class
- database error
- deployment version/commit
- latency
- environment

Do **not** log private message content unnecessarily.

---

# P1-16. Add product analytics events

The most useful events are not vanity clicks.

Track the marketplace funnel.

### Acquisition / activation

```text
signup_completed
verification_completed
first_search
first_listing_created
first_message_started
first_offer_sent
```

### Liquidity

```text
search_performed
search_zero_results
listing_viewed
listing_saved
wanted_created
seller_contacted
```

### Transaction funnel

```text
offer_sent
offer_countered
offer_accepted
listing_reserved
meetup_proposed
meetup_confirmed
transaction_completed
review_submitted
```

### Marketplace metrics

Measure:

- active sell listings by campus/category
- active wanted requests
- zero-result search rate
- search → listing-view rate
- listing-view → message rate
- listing-view → offer rate
- median time to first message
- offer acceptance rate
- accepted-offer → completed-transaction rate
- median time to sale
- completed transactions per active seller
- repeat buyer/seller rate

These tell you whether Mason Market actually works.

Downloads alone do not.

---

# 13. CI/CD and Test Strategy

## Strength today

The repository already contains tests for areas including:

- admin authorization
- build smoke checks
- listing validation
- listing routes
- marketplace features
- lifecycle behavior
- message authorization
- push behavior
- rate limiting
- session logic
- upload validation
- general validators

That is a good base.

## Missing visible layer

No `.github` workflow directory was visible in the current repository review.

So there is no visible GitHub Actions pipeline automatically enforcing the checks on every PR.

---

# P1-17. Add CI

Minimum workflow:

```text
npm ci
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Also add:

- migration smoke test
- dependency audit
- secret scanning / push protection where supported

---

# P1-18. Add E2E marketplace tests

Unit tests cannot validate the full transaction experience.

Use Playwright for critical flows:

### Buyer/seller flow

1. seller signs in
2. seller creates listing
3. buyer searches
4. buyer opens listing
5. buyer messages seller
6. buyer sends offer
7. seller accepts
8. listing becomes reserved for buyer
9. meetup scheduled
10. seller/buyer complete
11. rating unlocks

### Safety flow

1. user reports another user
2. admin reviews report
3. account suspended
4. suspended account cannot message/post
5. historical evidence remains

### Auth flow

1. non-university email rejected
2. unconfirmed email rejected
3. session invalidated after reset
4. cross-user ownership actions rejected

---

# 14. Documentation Drift

The repo documentation says one Next.js version while `package.json` currently declares a newer version.

This seems minor, but it is a signal that setup documentation can drift from implementation.

More importantly, the database setup instructions omit the later fix migration.

## Recommendation

Make the README generated/maintained from actual system facts where possible.

At minimum, add a release checklist:

- package/runtime versions verified
- migration list verified
- environment variables verified
- test account policy verified
- deployment smoke test run

---

# 15. Push Notifications

The code is already reasonably structured for web push.

It:

- stores push subscriptions
- sends push notifications
- removes expired/gone subscriptions
- handles notification click navigation

The main current operational gap is configuration.

## Recommendation

Before public launch:

- generate real VAPID keys
- store private key only server-side
- verify production domain/service-worker scope
- test iOS PWA behavior separately
- test permission denial/revocation
- make notification categories user-configurable

Suggested preferences:

```text
Messages
Offers
Meetups
Saved-search matches
Price drops
Listing expiry
Marketing
```

Marketing should remain separate from transactional notifications.

---

# 16. Search Improvements

The existing Postgres search is a good MVP choice.

Do not jump immediately to Elasticsearch/Algolia solely because the app is a marketplace.

Improve the current Postgres approach first.

## Recommended sequence

### Current

`tsvector` + filters

### Next

- weighted title > tags > description
- normalized course-code search
- trigram typo tolerance
- synonyms for common campus inventory
- exact category boosts

Example:

```text
"fridge"
```

could also recognize:

```text
mini fridge
mini-fridge
refrigerator
dorm fridge
```

### Later

Semantic search only if logs show users struggle with keyword retrieval.

Do not introduce a vector database merely because AI search is fashionable.

---

# 17. AI Roadmap — Objective Version

AI should improve conversion and marketplace efficiency.

It should not be the startup thesis.

---

## AI-1. Photo-to-listing assistant

After upload:

- suggest category
- suggest title
- draft description
- suggest condition questions
- suggest tags

Keep seller confirmation mandatory.

Useful because it reduces posting friction.

Competitors already have similar features, so it is not unique.

---

## AI-2. Price suggestions only after transaction data exists

Do not ask a general-purpose LLM to invent a campus price.

Once Mason Market has real completed transactions:

```text
Item/category
Condition
Campus
Season
Asking price
Accepted price
Days to sell
```

then show:

> Similar items at Mason recently completed between $45 and $65.

That is proprietary and useful.

---

## AI-3. Scam/risk assistance later

Start with deterministic rules:

- too many messages
- repeated external links
- account age
- duplicated images/listings
- abnormal posting volume
- repeated reports
- banned terms
- suspicious price outliers

Once Mason has labeled moderation data, an ML risk model can become meaningful.

Do not begin with a black-box "AI scam detector" that lacks training data.

---

# 18. What Not to Build Yet

---

## Housing

Housing is not just another category.

It requires:

- different filters
- addresses/maps
- availability dates
- leases
- deposits
- roommates
- higher fraud stakes
- different moderation
- possibly landlords/property managers

Prove the marketplace first.

---

## Jobs/services

A jobs or services marketplace has different:

- supply
- demand
- ranking
- trust
- transaction
- legal
- moderation

It does not automatically improve product-item liquidity.

---

## Integrated payments

Not yet.

Before Mason owns money movement, it needs:

- transaction truth
- dispute policy
- refund policy
- support operations
- fraud handling

The app can still structure the deal without processing payment.

---

## Social feed

A social feed creates an entirely new moderation and engagement problem.

Mason Market does not need to become:

```text
Reddit + Instagram + LinkedIn + Facebook Marketplace
```

to win.

---

# 19. Recommended Release Sequence

No dates are attached because the releases should depend on correctness, not an arbitrary calendar.

---

## Release A — Launch hardening

### Security / backend

- rotate/remove public test admin credential
- formalize Supabase migrations
- ensure security + fix migrations are applied
- fix meetup type mapping
- add shared authorization guards
- add block-user model
- configure real VAPID keys
- introduce centralized error monitoring
- add CI

### Product

- preserve current experience
- avoid broad new verticals

**Exit criteria:** existing marketplace is safe and reproducible.

---

## Release B — Trustworthy transaction loop

### Backend

- transactions table
- accepted-offer atomic workflow
- buyer-specific reservation
- completion confirmation
- rating eligibility from transaction
- two-way review model
- soft deletion + retention
- revised reputation model

### Product

- counteroffer
- transaction status UI
- clear reserved-for-you state
- completion confirmation
- verified review badge

**Exit criteria:** Mason Market can prove that a real campus transaction happened.

---

## Release C — Liquidity and return usage

### Backend

- wanted matching
- saved-search matching
- deduplicated saved-search definitions
- notification preference model

### Product

- "Notify me when available"
- wanted request improvements
- matching alerts
- better sharing
- move-in/move-out marketplace experiences

**Exit criteria:** users get value even when the exact item is not currently listed.

---

## Release D — Scale and operations

### Backend

- Supabase Realtime
- shared Redis rate limiting
- unread aggregation
- cursor pagination
- DB-native course search
- image cleanup/optimization
- product analytics
- performance monitoring

### Engineering

- E2E testing
- migration tests
- staging environment
- release checks

**Exit criteria:** architecture can handle meaningful campus usage without avoidable request/query explosion.

---

## Release E — Second-university readiness

### Backend/data model

- universities table
- email-domain table
- campuses table
- pickup-zone table
- university IDs on users/listings
- generic verification rules

### Product

- rebrand beyond "Mason" if desired
- campus selector only when necessary
- university-specific safe pickup locations

**Exit criteria:** adding another university is a configuration/data operation, not a source-code rewrite.

---

# 20. Suggested Backend Architecture After P1

```text
Browser / PWA
    |
    | HTTPS
    v
Next.js App Router / API
    |
    +--> Auth / authorization guards
    |
    +--> Domain services
    |      listings
    |      offers
    |      transactions
    |      messaging
    |      trust/safety
    |      notifications
    |
    +--> Supabase Postgres
    |      users
    |      universities
    |      campuses
    |      listings
    |      offers
    |      transactions
    |      messages
    |      conversations
    |      ratings
    |      reports
    |      saved_searches
    |      notifications
    |
    +--> Supabase Storage
    |      listing images
    |      profile images
    |
    +--> Supabase Realtime
    |      message events
    |      transaction updates
    |
    +--> Redis
    |      distributed rate limiting
    |      optional short-lived caches
    |
    +--> Error / performance monitoring
    |
    +--> Product analytics
```

---

# 21. Proposed Core Data Model

This is not a full migration, but it shows the entities Mason Market is missing.

```text
University
  1 ─── N Campus
  1 ─── N User
  1 ─── N Listing

Campus
  1 ─── N PickupZone

User
  1 ─── N Listing
  N ─── N User through Block
  1 ─── N Transaction as buyer
  1 ─── N Transaction as seller

Listing
  1 ─── N Offer
  1 ─── N Conversation
  1 ─── 0..N Transaction history

Transaction
  1 ─── N Review
  0..1 ─── Accepted Offer
  0..N ─── Meetup events

Conversation
  1 ─── N Message

SavedSearch
  N ─── matching engine ─── N Listing
```

---

# 22. Objective Feature Decisions

| Feature | Current decision | Reason |
|---|---|---|
| Offers | Keep + deepen | Already useful; needs transaction binding |
| Wanted listings | Keep + prioritize matching | Strong liquidity mechanism |
| Saved searches | Keep + finish notifications | Re-engagement |
| Price watches | Keep | Existing useful retention loop |
| Meetup | Keep + make real workflow | Campus-specific advantage |
| Ratings | Rebuild eligibility | Current trust semantics too weak |
| Manner temperature | Simplify | Price-weighted scoring is hard to justify |
| Public Q&A/comments | De-prioritize | Adds moderation, little core advantage |
| Infinite scroll | De-prioritize | Cosmetic compared with transaction integrity |
| Google login | Consider | Friction reduction if university domain remains verified |
| GPS campus detection | Low priority | Most users know their campus |
| AI listing generation | P2 | Convenience, not moat |
| AI pricing | Later | Needs real transaction data |
| AI fraud model | Later | Needs labeled data |
| Housing | Not now | Separate marketplace |
| Jobs | Not now | Separate marketplace |
| Services | Not now | Separate marketplace |
| Payments | Not now | Operational/compliance overhead |
| Social feed | Not now | Scope dilution |
| Native app | After usage signal | PWA is enough to validate flows initially |

---

# 23. Growth Case After These Changes

With the transaction/data foundation, Mason Market's pitch becomes stronger because it can demonstrate measurable campus liquidity rather than only a feature list.

The strongest evidence would be:

- number of active listings
- number of active wanted requests
- zero-result search rate decreasing
- median time to first seller response
- number of accepted offers
- percentage of accepted offers that complete
- median time to transaction
- repeat buyer rate
- repeat seller rate
- percentage of listings receiving at least one meaningful contact
- percentage of searches that lead to a conversation
- completed transactions per week on one campus

That is what would make a convincing case to:

- university partners
- accelerators
- potential cofounders
- investors
- students deciding whether the marketplace is active enough to use

---

# 24. What Would Create a Real Moat?

Not the code alone.

Not `.edu` verification.

Not AI.

Potential moat comes from four reinforcing assets.

## 1. Campus density

If Mason students know the active local inventory is on Mason Market, a clone is less useful because it starts empty.

## 2. Transaction reputation

A verified history of successful student-to-student transactions becomes hard to reproduce elsewhere.

## 3. Campus demand data

Mason can learn:

- what students want
- what sells
- when it sells
- typical campus price
- which categories go out of stock
- seasonal move-in/move-out patterns

## 4. University launch playbook

A repeatable process for getting enough sellers and buyers active at a new school is more defensible than a long feature list.

---

# 25. Final Prioritized Implementation Backlog

## P0 — correctness, trust, safety

1. Remove/rotate exposed public admin credential.
2. Convert SQL setup into proper ordered migrations.
3. Fix meetup message type conversion.
4. Add first-class `transactions`.
5. Make offer acceptance atomic with reservation/transaction creation.
6. Tie reservations to a buyer.
7. Require completed transaction before review.
8. Replace price-weighted reputation model.
9. Add two-way transaction reviews.
10. Change listing deletion to soft delete.
11. Preserve reports/messages/transaction evidence.
12. Add block-user backend enforcement.
13. Verify production RLS/security migration state.
14. Verify real VAPID push configuration.

## P1 — core product quality

15. Add counteroffers.
16. Build real meetup scheduling/rescheduling.
17. Add exchange-completion confirmation.
18. Add explicit "I'm on my way" / "I'm here" states.
19. Finish saved-search match notifications.
20. Connect wanted listings to matching notifications.
21. Deduplicate saved searches.
22. Replace silent zero-result autosave with explicit notify CTA.
23. Improve external sharing + Open Graph cards.
24. Add robust prohibited-item policy and moderation rules.

## P1 — backend scale/reliability

25. Replace 2-second polling with Supabase Realtime.
26. Eliminate per-conversation unread N+1 queries.
27. Make message/conversation updates atomic or use outbox events.
28. Add idempotency for message/offer/transaction actions.
29. Replace in-memory rate limiter with shared Redis.
30. Fix seller active-listing count query.
31. Move course matching entirely into Postgres.
32. Move to cursor pagination.
33. Add upload orphan cleanup.
34. Optimize/resize listing images.
35. Move profile images to controlled storage.
36. Add structured logs + error monitoring.
37. Add product analytics.
38. Add CI.
39. Add Playwright E2E tests.
40. Add migration smoke tests.

## P2 — expansion/differentiation

41. Normalize universities/domains/campuses/pickup zones.
42. Refactor GMU-specific auth into university configuration.
43. Add AI photo-to-listing assistant.
44. Build campus pricing recommendations from completed-sale data.
45. Add demand insights ("students are looking for...").
46. Add dorm/move-in bundles.
47. Add recommendation ranking based on real behavior.
48. Add reliable-trader badges from verified transactions.
49. Consider a native app only after usage supports the investment.

## Later / only after evidence

50. Housing.
51. Services.
52. Jobs.
53. Integrated payments.
54. Social/community feed.
55. Auctions.
56. Broader student super-app features.

---

# 26. Final Assessment

Mason Market is not missing dozens of basic marketplace features.

It already has a surprisingly broad MVP.

The biggest risk now is that the application looks more complete than the backend transaction model actually is.

That is fixable.

The most valuable next step is to turn the current set of loosely related marketplace actions into one trustworthy transaction system.

The strongest version of Mason Market is:

> **A verified campus marketplace where students can find what they need, signal demand when it is missing, negotiate, reserve an item, meet safely on campus, complete the exchange, and build real transaction reputation.**

If that experience becomes reliable at one university, then expansion into a broader student platform becomes an option.

If it does not become liquid and trustworthy at one university, adding housing, jobs, services, social feeds, or AI will not solve the core problem.

---

# Appendix A — Repository Areas Reviewed

The audit reviewed the current repository structure and representative implementation files including:

```text
README.md
package.json
DEPLOYMENT-CHECKLIST.md
FEATURES_TODO.md

src/app/
src/app/page.tsx
src/app/messages/page.tsx
src/app/api/listings/*
src/app/api/messages/*
src/app/api/auth/*
src/app/api/ratings/*
src/app/api/reports/*
src/app/api/saved-searches/*
src/app/api/upload/*
src/app/api/profile/*

src/lib/auth/*
src/lib/data/supabaseDataAccess.ts
src/lib/listingValidation.ts
src/lib/marketplaceLifecycle.ts
src/lib/pushNotification.ts
src/lib/rateLimit.ts
src/lib/supabase/server.ts
src/lib/types.ts
src/lib/uploadValidation.ts

supabase/schema.sql
supabase/schema-addons.sql
supabase/schema-security.sql
supabase/schema-fixes.sql

public/sw.js

src/__tests__/*
```

---

# Appendix B — Notable Strengths Worth Preserving

Do not throw away good work during refactors.

Preserve these ideas:

- centralized listing validation
- image magic-byte validation
- seller ownership checks
- suspended-account checks
- session invalidation
- timing-safe HMAC verification
- hidden-listing access controls
- Postgres full-text search
- DB indexes already present
- atomic view/reputation RPC direction
- admin activity logging
- safe pickup-zone domain model
- message recipient checks
- explicit offer-state validation
- price-drop notification hooks
- saved-search abstraction
- push subscription cleanup
- unit/security tests

The next architecture should **build on these**, not rewrite everything because a rewrite feels cleaner.

---

# Appendix C — Current Competitor Takeaways

The competitor scan was used for strategic prioritization, not to claim exact feature parity.

### Unilist
Current positioning includes a broad all-in-one campus product with marketplace, housing, rentals, services, jobs, requests, trust/review features, meetup proposals, deal tracking, and notifications.

**Lesson:** copying those categories does not differentiate Mason Market.

### Handoff
Markets a college-only marketplace with `.edu` verification, chat, and payments.

**Lesson:** verification + payments are not unique.

### WIP Marketplace / CampEx
Advertise AI-assisted listing behavior.

**Lesson:** AI listing generation can improve conversion but is unlikely to be a defensible moat.

### UniExchange / Versa / UListed / Quadsale / GathrU
All reinforce that student-only or campus-focused exchange is an active product category.

**Lesson:** the opportunity is execution, density, transaction trust, and campus-specific liquidity — not novelty of the basic idea.

---

# Bottom Line

### Keep

- marketplace focus
- wanted listings
- structured offers
- campus meetup concept
- price watches
- saved searches
- verification
- moderation
- PWA/web-first validation

### Fix first

- exposed credential
- migration consistency
- transaction source of truth
- review eligibility
- hard deletion
- meetup type bug
- blocking
- polling/N+1/rate limiting
- observability/CI

### Build next

- atomic reservation/transaction flow
- real meetup scheduling
- wanted/saved-search matching
- realtime messaging
- analytics
- multi-campus data model

### Avoid for now

- super-app scope
- housing/jobs/services
- payments
- social feed
- expensive AI features without data

That is the most defensible path from the current Mason Market repository to a stronger real-world product.
