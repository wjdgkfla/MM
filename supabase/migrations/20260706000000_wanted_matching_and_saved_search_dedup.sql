-- P1-13: dedupe saved searches — canonicalize query+filters into a stable
-- key so the same user saving the same search twice upserts instead of
-- accumulating duplicate rows.

alter table saved_searches add column if not exists normalized_key text;

-- Backfill existing rows with a best-effort key (query + raw filters JSON).
-- Doesn't need to match the app's canonicalization exactly — it only needs
-- to be stable so the unique index below doesn't collide on pre-existing data.
update saved_searches
set normalized_key = lower(trim(query)) || '|' || coalesce(filters::text, '{}')
where normalized_key is null;

alter table saved_searches alter column normalized_key set not null;
alter table saved_searches alter column normalized_key set default '';

-- Drop older duplicates (same user + same canonical search), keeping the
-- most recent so any existing notification history stays on the newest row.
delete from saved_searches a
using saved_searches b
where a.user_id = b.user_id
  and a.normalized_key = b.normalized_key
  and (a.created_at, a.id) < (b.created_at, b.id);

create unique index if not exists saved_searches_user_normalized_key_idx
  on saved_searches (user_id, normalized_key);
