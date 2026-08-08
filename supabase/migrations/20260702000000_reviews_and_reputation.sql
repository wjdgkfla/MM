-- Mason Market — Reviews tied to completed transactions + transparent reputation
-- Run this in the Supabase SQL Editor. Safe to run multiple times.

-- ─── Ratings → transactions ─────────────────────────────────────────────────
-- Ratings previously only proved "this buyer messaged this seller about this
-- listing" (see messagesExistsByUserAndListing in the old /api/ratings POST
-- handler) — not that anything was actually bought. transaction_id makes the
-- transaction the source of eligibility; reviewer_id/reviewee_id record which
-- direction the review runs (buyer→seller or, now, seller→buyer).
alter table ratings add column if not exists transaction_id text references transactions(id);
alter table ratings add column if not exists reviewer_id    text references users(id);
alter table ratings add column if not exists reviewee_id    text references users(id);

-- Backfill: every pre-existing rating was buyer→seller by definition (that
-- was the only direction the old form supported).
update ratings set reviewer_id = buyer_id, reviewee_id = seller_id where reviewer_id is null;

-- Pre-existing ratings predate the transactions table, so none of them can be
-- linked to a real transaction — they were never gated on a completed sale in
-- the first place. This is a demo app with no production ratings history, so
-- the safe/simple move is to drop them rather than carry ungated reviews
-- forward under the new "transaction required" model.
delete from ratings where transaction_id is null;

alter table ratings alter column transaction_id set not null;
alter table ratings alter column reviewer_id set not null;
alter table ratings alter column reviewee_id set not null;

-- One review per reviewer per transaction (replaces the old one-review-per-
-- buyer-per-listing constraint, which couldn't express "buyer and seller each
-- get one review of the other").
alter table ratings drop constraint if exists ratings_buyer_id_listing_id_key;
alter table ratings add constraint ratings_reviewer_transaction_key unique (reviewer_id, transaction_id);

create index if not exists ratings_reviewee_idx on ratings (reviewee_id, created_at desc);
create index if not exists ratings_transaction_idx on ratings (transaction_id);

-- ─── Reputation formula ──────────────────────────────────────────────────────
-- adjust_reputation_score() applied `listing.price / 10 * score` as a delta,
-- so a $1,000 laptop swung reputation 10x more than a $100 textbook — not a
-- meaningful trust signal. Reputation is now computed app-side from
-- completed-transaction count + review positivity (see
-- usersRecomputeReputationScore / usersReputationSummary in
-- supabaseDataAccess.ts) and written with a plain UPDATE, so the RPC is no
-- longer needed.
drop function if exists adjust_reputation_score(text, numeric);
