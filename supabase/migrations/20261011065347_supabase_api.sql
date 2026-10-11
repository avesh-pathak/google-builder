-- Apply after 001_initial_schema.sql. Server-side Data API access only.
-- Keep deny-all RLS for anon/authenticated: demo IDs are not authentication.
grant usage on schema public to service_role;
grant select, insert, update, delete, truncate on
  public.users, public.cafes, public.menu_items, public.friendships,
  public.visits, public.visit_items, public.user_favorites, public.item_ratings
to service_role;

-- Runs as service_role, never as the function owner. A failed item insertion
-- rolls back the cafe, visit and all items together.
create or replace function public.app_create_visit(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  cafe_key text;
  visit_key text := 'visit-' || pg_catalog.gen_random_uuid()::text;
  item jsonb;
  menu_key text;
  result jsonb;
begin
  if payload is null or pg_catalog.jsonb_typeof(payload->'items') is distinct from 'array' then
    raise exception 'Invalid visit payload' using errcode = '22023';
  end if;
  if pg_catalog.jsonb_array_length(payload->'items') < 1
     or nullif(pg_catalog.btrim(payload->>'cafeName'), '') is null then
    raise exception 'A cafe name and at least one item are required' using errcode = '22023';
  end if;
  if not exists (select 1 from public.users where id = payload->>'userId') then
    raise exception 'User not found' using errcode = '23503';
  end if;

  -- Serialize cafe resolution to avoid duplicate cafes from concurrent submissions.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(pg_catalog.lower(payload->>'cafeName'), 0));
  select id into cafe_key from public.cafes
    where pg_catalog.lower(name) = pg_catalog.lower(payload->>'cafeName') order by id limit 1;
  if cafe_key is null then
    cafe_key := 'cafe-' || pg_catalog.gen_random_uuid()::text;
    insert into public.cafes (id, name, location, description, image)
    values (cafe_key, payload->>'cafeName', 'Added by you', '',
      coalesce((select image from public.cafes order by id limit 1), ''));
  end if;

  insert into public.visits (id, user_id, cafe_id, cafe_name, visited_at, notes, shared_with_friends, source)
  values (visit_key, payload->>'userId', cafe_key, payload->>'cafeName',
    (payload->>'visitedAt')::date, payload->>'note', (payload->>'shared')::boolean, 'manual');

  for item in select value from pg_catalog.jsonb_array_elements(payload->'items') loop
    select id into menu_key from public.menu_items where id = item->>'menuItemId';
    insert into public.visit_items (id, visit_id, menu_item_id, item_name, rating)
    values ('visititem-' || pg_catalog.gen_random_uuid()::text, visit_key, menu_key,
      item->>'itemName', (item->>'rating')::smallint);
  end loop;

  select pg_catalog.to_jsonb(v) || pg_catalog.jsonb_build_object('visit_items',
    (select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(vi) order by vi.id)
      from public.visit_items vi where vi.visit_id = visit_key))
    into result from public.visits v where v.id = visit_key;
  return result;
end;
$$;
revoke all on function public.app_create_visit(jsonb) from public, anon, authenticated;
grant execute on function public.app_create_visit(jsonb) to service_role;

-- Existing development reset behavior; never exposed by the production handler.
create or replace function public.app_reset_demo_data()
returns void
language sql
security invoker
set search_path = ''
as $$
  truncate public.visit_items, public.visits, public.user_favorites, public.item_ratings,
    public.friendships, public.menu_items, public.cafes, public.users;
$$;
revoke all on function public.app_reset_demo_data() from public, anon, authenticated;
grant execute on function public.app_reset_demo_data() to service_role;

-- Read-only API readiness probe: verifies this migration and table access.
create or replace function public.app_api_status()
returns text
language sql
security invoker
set search_path = ''
as $$
  select 'supabase-api-v1'::text from (select count(*) from public.users) as probe;
$$;
revoke all on function public.app_api_status() from public, anon, authenticated;
grant execute on function public.app_api_status() to service_role;

notify pgrst, 'reload schema';
