-- Read-only public projection; the HTTP layer chooses the permitted public root.
-- No session, receipt, audit, quota update, or row lock is created by this function.
grant usage on schema attractor to service_role;
grant select (id, mode) on attractor.settings to service_role;
grant select (id, parent_id, title, kind, tags, artifact, content_hash, created_at)
  on attractor.shared_states to service_role;

create or replace function public.attractor_thread(
  p_root uuid,
  p_after timestamptz default null,
  p_after_id uuid default null,
  p_limit integer default 20,
  p_parent uuid default null
) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare current_mode text; result jsonb;
begin
  select mode into current_mode from attractor.settings where id = true;
  if current_mode is null or current_mode = 'FULL_STOP' then
    return jsonb_build_object('error', 'Public thread unavailable.', 'status', 503);
  end if;
  if p_root is null or p_limit is null or p_limit < 1 or p_limit > 20
     or (p_after is null) <> (p_after_id is null) then
    return jsonb_build_object('error', 'Root, paired cursor and limit 1-20 required.', 'status', 400);
  end if;
  if not exists (select 1 from attractor.shared_states where id = p_root) then
    return jsonb_build_object('error', 'Thread root not found.', 'status', 404);
  end if;
  if p_parent is not null then
    with recursive members(id) as (
      select id from attractor.shared_states where id = p_root
      union
      select child.id from attractor.shared_states child join members m on child.parent_id = m.id
    ) select jsonb_build_object('belongs', exists(select 1 from members where id = p_parent)) into result;
    return result;
  end if;
  -- UNION deduplicates IDs and terminates even if historical data contains a cycle.
  -- The existing shared-state write gate bounds the whole store to 2,000 states.
  with recursive members(id) as (
    select id from attractor.shared_states where id = p_root
    union
    select child.id from attractor.shared_states child join members m on child.parent_id = m.id
  ), candidates as (
    select s.id, s.parent_id, s.title, s.kind, s.tags, s.artifact, s.content_hash, s.created_at
    from attractor.shared_states s join members m on m.id = s.id
    where p_after is null or (s.created_at, s.id) > (p_after, p_after_id)
    order by s.created_at, s.id limit p_limit + 1
  ), page as (
    select * from candidates order by created_at, id limit p_limit
  ) select jsonb_build_object(
    'root_id', 'ATR-S-' || p_root,
    'items', coalesce((select jsonb_agg(jsonb_build_object(
      'id', 'ATR-S-' || id,
      'parent_id', case when parent_id is not null then 'ATR-S-' || parent_id end,
      'title', title, 'kind', kind, 'tags', tags, 'artifact', artifact,
      'content_hash', content_hash, 'created_at', created_at
    ) order by created_at, id) from page), '[]'::jsonb),
    'next_cursor', case when (select count(*) from candidates) > p_limit then
      (select jsonb_build_object('created_at', created_at, 'id', id)
       from page order by created_at desc, id desc limit 1)
      else null end
  ) into result;
  return result;
end $$;

revoke all on function public.attractor_thread(uuid,timestamptz,uuid,integer,uuid)
  from public, anon, authenticated;
grant execute on function public.attractor_thread(uuid,timestamptz,uuid,integer,uuid)
  to service_role;
