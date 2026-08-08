-- Mason Market — DB-native course-tag search + cursor pagination support (P1-6, P1-7)
-- Run this in the Supabase SQL Editor. Safe to run multiple times.

-- ─── Move course-tag filtering fully into Postgres (P1-6) ────────────────
-- Course-tag search previously pulled up to 2000 rows into JS and matched
-- course_code/tags there. Normalize both into indexed, generated columns so
-- the match happens as a real SQL WHERE clause instead.
create extension if not exists pg_trgm;

alter table listings
  add column if not exists course_code_normalized text
    generated always as (
      regexp_replace(lower(coalesce(course_code, '')), '[^a-z0-9]', '', 'g')
    ) stored;

-- Space-separated so a substring match can't accidentally span two tags
-- (e.g. tags 'abc' + 'def' must not match a search for 'cd').
alter table listings
  add column if not exists tags_normalized text
    generated always as (
      regexp_replace(lower(coalesce(array_to_string(tags, ' '), '')), '[^a-z0-9 ]', '', 'g')
    ) stored;

create index if not exists listings_course_code_normalized_trgm_idx
  on listings using gin (course_code_normalized gin_trgm_ops);
create index if not exists listings_tags_normalized_trgm_idx
  on listings using gin (tags_normalized gin_trgm_ops);

-- ─── Cursor pagination on (created_at, id) / (price, id) (P1-7) ──────────
-- Offset pagination (page/range) can skip or duplicate rows as listings
-- change while users browse. Keyset pagination needs an index on the sort
-- column plus id as a tiebreaker so the (column, id) comparison stays fast.
create index if not exists listings_created_at_id_idx on listings (created_at desc, id desc);
create index if not exists listings_price_id_idx on listings (price, id);
