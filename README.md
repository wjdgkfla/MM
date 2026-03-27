# Mason Market (GMU Student Marketplace)

Campus-focused marketplace inspired by Karrot/Facebook Marketplace, built specifically for George Mason University students.

This project is currently an MVP with mock/in-memory persistence and a database-ready data access layer.

## Current MVP Status

### Core Marketplace
- Browse feed with realistic GMU listings
- Search + practical filters (category, condition, price, status, campus/pickup, free-only, sort)
- Listing detail page with trust cues, seller summary, and save/message actions
- Create listing flow (`/sell`) with validation, image preview upload (local/mock), and redirect to item detail
- Edit/manage listings (`/my-listings`, `/my-listings/[id]/edit`)
- Listing lifecycle: available/reserved/sold/relist + archive/delete

### GMU Trust Layer
- GMU verification placeholders
- Campus/pickup zone clarity
- Seller trust badges + recently active cues
- Seller profile page (`/seller/[id]`) with active listings + trust snapshot

### Saved + Messaging
- Saved items via local storage (session-scoped keying by user id)
- Inbox/conversation UI scaffold (`/messages`)
- Message composer and listing-linked conversation flow (non-realtime starter architecture)

### Reporting + Moderation
- Listing detail report action with reasons:
  - spam
  - scam concern
  - prohibited item
  - misleading description
  - harassment
  - duplicate listing
- Optional “report seller” toggle in report form
- Admin moderation dashboard (`/admin`) sections:
  - Overview
  - Listings
  - Users
  - Reports
  - Activity
- Admin actions:
  - hide/flag/remove listings
  - change listing status
  - promote/remove admin
  - suspend/activate user
  - update report resolution
- Activity log records admin moderation actions

### Textbook-Specific UX
- Optional textbook fields:
  - `courseCode`
  - `professorName`
  - `edition`
  - `bundleNotes`
- Fields shown only when category is `textbooks`
- Displayed on item detail when present

## Important Accounts

- Admin: `admin@gmu.edu`
- Sign-in/sign-up now use Firebase email/password auth
- Suspended users are blocked from signing in

## Key Routes

- `/` browse feed
- `/item/[id]` listing detail
- `/sell` create listing
- `/saved` saved listings
- `/messages` conversations
- `/my-listings` seller listing management
- `/my-listings/[id]/edit` edit listing
- `/seller/[id]` seller trust/profile
- `/admin` moderation dashboard
- `/sign-in`, `/sign-up` auth starter pages

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- In-memory mock DB + DAL abstraction (`src/lib/data/*`) for future DB migration
- Firebase Admin SDK (enabled for real user tracking when env vars are set)

## Firebase User Tracking Setup

Mason Market now syncs signed-in users to Firestore (`users` collection) from the auth routes.

Add these values in `.env.local`:

```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
NEXT_PUBLIC_FIREBASE_API_KEY=your-web-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-web-app-id
```

You can copy from `.env.local.example` as a starting template.

Alternative (easier): place your downloaded Firebase service account key at project root as:

```bash
firebase-service-account.json
```

The app now supports either `.env.local` OR `firebase-service-account.json` for Firebase Admin auth.

Notes:
- Keep `FIREBASE_PRIVATE_KEY` quoted and include `\n` newlines exactly as shown.
- If these env vars are missing, the app safely falls back to local mock persistence for auth/session behavior.
- Firestore users are written with `id`, `email`, `displayName`, `role`, `gmuEmailVerified`, `updatedAt`, `lastSignInAt`.
- In Firebase Console, enable `Authentication -> Email/Password`.

### One-click seed to Firestore

After signing in as admin (`admin@gmu.edu` in demo mode), go to `/admin` and click `Seed Firebase Data`.

Use `Check Firebase Status` first to verify env vars + Firestore connection.

This writes/merges current Mason Market data into Firestore collections:
- `users`
- `listings`
- `messages`
- `reports`
- `adminActivity`

## Local Setup

### Prerequisites
- Node.js 18+
- npm

### Run Dev
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build
```bash
npm run build
npm start
```

## What Changed Recently (Summary)

- Added seller listing management flows and seller-only controls
- Added reporting system and report storage model
- Upgraded admin from summary page to actionable moderation workspace
- Added seller profile pages for trust and seller listing discovery
- Added textbook/course-material specific metadata and conditional form/display UX
- Fixed `/saved` runtime hook-order bug

## Known Gaps (Next Step Candidates)

- Real authentication/session backend (GMU SSO or provider)
- Real DB persistence (listings/users/favorites/conversations/messages/reports/activity)
- Real image storage
- Realtime messaging
- Dedicated course-code filter UI (current search already matches textbook metadata)

## License

MIT
