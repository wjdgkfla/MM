# Mason Market MVP Audit (Foundation)

## Scope
This audit focuses on making the current prototype structurally ready for MVP development, not adding advanced features.

## What Was Broken or Risky

### 1. Demo session/user logic duplicated
- `CURRENT_USER_ID` was hardcoded in multiple pages.
- Risk: easy drift and inconsistent behavior while iterating messaging.

### 2. GMU email validation duplicated
- Email check logic lived in API and UI separately.
- Risk: one side can diverge from the other.

### 3. Inbox conversation ordering bug
- `db.messages.getInboxByUser` deduplicated conversation rows before reliable ordering.
- Impact: inbox could show older message preview rather than latest for a thread.

### 4. Route/API coupling still simple but brittle
- UI fetches raw endpoints directly with inline logic.
- Not broken now, but a known growth pressure point.

## Minimal Refactors Applied

- Added `src/lib/config.ts` for shared app/session constants.
- Added `src/lib/validators.ts` for shared GMU email validation.
- Updated listing API and sell page to use shared validator.
- Updated item and messages pages to use shared demo user constant.
- Fixed inbox ordering behavior in `src/lib/db.ts`.

## What To Keep
- Next.js App Router structure in `src/app`.
- In-memory `db.ts` for MVP prototyping speed.
- Reusable UI components:
  - `ListingCard`, `StatusBadge`, `SellerTrustCard`, `SearchBar`, `CategoryFilter`.
- Core route set:
  - `/`, `/item/[id]`, `/sell`, `/saved`, `/messages`.
- Existing API surface:
  - `/api/listings`, `/api/listings/[id]`, `/api/messages`.

## What To Remove or Replace (Later, Not Now)
- Replace in-memory `db.ts` with a real persistence layer (SQLite/Postgres) in MVP phase 2.
- Replace demo user/session constant with real auth user context once GMU auth is introduced.
- Replace ad-hoc `fetch` calls with a tiny API client layer if pages become larger.

## Proposed Folder/File Structure (MVP-ready)

```
src/
  app/
    api/
      listings/
        route.ts
        [id]/route.ts
      messages/
        route.ts
    item/[id]/page.tsx
    messages/page.tsx
    saved/page.tsx
    sell/page.tsx
    page.tsx
  components/
    CategoryFilter.tsx
    Footer.tsx
    Header.tsx
    ListingCard.tsx
    SearchBar.tsx
    SellerTrustCard.tsx
    StatusBadge.tsx
  lib/
    config.ts
    db.ts
    types.ts
    useFavorites.ts
    validators.ts
docs/
  MVP_AUDIT.md
```

## Short Phased MVP Build Plan

### Phase 0: Foundation stabilization (now)
- Keep current architecture.
- Centralize constants/validators.
- Fix obvious data bugs.

### Phase 1: MVP completion
- Add lightweight API client helpers (`src/lib/api/*`) to reduce repeated fetch blocks.
- Add form/server validation parity checks for listing + message payloads.
- Add basic error states/toasts (non-blocking UX cleanup).

### Phase 2: Persistence and identity
- Swap `db.ts` with persistent storage.
- Introduce simple auth/session abstraction (still student-project scope).
- Keep APIs unchanged where possible to avoid front-end churn.

### Phase 3: Production hardening (after MVP)
- Access controls on listing status updates.
- Message thread pagination.
- Basic test coverage for API route behavior.
