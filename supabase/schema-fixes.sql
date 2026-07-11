-- Mason Market — Bug Fixes
-- Run this in the Supabase SQL Editor AFTER schema.sql, schema-addons.sql, and schema-security.sql.
-- Safe to run multiple times.

-- ─── Fix reputation_score column type ────────────────────────────────────
-- usersAdjustReputationScore() computes deltas with one decimal place of
-- precision (e.g. 1.5, -2.3) — the "manner temperature" feature is built
-- around that granularity (see mannerTemperature() and its tests). The
-- column was declared as `int`, so every fractional update was silently
-- rejected by Postgres and swallowed by the caller (neither the select nor
-- the update checked their `error` result). Net effect: reputation_score
-- never actually changed after a rating, for any user, ever.
alter table users alter column reputation_score type numeric(6,1) using reputation_score::numeric(6,1);
alter table users alter column reputation_score set default 0;

-- ─── Allow reporting a user without a listing ────────────────────────────
-- Every report previously required a listing_id, so there was no way to
-- report a user for DM harassment once a listing was sold/deleted, or for
-- abuse that never involved a listing at all. seller_id is reused as "the
-- reported user id" for these listing-less reports (it was already just a
-- foreign key to users, not tied to marketplace-seller status specifically).
alter table reports alter column listing_id drop not null;

-- ─── Atomic reputation score adjustment ──────────────────────────────────
-- usersAdjustReputationScore() previously did a plain select-then-update in
-- JS, which races: two ratings landing close together (different buyers
-- rating the same seller) can both read the same starting value, and the
-- second write silently overwrites the first, dropping one rating's effect.
-- A single UPDATE ... SET x = x + delta is atomic at the row level in
-- Postgres — mirrors the existing increment_view_count() RPC.
create or replace function adjust_reputation_score(user_id text, delta numeric)
returns void language sql security invoker set search_path = public as $$
  update users
  set reputation_score = round(least(62.5, greatest(-36.5, reputation_score + delta)) * 10) / 10
  where id = user_id;
$$;

revoke execute on function adjust_reputation_score(text, numeric) from public;
revoke execute on function adjust_reputation_score(text, numeric) from anon;
revoke execute on function adjust_reputation_score(text, numeric) from authenticated;

-- ─── Session versioning for password-reset invalidation ─────────────────
-- The app session cookie is a self-contained signed token with no
-- server-side revocation list — decodeSession() only checked the HMAC
-- signature and 14-day expiry. Resetting a password called Supabase's
-- global signOut (revokes Supabase refresh tokens) but never touched the
-- separate Mason Market app cookie, so an already-issued cookie (e.g.
-- stolen via a shared device) kept working for up to 14 days after the
-- legitimate user "reset and signed out everywhere." session_version is
-- embedded in each cookie at issue time and bumped on password reset;
-- getSessionFromRequest() now rejects any cookie whose embedded version
-- doesn't match the user's current row.
alter table users add column if not exists session_version integer not null default 0;

create or replace function increment_session_version(user_id text)
returns void language sql security invoker set search_path = public as $$
  update users set session_version = session_version + 1 where id = user_id;
$$;

revoke execute on function increment_session_version(text) from public;
revoke execute on function increment_session_version(text) from anon;
revoke execute on function increment_session_version(text) from authenticated;
