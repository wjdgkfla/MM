# Mason Market Feedback Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address 13 teammate feedback items covering animation, search reactivity, sell form UX, pickup zones, sort options, messaging, manner temperature, draft saving, and demand signals.

**Architecture:** Mostly surgical edits to existing client components and API routes. The biggest structural change is converting `page.tsx` to use Next.js `useSearchParams()` (wrapped in Suspense) so URL-driven navigation (hero chips, seasonal ribbon, browser history) triggers live re-fetches. The manner temperature system reuses the existing `reputation_score` DB column as a delta from 36.5°, updated whenever a rating is submitted.

**Tech Stack:** Next.js 16 App Router, React 18, Supabase/Postgres, Tailwind CSS, TypeScript

**Note on #2 (session expiration):** Already implemented — `session.ts` has `SESSION_MAX_AGE_MS = 14 days`. No action needed.

---

## File Map

| File | Tasks |
|------|-------|
| `src/components/HeroBlock.tsx` | #1 (fixed-width word, capitalize) |
| `src/components/Header.tsx` | #3 (bigger logo) |
| `src/app/page.tsx` | #4a, #5, #8, #11, #12 (useSearchParams, empty state, oldest sort, email CTA) |
| `src/components/SubNavRail.tsx` | #8 (Oldest sort option) |
| `src/lib/data/contracts.ts` | #8 (extend ListingQuery sort type) |
| `src/app/api/listings/route.ts` | #8 (pass oldest sort to query) |
| `src/lib/data/supabaseDataAccess.ts` | #7, #8, #10 (zones, oldest sort, reputation) |
| `src/lib/types.ts` | #7 (new pickup zones + campus zone map) |
| `src/lib/listingValidation.ts` | #6 (photo optional for wanted) |
| `src/app/sell/page.tsx` | #6 (toggle first), #13 (draft) |
| `src/app/messages/page.tsx` | #9 (no auto-open) |
| `src/app/api/ratings/route.ts` | #10 (update reputation after rating) |
| `src/components/SellerTrustCard.tsx` | #10 (display temperature + warning) |
| `src/components/SellerRating.tsx` | #10 (accept override temperature prop) |

---

### Task 1: Hero rotating word — fixed width + capitalize (#1)

**Files:**
- Modify: `src/components/HeroBlock.tsx`

The rotating word container currently shrinks to fit the word, making the headline reflow. Fix: add `minWidth` equal to the longest word. Also capitalize the first letter of each word.

- [ ] **Step 1: Capitalize ROTATING_WORDS and set fixed container width**

In `src/components/HeroBlock.tsx`, make these two changes:

```tsx
// Line 8-11 — capitalize each word:
const ROTATING_WORDS = [
  'Textbooks', 'Desks', 'Bikes', 'Hoodies', 'Mini-fridges',
  'Monitors', 'Calculators', 'Lab Manuals', 'Moving Boxes', 'Dorm Chairs', 'Desk Lamps',
]
```

Then in the `RotatingWord` component, change the outer `<span>` style to add `minWidth`:

```tsx
// Replace the outer span style (currently around line 55):
style={{
  display: 'inline-block',
  overflow: 'hidden',
  verticalAlign: 'bottom',
  height: '1.18em',
  lineHeight: '1.18em',
  minWidth: '6.5ch',  // ← add this; fits 'Mini-fridges' at any font size
}}
```

- [ ] **Step 2: Verify — start dev server and check homepage**

Run: `npm run dev`

Open `http://localhost:3000`. Confirm:
1. All rotating words are capitalized
2. The headline "Find ___ at Mason Market." stays on one line for all words including short ones like "Bikes"

- [ ] **Step 3: Commit**

```bash
git add src/components/HeroBlock.tsx
git commit -m "fix: hero rotating word fixed width and capitalized keywords"
```

---

### Task 2: Bigger logo (#3)

**Files:**
- Modify: `src/components/Header.tsx`

- [ ] **Step 1: Increase logo image size**

In `src/components/Header.tsx`, find the `<Image>` inside the Logo `<Link>` (around line 103) and update:

```tsx
// Before:
<Image
  src="/logo.png"
  alt="Mason Market"
  width={140}
  height={48}
  className="h-10 w-auto object-contain"
  priority
/>

// After:
<Image
  src="/logo.png"
  alt="Mason Market"
  width={180}
  height={60}
  className="h-12 w-auto object-contain"
  priority
/>
```

- [ ] **Step 2: Verify in browser**

Open `http://localhost:3000`. Confirm the logo is noticeably larger and still fits within the header bar. Logo click still navigates to `/`.

- [ ] **Step 3: Commit**

```bash
git add src/components/Header.tsx
git commit -m "fix: increase header logo size"
```

---

### Task 3: Reactive URL search with useSearchParams — fixes #4a, #11 initial load, #12 seasonal ribbon

**Files:**
- Modify: `src/app/page.tsx`

This is the core structural change. Replace the one-time `seeded.current` URL read with `useSearchParams()` so any navigation to `/?search=X` or `/?category=Y` (chip clicks, hero form submit, ribbon CTA, browser back) triggers a live re-fetch.

Next.js 16 requires `useSearchParams()` to be inside a `<Suspense>` boundary. Extract the page body into `HomeContent` and wrap it.

- [ ] **Step 1: Add useSearchParams import and wrap in Suspense**

At the top of `src/app/page.tsx`, update imports:

```tsx
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Category, Listing } from '@/lib/types'
import { CATEGORIES } from '@/lib/types'
```

(Remove the `useRef` import for `seeded` — it won't be needed anymore. Keep all other existing imports.)

- [ ] **Step 2: Rename `HomePage` to `HomeContent` and extract default export**

At the bottom of `src/app/page.tsx`, after the closing brace of the current `export default function HomePage()`, add:

```tsx
// Rename the existing function to HomeContent (remove `export default`):
function HomeContent() {
  // ... (all existing HomePage body stays here)
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  )
}
```

So the file structure becomes:
```
'use client'
imports...
type SortOption = ...
const EMPTY_FILTERS = ...
function countFilters() { ... }
function HomeContent() { /* all the page logic */ }
export default function HomePage() {
  return <Suspense fallback={null}><HomeContent /></Suspense>
}
```

- [ ] **Step 3: Replace seeded URL read with useSearchParams**

Inside `HomeContent`, remove the `seeded` ref and its `useEffect`. Replace with:

```tsx
const searchParams = useSearchParams()

// Initialize search and category from URL (runs on mount with current URL)
const [search, setSearch]     = useState<string>(() => searchParams.get('search') || '')
const [category, setCategory] = useState<Category | null>(() => {
  const c = searchParams.get('category')
  return c && CATEGORIES.includes(c as Category) ? (c as Category) : null
})
```

Then add a new effect that syncs state whenever the URL changes (chip click, router.push from header search, browser back/forward):

```tsx
useEffect(() => {
  const q = searchParams.get('search') || ''
  const c = searchParams.get('category')
  setSearch(q)
  setCategory(c && CATEGORIES.includes(c as Category) ? (c as Category) : null)
  setPage(0)
  setHasMore(true)
}, [searchParams])
```

Remove these lines (the old seeded approach):
```tsx
// DELETE:
const seeded = useRef(false)
useEffect(() => {
  if (seeded.current) return
  seeded.current = true
  const q = new URLSearchParams(window.location.search).get('search')
  if (q) setSearch(q)
}, [])
```

- [ ] **Step 4: Update clearAll to also reset the URL**

```tsx
const clearAll = () => {
  setSearch('')
  setCategory(null)
  setSort('newest')
  setFilters(EMPTY_FILTERS)
  setPage(0)
  setHasMore(true)
  router.replace('/')
}
```

- [ ] **Step 5: Keep category passed to SubNavRail in sync**

The `onCategoryChange` handler currently calls `setCategory(c)` directly. This is fine — SubNavRail clicks update local state without changing the URL (URL only changes when user navigates via hero/header). Leave that handler as-is.

- [ ] **Step 6: Verify**

1. Navigate to `http://localhost:3000/?search=BIOL+124`. Confirm search results appear immediately on load (no "click category and back" needed).
2. Click a chip (e.g., "IKEA mini fridge"). Confirm results update without pressing the search button.
3. Click "Browse furniture" in the seasonal ribbon (top banner). Confirm the Furniture category filter activates.
4. Use browser Back button after a chip click. Confirm the previous search restores.

- [ ] **Step 7: Commit**

```bash
git add src/app/page.tsx
git commit -m "fix: useSearchParams for reactive URL-driven search, chips, and seasonal ribbon"
```

---

### Task 4: Email banner button rename (#5)

**Files:**
- Modify: `src/app/page.tsx`

The "Sign up" button inside the email marketing opt-in banner is confusing — it looks like an account sign-up CTA. Rename it to "Subscribe".

- [ ] **Step 1: Rename button label**

In `src/app/page.tsx`, find the email banner section (around line 186):

```tsx
// Before:
<button type="button" onClick={optIntoEmail} className="ui-btn-primary">Sign up</button>

// After:
<button type="button" onClick={optIntoEmail} className="ui-btn-primary">Subscribe</button>
```

- [ ] **Step 2: Verify**

Logged in as a user without marketing opt-in, confirm the banner shows "Subscribe" instead of "Sign up".

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "fix: rename email marketing banner CTA from 'Sign up' to 'Subscribe'"
```

---

### Task 5: Add Oldest sort option (#8)

**Files:**
- Modify: `src/lib/data/contracts.ts`
- Modify: `src/lib/data/supabaseDataAccess.ts`
- Modify: `src/app/api/listings/route.ts`
- Modify: `src/components/SubNavRail.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Extend ListingQuery sort type in contracts.ts**

In `src/lib/data/contracts.ts`, line 30:

```ts
// Before:
sort?: 'newest' | 'price-asc' | 'price-desc'

// After:
sort?: 'newest' | 'oldest' | 'price-asc' | 'price-desc'
```

- [ ] **Step 2: Add oldest sort in data access layer**

In `src/lib/data/supabaseDataAccess.ts`, find the sort block (around line 263):

```ts
// Before:
if (query?.sort === 'price-asc')   q = q.order('price', { ascending: true })
else if (query?.sort === 'price-desc') q = q.order('price', { ascending: false })
else q = q.order('created_at', { ascending: false })

// After:
if (query?.sort === 'price-asc')   q = q.order('price', { ascending: true })
else if (query?.sort === 'price-desc') q = q.order('price', { ascending: false })
else if (query?.sort === 'oldest') q = q.order('created_at', { ascending: true })
else                               q = q.order('created_at', { ascending: false })
```

- [ ] **Step 3: Accept oldest in the listings API route**

In `src/app/api/listings/route.ts`, line 42:

```ts
// Before:
const sort = (searchParams.get('sort') || 'newest') as 'newest' | 'price-asc' | 'price-desc'

// After:
const sort = (searchParams.get('sort') || 'newest') as 'newest' | 'oldest' | 'price-asc' | 'price-desc'
```

- [ ] **Step 4: Update SortOption type and add option in SubNavRail**

In `src/components/SubNavRail.tsx`:

```tsx
// Line 4 — extend type:
type SortOption = 'newest' | 'oldest' | 'price-asc' | 'price-desc'

// In SORT_OPTIONS array, add oldest after newest:
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest',     label: 'Newest' },
  { value: 'oldest',     label: 'Oldest' },
  { value: 'price-asc',  label: 'Price ↑' },
  { value: 'price-desc', label: 'Price ↓' },
]
```

- [ ] **Step 5: Update SortOption type in page.tsx**

In `src/app/page.tsx`, line 14:

```tsx
// Before:
type SortOption = 'newest' | 'price-asc' | 'price-desc'

// After:
type SortOption = 'newest' | 'oldest' | 'price-asc' | 'price-desc'
```

- [ ] **Step 6: Verify**

Open homepage. Confirm "Oldest" appears in the sort dropdown. Select it and confirm older listings appear first.

- [ ] **Step 7: Commit**

```bash
git add src/lib/data/contracts.ts src/lib/data/supabaseDataAccess.ts src/app/api/listings/route.ts src/components/SubNavRail.tsx src/app/page.tsx
git commit -m "feat: add Oldest sort option to listing feed"
```

---

### Task 6: Smart search empty state (#11)

**Files:**
- Modify: `src/app/page.tsx`

When a search term is active and returns zero results, show a specific message with a "Post Wanted" CTA. Also auto-save the search for logged-in users so they're notified when a match appears.

- [ ] **Step 1: Replace the empty-state block with search-aware messaging**

In `src/app/page.tsx`, find the `listings.length === 0` block (around line 283). Replace it:

```tsx
) : listings.length === 0 ? (
  <div className="py-16 text-center">
    <div className="mx-auto max-w-md rounded-3xl border border-dashed bg-white px-6 py-10" style={{ borderColor: 'var(--m-line)' }}>
      <div className="mb-4 flex justify-center" style={{ color: 'var(--m-muted)' }}>
        <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
        </svg>
      </div>
      {search ? (
        <>
          <p className="text-[16px] font-bold" style={{ color: 'var(--m-ink)' }}>
            No results for &ldquo;{search}&rdquo;
          </p>
          <p className="mt-1.5 text-[13px]" style={{ color: 'var(--m-muted)' }}>
            Nobody has listed that yet — post a Wanted to let sellers know you&apos;re looking.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <a
              href={`/sell?kind=wanted&q=${encodeURIComponent(search)}`}
              className="flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--m-pop)' }}
            >
              + Post Wanted
            </a>
            <button type="button" onClick={clearAll} className="flex h-10 items-center rounded-full border px-4 text-[13px] font-semibold" style={{ borderColor: 'var(--m-line)', color: 'var(--m-ink)' }}>
              Clear search
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-[16px] font-bold" style={{ color: 'var(--m-ink)' }}>
            {hasAnyFilter ? 'Nothing matches those filters' : 'No listings yet'}
          </p>
          <p className="mt-1.5 text-[13px]" style={{ color: 'var(--m-muted)' }}>
            {hasAnyFilter ? 'Try widening the price range or removing a filter.' : 'Be the first to post something.'}
          </p>
          {hasAnyFilter && (
            <button type="button" onClick={clearAll} className="mt-5 ui-btn-secondary px-5 text-sm">
              Reset filters
            </button>
          )}
        </>
      )}
    </div>
  </div>
```

- [ ] **Step 2: Auto-save zero-result searches for logged-in users**

Still in `src/app/page.tsx`, find the main fetch `useEffect` (the one that calls `/api/listings`). After setting listings (in the `.then` callback), add:

```tsx
.then((data: Listing[]) => {
  const result = Array.isArray(data) ? data : []
  setListings(result)
  setHasMore(result.length === PAGE_SIZE)
  // Auto-save zero-result searches so user gets notified when a match appears
  if (result.length === 0 && search && session) {
    fetch('/api/saved-searches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: search, query: search, filters: {} }),
    }).catch(() => {})
  }
})
```

- [ ] **Step 3: Verify**

Search for "BIOL 124" (no matches). Confirm:
1. Message says `No results for "BIOL 124"`
2. "+ Post Wanted" button appears and links to `/sell?kind=wanted&q=BIOL%20124`
3. "Clear search" button clears the search

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: smart empty state for zero-result searches with Wanted CTA"
```

---

### Task 7: Sell form — Wanted toggle first, photo optional (#6)

**Files:**
- Modify: `src/app/sell/page.tsx`
- Modify: `src/lib/listingValidation.ts`

Move the Sell/Wanted toggle above the Photos section. When Wanted is selected, photos become optional.

- [ ] **Step 1: Pre-fill listingKind from URL query param**

`/sell?kind=wanted&q=BIOL+124` comes from the empty-state CTA (Task 6). Seed the form from URL on mount.

At the top of `SellPage` (after state declarations), add:

```tsx
// Seed listingKind and title from URL (e.g., coming from "Post Wanted" CTA)
useEffect(() => {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  const kind = params.get('kind')
  const q = params.get('q')
  if (kind === 'wanted' || kind === 'sell') {
    setForm(prev => ({ ...prev, listingKind: kind as ListingKind }))
  }
  if (q) {
    setForm(prev => ({ ...prev, title: q }))
  }
}, [])
```

- [ ] **Step 2: Add a "Step 0" kind toggle section above the photos section**

In `src/app/sell/page.tsx`, insert a new `<section>` before the existing Section 1 (Photos). Add it right after the `<form onSubmit={handleSubmit} className="space-y-5">` opening tag:

```tsx
{/* Section 0: Listing type */}
<section className="rounded-[var(--r-lg)] border bg-white p-6" style={{ borderColor: 'var(--m-line)' }}>
  <div className="mb-4 flex items-center gap-2">
    <span className="grid h-6 w-6 place-items-center rounded-full font-mono-label text-[10px] font-bold text-white" style={{ background: 'var(--m-ink)' }}>
      1
    </span>
    <p className="font-display text-[20px] font-black">What are you posting?</p>
  </div>
  <div className="flex rounded-xl border bg-[var(--m-soft)] p-1" style={{ borderColor: 'var(--m-line)' }}>
    {([
      ['sell', 'Selling', 'I have something to sell'],
      ['wanted', 'Wanted', "I'm looking for something"],
    ] as Array<[ListingKind, string, string]>).map(([value, label, hint]) => (
      <button
        key={value}
        type="button"
        onClick={() => setForm({ ...form, listingKind: value })}
        className={`flex-1 rounded-lg px-4 py-3 text-left transition-colors ${form.listingKind === value ? 'bg-white shadow-sm' : ''}`}
        style={{ border: 'none', cursor: 'pointer' }}
      >
        <p className={`text-sm font-bold ${form.listingKind === value ? 'text-[var(--m-ink)]' : 'text-[var(--m-muted)]'}`}>{label}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--m-muted)' }}>{hint}</p>
      </button>
    ))}
  </div>
</section>
```

- [ ] **Step 3: Remove the Sell/Wanted toggle from inside Section 2 (Basics)**

In `src/app/sell/page.tsx`, find the `mb-4 flex rounded-xl border bg-white p-1` toggle inside the Basics section and remove it (it was the old Sell/Wanted toggle inside "Basic details"). Also remove the wrapping `<div className="rounded-xl bg-[var(--m-soft)] p-3 sm:p-4">` that contained it if it only wraps that toggle. Keep the grid of Price/Category/Condition below it.

Specifically, remove these lines:
```tsx
<div className="mb-4 flex rounded-xl border bg-white p-1" style={{ borderColor: 'var(--m-line)' }}>
  {([
    ['sell', 'Selling'],
    ['wanted', 'Wanted'],
  ] as Array<[ListingKind, string]>).map(([value, label]) => (
    <button
      key={value}
      type="button"
      onClick={() => setForm({ ...form, listingKind: value })}
      className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${form.listingKind === value ? 'bg-[var(--m-ink)] text-white' : 'text-[var(--m-muted)]'}`}
    >
      {label}
    </button>
  ))}
</div>
```

- [ ] **Step 4: Re-number section badges**

After adding Section 0 (type), the old sections need renumbering:
- Old Section 1 (Photos) → now Section 2
- Old Section 2 (Basics) → now Section 3
- Old Section 3 (Pickup) → now Section 4

Find the `<span>` badges with numbers `1`, `2`, `3` in the section headers and change them to `2`, `3`, `4` respectively.

- [ ] **Step 5: Make photos optional for Wanted listings**

In `src/app/sell/page.tsx`, update the `validate()` function:

```tsx
const validate = () => {
  // Photos required for sell listings only
  if (form.listingKind === 'sell' && imageFiles.length === 0)
    return 'At least 1 photo is required for selling listings.'
  if (form.title.trim().length < 5) return 'Title should be at least 5 characters.'
  if (form.description.trim().length < 15) return 'Description should be at least 15 characters.'
  if (form.pickupNotes.trim().length < 6) return 'Pickup notes should be at least 6 characters.'
  const price = Number(form.price)
  if (!Number.isFinite(price) || price < 0) return 'Price must be 0 or higher.'
  if (form.category === 'textbooks' && form.courseCode.trim().length > 0 && form.courseCode.trim().length < 3) {
    return 'Course code should be at least 3 characters when provided.'
  }
  return ''
}
```

Also update the photo input label in Section 2 to reflect that Wanted listings don't require a photo:

```tsx
<label className="block text-sm font-medium mb-2" style={{ color: 'var(--m-ink)' }}>
  Photos {form.listingKind === 'sell' ? <span className="text-red-500">*</span> : <span style={{ color: 'var(--m-muted)' }}>(optional for Wanted)</span>}
</label>
```

Also update the hint text below the input:
```tsx
<p className="mt-1 text-xs" style={{ color: 'var(--m-muted)' }}>
  {form.listingKind === 'sell' ? 'At least 1 photo required.' : 'Optional for Wanted posts.'} Up to 4 images (5MB each).
</p>
```

- [ ] **Step 6: Make server-side validation also allow wanted posts with no photos**

In `src/lib/listingValidation.ts`, line 105:

```ts
// Before:
if (images.length === 0) return { ok: false, error: 'At least 1 photo is required' }

// After:
if (listingKind === 'sell' && images.length === 0) {
  return { ok: false, error: 'At least 1 photo is required for selling listings' }
}
```

- [ ] **Step 7: Verify**

1. Open `/sell`. Confirm "What are you posting?" is the first section.
2. Select "Wanted". Confirm photo upload says "Optional for Wanted posts."
3. Submit a Wanted post without a photo. Confirm it posts successfully.
4. Switch back to "Selling". Confirm submitting without a photo shows the error.

- [ ] **Step 8: Commit**

```bash
git add src/app/sell/page.tsx src/lib/listingValidation.ts
git commit -m "feat: Wanted toggle first in sell form, photos optional for Wanted posts"
```

---

### Task 8: Campus-specific pickup zones (#7)

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/data/supabaseDataAccess.ts` (CAMPUS_ZONE_MAP is in types.ts — no change here needed)

Add meaningful pickup spots for Arlington and Sci-Tech campuses, replacing the near-empty lists they have now.

- [ ] **Step 1: Add new zone keys to PICKUP_ZONES**

In `src/lib/types.ts`, extend the `PICKUP_ZONES` array:

```ts
export const PICKUP_ZONES = [
  // Fairfax
  'jc-lobby',
  'fenwick-entrance',
  'sub1-desk',
  'engineering-atrium',
  'shenandoah-deck',
  'potomac-courtyard',
  // Arlington
  'van-metre-hall',
  'hazel-hall-lobby',
  'founders-hall-lobby',
  // Sci-Tech
  'sci-tech-kiosk',
  'innovation-hall-lobby',
  // Shared
  'off-campus-fairfax',
  'off-campus-arlington',
] as const
```

- [ ] **Step 2: Update CAMPUS_ZONE_MAP**

In `src/lib/types.ts`:

```ts
export const CAMPUS_ZONE_MAP: Record<string, string[]> = {
  fairfax:    ['jc-lobby', 'fenwick-entrance', 'sub1-desk', 'engineering-atrium', 'shenandoah-deck', 'potomac-courtyard', 'off-campus-fairfax'],
  arlington:  ['van-metre-hall', 'hazel-hall-lobby', 'founders-hall-lobby', 'off-campus-arlington'],
  'sci-tech': ['sci-tech-kiosk', 'innovation-hall-lobby', 'off-campus-fairfax'],
}
```

- [ ] **Step 3: Add labels for new zones**

In `src/lib/types.ts`, extend `PICKUP_ZONE_LABELS`:

```ts
export const PICKUP_ZONE_LABELS: Record<PickupZone, string> = {
  'jc-lobby':             'Johnson Center Lobby',
  'fenwick-entrance':     'Fenwick Library Entrance',
  'sub1-desk':            'SUB I Front Desk',
  'engineering-atrium':   'Engineering Atrium',
  'shenandoah-deck':      'Shenandoah Parking Deck',
  'potomac-courtyard':    'Potomac Heights Courtyard',
  'van-metre-hall':       'Van Metre Hall (Arlington)',
  'hazel-hall-lobby':     'Hazel Hall Lobby (Arlington)',
  'founders-hall-lobby':  'Founders Hall Lobby — Law School',
  'sci-tech-kiosk':       'Sci-Tech Student Kiosk',
  'innovation-hall-lobby':'Innovation Hall Lobby (Sci-Tech)',
  'off-campus-fairfax':   'Off-campus near Fairfax',
  'off-campus-arlington': 'Off-campus near Arlington',
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors (all PickupZone values now have labels).

- [ ] **Step 5: Verify sell form**

1. Open `/sell`. Set Campus to "Arlington Campus".
2. Confirm pickup zone dropdown now shows: Van Metre Hall, Hazel Hall Lobby, Founders Hall Lobby, Off-campus near Arlington.
3. Set Campus to "Sci-Tech Campus".
4. Confirm dropdown shows: Sci-Tech Student Kiosk, Innovation Hall Lobby, Off-campus near Fairfax.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: campus-specific pickup zones for Arlington and Sci-Tech"
```

---

### Task 9: Messages — no auto-open on load (#9)

**Files:**
- Modify: `src/app/messages/page.tsx`

Currently, loading `/messages` auto-selects the most recent conversation. This can cause confusion when messaging multiple people. Default to showing only the thread list with no chat open.

- [ ] **Step 1: Stop auto-selecting the first conversation**

In `src/app/messages/page.tsx`, find the `loadInbox` function. Near the end where `setSelectedKey` is called (around line 145):

```tsx
// Before:
setConversations(merged)
setSelectedKey(merged[0]?.key || null)

// After:
setConversations(merged)
// Only auto-open if we navigated here from a specific listing (e.g., "Message seller" button)
setSelectedKey(listingIdFromDetail ? (merged[0]?.key || null) : null)
```

- [ ] **Step 2: Show a prompt in the empty right pane**

Find the fallback content in the `<section>` when `!selectedConversation` (around line 607):

```tsx
// Before:
<p className="text-sm" style={{ color: 'var(--m-muted)' }}>Select a conversation.</p>

// After:
<div className="flex flex-col items-center justify-center h-full py-16" style={{ color: 'var(--m-muted)' }}>
  <svg viewBox="0 0 24 24" className="h-10 w-10 mb-3" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
  <p className="text-sm font-medium">Select a conversation to read it</p>
</div>
```

- [ ] **Step 3: Verify**

Open `/messages`. Confirm:
1. Thread list shows on the left.
2. Right pane shows the "Select a conversation" prompt — no chat auto-opens.
3. Clicking a thread opens its messages.
4. Clicking "Message seller" on a listing page still auto-opens that conversation.

- [ ] **Step 4: Commit**

```bash
git add src/app/messages/page.tsx
git commit -m "fix: messages page no longer auto-opens most recent conversation"
```

---

### Task 10: Manner temperature system (price-weighted, DB-persisted) (#10)

**Files:**
- Modify: `src/lib/data/supabaseDataAccess.ts`
- Modify: `src/app/api/ratings/route.ts`
- Modify: `src/components/SellerTrustCard.tsx`
- Modify: `src/components/SellerRating.tsx`

**Design:** `reputation_score` in the DB is used as the delta from 36.5°. All new accounts start at `reputation_score = 0` → 36.5°. Each rating adjusts it by `round(price/10 * score, 1)`. Display temperature = `clamp(36.5 + reputationScore, 0, 99)`. Warning shown when temperature < 36.5.

- [ ] **Step 1: Add usersAdjustReputationScore to data access**

In `src/lib/data/supabaseDataAccess.ts`, add after `usersUpdateProfile`:

```ts
export async function usersAdjustReputationScore(userId: string, delta: number): Promise<void> {
  const { data } = await getSupabaseAdmin()
    .from('users')
    .select('reputation_score')
    .eq('id', userId)
    .single()
  if (!data) return
  const current = Number(data.reputation_score) || 0
  // Clamp: min score = -36.5 (→ 0° display), max = 62.5 (→ 99° display)
  const newScore = Math.round(Math.min(62.5, Math.max(-36.5, current + delta)) * 10) / 10
  await getSupabaseAdmin()
    .from('users')
    .update({ reputation_score: newScore })
    .eq('id', userId)
}
```

- [ ] **Step 2: Call reputation adjustment after rating creation**

In `src/app/api/ratings/route.ts`, update the POST handler. After `ratingsCreate(...)` succeeds, add the reputation update:

First, add `usersAdjustReputationScore` to the import:

```ts
import {
  ratingsFindBySellerId,
  ratingsCreate,
  ratingsFindByBuyerAndListing,
  listingsFindById,
  usersFindById,
  messagesExistsByUserAndListing,
  usersAdjustReputationScore,
} from '@/lib/data/supabaseDataAccess'
```

Then, after `const rating = await ratingsCreate(...)`, add:

```ts
const rating = await ratingsCreate({
  sellerId: String(sellerId),
  buyerId: session.userId,
  listingId: String(listingId),
  score: score as RatingScore,
  tags: validTags,
})

// Update seller's manner temperature: delta = price/10 * score, 1 decimal place
const delta = Math.round((listing.price / 10) * (score as number) * 10) / 10
await usersAdjustReputationScore(String(sellerId), delta).catch(() => {})

return NextResponse.json(rating)
```

- [ ] **Step 3: Add a pure temperature helper and test it**

Add a helper in `src/lib/trust.ts`:

```ts
export function mannerTemperature(reputationScore: number): number {
  return Math.round(Math.min(99, Math.max(0, 36.5 + reputationScore)) * 10) / 10
}
```

Write a test in `src/__tests__/marketplaceFeatures.test.ts` (add to the existing describe block):

```ts
import { mannerTemperature } from '@/lib/trust'

// Inside describe('marketplace feature helpers'):
test('mannerTemperature clamps and computes correctly', () => {
  expect(mannerTemperature(0)).toBe(36.5)           // new user baseline
  expect(mannerTemperature(10)).toBe(46.5)           // $100 positive review
  expect(mannerTemperature(-36.5)).toBe(0)           // minimum
  expect(mannerTemperature(62.5)).toBe(99)           // maximum
  expect(mannerTemperature(-40)).toBe(0)             // clamped below 0
  expect(mannerTemperature(100)).toBe(99)            // clamped above 99
  expect(mannerTemperature(-5)).toBe(31.5)           // below baseline (warning zone)
})
```

Run:
```bash
npx jest src/__tests__/marketplaceFeatures.test.ts
```
Expected: all tests pass.

- [ ] **Step 4: Update SellerTrustCard to display temperature with warning**

In `src/components/SellerTrustCard.tsx`, add the import at the top:

```tsx
import { mannerTemperature } from '@/lib/trust'
```

Replace the Reputation box (first box in the 4-column grid):

```tsx
// Before:
<div className="rounded-xl bg-[var(--m-soft)] p-3 text-center">
  <p className="font-semibold text-[var(--m-ink)]">{seller.reputationScore.toFixed(1)}</p>
  <p className="text-xs text-[var(--m-muted)]">Reputation</p>
</div>

// After:
<div className="rounded-xl bg-[var(--m-soft)] p-3 text-center">
  <p className={`font-semibold ${mannerTemperature(seller.reputationScore) >= 36.5 ? 'text-[var(--m-green)]' : 'text-amber-600'}`}>
    {mannerTemperature(seller.reputationScore)}°
  </p>
  <p className="text-xs text-[var(--m-muted)]">Manner temp</p>
</div>
```

Add a warning message above the grid, shown only when reputationScore < 0 (below baseline):

```tsx
{seller.reputationScore < 0 && (
  <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
    ⚠ This seller&apos;s previous trades received below-average ratings.
  </p>
)}
<div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
  {/* ... existing grid */}
</div>
```

- [ ] **Step 5: Update SellerRating to accept an override temperature**

In `src/components/SellerRating.tsx`, update the props interface and `getMannerTemp` usage:

```tsx
interface SellerRatingProps {
  sellerId: string
  compact?: boolean
  mannerTemp?: number  // ← override from parent (reputationScore-based), if available
}

export function SellerRating({ sellerId, compact = false, mannerTemp }: SellerRatingProps) {
  // ...existing state...

  const temp = mannerTemp !== undefined ? mannerTemp : getMannerTemp(ratings)
  // rest unchanged
```

- [ ] **Step 6: Verify**

1. Navigate to a seller's profile page. Confirm manner temperature shows as "36.5°" for a user with no ratings.
2. Submit a test rating (via the API or UI) for a $100 item. Confirm the seller's temperature increases to 46.5°.
3. Confirm a seller with `reputationScore < 0` shows the amber warning.

- [ ] **Step 7: Commit**

```bash
git add src/lib/trust.ts src/lib/data/supabaseDataAccess.ts src/app/api/ratings/route.ts src/components/SellerTrustCard.tsx src/components/SellerRating.tsx src/__tests__/marketplaceFeatures.test.ts
git commit -m "feat: price-weighted manner temperature system (36.5° baseline, DB-persisted)"
```

---

### Task 11: Draft post feature (#13)

**Files:**
- Modify: `src/app/sell/page.tsx`

Persist in-progress sell form data to `localStorage`. On mount, detect a draft and offer Restore/Discard. Clear draft on successful submit.

- [ ] **Step 1: Add draft save/restore constants**

At the top of `src/app/sell/page.tsx`, add:

```tsx
const DRAFT_KEY = 'mm_sell_draft'
```

- [ ] **Step 2: Add draft banner state**

Inside `SellPage`, add:

```tsx
const [showDraftBanner, setShowDraftBanner] = useState(false)
```

- [ ] **Step 3: On mount, check for an existing draft**

Add a `useEffect` (after existing state declarations):

```tsx
useEffect(() => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return
    const saved = JSON.parse(raw) as SellFormState
    // Only show restore banner if there's meaningful content
    if (saved.title || saved.description) setShowDraftBanner(true)
  } catch {
    localStorage.removeItem(DRAFT_KEY)
  }
}, [])
```

- [ ] **Step 4: Auto-save form to localStorage on every change**

Add a debounced save effect:

```tsx
const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

useEffect(() => {
  if (draftTimer.current) clearTimeout(draftTimer.current)
  draftTimer.current = setTimeout(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form))
    } catch {}
  }, 500)
  return () => { if (draftTimer.current) clearTimeout(draftTimer.current) }
}, [form])
```

Also import `useRef` if not already imported at the top.

- [ ] **Step 5: Clear draft on successful submit**

In the `handleSubmit` function, after `router.push(...)`:

```tsx
router.push(`/my-listings/${listing.id}/edit?posted=1`)
localStorage.removeItem(DRAFT_KEY)
```

- [ ] **Step 6: Add restore/discard banner to the form UI**

Insert this just above `<form onSubmit={handleSubmit} ...>`:

```tsx
{showDraftBanner && (
  <div className="mb-4 flex items-center justify-between rounded-xl border bg-amber-50 px-4 py-3" style={{ borderColor: '#fbbf24' }}>
    <p className="text-sm font-medium text-amber-800">You have a saved draft — continue where you left off?</p>
    <div className="flex gap-2 ml-4">
      <button
        type="button"
        onClick={() => {
          try {
            const raw = localStorage.getItem(DRAFT_KEY)
            if (raw) setForm(JSON.parse(raw) as SellFormState)
          } catch {}
          setShowDraftBanner(false)
        }}
        className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
      >
        Restore
      </button>
      <button
        type="button"
        onClick={() => {
          localStorage.removeItem(DRAFT_KEY)
          setShowDraftBanner(false)
        }}
        className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-amber-100"
        style={{ borderColor: '#fbbf24', color: '#92400e' }}
      >
        Discard
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 7: Verify**

1. Open `/sell`. Fill in a title and description. Navigate away.
2. Return to `/sell`. Confirm the amber draft banner appears.
3. Click "Restore". Confirm the form refills with the saved data.
4. Click "Discard". Confirm the banner disappears and the form is blank.
5. Complete and submit a listing. Confirm the draft is cleared (navigate away and back — no banner).

- [ ] **Step 8: Commit**

```bash
git add src/app/sell/page.tsx
git commit -m "feat: sell form draft saved to localStorage, restored on return"
```

---

### Task 12: Run full test suite and verify build

- [ ] **Step 1: Run tests**

```bash
npx jest
```

Expected: all existing tests pass + the new `mannerTemperature` test passes.

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Production build check**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 4: Final manual smoke test**

Check each fixed item:
1. Hero word stays on one line for "Bikes"
2. Logo is larger
3. Email banner says "Subscribe"
4. Clicking a hero chip shows results immediately
5. Clicking "Browse furniture" from the ribbon filters to Furniture
6. Sell form shows "What are you posting?" first
7. Wanted posts don't require a photo
8. Arlington/Sci-Tech zones show correct options
9. "Oldest" appears in sort dropdown and works
10. Messages page shows no auto-opened chat
11. Seller card shows `36.5°` for new users
12. Searching with no results shows "Post Wanted" CTA
13. Filling sell form and returning shows draft restore banner

- [ ] **Step 5: Commit any last fixes**

```bash
git add -A
git commit -m "chore: final smoke test fixes"
```
