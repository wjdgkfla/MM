# Mason Market Modern Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the entire Mason Market app to match the modern design handoff — Instrument Serif / IBM Plex Mono / Geist fonts, new `--m-*` CSS tokens, square listing cards, and redesigned layouts for every screen.

**Architecture:** Token-swap + component reskin only. All API routes, data access, auth, and business logic are untouched. Every change is confined to CSS variables, font loading, and the JSX/className layer of UI files.

**Tech Stack:** Next.js 14, React 18, Tailwind CSS v3, `next/font/google`, TypeScript

---

## File Map

| File | Action |
|------|--------|
| `src/app/globals.css` | Replace `--air-*`/`--mason-*` vars with `--m-*` tokens; update utility classes |
| `src/app/layout.tsx` | Load 3 fonts via `next/font/google`; expose as CSS vars on `<html>` |
| `src/components/Header.tsx` | Full reskin: dark M tile, pill search, nav underline, Sell CTA |
| `src/components/Footer.tsx` | Apply new tokens |
| `src/components/StatusBadge.tsx` | Update colors to new tokens |
| `src/components/TrustCues.tsx` | Apply new tokens |
| `src/components/AuthRequiredCard.tsx` | Apply new tokens |
| `src/components/SellerTrustCard.tsx` | Apply new tokens |
| `src/components/SellerRating.tsx` | Apply new tokens |
| `src/components/RatingForm.tsx` | Apply new tokens |
| `src/components/ListingCard.tsx` | Square photo, new type scale, saves/chats stats row |
| `src/components/CategoryFilter.tsx` | Pill chip style matching rail design |
| `src/app/page.tsx` | Sticky category rail, 4-col grid, sort select, meta row |
| `src/app/item/[id]/page.tsx` | 2-col layout with sticky buy column |
| `src/app/sell/page.tsx` | 3-step numbered card sections + live preview column |
| `src/app/messages/page.tsx` | Rounded container, redesigned bubble thread |
| `src/app/saved/page.tsx` | Instrument Serif H1, 4-col grid, new empty state |
| `src/app/my-listings/page.tsx` | New header, grid layout |
| `src/app/seller/[id]/page.tsx` | Apply new tokens |
| `src/app/sign-in/page.tsx` | Centered card, Instrument Serif heading |
| `src/app/sign-up/page.tsx` | Centered card, Instrument Serif heading |
| `src/app/admin/page.tsx` | Apply new tokens |
| `src/app/admin/AdminModerationClient.tsx` | Apply new tokens |

---

## Task 1: CSS tokens + utility classes (`globals.css`)

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace the entire file**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* Surfaces */
  --m-bg:        #FFFFFF;
  --m-soft:      #F6F6F4;
  --m-soft-warm: #F1F0EC;
  /* Ink */
  --m-ink:       #111111;
  --m-muted:     #767676;
  --m-line:      #EEEEEE;
  /* Brand */
  --m-green:     #006B3C;
  --m-green-soft:#E5EFE9;
  --m-pop:       #006B3C;
  --m-gold:      #C9A227;
  /* Radii */
  --r-pill: 9999px;
  --r-card: 12px;
  --r-md:   16px;
  --r-lg:   24px;
  --r-tile: 10px;
}

html, body {
  background: var(--m-bg);
  color: var(--m-ink);
}

body {
  font-family: var(--font-geist, system-ui, -apple-system, sans-serif);
  -webkit-font-smoothing: antialiased;
}

.font-display {
  font-family: var(--font-instrument-serif, Georgia, serif);
}

.font-mono-label {
  font-family: var(--font-ibm-plex-mono, ui-monospace, monospace);
}

@layer components {
  .ui-surface {
    @apply rounded-3xl border bg-white;
    border-color: var(--m-line);
  }

  .ui-input {
    @apply w-full rounded-2xl border bg-white px-4 py-3 text-sm transition-colors;
    border-color: var(--m-line);
    color: var(--m-ink);
    min-height: 48px;
  }

  .ui-input::placeholder {
    color: var(--m-muted);
  }

  .ui-input:focus {
    @apply outline-none;
    border-color: var(--m-ink);
  }

  .ui-btn-primary {
    @apply rounded-xl px-4 py-3 text-sm font-semibold text-white transition-opacity;
    background: var(--m-pop);
  }

  .ui-btn-primary:hover {
    opacity: 0.9;
  }

  .ui-btn-primary:disabled {
    @apply cursor-not-allowed opacity-60;
  }

  .ui-btn-secondary {
    @apply rounded-xl border bg-white px-4 py-3 text-sm font-medium transition-colors;
    border-color: var(--m-line);
    color: var(--m-ink);
  }

  .ui-btn-secondary:hover {
    background: var(--m-soft);
  }

  .ui-pill {
    @apply inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition-colors;
  }

  .ui-pill-neutral {
    background: var(--m-soft);
    color: var(--m-ink);
  }

  .ui-pill-neutral:hover {
    background: var(--m-soft-warm);
  }

  .ui-pill-active {
    background: var(--m-ink);
    color: #ffffff;
  }

  .ui-select-wrap {
    @apply relative;
  }

  .ui-select {
    @apply ui-input appearance-none pr-10;
  }

  .ui-select-icon {
    @apply pointer-events-none absolute right-3 top-1/2 -translate-y-1/2;
    color: var(--m-muted);
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  .tabular-nums { font-variant-numeric: tabular-nums; }
}
```

- [ ] **Step 2: Verify dev server still compiles**

```bash
npm run dev
```
Expected: no CSS errors, page loads (styling will look broken until Task 2).

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "style: replace CSS vars with --m-* design token set"
```

---

## Task 2: Font loading (`layout.tsx`)

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Replace layout.tsx**

```tsx
import type { Metadata, Viewport } from 'next'
import { Instrument_Serif, IBM_Plex_Mono, Geist } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
})

const instrumentSerif = Instrument_Serif({
  weight: ['400'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  display: 'swap',
})

const ibmPlexMono = IBM_Plex_Mono({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  manifest: '/manifest.json',
  title: 'Mason Market | Buy & Sell at George Mason University',
  description:
    'The trusted student marketplace for George Mason University. Buy and sell textbooks, electronics, furniture, and more — safely on campus.',
  metadataBase: new URL('https://mason-market.vercel.app'),
  openGraph: {
    title: 'Mason Market | GMU Student Marketplace',
    description:
      'Buy and sell textbooks, electronics, furniture, and more — safely on campus at George Mason University.',
    type: 'website',
    siteName: 'Mason Market',
  },
  twitter: {
    card: 'summary',
    title: 'Mason Market | GMU Student Marketplace',
    description:
      'Buy and sell textbooks, electronics, furniture, and more — safely on campus at GMU.',
  },
}

export const viewport: Viewport = {
  themeColor: '#006B3C',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${instrumentSerif.variable} ${ibmPlexMono.variable}`}
    >
      <body className="flex min-h-screen flex-col" style={{ background: 'var(--m-bg)', color: 'var(--m-ink)' }}>
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Verify fonts load**

Run `npm run dev`, open browser, open DevTools → Elements. The `<html>` tag should have three `--font-*` CSS variable classes. Body text should render in Geist (clean sans-serif, not system default).

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "style: load Geist, Instrument Serif, IBM Plex Mono via next/font/google"
```

---

## Task 3: Header component

**Files:**
- Modify: `src/components/Header.tsx`

- [ ] **Step 1: Replace Header.tsx**

```tsx
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuthSession } from '@/lib/auth/useAuthSession'

export function Header() {
  const { session } = useAuthSession()
  const pathname = usePathname()
  const router = useRouter()
  const [headerSearch, setHeaderSearch] = useState('')

  const handleSignOut = async () => {
    await fetch('/api/auth/sign-out', { method: 'POST' })
    window.location.href = '/'
  }

  const handleHeaderSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = headerSearch.trim()
    router.push(q ? `/?search=${encodeURIComponent(q)}` : '/')
    setHeaderSearch('')
  }

  const navLinks = [
    { href: '/', label: 'Browse' },
    { href: '/saved', label: 'Saved' },
    { href: '/messages', label: 'Messages' },
    { href: '/my-listings', label: 'My posts' },
  ]

  return (
    <header className="sticky top-0 z-30 border-b bg-[var(--m-bg)]/85 backdrop-blur-xl" style={{ borderColor: 'var(--m-line)' }}>
      <div className="mx-auto flex h-[68px] max-w-[1280px] items-center gap-4 px-6">

        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <div
            className="grid h-9 w-9 place-items-center font-display font-black text-white"
            style={{ background: 'var(--m-ink)', borderRadius: 'var(--r-tile)', fontSize: 18, lineHeight: 1 }}
          >
            M
          </div>
          <span className="font-display hidden text-[19px] font-black tracking-tight sm:block" style={{ color: 'var(--m-ink)' }}>
            Mason Market
          </span>
        </Link>

        {/* Search */}
        <form
          onSubmit={handleHeaderSearch}
          className="flex flex-1 max-w-[480px] items-center gap-2 h-11 rounded-full border bg-white px-4 transition-colors focus-within:border-[var(--m-ink)]"
          style={{ borderColor: 'var(--m-line)' }}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--m-muted)' }}>
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            value={headerSearch}
            onChange={(e) => setHeaderSearch(e.target.value)}
            placeholder="Search campus listings…"
            className="flex-1 bg-transparent text-[13px] outline-none"
            style={{ color: 'var(--m-ink)' }}
          />
        </form>

        {/* Nav — only when signed in */}
        {session && (
          <nav className="hidden lg:flex items-center gap-0.5">
            {navLinks.map((item) => {
              const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative flex h-9 items-center rounded-full px-3 text-[13px] font-semibold transition-colors"
                  style={{ color: active ? 'var(--m-ink)' : 'var(--m-muted)' }}
                >
                  {item.label}
                  {active && (
                    <span
                      className="absolute left-3 right-3 rounded-full"
                      style={{ bottom: -10, height: 3, background: 'var(--m-ink)' }}
                    />
                  )}
                </Link>
              )
            })}
          </nav>
        )}

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-2">
          {session ? (
            <>
              {session.role === 'admin' && (
                <Link
                  href="/admin"
                  className="hidden h-9 items-center rounded-full px-3 text-[13px] font-semibold lg:flex"
                  style={{ color: 'var(--m-muted)' }}
                >
                  Admin
                </Link>
              )}
              <Link
                href="/sell"
                className="flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: 'var(--m-pop)', borderRadius: 'var(--r-pill)' }}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Sell
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="hidden h-9 items-center rounded-full px-3 text-[13px] font-semibold transition-colors lg:flex"
                style={{ color: 'var(--m-muted)' }}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/sign-in?redirect=/"
              className="flex h-10 items-center rounded-full px-4 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--m-pop)' }}
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Visual check**

Run `npm run dev`. Header should show: dark M tile logo, search bar, green Sell pill. Nav underline should appear on the active route.

- [ ] **Step 3: Commit**

```bash
git add src/components/Header.tsx
git commit -m "style: redesign header with dark M tile, pill search, nav underline"
```

---

## Task 4: Footer + utility components

**Files:**
- Modify: `src/components/Footer.tsx`
- Modify: `src/components/StatusBadge.tsx`
- Modify: `src/components/TrustCues.tsx`
- Modify: `src/components/AuthRequiredCard.tsx`

- [ ] **Step 1: Update Footer.tsx** — replace hardcoded colors with token vars

Read current Footer.tsx and replace any `text-gray-*`, `border-gray-*`, `bg-gray-*` with token equivalents:
- `text-gray-500` / `text-gray-600` → `text-[var(--m-muted)]`
- `border-gray-200` → `border-[var(--m-line)]`
- `bg-gray-50` → `bg-[var(--m-soft)]`
- `text-[#006633]` → `text-[var(--m-green)]`

- [ ] **Step 2: Update StatusBadge.tsx**

```tsx
import { Listing } from '@/lib/types'

const BADGE_STYLES: Record<Listing['status'], string> = {
  available: 'bg-[var(--m-green-soft)] text-[var(--m-green)]',
  reserved:  'bg-amber-50 text-amber-700',
  sold:      'bg-[var(--m-soft)] text-[var(--m-muted)]',
}

const BADGE_LABELS: Record<Listing['status'], string> = {
  available: 'Available',
  reserved: 'Reserved',
  sold: 'Sold',
}

export function StatusBadge({ status }: { status: Listing['status'] }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${BADGE_STYLES[status]}`}>
      {BADGE_LABELS[status]}
    </span>
  )
}
```

- [ ] **Step 3: Update TrustCues.tsx** — replace hardcoded green/gray classes with `var(--m-green)` / `var(--m-muted)` / `var(--m-green-soft)` inline styles or token classes. No structural change.

- [ ] **Step 4: Update AuthRequiredCard.tsx** — replace `border-gray-200`, `text-gray-*`, `bg-[#006633]` with token vars. No structural change.

- [ ] **Step 5: Commit**

```bash
git add src/components/Footer.tsx src/components/StatusBadge.tsx src/components/TrustCues.tsx src/components/AuthRequiredCard.tsx
git commit -m "style: apply --m-* tokens to Footer, StatusBadge, TrustCues, AuthRequiredCard"
```

---

## Task 5: Seller components token pass

**Files:**
- Modify: `src/components/SellerTrustCard.tsx`
- Modify: `src/components/SellerRating.tsx`
- Modify: `src/components/RatingForm.tsx`

- [ ] **Step 1: In each file**, replace hardcoded color values:
  - `#006633` → `var(--m-green)`
  - `text-gray-500` / `text-gray-600` → `text-[var(--m-muted)]`
  - `border-gray-200` → `border-[var(--m-line)]`
  - `bg-gray-50` / `bg-gray-100` → `bg-[var(--m-soft)]`
  - `rounded-2xl` borders → keep rounded, just update colors
  - Gold star color → `var(--m-gold)`

No structural or functional changes — only className string updates.

- [ ] **Step 2: Commit**

```bash
git add src/components/SellerTrustCard.tsx src/components/SellerRating.tsx src/components/RatingForm.tsx
git commit -m "style: apply --m-* tokens to seller components"
```

---

## Task 6: ListingCard — square photo + new typography

**Files:**
- Modify: `src/components/ListingCard.tsx`

- [ ] **Step 1: Replace ListingCard.tsx**

```tsx
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Listing } from '@/lib/types'
import { PICKUP_ZONE_LABELS, LOCATION_LABELS } from '@/lib/types'
import { formatRecency } from '@/lib/time'

interface ListingCardProps {
  listing: Listing
  isSaved?: boolean
  onToggleSave?: (listingId: string) => void
}

const FALLBACK_IMAGE = '/listings/moving-boxes.svg'

export function ListingCard({ listing, isSaved = false, onToggleSave }: ListingCardProps) {
  const priceLabel = listing.price === 0 ? 'Free' : `$${listing.price}`
  const coverImage = listing.imageUrls[0] || FALLBACK_IMAGE

  return (
    <article
      className="cursor-pointer group"
      onClick={() => { window.location.href = `/item/${listing.id}` }}
    >
      {/* Square photo */}
      <div className="relative aspect-square overflow-hidden bg-[var(--m-soft)]" style={{ borderRadius: 'var(--r-card)' }}>
        <Image
          src={coverImage}
          alt={listing.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          unoptimized={coverImage.startsWith('data:')}
        />

        {/* Heart button */}
        {onToggleSave && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleSave(listing.id) }}
            aria-label={isSaved ? 'Unsave listing' : 'Save listing'}
            className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full transition-colors"
            style={{
              background: isSaved ? 'var(--m-pop)' : 'rgba(255,255,255,0)',
              color: isSaved ? '#fff' : '#fff',
            }}
          >
            <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
              <path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 0 0-7.1 7.1l8.8 8.9 8.8-8.9a5 5 0 0 0 0-7.1Z" />
            </svg>
          </button>
        )}

        {/* Reserved scrim */}
        {listing.status === 'reserved' && (
          <div className="absolute inset-0 grid place-items-center bg-black/45">
            <span className="rounded-full border border-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
              Reserved
            </span>
          </div>
        )}

        {/* Free tag */}
        {listing.price === 0 && listing.status !== 'reserved' && (
          <div className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white" style={{ background: 'var(--m-green)' }}>
            Free
          </div>
        )}
      </div>

      {/* Info below photo */}
      <Link href={`/item/${listing.id}`} className="block pt-3" onClick={(e) => e.stopPropagation()}>
        <p className="min-h-[2.6em] line-clamp-2 text-[13px] leading-snug" style={{ color: 'var(--m-ink)' }}>
          {listing.title}
        </p>
        <p className="mt-1 text-[15px] font-bold tabular-nums" style={{ color: 'var(--m-ink)' }}>
          {priceLabel}
        </p>
        <div className="mt-1 flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--m-muted)' }}>
          <span className="truncate">
            {LOCATION_LABELS[listing.campusLocation]} · {PICKUP_ZONE_LABELS[listing.pickupZone]}
          </span>
          <span>·</span>
          <span className="shrink-0">{formatRecency(listing.createdAt)}</span>
        </div>
        {(listing.favoriteCount > 0 || (listing.viewCount ?? 0) > 0) && (
          <div className="mt-1.5 flex items-center gap-2.5 text-[11px]" style={{ color: 'var(--m-muted)' }}>
            {listing.favoriteCount > 0 && (
              <span className="flex items-center gap-0.5">
                <svg viewBox="0 0 24 24" className="h-[11px] w-[11px]" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 0 0-7.1 7.1l8.8 8.9 8.8-8.9a5 5 0 0 0 0-7.1Z" />
                </svg>
                {listing.favoriteCount}
              </span>
            )}
            {(listing.viewCount ?? 0) > 0 && (
              <span>{listing.viewCount} views</span>
            )}
          </div>
        )}
      </Link>
    </article>
  )
}
```

- [ ] **Step 2: Visual check**

Open home feed. Cards should be square-cropped, clean minimal text below, no border/shadow frame around the card.

- [ ] **Step 3: Commit**

```bash
git add src/components/ListingCard.tsx
git commit -m "style: square listing cards with new typography scale and stats row"
```

---

## Task 7: CategoryFilter pill reskin

**Files:**
- Modify: `src/components/CategoryFilter.tsx`

- [ ] **Step 1: Replace pill button classes in CategoryFilter.tsx**

The active pill should use `bg-[var(--m-ink)] text-white border-[var(--m-ink)]`.
The inactive pill should use `bg-white text-[var(--m-ink)] border-[var(--m-line)] hover:border-[var(--m-ink)]`.
Both pills: `h-9 px-3.5 rounded-full border text-[13px] font-semibold transition shrink-0 inline-flex items-center gap-1.5`.

Read the current CategoryFilter.tsx and apply these class substitutions without changing any props or logic.

- [ ] **Step 2: Commit**

```bash
git add src/components/CategoryFilter.tsx
git commit -m "style: restyle category filter pills to match design rail"
```

---

## Task 8: Home feed page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update the outer wrapper and grid**

Find the listing grid container (currently `grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4`) and update to:
```tsx
<div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
```

- [ ] **Step 2: Add meta row above grid**

Before the grid, add:
```tsx
<div className="mb-5 flex items-baseline justify-between">
  <h2 className="text-[18px] font-bold tracking-tight" style={{ color: 'var(--m-ink)' }}>
    Listings near Fairfax
  </h2>
  <p className="text-[12px]" style={{ color: 'var(--m-muted)' }}>
    {listings.length} items
  </p>
</div>
```

- [ ] **Step 3: Update page wrapper max-width and padding**

Change outer page div from `max-w-6xl` to `max-w-[1280px]` and padding to `px-6`.

- [ ] **Step 4: Update filter/search section background**

The sticky category section (if any) should use `bg-[var(--m-bg)]/95 backdrop-blur border-b` with `border-[var(--m-line)]`.

- [ ] **Step 5: Replace hardcoded green/gray colors** in the page with token vars (`var(--m-green)`, `var(--m-muted)`, `var(--m-line)`, `var(--m-soft)`).

- [ ] **Step 6: Visual check**

4-column grid on desktop, meta row visible, category pills styled correctly.

- [ ] **Step 7: Commit**

```bash
git add src/app/page.tsx
git commit -m "style: 4-col grid, meta row, token colors on home feed"
```

---

## Task 9: Item detail page

**Files:**
- Modify: `src/app/item/[id]/page.tsx`

- [ ] **Step 1: Update outer layout to 2-column**

Find the main grid container and change to:
```tsx
<div className="grid gap-6 lg:grid-cols-[1.15fr_400px] lg:gap-10">
```

- [ ] **Step 2: Apply Instrument Serif to listing title**

```tsx
<h1 className="font-display text-[26px] font-black leading-tight text-[var(--m-ink)]">
  {listing.title}
</h1>
```

- [ ] **Step 3: Update price display**

```tsx
<p className="font-display font-black text-[52px] leading-none tabular-nums" style={{ color: 'var(--m-ink)' }}>
  {priceLabel}
</p>
```

- [ ] **Step 4: Make right column sticky**

Wrap the right column content in:
```tsx
<div className="sticky top-[88px] space-y-3">
  {/* existing right column content */}
</div>
```

- [ ] **Step 5: Update buy column card**

Wrap right column in a white card:
```tsx
<div className="rounded-[var(--r-lg)] border bg-white p-6" style={{ borderColor: 'var(--m-line)' }}>
  {/* price, title, CTA buttons, seller block */}
</div>
```

- [ ] **Step 6: Update CTA buttons**

Primary chat button:
```tsx
<button className="w-full h-12 rounded-2xl text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
  style={{ background: 'var(--m-ink)' }}>
  Chat with seller
</button>
```

- [ ] **Step 7: Pickup zone card (green)**

```tsx
<div className="rounded-[var(--r-lg)] p-5 text-white relative overflow-hidden" style={{ background: 'var(--m-green)' }}>
  <p className="font-mono-label text-[10px] uppercase tracking-[0.16em] opacity-80">Pickup zone</p>
  <p className="font-display text-[20px] font-black mt-0.5">{PICKUP_ZONE_LABELS[listing.pickupZone]}</p>
  <p className="text-[12px] opacity-90 mt-1">{listing.pickupNotes}</p>
</div>
```

- [ ] **Step 8: Replace all remaining hardcoded color strings**

`text-[#006633]` → `text-[var(--m-green)]`
`bg-[#006633]` → `bg-[var(--m-pop)]`
`border-gray-200` → `border-[var(--m-line)]`
`text-gray-500` / `text-gray-600` → `text-[var(--m-muted)]`
`bg-gray-50` / `bg-gray-100` → `bg-[var(--m-soft)]`

- [ ] **Step 9: Visual check**

Desktop: 2-column layout with sticky buy column on the right. Price in large Instrument Serif. Green pickup card.

- [ ] **Step 10: Commit**

```bash
git add src/app/item/[id]/page.tsx
git commit -m "style: 2-col item detail with sticky buy column, display price, green pickup card"
```

---

## Task 10: Sell page

**Files:**
- Modify: `src/app/sell/page.tsx`

- [ ] **Step 1: Update outer layout to 2-column**

```tsx
<div className="max-w-[1280px] mx-auto px-6 py-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
```

- [ ] **Step 2: Add Instrument Serif H1**

```tsx
<h1 className="font-display text-[44px] font-black leading-[0.98] mt-2" style={{ color: 'var(--m-ink)' }}>
  Post something<br />worth keeping.
</h1>
```

- [ ] **Step 3: Wrap each form section in a numbered white card**

Each of the 3 sections (photos, basics, pickup) gets:
```tsx
<section className="rounded-[var(--r-lg)] border bg-white p-6" style={{ borderColor: 'var(--m-line)' }}>
  <div className="mb-4 flex items-center gap-2">
    <span className="grid h-6 w-6 place-items-center rounded-full font-mono-label text-[10px] font-bold text-white"
      style={{ background: 'var(--m-ink)' }}>
      1 {/* change to 2, 3 for subsequent sections */}
    </span>
    <p className="font-display text-[20px] font-black">Photos</p>
  </div>
  {/* section content */}
</section>
```

- [ ] **Step 4: Add sticky live preview column**

After the form column, add a sticky right column:
```tsx
<div className="hidden lg:block">
  <div className="sticky top-[88px]">
    <p className="font-mono-label text-[10px] uppercase tracking-[0.18em] mb-3" style={{ color: 'var(--m-muted)' }}>
      Live preview
    </p>
    {/* A simplified preview card showing title, price, zone from form state */}
    <div className="rounded-[var(--r-lg)] border bg-white p-4" style={{ borderColor: 'var(--m-line)' }}>
      <div className="aspect-square rounded-xl bg-[var(--m-soft)]" />
      <p className="font-display font-black text-[26px] mt-3 tabular-nums" style={{ color: 'var(--m-ink)' }}>
        {form.price ? (form.price === '0' ? 'Free' : `$${form.price}`) : '—'}
      </p>
      <p className="text-[13px] font-semibold mt-1 line-clamp-2 min-h-[2.4em]" style={{ color: form.title ? 'var(--m-ink)' : 'var(--m-muted)' }}>
        {form.title || 'Your title shows here'}
      </p>
    </div>
  </div>
</div>
```

- [ ] **Step 5: Update submit button**

```tsx
<button type="submit" disabled={submitting} className="w-full h-14 rounded-2xl text-white font-bold text-[15px] flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
  style={{ background: 'var(--m-pop)' }}>
  {submitting ? 'Posting…' : 'Post listing →'}
</button>
```

- [ ] **Step 6: Replace all hardcoded color strings** with token vars (same substitution rules as Task 9).

- [ ] **Step 7: Commit**

```bash
git add src/app/sell/page.tsx
git commit -m "style: sell page with numbered card sections, live preview column, display H1"
```

---

## Task 11: Messages page

**Files:**
- Modify: `src/app/messages/page.tsx`

- [ ] **Step 1: Update page header**

```tsx
<h1 className="font-display text-[36px] font-black mb-1" style={{ color: 'var(--m-ink)' }}>Messages</h1>
```

- [ ] **Step 2: Wrap conversation pane in rounded-3xl card**

Change the grid container:
```tsx
<div className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr] overflow-hidden rounded-[var(--r-lg)] border" style={{ borderColor: 'var(--m-line)', minHeight: 560 }}>
```

- [ ] **Step 3: Update conversation list sidebar**

```tsx
<aside className="border-r bg-white" style={{ borderColor: 'var(--m-line)' }}>
```

- [ ] **Step 4: Update chat bubbles**

Self messages (fromCurrentUser):
```tsx
className="ml-auto max-w-[60%] rounded-[20px] rounded-br-[6px] px-4 py-2.5 text-[13.5px] leading-snug text-white"
style={{ background: 'var(--m-ink)' }}
```

Peer messages:
```tsx
className="mr-auto max-w-[60%] rounded-[20px] rounded-bl-[6px] border bg-white px-4 py-2.5 text-[13.5px] leading-snug"
style={{ borderColor: 'var(--m-line)', color: 'var(--m-ink)' }}
```

- [ ] **Step 5: Update offer bubble**

```tsx
<div className="rounded-2xl border-2 p-4" style={{ borderColor: 'var(--m-gold)', background: 'var(--m-soft-warm)' }}>
  <p className="font-mono-label text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--m-muted)' }}>Offer</p>
  <p className="font-display font-black text-[28px] tabular-nums mt-1">${message.offerAmount}</p>
```

- [ ] **Step 6: Replace remaining hardcoded color strings** with token vars.

- [ ] **Step 7: Commit**

```bash
git add src/app/messages/page.tsx
git commit -m "style: messages with display heading, rounded card, ink/white bubbles, gold offer card"
```

---

## Task 12: Saved page

**Files:**
- Modify: `src/app/saved/page.tsx`

- [ ] **Step 1: Update heading**

```tsx
<div>
  <h1 className="font-display text-[36px] font-black" style={{ color: 'var(--m-ink)' }}>Saved finds</h1>
  <p className="mt-1 text-[13px]" style={{ color: 'var(--m-muted)' }}>
    {savedListings.length} items · we'll alert you if prices drop
  </p>
</div>
```

- [ ] **Step 2: Update grid columns**

```tsx
<div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
```

- [ ] **Step 3: Update empty state**

```tsx
<div className="mt-12 rounded-[var(--r-lg)] border p-16 text-center max-w-[480px] mx-auto" style={{ borderColor: 'var(--m-line)' }}>
  <svg viewBox="0 0 24 24" className="mx-auto h-9 w-9 mb-3" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ color: 'var(--m-pop)' }}>
    <path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 0 0-7.1 7.1l8.8 8.9 8.8-8.9a5 5 0 0 0 0-7.1Z" />
  </svg>
  <p className="font-display text-[24px] font-black" style={{ color: 'var(--m-ink)' }}>Nothing saved yet</p>
  <p className="mt-1 text-[13px]" style={{ color: 'var(--m-muted)' }}>Tap the heart on a listing to save it here.</p>
  <Link href="/" className="mt-5 inline-flex h-11 items-center rounded-full px-6 text-[13px] font-bold text-white" style={{ background: 'var(--m-pop)' }}>
    Browse feed
  </Link>
</div>
```

- [ ] **Step 4: Replace remaining hardcoded color strings** with token vars.

- [ ] **Step 5: Commit**

```bash
git add src/app/saved/page.tsx
git commit -m "style: saved page with display heading, 4-col grid, new empty state"
```

---

## Task 13: My Listings page

**Files:**
- Modify: `src/app/my-listings/page.tsx`

- [ ] **Step 1: Update page heading**

```tsx
<h1 className="font-display text-[36px] font-black" style={{ color: 'var(--m-ink)' }}>My posts</h1>
```

- [ ] **Step 2: Restyle listing rows**

My listings uses a row-style layout (not grid cards). Update each listing row:
- Container: `rounded-[var(--r-lg)] border bg-white p-4 flex gap-4` with `borderColor: 'var(--m-line)'`
- Title: `text-[14px] font-semibold` in `var(--m-ink)`
- Price: `font-bold tabular-nums` in `var(--m-ink)`
- Status badge uses updated `StatusBadge` component from Task 4
- Action buttons: use `ui-btn-secondary` class (already updated in Task 1)

- [ ] **Step 3: Replace remaining hardcoded color strings** with token vars.

- [ ] **Step 4: Commit**

```bash
git add src/app/my-listings/page.tsx
git commit -m "style: my listings page with display heading and token colors"
```

---

## Task 14: Seller profile page

**Files:**
- Modify: `src/app/seller/[id]/page.tsx`

- [ ] **Step 1: Update heading area**

```tsx
<h1 className="font-display text-[32px] font-black" style={{ color: 'var(--m-ink)' }}>
  {seller.displayName}
</h1>
```

- [ ] **Step 2: Replace all hardcoded color strings** with token vars using the same substitution rules from Task 9.

- [ ] **Step 3: Commit**

```bash
git add src/app/seller/[id]/page.tsx
git commit -m "style: seller profile page token color pass"
```

---

## Task 15: Auth pages (sign-in + sign-up)

**Files:**
- Modify: `src/app/sign-in/page.tsx`
- Modify: `src/app/sign-up/page.tsx`

- [ ] **Step 1: Update sign-in page layout**

Wrap form in a centered card:
```tsx
<div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
  <div className="w-full max-w-[400px] rounded-[var(--r-lg)] border bg-white p-8" style={{ borderColor: 'var(--m-line)' }}>
    <h1 className="font-display text-[32px] font-black" style={{ color: 'var(--m-ink)' }}>Sign in</h1>
    <p className="mt-1 text-[13px]" style={{ color: 'var(--m-muted)' }}>
      Use your GMU email to access Mason Market.
    </p>
    {/* existing form fields below, keep all logic intact */}
  </div>
</div>
```

- [ ] **Step 2: Apply same centered card layout to sign-up page** with heading "Create account".

- [ ] **Step 3: Replace hardcoded color strings** in both pages with token vars. Ensure submit buttons use `ui-btn-primary`.

- [ ] **Step 4: Commit**

```bash
git add src/app/sign-in/page.tsx src/app/sign-up/page.tsx
git commit -m "style: centered card auth pages with display heading"
```

---

## Task 16: Admin panel

**Files:**
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/admin/AdminModerationClient.tsx`

- [ ] **Step 1: Update admin page heading**

```tsx
<h1 className="font-display text-[32px] font-black" style={{ color: 'var(--m-ink)' }}>Admin</h1>
```

- [ ] **Step 2: Replace hardcoded color strings** in both files with token vars:
  - `text-[#006633]` / `bg-[#006633]` → token vars
  - `border-gray-200` → `border-[var(--m-line)]`
  - `bg-gray-50` / `bg-gray-100` → `bg-[var(--m-soft)]`
  - `text-gray-500` / `text-gray-600` → `text-[var(--m-muted)]`

No structural changes — admin table/card layout stays as-is.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/page.tsx src/app/admin/AdminModerationClient.tsx
git commit -m "style: admin panel token color pass"
```

---

## Task 17: My Listings edit page + error/not-found pages

**Files:**
- Modify: `src/app/my-listings/[id]/edit/page.tsx`
- Modify: `src/app/error.tsx`
- Modify: `src/app/not-found.tsx`

- [ ] **Step 1: Edit page** — apply same centered/card pattern as sell page. Replace hardcoded colors with token vars.

- [ ] **Step 2: error.tsx and not-found.tsx** — replace hardcoded color strings with token vars. Add `font-display` class to H1 headings.

- [ ] **Step 3: Commit**

```bash
git add src/app/my-listings/[id]/edit/page.tsx src/app/error.tsx src/app/not-found.tsx
git commit -m "style: token pass on edit, error, and not-found pages"
```

---

## Task 18: Final verification

- [ ] **Step 1: Build check**

```bash
npm run build
```

Expected: successful build, no TypeScript errors.

- [ ] **Step 2: Visual walkthrough** — open `npm run dev` and visit each route:

| Route | What to verify |
|-------|----------------|
| `/` | 4-col square-card grid, category pills, Geist body font |
| `/item/[id]` | 2-col layout, Instrument Serif title + 52px price, sticky buy column, green pickup card |
| `/sell` | Numbered card sections, live preview right column |
| `/messages` | Rounded card container, ink/white bubbles |
| `/saved` | Display heading, 4-col grid, new empty state |
| `/my-listings` | Display heading, token colors |
| `/sign-in` | Centered card, display heading |
| `/admin` | Token colors applied |

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "style: mason market modern redesign — complete"
```
