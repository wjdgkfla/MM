-- Mason Market — let a buyer accept a seller's counteroffer
-- Safe to run multiple times.

-- accept_offer() assumed the offer recipient (to_user_id) is always the listing
-- seller. That is true for an opening offer (buyer -> seller) but not for a
-- counteroffer, which counter_offer() sends seller -> buyer. Accepting one
-- therefore always failed with "Only the seller can accept offers on this
-- listing", so a negotiation could never end in a transaction.
--
-- The seller is now taken from the listing itself, and the buyer is the other
-- participant of the offer. Only the offer recipient can still accept.
-- CREATE OR REPLACE keeps the existing execute grants/revokes on the function.
create or replace function accept_offer(offer_message_id text, actor_user_id text)
returns text language plpgsql security invoker set search_path = public as $$
declare
  v_listing_id  text;
  v_from_user_id text;
  v_to_user_id   text;
  v_seller_id   text;
  v_buyer_id    text;
  v_agreed_price numeric(10,2);
  v_asking_price numeric(10,2);
  v_listing_status text;
  v_expires_at  timestamptz;
  v_transaction_id text;
begin
  select listing_id, from_user_id, to_user_id, offer_amount, expires_at
    into v_listing_id, v_from_user_id, v_to_user_id, v_agreed_price, v_expires_at
    from messages
    where id = offer_message_id
      and type = 'offer'
      and offer_status = 'pending'
    for update;

  if not found then
    raise exception 'Offer not found or already resolved';
  end if;

  if v_to_user_id <> actor_user_id then
    raise exception 'Only the offer recipient can accept this offer';
  end if;

  if v_expires_at is not null and v_expires_at < now() then
    raise exception 'This offer has expired';
  end if;

  select status, price, seller_id into v_listing_status, v_asking_price, v_seller_id
    from listings
    where id = v_listing_id
    for update;

  if not found then
    raise exception 'Listing not found';
  end if;

  if v_seller_id = v_to_user_id then
    v_buyer_id := v_from_user_id;   -- opening offer: buyer -> seller
  elsif v_seller_id = v_from_user_id then
    v_buyer_id := v_to_user_id;     -- counteroffer: seller -> buyer
  else
    raise exception 'This offer is not between the listing seller and a buyer';
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
    v_transaction_id, v_listing_id, v_seller_id, v_buyer_id, offer_message_id,
    v_asking_price, v_agreed_price, 'reserved'
  );

  update listings set status = 'reserved', updated_at = now() where id = v_listing_id;

  return v_transaction_id;
end;
$$;
