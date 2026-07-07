# Karrot Parity Roadmap (Mason Market)

> Updated after a full-codebase audit — several items below were marked
> "Not started"/"Next" while already fully implemented, and this doc
> described a Firebase/Firestore backend that no longer exists. The app is
> 100% Supabase (Postgres + Supabase Auth + Supabase Storage).

## 1) Real auth stack parity
- Status: Done
- Supabase email/password auth on `/sign-in` and `/sign-up`, with 6-digit
  OTP email confirmation for sign-up
- Server verifies the Supabase session before issuing the app session cookie
- User profile is synced to the Postgres `users` table on sign-in/sign-up
- Password reset flow (`/forgot-password`, `/reset-password`), including
  global session invalidation on reset
- GMU-domain email enforcement (`@gmu.edu` / `@masonlive.gmu.edu`) is
  enforced both client- and server-side

## 2) Real persistent backend (products/users/messages/media)
- Status: Done
- Supabase Postgres backs all listing/user/message/report/rating data
  (`src/lib/data/supabaseDataAccess.ts`)
- Supabase Storage backs listing image uploads

## 3) Map + distance/radius discovery
- Status: Not started
- Next:
  - Add map view route/tab
  - Enable geolocation + radius filtering by pickup coordinates

## 4) Recent viewed history
- Status: Not started
- Next:
  - Track recent item views per user
  - Add `/recent` page

## 5) Buyer/seller transaction history
- Status: Partial
- Done:
  - Listing status lifecycle (available/reserved/sold)
- Next:
  - A dedicated transactions model + history page (currently only inferred
    from listing status + message threads, not tracked as its own record)

## 6) Post-transaction rating flow
- Status: Done (weaker gate than ideal)
- Done:
  - Buyer can rate a seller after messaging about a listing; updates the
    seller's manner-temperature score
- Known gap: rating is gated on "you messaged about this listing," not on
  a confirmed completed sale — a legitimate weaker proxy, not a bug

## 7) Chat depth parity
- Status: Done
- Done:
  - Listing-linked conversations and threads
  - Unread counts (computed live per-conversation, per-participant)
  - Offer / accept / decline flow
  - Meetup proposal flow
- Next:
  - Counter-offers (see FEATURES_TODO.md item 9)
