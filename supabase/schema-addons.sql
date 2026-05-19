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

-- ─── Performance index for conversation inbox queries ──────────────────────
-- Speeds up conversationsListByUser at scale (GIN scan + sort without full table scan)
create index if not exists conversations_active_updated_idx
  on conversations (updated_at desc)
  where is_active = true;

-- Phase 2+ feature additions are additive so existing data is preserved.
alter table users add column if not exists bio text not null default '';
alter table users add column if not exists marketing_email_opt_in bool not null default false;

alter table listings add column if not exists listing_kind text not null default 'sell';
alter table listings add column if not exists cover_image_url text;
alter table listings add column if not exists expires_at timestamptz;
alter table listings add column if not exists last_refreshed_at timestamptz;

do $$ begin
  alter table listings add constraint listings_listing_kind_check
    check (listing_kind in ('sell','wanted'));
exception when duplicate_object then null;
end $$;

alter table conversations add column if not exists buyer_last_read_at timestamptz;
alter table conversations add column if not exists seller_last_read_at timestamptz;

alter table messages add column if not exists meetup_status text;
alter table messages add column if not exists meetup_zone text;
alter table messages add column if not exists meetup_time timestamptz;

alter table messages drop constraint if exists messages_type_check;
alter table messages add constraint messages_type_check
  check (type in ('text','offer','meetup'));

do $$ begin
  alter table messages add constraint messages_meetup_status_check
    check (meetup_status is null or meetup_status in ('proposed','confirmed','rescheduled','cancelled','completed'));
exception when duplicate_object then null;
end $$;

create table if not exists notifications (
  id         text primary key,
  user_id    text not null references users(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text not null,
  link       text,
  meta       jsonb,
  is_read    bool not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on notifications (user_id, is_read, created_at desc);

create table if not exists saved_searches (
  id               text primary key,
  user_id          text not null references users(id) on delete cascade,
  label            text not null,
  query            text not null default '',
  filters          jsonb not null default '{}',
  last_notified_at timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists saved_searches_user_idx
  on saved_searches (user_id, created_at desc);

create table if not exists price_watches (
  user_id         text not null references users(id) on delete cascade,
  listing_id      text not null references listings(id) on delete cascade,
  last_seen_price numeric(10,2) not null default 0,
  created_at      timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index if not exists price_watches_listing_idx
  on price_watches (listing_id);
