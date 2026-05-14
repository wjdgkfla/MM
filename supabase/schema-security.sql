-- Mason Market — Security Hardening
-- Run this in the Supabase SQL Editor.
-- Safe to run multiple times.

-- ─── Enable RLS on all tables ────────────────────────────────────────────────
-- Service-role key bypasses RLS entirely, so all API routes keep working.
-- This blocks any direct anon/authenticated client from reading/writing tables.
alter table users          enable row level security;
alter table listings       enable row level security;
alter table favorites      enable row level security;
alter table messages       enable row level security;
alter table conversations  enable row level security;
alter table ratings        enable row level security;
alter table reports        enable row level security;
alter table admin_activity enable row level security;

-- ─── Fix function search paths ───────────────────────────────────────────────
-- Prevents search_path injection attacks on all three functions.
alter function update_favorite_count()         set search_path = public;
alter function listings_search_vector_update() set search_path = public;
alter function increment_view_count(text)      set search_path = public;

-- ─── Fix increment_view_count ────────────────────────────────────────────────
-- Remove SECURITY DEFINER (not needed — service role has full access already).
-- Revoke public execute so anonymous users can't call it directly.
create or replace function increment_view_count(listing_id text)
returns void language sql security invoker set search_path = public as $$
  update listings set view_count = view_count + 1 where id = listing_id;
$$;

revoke execute on function increment_view_count(text) from public;
revoke execute on function increment_view_count(text) from anon;
revoke execute on function increment_view_count(text) from authenticated;
