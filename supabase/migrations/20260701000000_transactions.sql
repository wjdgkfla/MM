-- Mason Market — Transactions
-- Run this in the Supabase SQL Editor.
-- Safe to run multiple times.

-- ─── Transactions ───────────────────────────────────────────────────────────
-- First-class transaction entity. Today transaction state is scattered across
-- listing.status, offer messages' offer_status, meetup messages, and ratings —
-- there is no authoritative row answering "who bought this, for what price,
-- was it completed." This table is that source of truth; accept_offer()
-- below is the only way a row is created, so it always starts from a real
-- accepted offer with a real buyer/seller/price.
create table if not exists transactions (
  id                        text primary key,
  listing_id                text not null references listings(id),
  seller_id                 text not null references users(id),
  buyer_id                  text not null references users(id),
  accepted_offer_message_id text,
  asking_price              numeric(10,2) not null,
  agreed_price              numeric(10,2),
  status                    text not null default 'initiated'
    check (status in ('initiated','reserved','meetup_scheduled','completed','cancelled','disputed')),
  meetup_zone               text,
  meetup_time               timestamptz,
  seller_confirmed_at       timestamptz,
  buyer_confirmed_at        timestamptz,
  completed_at              timestamptz,
  cancelled_at              timestamptz,
  cancellation_reason       text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists transactions_listing_id_idx on transactions (listing_id);
create index if not exists transactions_seller_id_idx  on transactions (seller_id);
create index if not exists transactions_buyer_id_idx   on transactions (buyer_id);
create index if not exists transactions_status_idx     on transactions (status);

-- Service-role key bypasses RLS, so all API routes keep working; this only
-- blocks direct anon/authenticated client access, matching every other
-- table in schema-security.sql.
alter table transactions enable row level security;

-- ─── Atomic accept-offer RPC ─────────────────────────────────────────────────
-- messagesUpdateOfferStatus() previously only flipped one message's
-- offer_status — it never reserved the listing for that buyer, never
-- recorded the agreed price anywhere durable, and never touched competing
-- pending offers on the same listing. accept_offer() does all of that in one
-- transaction (row locks via `for update` prevent two concurrent accepts on
-- the same offer/listing from both succeeding). Mirrors the
-- adjust_reputation_score / increment_session_version RPC pattern: plain SQL
-- where possible, plpgsql only because this needs branching + a locked read.
create or replace function accept_offer(offer_message_id text, actor_user_id text)
returns text language plpgsql security invoker set search_path = public as $$
declare
  v_listing_id  text;
  v_buyer_id    text;
  v_seller_id   text;
  v_agreed_price numeric(10,2);
  v_asking_price numeric(10,2);
  v_listing_status text;
  v_transaction_id text;
begin
  select listing_id, from_user_id, to_user_id, offer_amount
    into v_listing_id, v_buyer_id, v_seller_id, v_agreed_price
    from messages
    where id = offer_message_id
      and type = 'offer'
      and offer_status = 'pending'
    for update;

  if not found then
    raise exception 'Offer not found or already resolved';
  end if;

  if v_seller_id <> actor_user_id then
    raise exception 'Only the offer recipient can accept this offer';
  end if;

  select status, price into v_listing_status, v_asking_price
    from listings
    where id = v_listing_id and seller_id = actor_user_id
    for update;

  if not found then
    raise exception 'Only the seller can accept offers on this listing';
  end if;

  if v_listing_status <> 'available' then
    raise exception 'Listing is no longer available';
  end if;

  v_transaction_id := 'txn_' || replace(gen_random_uuid()::text, '-', '');

  update messages set offer_status = 'accepted' where id = offer_message_id;

  -- Any other pending offer on this listing is now moot — decline it.
  update messages
    set offer_status = 'declined'
    where listing_id = v_listing_id
      and type = 'offer'
      and offer_status = 'pending'
      and id <> offer_message_id;

  insert into transactions (
    id, listing_id, seller_id, buyer_id, accepted_offer_message_id,
    asking_price, agreed_price, status
  ) values (
    v_transaction_id, v_listing_id, actor_user_id, v_buyer_id, offer_message_id,
    v_asking_price, v_agreed_price, 'reserved'
  );

  update listings set status = 'reserved', updated_at = now() where id = v_listing_id;

  return v_transaction_id;
end;
$$;

revoke execute on function accept_offer(text, text) from public;
revoke execute on function accept_offer(text, text) from anon;
revoke execute on function accept_offer(text, text) from authenticated;
