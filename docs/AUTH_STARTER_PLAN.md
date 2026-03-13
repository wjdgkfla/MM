# Auth + GMU Access Starter Plan

## Goal
Prepare Mason Market for real authentication while keeping current implementation lightweight and replaceable.

## What is implemented now (starter)

- Session cookie-based mock auth (`sign-in`, `sign-up`, `sign-out`, `session` endpoints)
- GMU email restriction at auth entry points
- Protected actions gated in UI and API
- Clear handoff points for replacing mock auth with production auth

## Starter structure

### Auth domain

- `src/lib/auth/types.ts` - `AuthSession` shape
- `src/lib/auth/constants.ts` - cookie name
- `src/lib/auth/session.ts` - encode/decode/read/write session cookie helpers
- `src/lib/auth/useAuthSession.ts` - client hook for current session

### Auth routes

- `GET /api/auth/session` - return current session
- `POST /api/auth/sign-in` - GMU email sign in + session cookie
- `POST /api/auth/sign-up` - GMU email sign up stub + session cookie
- `POST /api/auth/sign-out` - clear session cookie

### Auth pages

- `/sign-in`
- `/sign-up`

### Reusable auth UI

- `src/components/AuthRequiredCard.tsx`

## Logged-out vs logged-in behavior

### Logged-out

- Can browse feed and item details
- Cannot post listings, message sellers, or use saved items
- Gets redirected/prompted to sign in/up for protected actions

### Logged-in (GMU session)

- Can post listings (`/sell`)
- Can open messaging (`/messages`, message seller CTA)
- Can save/unsave listings

## GMU-only enforcement points

### Client-side UX gates

- `/sell` page requires session
- `/messages` page requires session
- Save and message CTAs route to sign-in when no session

### Server-side enforcement (authoritative)

- `POST /api/listings`: requires valid session and GMU-verified email
- `POST /api/messages`: requires valid session
- `GET /api/messages` with `userId`: session must match requested user

## How to replace with production auth later

1. Replace `src/lib/auth/session.ts` cookie helpers with provider/session SDK integration.
2. Keep current API contracts and auth checks, but source user identity from real provider claims.
3. Persist user records and session metadata in DB.
4. Replace sign-up/sign-in stubs with real flows (passwordless, SSO, OAuth, etc.).

## Suggested production direction for GMU-only access

- Primary: `@gmu.edu` / `@masonlive.gmu.edu` domain checks at sign-in
- Optional hardening: email verification challenge + institutional SSO
- Store normalized domain verification state on user record
