-- Mason Market — Soft-delete listings (P0-6)
-- Run this in the Supabase SQL Editor. Safe to run multiple times.

-- ─── Stop hard-deleting listings and transaction evidence ───────────────
-- Deleting a listing previously ran DELETE FROM listings, which cascades
-- into favorites, messages, conversations, ratings, and reports tied to
-- that listing — erasing evidence needed for safety investigations,
-- disputes, and reputation history. Soft delete instead: mark the row and
-- exclude it from normal browse/search reads, but keep it (and everything
-- that references it) in the database for moderation/support.
alter table listings
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by text,
  add column if not exists delete_reason text;
