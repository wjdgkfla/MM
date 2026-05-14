-- Mason Market — Schema Add-ons
-- Run this in the Supabase SQL Editor AFTER schema.sql

-- ─── Atomic view count increment RPC ─────────────────────────────────────
create or replace function increment_view_count(listing_id text)
returns void language sql security definer as $$
  update listings set view_count = view_count + 1 where id = listing_id;
$$;

-- ─── Data integrity constraints ───────────────────────────────────────────
-- These use DO blocks to skip gracefully if the constraint already exists.

do $$ begin
  alter table users add constraint users_display_name_length
    check (length(display_name) <= 100);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table messages add constraint messages_offer_amount_bounds
    check (offer_amount is null or (offer_amount > 0 and offer_amount <= 100000));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table messages add constraint messages_body_length
    check (length(body) >= 1 and length(body) <= 2000);
exception when duplicate_object then null;
end $$;
