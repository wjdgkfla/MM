# Design: Mason Market Deploy-Ready Pass
_Date: 2026-05-15_

## Goal
Make Mason Market production-ready by removing all Firebase remnants, improving messaging UX, fixing listing lifecycle edge cases, adding an unread message indicator in the Header, polishing UI copy, and verifying a clean build.

## Approach
Sequential sweep — infra/naming first, then product behavior, then polish, then build. Each layer is stable before the next touches it.

---

## Section 1 — Firebase Removal

### What exists
- `/api/admin/firebase/seed/route.ts` — POST endpoint that runs Supabase table counts. Route path and internal naming are Firebase leftovers.
- `/api/admin/firebase/status/route.ts` — GET endpoint that pings Supabase. Same issue.
- `AdminModerationClient.tsx` — functions `seedFirebase()` / `checkFirebaseStatus()`, button labels "Check DB Status" / "Check Database", info string "Firebase snapshot: ...".
- `.gitignore` — has `firebase-service-account.json` and `mason-market-firebase-adminsdk-*.json` patterns.

### Changes
1. Create `src/app/api/admin/db/snapshot/route.ts` with the same logic as the seed route. Delete the `firebase/seed/` route.
2. Create `src/app/api/admin/db/status/route.ts` with the same logic as the status route. Delete the `firebase/status/` route.
3. In `AdminModerationClient.tsx`:
   - Rename `seedFirebase` → `checkDbSnapshot`, update fetch URL to `/api/admin/db/snapshot`
   - Rename `checkFirebaseStatus` → `checkDbStatus`, update fetch URL to `/api/admin/db/status`
   - Button labels: "DB Snapshot" and "DB Status"
   - Info message: "Firebase snapshot:" → "Database snapshot:"
   - Error message: "Failed to seed Firebase" → "Failed to check database"
   - busyKey strings: `'seed-firebase'` → `'db-snapshot'`, `'check-firebase'` → `'db-status'`
4. Remove Firebase credential patterns from `.gitignore`.

---

## Section 2 — Messaging UX

### Auto-scroll to bottom on new messages
- Add `threadEndRef = useRef<HTMLDivElement>(null)` in `messages/page.tsx`
- Place `<div ref={threadEndRef} />` at the bottom of the thread message list
- Add `useEffect(() => { threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [thread])` — only fires when message count changes to avoid jitter

### Per-message timestamps
- Add a timestamp below each message bubble using `formatRecency(message.createdAt)`
- Small, muted text (same style as conversation sidebar timestamps)

### Thread area sizing
- Change fixed `h-[340px]` to `flex-1 min-h-[280px] overflow-y-auto` so the thread fills available vertical space in the panel

### Unread badge in Header
- When user opens `/messages` page, write `localStorage.setItem('mm_msgs_last_seen', Date.now().toString())`
- In `Header.tsx`, when user is signed in, fetch `/api/messages?userId=X` once on mount
- Compare each conversation's `lastMessageAt` to `localStorage.getItem('mm_msgs_last_seen')`
- Show a small green dot on the Messages nav link if any conversation has a newer message
- Dot is a `<span>` with `absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[var(--m-pop)]`

---

## Section 3 — Listing & API Fixes

### Server-side self-message prevention
- In `src/app/api/messages/route.ts` (POST handler): if `toUserId === session.userId`, return `{ error: 'You cannot send a message to yourself.' }` with status 400.

### Sold listing messaging guard
- The UI already disables messaging for sold listings. Verify the API doesn't allow it (check existing validation in messages route).

---

## Section 4 — Copy Polish

| Location | Before | After |
|---|---|---|
| `AdminModerationClient.tsx` button | "Check DB Status" | "DB Status" |
| `AdminModerationClient.tsx` button | "Check Database" | "DB Snapshot" |
| `AdminModerationClient.tsx` info | "Firebase snapshot: ..." | "Database snapshot: ..." |
| `AdminModerationClient.tsx` error | "Failed to seed Firebase" | "Failed to check database" |
| `messages/page.tsx` empty state | "No conversations yet." | "No conversations yet. Browse listings and message a seller to get started." |
| `messages/page.tsx` subheading | "Transaction chat for listing questions, pickup timing, and final price agreement." | "Message sellers about availability, meetup timing, and price." |
| `messages/page.tsx` empty thread | "No messages yet. Send the first message about pickup or price." | "No messages yet. Say hi or ask about availability." |

---

## Section 5 — Build Verification

1. Run `npm run build` — fix all TypeScript and import errors
2. Grep for any remaining `firebase` references in `src/`
3. Confirm `/api/admin/db/snapshot` and `/api/admin/db/status` routes respond correctly
4. Confirm messaging self-send is blocked

---

## Files Changed Summary

| File | Change type |
|---|---|
| `src/app/api/admin/firebase/seed/route.ts` | Deleted |
| `src/app/api/admin/firebase/status/route.ts` | Deleted |
| `src/app/api/admin/db/snapshot/route.ts` | Created |
| `src/app/api/admin/db/status/route.ts` | Created |
| `src/app/admin/AdminModerationClient.tsx` | Renamed functions, URLs, labels, copy |
| `src/app/messages/page.tsx` | Auto-scroll, timestamps, thread sizing, localStorage write, copy |
| `src/components/Header.tsx` | Unread badge fetch + dot indicator |
| `src/app/api/messages/route.ts` | Self-message guard |
| `.gitignore` | Remove Firebase patterns |

---

## Constraints
- No database schema changes
- No new npm dependencies
- Keep existing Supabase logic intact
- No real-time websockets — polling only
- Admin access remains role-based (no hardcoded emails added)
