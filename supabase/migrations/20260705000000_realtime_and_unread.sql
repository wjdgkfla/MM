-- Mason Market — Enable Realtime on messages (P1-1)
-- Run this in the Supabase SQL Editor. Safe to run multiple times.

-- ─── Replace 2-second chat polling with Supabase Realtime ───────────────
-- The messages page now subscribes to INSERT events on this table for the
-- active conversation instead of polling every 2s. Realtime only delivers
-- change events for tables added to the supabase_realtime publication —
-- do it here so a fresh environment doesn't need a manual dashboard step.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table messages;
  end if;
end $$;
