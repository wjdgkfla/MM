-- Mason Market — User Blocking
-- Run this in the Supabase SQL Editor.
-- Safe to run multiple times.

-- ─── Blocks ───────────────────────────────────────────────────────────────
-- A user can immediately stop another user from messaging them, independent
-- of reporting. blocker_id blocked blocked_id; enforcement is bidirectional
-- (see blocksIsBlocked in supabaseDataAccess.ts) — either party having
-- blocked the other stops new messages.
create table if not exists blocks (
  blocker_id text not null references users(id) on delete cascade,
  blocked_id text not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create index if not exists blocks_blocked_id_idx on blocks (blocked_id);

-- Service-role key bypasses RLS, so all API routes keep working; this only
-- blocks direct anon/authenticated client access, matching every other
-- user-scoped table in schema-security.sql.
alter table blocks enable row level security;
