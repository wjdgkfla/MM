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

## Important Accounts (Mock Auth)

- Admin: `admin@gmu.edu`
- Sign-in uses GMU email stub flow (no password yet)
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
