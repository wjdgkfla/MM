-- Mason Market — Supabase / Postgres Schema
-- Run this once in the Supabase SQL editor after project creation.

-- ─── Users ────────────────────────────────────────────────────────────────
create table if not exists users (
  id           text primary key,
  role         text not null default 'student' check (role in ('student','admin')),
  account_state text not null default 'active' check (account_state in ('active','suspended')),
  display_name  text not null,
  gmu_email     text not null unique,
  gmu_email_verified bool not null default true,
  profile_image_url  text,
  is_student_seller  bool not null default true,
  home_campus   text not null default 'fairfax',
  campus_verification text not null default 'pending' check (campus_verification in ('verified','pending')),
  last_active_at timestamptz not null default now(),
  joined_at      timestamptz not null default now(),
  trust_badge    text not null default 'new-seller',
  reputation_score int not null default 0,
  listing_count   int not null default 0
);

create index if not exists users_gmu_email_idx on users (lower(gmu_email));

-- ─── Listings ─────────────────────────────────────────────────────────────
create table if not exists listings (
  id               text primary key,
  title            text not null,
  description      text not null,
  price            numeric(10,2) not null default 0,
  category         text not null default 'other',
  condition        text not null default 'good',
  status           text not null default 'available' check (status in ('available','reserved','sold')),
  moderation_state text not null default 'visible' check (moderation_state in ('visible','flagged','hidden')),
  image_urls       text[] not null default '{}',
  seller_id        text not null references users(id) on delete cascade,
  seller_profile   jsonb not null default '{}',
  campus_location  text not null default 'fairfax',
  pickup_zone      text not null default 'jc-lobby',
  pickup_notes     text not null default '',
  course_code      text,
  professor_name   text,
  edition          text,
  bundle_notes     text,
  tags             text[] not null default '{}',
  favorite_count   int not null default 0,
  view_count       int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  search_vector    tsvector generated always as (
    to_tsvector('english',
      coalesce(title,'') || ' ' ||
      coalesce(description,'') || ' ' ||
      coalesce(course_code,'') || ' ' ||
      coalesce(professor_name,'') || ' ' ||
      coalesce(pickup_notes,'') || ' ' ||
      coalesce(array_to_string(tags,' '),'')
    )
  ) stored
);

create index if not exists listings_seller_id_idx  on listings (seller_id);
create index if not exists listings_status_idx      on listings (status);
create index if not exists listings_category_idx    on listings (category);
create index if not exists listings_campus_idx      on listings (campus_location);
create index if not exists listings_moderation_idx  on listings (moderation_state);
create index if not exists listings_created_idx     on listings (created_at desc);
create index if not exists listings_search_idx      on listings using gin (search_vector);
create index if not exists listings_tags_idx        on listings using gin (tags);

-- ─── Favorites ────────────────────────────────────────────────────────────
create table if not exists favorites (
  user_id    text not null references users(id) on delete cascade,
  listing_id text not null references listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index if not exists favorites_user_id_idx on favorites (user_id);

-- Trigger to keep listings.favorite_count in sync
create or replace function update_favorite_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update listings set favorite_count = favorite_count + 1 where id = NEW.listing_id;
  elsif TG_OP = 'DELETE' then
    update listings set favorite_count = greatest(0, favorite_count - 1) where id = OLD.listing_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_favorite_count on favorites;
create trigger trg_favorite_count
  after insert or delete on favorites
  for each row execute function update_favorite_count();

-- ─── Messages ─────────────────────────────────────────────────────────────
create table if not exists messages (
  id              text primary key,
  listing_id      text not null references listings(id) on delete cascade,
  conversation_id text not null,
  from_user_id    text not null references users(id) on delete cascade,
  to_user_id      text not null references users(id) on delete cascade,
  body            text not null,
  type            text not null default 'text' check (type in ('text','offer')),
  offer_amount    numeric(10,2),
  offer_status    text check (offer_status in ('pending','accepted','declined')),
  created_at      timestamptz not null default now()
);

create index if not exists messages_conversation_idx  on messages (conversation_id, created_at asc);
create index if not exists messages_from_user_idx     on messages (from_user_id, created_at desc);
create index if not exists messages_to_user_idx       on messages (to_user_id, created_at desc);
create index if not exists messages_listing_idx       on messages (listing_id, created_at asc);

-- ─── Conversations ────────────────────────────────────────────────────────
create table if not exists conversations (
  id              text primary key,
  listing_id      text not null references listings(id) on delete cascade,
  buyer_id        text not null references users(id) on delete cascade,
  seller_id       text not null references users(id) on delete cascade,
  last_message    text not null default '',
  unread_count    int not null default 0,
  is_active       bool not null default true,
  participants    jsonb not null default '{}',
  participant_ids text[] not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists conversations_updated_idx        on conversations (updated_at desc);
create index if not exists conversations_participant_ids_idx on conversations using gin (participant_ids);
create index if not exists conversations_buyer_idx          on conversations (buyer_id);
create index if not exists conversations_seller_idx         on conversations (seller_id);

-- ─── Ratings ──────────────────────────────────────────────────────────────
create table if not exists ratings (
  id         text primary key,
  seller_id  text not null references users(id) on delete cascade,
  buyer_id   text not null references users(id) on delete cascade,
  listing_id text not null references listings(id) on delete cascade,
  score      smallint not null check (score in (1,-1)),
  tags       text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (buyer_id, listing_id)
);

create index if not exists ratings_seller_idx on ratings (seller_id, created_at desc);

-- ─── Reports ──────────────────────────────────────────────────────────────
create table if not exists reports (
  id                   text primary key,
  listing_id           text not null references listings(id) on delete cascade,
  seller_id            text not null references users(id) on delete cascade,
  reported_by_user_id  text not null references users(id) on delete cascade,
  reason               text not null,
  notes                text,
  include_seller       bool not null default false,
  status               text not null default 'open' check (status in ('open','reviewed','resolved')),
  created_at           timestamptz not null default now(),
  unique (reported_by_user_id, listing_id)
);

create index if not exists reports_status_idx on reports (status, created_at desc);

-- ─── Admin Activity ───────────────────────────────────────────────────────
create table if not exists admin_activity (
  id                text primary key,
  actor_user_id     text not null references users(id) on delete cascade,
  actor_display_name text not null,
  action            text not null,
  target_type       text not null check (target_type in ('listing','user','report')),
  target_id         text not null,
  notes             text,
  created_at        timestamptz not null default now()
);

create index if not exists admin_activity_created_idx on admin_activity (created_at desc);

-- ─── Disable RLS (all access via service-role API routes) ─────────────────
alter table users           disable row level security;
alter table listings        disable row level security;
alter table favorites       disable row level security;
alter table messages        disable row level security;
alter table conversations   disable row level security;
alter table ratings         disable row level security;
alter table reports         disable row level security;
alter table admin_activity  disable row level security;
