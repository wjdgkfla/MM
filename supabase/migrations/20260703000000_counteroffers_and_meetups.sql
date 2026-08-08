-- Mason Market — Counteroffers, offer lifecycle, meetup scheduling
-- Run this in the Supabase SQL Editor. Safe to run multiple times.

-- ─── Offer lifecycle columns ────────────────────────────────────────────────
-- parent_offer_message_id links a counteroffer back to the offer it replaces,
-- forming a visible chain. expires_at lets accept/counter actions reject a
-- stale offer without a cron job — actionability is simply checked at the
-- moment of the action (and on read, in the UI).
alter table messages add column if not exists parent_offer_message_id text references messages(id);
alter table messages add column if not exists expires_at timestamptz;

-- Lightweight "I'm on my way" / "I'm here" notices near meetup time, modeled
-- as a flag on an ordinary text message rather than a new presence system.
alter table messages add column if not exists presence_status text;
do $$ begin
  alter table messages add constraint messages_presence_status_check
    check (presence_status is null or presence_status in ('on_the_way', 'arrived'));
exception when duplicate_object then null;
end $$;

-- Extend offer_status with withdrawn (buyer pulls back a pending offer) and
-- superseded (parent of an accepted counteroffer). The original check was
-- declared inline on the column, so Postgres auto-named it
-- messages_offer_status_check — same rename pattern already used for
-- messages_type_check in 20260401000000_marketplace_addons.sql.
alter table messages drop constraint if exists messages_offer_status_check;
alter table messages add constraint messages_offer_status_check
  check (offer_status is null or offer_status in ('pending', 'accepted', 'declined', 'withdrawn', 'superseded'));

create index if not exists messages_parent_offer_idx on messages (parent_offer_message_id);

-- ─── Counteroffer RPC ───────────────────────────────────────────────────────
-- Mirrors accept_offer(): locks the parent offer row, supersedes it, and
-- inserts the new offer atomically so only one offer in a chain is ever
-- "pending" at a time.
create or replace function counter_offer(
  parent_message_id text,
  actor_user_id text,
  new_amount numeric,
  new_body text,
  new_expires_at timestamptz
) returns text language plpgsql security invoker set search_path = public as $$
declare
  v_listing_id      text;
  v_from_user_id    text;
  v_to_user_id      text;
  v_conversation_id text;
  v_expires_at      timestamptz;
  v_new_id          text;
begin
  select listing_id, from_user_id, to_user_id, conversation_id, expires_at
    into v_listing_id, v_from_user_id, v_to_user_id, v_conversation_id, v_expires_at
    from messages
    where id = parent_message_id
      and type = 'offer'
      and offer_status = 'pending'
    for update;

  if not found then
    raise exception 'Offer not found or no longer active';
  end if;

  if actor_user_id <> v_to_user_id then
    raise exception 'Only the offer recipient can counter this offer';
  end if;

  if v_expires_at is not null and v_expires_at < now() then
    raise exception 'This offer has expired';
  end if;

  update messages set offer_status = 'superseded' where id = parent_message_id;

  v_new_id := 'msg_' || replace(gen_random_uuid()::text, '-', '');

  insert into messages (
    id, listing_id, conversation_id, from_user_id, to_user_id, body,
    type, offer_amount, offer_status, parent_offer_message_id, expires_at
  ) values (
    v_new_id, v_listing_id, v_conversation_id, actor_user_id, v_from_user_id, new_body,
    'offer', new_amount, 'pending', parent_message_id, new_expires_at
  );

  return v_new_id;
end;
$$;

revoke execute on function counter_offer(text, text, numeric, text, timestamptz) from public;
revoke execute on function counter_offer(text, text, numeric, text, timestamptz) from anon;
revoke execute on function counter_offer(text, text, numeric, text, timestamptz) from authenticated;

-- accept_offer() is redefined here (same name/signature) to also reject an
-- expired pending offer — the only other place "offer actionability" is
-- decided server-side besides counter_offer() above.
create or replace function accept_offer(offer_message_id text, actor_user_id text)
returns text language plpgsql security invoker set search_path = public as $$
declare
  v_listing_id  text;
  v_buyer_id    text;
  v_seller_id   text;
  v_agreed_price numeric(10,2);
  v_asking_price numeric(10,2);
  v_listing_status text;
  v_expires_at  timestamptz;
  v_transaction_id text;
begin
  select listing_id, from_user_id, to_user_id, offer_amount, expires_at
    into v_listing_id, v_buyer_id, v_seller_id, v_agreed_price, v_expires_at
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

  if v_expires_at is not null and v_expires_at < now() then
    raise exception 'This offer has expired';
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

-- ─── Completion confirmation RPC ────────────────────────────────────────────
-- Buyer and seller each confirm independently; the transaction only flips to
-- completed once both confirmations are present. Row lock avoids a race where
-- both sides confirm at the same instant and neither update sees the other's.
create or replace function confirm_transaction_completion(txn_id text, actor_user_id text)
returns text language plpgsql security invoker set search_path = public as $$
declare
  v_seller_id           text;
  v_buyer_id             text;
  v_seller_confirmed_at  timestamptz;
  v_buyer_confirmed_at   timestamptz;
  v_status               text;
begin
  select seller_id, buyer_id, seller_confirmed_at, buyer_confirmed_at, status
    into v_seller_id, v_buyer_id, v_seller_confirmed_at, v_buyer_confirmed_at, v_status
    from transactions
    where id = txn_id
    for update;

  if not found then
    raise exception 'Transaction not found';
  end if;

  if actor_user_id <> v_seller_id and actor_user_id <> v_buyer_id then
    raise exception 'Only the buyer or seller can confirm this exchange';
  end if;

  if v_status = 'cancelled' then
    raise exception 'This transaction was cancelled';
  end if;

  if v_status = 'completed' then
    return 'completed';
  end if;

  if actor_user_id = v_seller_id and v_seller_confirmed_at is null then
    v_seller_confirmed_at := now();
  end if;
  if actor_user_id = v_buyer_id and v_buyer_confirmed_at is null then
    v_buyer_confirmed_at := now();
  end if;

  if v_seller_confirmed_at is not null and v_buyer_confirmed_at is not null then
    v_status := 'completed';
    update transactions
      set seller_confirmed_at = v_seller_confirmed_at,
          buyer_confirmed_at = v_buyer_confirmed_at,
          status = 'completed',
          completed_at = now(),
          updated_at = now()
      where id = txn_id;
  else
    update transactions
      set seller_confirmed_at = v_seller_confirmed_at,
          buyer_confirmed_at = v_buyer_confirmed_at,
          updated_at = now()
      where id = txn_id;
  end if;

  return v_status;
end;
$$;

revoke execute on function confirm_transaction_completion(text, text) from public;
revoke execute on function confirm_transaction_completion(text, text) from anon;
revoke execute on function confirm_transaction_completion(text, text) from authenticated;
