# Mason Market

GMU-only student marketplace — buy and sell textbooks, electronics, furniture, and more on campus.

---

## Tech Stack

- **Next.js 14** (App Router, TypeScript)
- **Supabase** — Postgres database, Auth (email/password), Storage (images)
- **Tailwind CSS**

---

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/wjdgkfla/MM.git
cd MM
npm install
```

### 2. Create `.env.local`

Copy the example file and fill in the values:

```bash
cp .env.local.example .env.local
```

Then open `.env.local` and add the real values. **Get these from the project owner** (they are shared team secrets):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://fnunijtdaepvmetdabik.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ask team lead>
SUPABASE_SERVICE_ROLE_KEY=<ask team lead>
SESSION_SECRET=any-random-string-32-chars-or-more
```

> Generate a SESSION_SECRET with: `openssl rand -hex 32`  
> Or just use any long random string locally — it only needs to match in production.

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Test Accounts

| Email | Password | Role |
|---|---|---|
| `admin@gmu.edu` | `Mason@Market2025!` | Admin |

To create your own student account, sign up with any `@gmu.edu` or `@masonlive.gmu.edu` email via the Supabase dashboard (Authentication → Users → Add user → check "Auto Confirm User").

---

## Key Routes

| Route | Description |
|---|---|
| `/` | Browse listings feed |
| `/sell` | Post a new listing |
| `/item/[id]` | Listing detail, messaging, offers |
| `/messages` | Inbox / conversations |
| `/saved` | Saved listings |
| `/my-listings` | Manage your listings |
| `/seller/[id]` | Public seller profile + ratings |
| `/admin` | Admin moderation dashboard |
| `/sign-in` | Sign in |
| `/sign-up` | Create account |
| `/forgot-password` | Request password reset |

---

## Database

The Supabase schema is in `supabase/`. If you need to reset and recreate the database:

1. Run `supabase/schema.sql` in the Supabase SQL Editor
2. Run `supabase/schema-addons.sql` (RPC + DB constraints)
3. Run `supabase/schema-security.sql` (RLS + function security)

---

## Features

- **GMU-only auth** — only `@gmu.edu` / `@masonlive.gmu.edu` emails accepted
- **Listings** — post with photos, category, condition, pickup zone
- **Full-text search** — native Postgres `tsvector` search
- **Messaging** — conversation threads, offer cards (accept/decline)
- **Favorites** — save listings, public interest count (당근마켓-style)
- **Seller ratings** — manner temperature score + tags after transactions
- **Make an offer** — structured offer flow with seller accept/decline
- **Reports** — flag listings for moderation
- **Admin panel** — moderate listings, manage users, review reports
- **Rate limiting** — all API routes rate-limited per IP
- **HMAC session cookies** — signed and tamper-proof

---

## Build

```bash
npm run build
npm start
```
