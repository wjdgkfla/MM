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
