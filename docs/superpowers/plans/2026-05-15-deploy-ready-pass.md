# Mason Market Deploy-Ready Pass — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all Firebase remnants, improve messaging UX, add an unread badge to the Messages nav link, and verify a clean production build.

**Architecture:** Sequential sweep — new API routes created before old ones are deleted, UI updated last so it always points to live routes. No schema changes. No new npm dependencies.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase, Tailwind CSS. No test framework present — verification is via `npm run build` and manual smoke-check steps.

---

## Pre-flight

Before starting, confirm the dev server is NOT running (to avoid hot-reload confusion during route renames).

---

## Task 1: Create replacement admin DB routes

**Files:**
- Create: `src/app/api/admin/db/snapshot/route.ts`
- Create: `src/app/api/admin/db/status/route.ts`

These replace the misnamed `firebase/` routes. Logic is identical — only the file path changes.

- [ ] **Step 1.1: Create the snapshot route**

Create `src/app/api/admin/db/snapshot/route.ts` with this exact content:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 400 })
    }

    const db = getSupabaseAdmin()

    const [users, listings, messages, reports, activity] = await Promise.all([
      db.from('users').select('*', { count: 'exact', head: true }),
      db.from('listings').select('*', { count: 'exact', head: true }),
      db.from('messages').select('*', { count: 'exact', head: true }),
      db.from('reports').select('*', { count: 'exact', head: true }),
      db.from('admin_activity').select('*', { count: 'exact', head: true }),
    ])

    return NextResponse.json({
      ok: true,
      mode: 'supabase',
      message: 'Connected to Supabase. Counts reflect current database state.',
      counts: {
        users: users.count ?? 0,
        listings: listings.count ?? 0,
        messages: messages.count ?? 0,
        reports: reports.count ?? 0,
        adminActivity: activity.count ?? 0,
      },
    })
  } catch (err) {
    console.error('POST /api/admin/db/snapshot error:', err)
    return NextResponse.json({ error: 'Failed to check database' }, { status: 500 })
  }
}
```

- [ ] **Step 1.2: Create the status route**

Create `src/app/api/admin/db/status/route.ts` with this exact content:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request)
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const configured = isSupabaseConfigured()
  if (!configured) {
    return NextResponse.json({ configured: false, connected: false, details: 'Missing Supabase env vars.' })
  }

  try {
    const { data, error } = await getSupabaseAdmin().from('users').select('id', { count: 'exact', head: true })
    if (error) throw error
    return NextResponse.json({ configured: true, connected: true, details: 'Supabase connected.', data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ configured: true, connected: false, details: msg })
  }
}
```

- [ ] **Step 1.3: Verify TypeScript compiles for new files**

```bash
cd "C:\Users\wjdgk\Desktop\mason-market\mason-market"
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors related to the two new files.

---

## Task 2: Delete the old firebase routes

**Files:**
- Delete: `src/app/api/admin/firebase/seed/route.ts`
- Delete: `src/app/api/admin/firebase/status/route.ts`
- Delete: directories `src/app/api/admin/firebase/seed/` and `src/app/api/admin/firebase/status/` and `src/app/api/admin/firebase/` (if empty after deletion)

- [ ] **Step 2.1: Delete old route files and directories**

Run in PowerShell:
```powershell
Remove-Item -Recurse -Force "C:\Users\wjdgk\Desktop\mason-market\mason-market\src\app\api\admin\firebase"
```

- [ ] **Step 2.2: Verify deletion**

```powershell
Test-Path "C:\Users\wjdgk\Desktop\mason-market\mason-market\src\app\api\admin\firebase"
```

Expected: `False`

---

## Task 3: Update AdminModerationClient.tsx

**Files:**
- Modify: `src/app/admin/AdminModerationClient.tsx`

Changes: rename functions, update fetch URLs, fix button labels, fix info/error copy, fix busyKey strings.

- [ ] **Step 3.1: Replace `checkFirebaseStatus` function**

Find this block (lines 208–229):
```typescript
  const checkFirebaseStatus = async () => {
    setBusyKey('check-firebase')
    setError('')
    setInfo('')
    try {
      const res = await fetch('/api/admin/firebase/status')
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(body?.error || 'Failed to check database status')
      }

      const message = body?.connected
        ? `✓ Supabase connected. ${body.details || ''}`
        : `✗ Supabase not connected. ${body.details || ''}`

      setInfo(message)
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Failed to check database status')
    } finally {
      setBusyKey('')
    }
  }
```

Replace with:
```typescript
  const checkDbStatus = async () => {
    setBusyKey('db-status')
    setError('')
    setInfo('')
    try {
      const res = await fetch('/api/admin/db/status')
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(body?.error || 'Failed to check database status')
      }

      const message = body?.connected
        ? `✓ Supabase connected. ${body.details || ''}`
        : `✗ Supabase not connected. ${body.details || ''}`

      setInfo(message)
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Failed to check database status')
    } finally {
      setBusyKey('')
    }
  }
```

- [ ] **Step 3.2: Replace `seedFirebase` function**

Find this block (lines 183–206):
```typescript
  const seedFirebase = async () => {
    setBusyKey('seed-firebase')
    setError('')
    setInfo('')
    try {
      const res = await fetch('/api/admin/firebase/seed', { method: 'POST' })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(body?.error || 'Failed to seed Firebase')
      }
      const counts = body?.counts
      if (counts) {
        setInfo(
          `Firebase snapshot: ${counts.users} users, ${counts.listings} listings, ${counts.messages} messages, ${counts.reports} reports, ${counts.adminActivity} admin activity entries.`
        )
      } else {
        setInfo('Firebase check completed.')
      }
    } catch (seedError) {
      setError(seedError instanceof Error ? seedError.message : 'Failed to check database')
    } finally {
      setBusyKey('')
    }
  }
```

Replace with:
```typescript
  const checkDbSnapshot = async () => {
    setBusyKey('db-snapshot')
    setError('')
    setInfo('')
    try {
      const res = await fetch('/api/admin/db/snapshot', { method: 'POST' })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(body?.error || 'Failed to check database')
      }
      const counts = body?.counts
      if (counts) {
        setInfo(
          `Database snapshot: ${counts.users} users, ${counts.listings} listings, ${counts.messages} messages, ${counts.reports} reports, ${counts.adminActivity} admin activity entries.`
        )
      } else {
        setInfo('Database check completed.')
      }
    } catch (snapshotError) {
      setError(snapshotError instanceof Error ? snapshotError.message : 'Failed to check database')
    } finally {
      setBusyKey('')
    }
  }
```

- [ ] **Step 3.3: Update the button JSX**

Find this block (lines 244–260):
```tsx
          <button
            type="button"
            onClick={checkFirebaseStatus}
            disabled={busyKey === 'check-firebase'}
            className="ui-btn-secondary"
          >
            {busyKey === 'check-firebase' ? 'Checking...' : 'Check DB Status'}
          </button>
          <button
            type="button"
            onClick={seedFirebase}
            disabled={busyKey === 'seed-firebase'}
            className="ui-btn-secondary"
          >
            {busyKey === 'seed-firebase' ? 'Checking...' : 'Check Database'}
          </button>
```

Replace with:
```tsx
          <button
            type="button"
            onClick={checkDbStatus}
            disabled={busyKey === 'db-status'}
            className="ui-btn-secondary"
          >
            {busyKey === 'db-status' ? 'Checking...' : 'DB Status'}
          </button>
          <button
            type="button"
            onClick={checkDbSnapshot}
            disabled={busyKey === 'db-snapshot'}
            className="ui-btn-secondary"
          >
            {busyKey === 'db-snapshot' ? 'Checking...' : 'DB Snapshot'}
          </button>
```

- [ ] **Step 3.4: Verify no firebase references remain in AdminModerationClient.tsx**

```powershell
Select-String -Path "C:\Users\wjdgk\Desktop\mason-market\mason-market\src\app\admin\AdminModerationClient.tsx" -Pattern "firebase" -CaseSensitive:$false
```

Expected: no matches.

---

## Task 4: Clean .gitignore

**Files:**
- Modify: `.gitignore` (project root)

- [ ] **Step 4.1: Remove Firebase credential patterns**

Open `.gitignore` and remove these two lines (they appear near the bottom or in a Firebase section):
```
firebase-service-account.json
mason-market-firebase-adminsdk-*.json
```

- [ ] **Step 4.2: Verify no firebase references remain in src/**

```powershell
Get-ChildItem -Recurse -Path "C:\Users\wjdgk\Desktop\mason-market\mason-market\src" -Include "*.ts","*.tsx" | Select-String -Pattern "firebase" -CaseSensitive:$false
```

Expected: no matches.

- [ ] **Step 4.3: Commit Firebase removal**

```bash
cd "C:\Users\wjdgk\Desktop\mason-market\mason-market"
git add src/app/api/admin/db/ src/app/admin/AdminModerationClient.tsx .gitignore
git rm -r src/app/api/admin/firebase/
git commit -m "remove Firebase remnants, rename admin routes to /api/admin/db/*"
```

---

## Task 5: Messaging page UX improvements

**Files:**
- Modify: `src/app/messages/page.tsx`

Changes: auto-scroll thread to bottom on new messages, per-message timestamps, expand thread area height, write localStorage on mount, polish copy.

- [ ] **Step 5.1: Add threadScrollRef**

At the top of the component, after the existing refs, add:
```typescript
  const threadScrollRef = useRef<HTMLDivElement>(null)
```

(The `useRef` import is already present at line 4.)

- [ ] **Step 5.2: Add auto-scroll effect**

After the `loadThread` useEffect (around line 193), add this new effect:
```typescript
  // Scroll thread to bottom whenever new messages arrive
  useEffect(() => {
    if (threadScrollRef.current) {
      threadScrollRef.current.scrollTop = threadScrollRef.current.scrollHeight
    }
  }, [thread.length])
```

- [ ] **Step 5.3: Write localStorage on mount and improve subheading copy**

In the `loadInbox` useEffect (line 58), add `localStorage.setItem('mm_msgs_last_seen', Date.now().toString())` right after line 62 (`if (!currentUserId) return`):

Find:
```typescript
        if (!currentUserId) return

        const inboxRes = await fetch(`/api/messages?userId=${currentUserId}`)
```

Replace with:
```typescript
        if (!currentUserId) return
        localStorage.setItem('mm_msgs_last_seen', Date.now().toString())

        const inboxRes = await fetch(`/api/messages?userId=${currentUserId}`)
```

- [ ] **Step 5.4: Update subheading copy**

Find:
```tsx
      <p className="text-[13px] mt-1" style={{ color: 'var(--m-muted)' }}>
        Transaction chat for listing questions, pickup timing, and final price agreement.
      </p>
```

Replace with:
```tsx
      <p className="text-[13px] mt-1" style={{ color: 'var(--m-muted)' }}>
        Message sellers about availability, meetup timing, and price.
      </p>
```

- [ ] **Step 5.5: Update empty conversations copy**

Find:
```tsx
          <p style={{ color: 'var(--m-muted)' }}>No conversations yet.</p>
```

Replace with:
```tsx
          <p style={{ color: 'var(--m-muted)' }}>No conversations yet. Browse listings and message a seller to get started.</p>
```

- [ ] **Step 5.6: Attach threadScrollRef to the thread div and expand its height**

Find:
```tsx
                <div className="mt-4 h-[340px] overflow-y-auto rounded-xl bg-[var(--m-soft)] p-3">
```

Replace with:
```tsx
                <div ref={threadScrollRef} className="mt-4 flex-1 min-h-[280px] overflow-y-auto rounded-xl bg-[var(--m-soft)] p-3">
```

- [ ] **Step 5.7: Update empty thread copy**

Find:
```tsx
                    <p className="text-sm" style={{ color: 'var(--m-muted)' }}>No messages yet. Send the first message about pickup or price.</p>
```

Replace with:
```tsx
                    <p className="text-sm" style={{ color: 'var(--m-muted)' }}>No messages yet. Say hi or ask about availability.</p>
```

- [ ] **Step 5.8: Add per-message timestamps to text message bubbles**

Find the text message return block:
```tsx
                        return (
                          <div
                            key={message.id}
                            className={
                              fromCurrentUser
                                ? 'ml-auto max-w-[60%] rounded-[20px] rounded-br-[6px] px-4 py-2.5 text-sm text-white'
                                : 'mr-auto max-w-[60%] rounded-[20px] rounded-bl-[6px] border bg-white px-4 py-2.5 text-sm'
                            }
                            style={
                              fromCurrentUser
                                ? { background: 'var(--m-ink)' }
                                : { borderColor: 'var(--m-line)', color: 'var(--m-ink)' }
                            }
                          >
                            {message.body}
                          </div>
                        )
```

Replace with:
```tsx
                        return (
                          <div key={message.id} className={fromCurrentUser ? 'ml-auto max-w-[60%]' : 'mr-auto max-w-[60%]'}>
                            <div
                              className={
                                fromCurrentUser
                                  ? 'rounded-[20px] rounded-br-[6px] px-4 py-2.5 text-sm text-white'
                                  : 'rounded-[20px] rounded-bl-[6px] border bg-white px-4 py-2.5 text-sm'
                              }
                              style={
                                fromCurrentUser
                                  ? { background: 'var(--m-ink)' }
                                  : { borderColor: 'var(--m-line)', color: 'var(--m-ink)' }
                              }
                            >
                              {message.body}
                            </div>
                            <p className={`mt-0.5 text-[10px] ${fromCurrentUser ? 'text-right' : 'text-left'}`} style={{ color: 'var(--m-muted)' }}>
                              {formatRecency(message.createdAt)}
                            </p>
                          </div>
                        )
```

- [ ] **Step 5.9: Verify TypeScript compiles**

```bash
cd "C:\Users\wjdgk\Desktop\mason-market\mason-market"
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors in `messages/page.tsx`.

- [ ] **Step 5.10: Commit messaging improvements**

```bash
git add src/app/messages/page.tsx
git commit -m "improve messaging UX: auto-scroll, timestamps, thread height, localStorage, copy"
```

---

## Task 6: Header unread message badge

**Files:**
- Modify: `src/components/Header.tsx`

Adds a green dot to the Messages nav link when the user has conversations with messages newer than the last time they visited `/messages`.

- [ ] **Step 6.1: Add useState import**

`useState` is not currently imported in Header.tsx (only `useState` is at line 6). Confirm `useState` is already imported — it is (line 6: `import { useState } from 'react'`). No change needed for imports.

- [ ] **Step 6.2: Add unread state and effect**

After line 13 (`const [mobileSearchOpen, setMobileSearchOpen] = useState(false)`), add:

```typescript
  const [hasUnread, setHasUnread] = useState(false)

  // Check for unread conversations once on mount
  useEffect(() => {
    if (!session) { setHasUnread(false); return }
    const check = async () => {
      try {
        const res = await fetch('/api/messages')
        if (!res.ok) return
        const inbox: { lastMessageAt: string }[] = await res.json()
        const lastSeen = parseInt(localStorage.getItem('mm_msgs_last_seen') || '0', 10)
        setHasUnread(
          Array.isArray(inbox) && inbox.some(
            (c) => new Date(c.lastMessageAt).getTime() > lastSeen
          )
        )
      } catch {
        // silently ignore
      }
    }
    check()
  }, [session?.userId])

  // Clear unread badge when user navigates to messages
  useEffect(() => {
    if (pathname === '/messages') setHasUnread(false)
  }, [pathname])
```

`useEffect` is not currently imported in Header.tsx. Add it to the import on line 4:

Find:
```typescript
import { useState } from 'react'
```

Replace with:
```typescript
import { useEffect, useState } from 'react'
```

- [ ] **Step 6.3: Add dot to Messages nav link**

Find the nav link render block:
```tsx
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
```

Replace with:
```tsx
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
                  {item.href === '/messages' && hasUnread && (
                    <span className="ml-1 inline-flex h-2 w-2 rounded-full" style={{ background: 'var(--m-pop)' }} />
                  )}
                  {active && (
                    <span
                      className="absolute left-3 right-3 rounded-full"
                      style={{ bottom: -10, height: 3, background: 'var(--m-ink)' }}
                    />
                  )}
                </Link>
              )
            })}
```

- [ ] **Step 6.4: Verify TypeScript compiles**

```bash
cd "C:\Users\wjdgk\Desktop\mason-market\mason-market"
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors in `Header.tsx`.

- [ ] **Step 6.5: Commit Header unread badge**

```bash
git add src/components/Header.tsx
git commit -m "add unread message dot to Messages nav link in Header"
```

---

## Task 7: Build verification

- [ ] **Step 7.1: Run full production build**

```bash
cd "C:\Users\wjdgk\Desktop\mason-market\mason-market"
npm run build 2>&1
```

Expected: build succeeds with no TypeScript errors, no missing module errors, no "Module not found" for firebase.

If the build fails, fix errors before continuing.

- [ ] **Step 7.2: Final firebase reference check across entire project**

```powershell
Get-ChildItem -Recurse -Path "C:\Users\wjdgk\Desktop\mason-market\mason-market\src" -Include "*.ts","*.tsx","*.js" | Select-String -Pattern "firebase" -CaseSensitive:$false
```

Expected: zero matches.

- [ ] **Step 7.3: Verify new admin routes exist**

```powershell
Test-Path "C:\Users\wjdgk\Desktop\mason-market\mason-market\src\app\api\admin\db\snapshot\route.ts"
Test-Path "C:\Users\wjdgk\Desktop\mason-market\mason-market\src\app\api\admin\db\status\route.ts"
```

Expected: both `True`.

- [ ] **Step 7.4: Final commit**

```bash
cd "C:\Users\wjdgk\Desktop\mason-market\mason-market"
git add -A
git status
git commit -m "chore: deploy-ready pass complete — Firebase removed, messaging UX improved, unread badge added"
```

---

## Summary of Changes

| Task | Files | What changed |
|---|---|---|
| 1–2 | `api/admin/db/snapshot/`, `api/admin/db/status/` | Created; old `firebase/` routes deleted |
| 3 | `AdminModerationClient.tsx` | Functions renamed, URLs updated, copy fixed |
| 4 | `.gitignore` | Firebase credential patterns removed |
| 5 | `messages/page.tsx` | Auto-scroll, per-message timestamps, flex thread height, localStorage write, copy |
| 6 | `Header.tsx` | Unread dot on Messages nav link |
| 7 | — | Build verified, zero firebase references confirmed |

## Known pre-existing state (no action needed)
- Self-message prevention is already implemented server-side in `api/messages/route.ts` (lines 82–94)
- Sold listing messaging block is already in `api/messages/route.ts` (line 78–80)
- Delete confirmation dialog already exists in `item/[id]/page.tsx` (line 176–178)
- Seller controls are already hidden from non-owners
