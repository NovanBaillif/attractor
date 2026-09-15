-- Dedicated ATTRACTOR project only. Apply once through the Supabase migration API.
create schema if not exists attractor;
revoke all on schema attractor from public, anon, authenticated;
grant usage on schema attractor to service_role;

create table attractor.settings(id boolean primary key default true check(id), mode text not null default 'NORMAL' check(mode in ('NORMAL','CONTRIBUTIONS_PAUSED','OBSERVATION_ONLY','FULL_STOP')));
insert into attractor.settings(id) values(true);
create table attractor.sessions(id uuid primary key default gen_random_uuid(), token_hash text not null unique, created_at timestamptz not null default now(), source text not null check(source in ('unattributed','controlled','seed')));
create table attractor.artifacts(id uuid primary key default gen_random_uuid(), session_id uuid references attractor.sessions on delete set null, slug text not null, parent_id uuid references attractor.artifacts, revision integer not null default 1, recipe jsonb not null, examples jsonb not null, conventions jsonb not null default '{}', content_hash text not null, verification jsonb not null, origin text not null check(origin in ('visitor','seed')), created_at timestamptz not null default now(), check(octet_length(recipe::text)+octet_length(examples::text)+octet_length(conventions::text)<20000));
create index artifacts_parent on attractor.artifacts(parent_id);
alter table attractor.artifacts add column problem jsonb check(problem is null or octet_length(problem::text)<12000);
create index artifacts_slug on attractor.artifacts(slug text_pattern_ops);
create index artifacts_session on attractor.artifacts(session_id);
create table attractor.exposures(id uuid primary key default gen_random_uuid(), session_id uuid not null references attractor.sessions on delete cascade, artifact_id uuid not null references attractor.artifacts, content_hash text not null, marker uuid not null default gen_random_uuid(), created_at timestamptz not null default now(), unique(id,session_id,artifact_id));
create index exposures_session on attractor.exposures(session_id,created_at);
create index exposures_artifact on attractor.exposures(artifact_id);
create table attractor.events(id bigint generated always as identity primary key, session_id uuid references attractor.sessions on delete set null, action text not null, artifact_id uuid references attractor.artifacts, exposure_id uuid references attractor.exposures on delete set null, detail jsonb not null default '{}', created_at timestamptz not null default now());
create index events_session on attractor.events(session_id,created_at);
create index events_knowledge on attractor.events((detail->>'knowledge_id'),id) where action='MCP_REQUEST';
create index events_time on attractor.events(created_at);
create index events_artifact on attractor.events(artifact_id);
create index events_exposure on attractor.events(exposure_id);
create table attractor.quotas(bucket text primary key, count integer not null, expires_at timestamptz not null);
create table attractor.shared_states(id uuid primary key default gen_random_uuid(),session_id uuid references attractor.sessions on delete set null,parent_id uuid references attractor.shared_states,title text not null,kind text not null check(kind in ('json','code','plan')),tags jsonb not null,artifact jsonb not null,content_hash text not null,created_at timestamptz not null default now(),check(octet_length(artifact::text)<=16000),check(length(title)<=120),check(jsonb_typeof(tags)='array' and jsonb_array_length(tags)<=8));
create index shared_states_parent on attractor.shared_states(parent_id);
create index shared_states_session on attractor.shared_states(session_id,created_at);
create table attractor.state_reads(id uuid primary key default gen_random_uuid(),session_id uuid not null references attractor.sessions on delete cascade,state_id uuid not null references attractor.shared_states,created_at timestamptz not null default now());
create index state_reads_session on attractor.state_reads(session_id,created_at);
create index state_reads_state on attractor.state_reads(state_id);

alter table attractor.settings enable row level security;
alter table attractor.sessions enable row level security;
alter table attractor.artifacts enable row level security;
alter table attractor.exposures enable row level security;
alter table attractor.events enable row level security;
alter table attractor.quotas enable row level security;
alter table attractor.shared_states enable row level security;
alter table attractor.state_reads enable row level security;
grant select,insert,update,delete on all tables in schema attractor to service_role;
grant usage,select on all sequences in schema attractor to service_role;

create function public.attractor_rpc(p_op text,p_token_hash text,p_network_hash text,p_args jsonb default '{}') returns jsonb
language plpgsql security invoker set search_path='' as $$
declare sid uuid; a attractor.artifacts; parent attractor.artifacts; exp attractor.exposures; st attractor.shared_states; state_parent attractor.shared_states; state_receipt attractor.state_reads; n integer; current_mode text; out jsonb; q text; day text:=to_char(now(),'YYYY-MM-DD'); minute text:=to_char(now(),'YYYY-MM-DD-HH24-MI');
begin
  -- One bounded transactional gate gives atomic quotas, lineage and caps.
  select mode into current_mode from attractor.settings where id=true for update;
  if p_op='health' then return jsonb_build_object('mode',current_mode,'persistence',true,'protocol','0.2'); end if;
  if p_op='admin_mode' then
    update attractor.settings set mode=p_args->>'mode' where id=true;
    return jsonb_build_object('mode',p_args->>'mode');
  end if;
  if p_op='timeline' then
    return jsonb_build_object('events',coalesce((select jsonb_agg(x) from (
      select e.id,e.session_id,e.action,e.created_at,e.detail,s.source from attractor.events e left join attractor.sessions s on s.id=e.session_id
      where coalesce(e.session_id::text,'request:'||(e.detail->>'request_id'))=p_args->>'subject'
        and (p_args->>'before' is null or e.id<(p_args->>'before')::bigint)
      order by e.id desc limit 200) x),'[]'::jsonb));
  end if;
  if p_op='observatory' then
    with event_rows as (
      select coalesce(e.session_id::text,'request:'||(e.detail->>'request_id')) subject,e.*,s.source declared_source
      from attractor.events e left join attractor.sessions s on s.id=e.session_id
      where e.session_id is not null or e.action in ('MCP_REQUEST','A2A_REQUEST')
    ), grouped as (
      select subject id,case when bool_or(declared_source='controlled' or detail->>'controlled_test'='true') then 'controlled' else 'unattributed' end source,
        min(created_at) first_at,max(created_at) last_at,
        (array_agg(coalesce(detail->>'jsonrpc_method',action) order by id desc))[1] last_event,
        max(detail->>'network_day') network_day,
        coalesce(jsonb_agg(distinct detail->>'user_agent') filter(where detail->>'user_agent' is not null),'[]') user_agents,
        coalesce(jsonb_agg(distinct (detail->>'client_name')||'/'||coalesce(detail->>'client_version','?')) filter(where detail->>'client_name' is not null),'[]') clients,
        coalesce(jsonb_agg(distinct detail->>'protocol_version') filter(where detail->>'protocol_version' is not null),'[]') protocols,
        coalesce(jsonb_agg(distinct detail->>'tool_catalog_hash') filter(where detail->>'tool_catalog_hash' is not null and detail->>'jsonrpc_method' in ('tools/list','server/discover')),'[]') catalogs,
        count(*) filter(where detail->>'jsonrpc_method' in ('initialize','server/discover','tools/list') and detail->>'result_status'='success') discovery,
        count(*) filter(where detail->>'jsonrpc_method'='tools/list' and detail->>'result_status'='success') capability_views,
        count(*) filter(where detail->>'jsonrpc_method' in ('tools/call','SendMessage') or (action='NATIVE_REQUEST' and detail->>'transport'='http-json')) calls,
        count(*) filter(where (detail->>'jsonrpc_method' in ('tools/call','SendMessage') or (action='NATIVE_REQUEST' and detail->>'transport'='http-json')) and detail->>'result_status'='success') tool_successes,
        count(*) filter(where action='AGENT_TOOL_CALL_SUCCESS') honey_results,
        count(*) filter(where action in ('PRODUCED','MODIFIED')) contributions,
        count(*) filter(where action='VERIFIED_USE') verified_uses,
        count(*) filter(where action='STATE_SHARED') states_shared,
        count(*) filter(where action='STATE_DERIVED') states_derived,
        count(*) filter(where action='STATE_READ') states_read,
        count(*) filter(where action='STATE_VERIFIED') states_verified,
        count(*) filter(where detail->>'error_category'='expected_transport_behavior' or (detail->>'http_status'='405' and detail->>'http_method' in ('GET','DELETE','HEAD'))) expected_transport,
        count(*) filter(where (detail->>'error_category' is not null and detail->>'error_category'<>'expected_transport_behavior') or (detail->>'error_category' is null and detail->>'result_status' in ('jsonrpc_error','http_error','tool_error') and not (coalesce(detail->>'http_status','')='405' and coalesce(detail->>'http_method','') in ('GET','DELETE','HEAD')))) errors
      from event_rows group by subject
    ), catalogs as (
      select subject,jsonb_agg(distinct tool) presented_tools from event_rows cross join lateral jsonb_array_elements_text(coalesce(detail->'catalog_presented','[]')) tool group by subject
    ) select coalesce(jsonb_agg(to_jsonb(g)||jsonb_build_object('presented_tools',coalesce(c.presented_tools,'[]'))),'[]') into out from grouped g left join catalogs c on c.subject=g.id;
    return jsonb_build_object('checked_at',now(),'subjects',out,'links',coalesce((
      select jsonb_agg(link) from (
        select 'recipe_verified' kind,artifact_owner.session_id::text "from",e.session_id::text "to",'ATR-K-'||artifact_owner.id::text knowledge_id,e.id event_id
        from attractor.events e join attractor.artifacts artifact_owner on artifact_owner.id=e.artifact_id where e.action='VERIFIED_USE' and artifact_owner.session_id is not null
        union all
        select 'value_reused',p.session_id::text,e.session_id::text,e.detail->>'reused_knowledge_id',e.id
        from attractor.events e join lateral (
          select x.session_id from attractor.events x where x.action='MCP_REQUEST' and x.id<e.id and x.detail->>'knowledge_id'=e.detail->>'reused_knowledge_id' order by x.id limit 1
        ) p on true where e.action='MCP_REQUEST' and e.detail->>'reused_knowledge_id' is not null
        union all
        select 'state_verified',e.detail->>'from_session',e.session_id::text,e.detail->>'state_id',e.id
        from attractor.events e where e.action='STATE_VERIFIED' and e.detail->>'from_session' is not null
      ) link),'[]'));
  end if;
  if p_op='admin' then
    return jsonb_build_object('mode',current_mode,
      'sessions',(select count(*) from attractor.sessions),'artifacts',(select count(*) from attractor.artifacts),
      'exposures',(select count(*) from attractor.exposures),
      'honey',(select jsonb_build_object('attempts',count(*) filter(where e.action='AGENT_TOOL_CALL_ATTEMPT'),'controlled_success',count(*) filter(where e.action='AGENT_TOOL_CALL_SUCCESS' and s.source='controlled'),'unattributed_success',count(*) filter(where e.action='AGENT_TOOL_CALL_SUCCESS' and s.source='unattributed'),'unknown_source_success',count(*) filter(where e.action='AGENT_TOOL_CALL_SUCCESS' and s.source is null),'errors',count(*) filter(where e.action='AGENT_TOOL_CALL_ERROR')) from attractor.events e left join attractor.sessions s on s.id=e.session_id),
      'cross_session_revisions',(select count(*) from attractor.artifacts c join attractor.artifacts p on p.id=c.parent_id where c.session_id<>p.session_id),
      'events',coalesce((select jsonb_agg(x) from (select e.*,s.source from attractor.events e left join attractor.sessions s on s.id=e.session_id order by e.id desc limit 100) x),'[]'::jsonb));
  end if;
  if current_mode='FULL_STOP' then return jsonb_build_object('error','Expériences arrêtées.','status',503); end if;
  if current_mode='CONTRIBUTIONS_PAUSED' and p_op in ('create','share_state') then return jsonb_build_object('error','Contributions paused.','status',503); end if;
  if current_mode='OBSERVATION_ONLY' and p_op in ('create','use','validate','honey_attempt','honey_result','share_state','verify_state') then return jsonb_build_object('error','Écritures suspendues.','status',503); end if;
  -- Purge at most once per UTC day; bounded by deployment-wide storage caps.
  insert into attractor.quotas(bucket,count,expires_at) values('purge:'||day,1,now()+interval '2 days') on conflict do nothing;
  if found then
    delete from attractor.events where created_at<now()-interval '30 days';
    delete from attractor.exposures where created_at<now()-interval '30 days';
    delete from attractor.sessions where created_at<now()-interval '30 days';
    delete from attractor.quotas where expires_at<now();
  end if;
  foreach q in array array['global:'||day,'net:'||p_network_hash||':'||minute,'session:'||p_token_hash||':'||minute] loop
    insert into attractor.quotas(bucket,count,expires_at) values(q,1,now()+case when q like 'global:%' then interval '2 days' else interval '2 minutes' end)
      on conflict(bucket) do update set count=attractor.quotas.count+1 returning count into n;
    if n>(case when q like 'global:%' then 10000 when q like 'net:%' then 120 else 60 end) then return jsonb_build_object('error','Quota atteint.','status',429); end if;
  end loop;
  if p_op='mcp_gate' then return jsonb_build_object('mode',current_mode); end if;
  if p_op='mcp_trace' then
    if (select count(*) from attractor.events)>=100000 then return jsonb_build_object('recorded',false); end if;
    select id into sid from attractor.sessions where token_hash=p_token_hash and created_at>now()-interval '30 days';
    if exists(select 1 from attractor.sessions where id=sid and source='controlled') then
      p_args=p_args||jsonb_build_object('controlled_test',true,'classification','CONTROLLED');
    end if;
    p_args=p_args||jsonb_build_object('reused_knowledge_id',null);
    if p_args->>'result_status'='success' and p_args->>'claimed_knowledge_id' is not null and exists(
      select 1 from attractor.events prior where prior.action='MCP_REQUEST'
        and prior.detail->>'knowledge_id'=p_args->>'claimed_knowledge_id'
        and prior.detail->>'output_value_hash'=p_args->>'input_value_hash'
        and prior.detail->>'result_status'='success'
    ) then p_args=p_args||jsonb_build_object('reused_knowledge_id',p_args->>'claimed_knowledge_id'); end if;
    insert into attractor.events(session_id,action,detail) values(sid,case when p_args->>'transport'='a2a' then 'A2A_REQUEST' else 'MCP_REQUEST' end,p_args);
    return jsonb_build_object('recorded',true,'attractor_session_id',sid,'controlled_test',p_args->'controlled_test','reused_knowledge_id',p_args->'reused_knowledge_id');
  end if;
  if p_op='capabilities' then
    if (select count(*) from attractor.events)>=100000 then return jsonb_build_object('error','Journal capacity reached.','status',503); end if;
    select id into sid from attractor.sessions where token_hash=p_token_hash and created_at>now()-interval '30 days';
    insert into attractor.events(session_id,action,detail) values(sid,'CAPABILITY_DISCOVERY','{}');
    return jsonb_build_object('recorded',true);
  end if;
  if p_op='session' then
    if (select count(*) from attractor.sessions)>=10000 then return jsonb_build_object('error','Capacité de sessions atteinte.','status',503); end if;
    insert into attractor.sessions(token_hash,source) values(p_token_hash,case when p_args->>'source'='controlled' then 'controlled' else 'unattributed' end) returning id into sid;
    insert into attractor.events(session_id,action,detail) values(sid,'SESSION',jsonb_build_object('entrypoint',p_args->>'entrypoint','campaign',p_args->>'campaign','attribution','declared_not_verified'));
    return jsonb_build_object('session_id',sid,'source',case when p_args->>'source'='controlled' then 'controlled' else 'unattributed' end);
  end if;
  select id into sid from attractor.sessions where token_hash=p_token_hash and created_at>now()-interval '30 days';
  if sid is null then return jsonb_build_object('error','Session requise ou expirée.','status',401); end if;
  if (select count(*) from attractor.events)>=100000 then return jsonb_build_object('error','Capacité de journal atteinte.','status',503); end if;
  if p_op='native_gate' then return jsonb_build_object('mode',current_mode); end if;
  if p_op='native_event' then
    insert into attractor.events(session_id,action,detail) values(sid,'NATIVE_REQUEST',p_args);
    return jsonb_build_object('recorded',true);
  end if;
  if p_op='share_state' then
    if (select count(*) from attractor.shared_states)>=2000 then return jsonb_build_object('error','Shared state capacity reached.','status',503); end if;
    if (select count(*) from attractor.shared_states where session_id=sid and created_at>now()-interval '1 day')>=20 then return jsonb_build_object('error','20 states per application context per day.','status',429); end if;
    if p_args->>'parent_id' is not null then
      select * into state_parent from attractor.shared_states where id=replace(p_args->>'parent_id','ATR-S-','')::uuid;
      select * into state_receipt from attractor.state_reads where id=(p_args->>'read_receipt')::uuid and session_id=sid and state_id=state_parent.id;
      if state_receipt.id is null then return jsonb_build_object('error','Parent read receipt required in the same application context.','status',409); end if;
      if state_parent.content_hash=p_args->>'content_hash' then return jsonb_build_object('error','Derived state must change the artifact.','status',409); end if;
    end if;
    insert into attractor.shared_states(session_id,parent_id,title,kind,tags,artifact,content_hash) values(sid,state_parent.id,p_args->>'title',p_args->>'kind',p_args->'tags',p_args->'artifact',p_args->>'content_hash') returning * into st;
    insert into attractor.events(session_id,action,detail) values(sid,case when st.parent_id is null then 'STATE_SHARED' else 'STATE_DERIVED' end,jsonb_build_object('state_id','ATR-S-'||st.id,'parent_id',case when st.parent_id is not null then 'ATR-S-'||st.parent_id end,'from_session',state_parent.session_id,'content_hash',st.content_hash));
    return jsonb_build_object('state',(to_jsonb(st)-'session_id'-'artifact')||jsonb_build_object('id','ATR-S-'||st.id,'parent_id',case when st.parent_id is not null then 'ATR-S-'||st.parent_id end),'public',true);
  end if;
  if p_op='retrieve_state' then
    if p_args->>'id' is null then
      select coalesce(jsonb_agg(x),'[]') into out from (
        select 'ATR-S-'||s.id id,case when s.parent_id is not null then 'ATR-S-'||s.parent_id end parent_id,s.title,s.kind,s.tags,s.content_hash,s.created_at
        from attractor.shared_states s where not exists(select 1 from jsonb_array_elements_text(p_args->'words') w where lower(s.title||' '||s.tags::text) not like '%'||w||'%') order by s.created_at desc,s.id limit least(coalesce((p_args->>'limit')::integer,5),10)
      ) x;
      insert into attractor.events(session_id,action,detail) values(sid,'STATE_SEARCH',jsonb_build_object('visible_ids',(select coalesce(jsonb_agg(x->'id'),'[]') from jsonb_array_elements(out) x)));
      return jsonb_build_object('states',out,'limit',coalesce((p_args->>'limit')::integer,5),'trust','untrusted_data');
    end if;
    select * into st from attractor.shared_states where id=replace(p_args->>'id','ATR-S-','')::uuid;
    if st.id is null then return jsonb_build_object('error','State not found.','status',404); end if;
    if (select count(*) from attractor.state_reads)>=10000 then return jsonb_build_object('error','State read receipt capacity reached.','status',503); end if;
    insert into attractor.state_reads(session_id,state_id) values(sid,st.id) returning * into state_receipt;
    insert into attractor.events(session_id,action,detail) values(sid,'STATE_READ',jsonb_build_object('state_id','ATR-S-'||st.id,'from_session',st.session_id,'content_hash',st.content_hash));
    return jsonb_build_object('state',(to_jsonb(st)-'session_id')||jsonb_build_object('id','ATR-S-'||st.id,'parent_id',case when st.parent_id is not null then 'ATR-S-'||st.parent_id end),'read_receipt',state_receipt.id,'trust','untrusted_data');
  end if;
  if p_op='verify_state' then
    select * into st from attractor.shared_states where id=replace(p_args->>'state_id','ATR-S-','')::uuid;
    select * into state_receipt from attractor.state_reads where id=(p_args->>'read_receipt')::uuid and state_id=st.id and session_id=sid;
    if state_receipt.id is null or st.content_hash<>p_args->>'content_hash' then return jsonb_build_object('error','State content and private read receipt must match.','status',409); end if;
    if exists(select 1 from attractor.events where action='STATE_VERIFIED' and detail->>'read_receipt'=state_receipt.id::text) then return jsonb_build_object('verified',true,'already_recorded',true); end if;
    insert into attractor.events(session_id,action,detail) values(sid,'STATE_VERIFIED',jsonb_build_object('state_id','ATR-S-'||st.id,'from_session',st.session_id,'read_receipt',state_receipt.id,'content_hash',st.content_hash,'constraints_hash',p_args->>'constraints_hash'));
    return jsonb_build_object('verified',true,'meaning','Identical retrieved artifact passed explicit constraints; semantic correctness and independent agency are not established.');
  end if;
  if p_op='honey_attempt' then
    insert into attractor.events(session_id,action,detail) values(sid,'AGENT_TOOL_CALL_ATTEMPT',p_args);
    return jsonb_build_object('recorded',true);
  end if;
  if p_op='honey_result' then
    if not exists(select 1 from attractor.events where session_id=sid and action='AGENT_TOOL_CALL_ATTEMPT' and detail->>'request_id'=p_args->>'request_id' and detail->>'tool_name'=p_args->>'tool_name') then return jsonb_build_object('error','Missing tool attempt.','status',409); end if;
    if exists(select 1 from attractor.events where session_id=sid and action in ('AGENT_TOOL_CALL_SUCCESS','AGENT_TOOL_CALL_ERROR') and detail->>'request_id'=p_args->>'request_id') then return jsonb_build_object('error','Tool result already recorded.','status',409); end if;
    insert into attractor.events(session_id,action,detail) values(sid,case when p_args->>'status'='success' then 'AGENT_TOOL_CALL_SUCCESS' else 'AGENT_TOOL_CALL_ERROR' end,p_args);
    return jsonb_build_object('recorded',true);
  end if;
  if p_op='commons' then
    select coalesce(jsonb_agg(x),'[]') into out from (
      select candidate.id,candidate.slug,candidate.revision,candidate.parent_id,candidate.origin,candidate.recipe,candidate.examples,candidate.conventions,candidate.problem,candidate.content_hash,candidate.verification,
        (select jsonb_build_object('controlled_uses',count(*) filter(where s.source='controlled'),'unattributed_uses',count(*) filter(where s.source='unattributed'),'unknown_source_uses',count(*) filter(where s.source is null)) from attractor.events e left join attractor.sessions s on s.id=e.session_id where e.artifact_id=candidate.id and e.action='VERIFIED_USE') as evidence,
        coalesce((select jsonb_agg(v) from (select c.id,c.parent_id,c.revision,c.slug from attractor.artifacts c where c.parent_id=candidate.id or c.id=candidate.parent_id order by c.id limit 30) v),'[]') as variants
      from attractor.artifacts candidate
      where not exists(select 1 from jsonb_array_elements_text(coalesce(p_args->'words','[]')) w where lower(candidate.slug||' '||coalesce(candidate.problem->>'title','')) not like '%'||w||'%')
        and (p_args->>'schema_id' is null or candidate.problem is null or candidate.problem->>'schema_id'=p_args->>'schema_id')
        and (p_args->'input_keys' is null or p_args->'input_keys'='null'::jsonb or not exists(select 1 from jsonb_array_elements(candidate.recipe->'fields') f where not (p_args->'input_keys' ? (f->>'from'))))
      order by candidate.id limit 100
    ) x;
    insert into attractor.events(session_id,action,detail) values(sid,'COMMONS_SEARCH',jsonb_build_object('candidate_ids',(select coalesce(jsonb_agg(item->'id'),'[]') from jsonb_array_elements(out) item),'protocol','0.4'));
    return jsonb_build_object('items',out);
  end if;
  if p_op='search' then
    select coalesce(jsonb_agg(x),'[]') into out from (select id,slug,revision,parent_id,origin,verification,created_at from attractor.artifacts where slug like '%'||(p_args->>'q')||'%' order by created_at desc,id limit 30) x;
    insert into attractor.events(session_id,action,detail) values(sid,'SEARCH',jsonb_build_object('query',p_args->>'q','visible_summaries',out));
    return jsonb_build_object('items',out);
  end if;
  if p_op='read' then
    select * into a from attractor.artifacts where id=(p_args->>'id')::uuid;
    if not found then return jsonb_build_object('error','Recette introuvable.','status',404); end if;
    insert into attractor.exposures(session_id,artifact_id,content_hash) values(sid,a.id,a.content_hash) returning * into exp;
    insert into attractor.events(session_id,action,artifact_id,exposure_id,detail) values(sid,'READ',a.id,exp.id,jsonb_build_object('content_hash',a.content_hash,'protocol','0.2'));
    return jsonb_build_object('artifact',to_jsonb(a)-'session_id','exposure_id',exp.id,'marker',exp.marker,'protocol_version','0.2');
  end if;
  if p_op='create' then
    if (select count(*) from attractor.artifacts)>=2000 then return jsonb_build_object('error','Capacité de contributions atteinte.','status',503); end if;
    if (select count(*) from attractor.artifacts where session_id=sid and created_at>now()-interval '1 day')>=20 then return jsonb_build_object('error','20 contributions par session et par jour.','status',429); end if;
    if p_args->>'parent_id' is not null then
      select * into parent from attractor.artifacts where id=(p_args->>'parent_id')::uuid;
      select * into exp from attractor.exposures where id=(p_args->>'exposure_id')::uuid and session_id=sid and artifact_id=parent.id;
      if exp.id is null then return jsonb_build_object('error','Exposition du parent absente pour cette session.','status',409); end if;
      if parent.content_hash=p_args->>'content_hash' then return jsonb_build_object('error','La révision ne modifie pas le contenu.','status',409); end if;
    end if;
    insert into attractor.artifacts(session_id,slug,parent_id,revision,recipe,examples,conventions,content_hash,verification,origin,problem)
      values(sid,p_args->>'slug',parent.id,coalesce(parent.revision+1,1),p_args->'recipe',p_args->'examples',p_args->'conventions',p_args->>'content_hash',p_args->'verification','visitor',p_args->'problem') returning * into a;
    insert into attractor.events(session_id,action,artifact_id,exposure_id,detail) values(sid,case when parent.id is null then 'PRODUCED' else 'MODIFIED' end,a.id,exp.id,jsonb_build_object('parent_id',parent.id,'cross_session',parent.session_id is not null and parent.session_id<>sid,'content_hash',a.content_hash,'conventions',a.conventions));
    return jsonb_build_object('artifact',to_jsonb(a)-'session_id');
  end if;
  if p_op in ('prepare_use','use') then
    select * into exp from attractor.exposures where id=(p_args->>'exposure_id')::uuid and session_id=sid and artifact_id=(p_args->>'id')::uuid;
    if exp.id is null then return jsonb_build_object('error','Reçu d’exposition absent ou appartenant à une autre session.','status',409); end if;
    if exp.marker::text<>p_args->>'marker' then return jsonb_build_object('error','Marqueur incorrect.','status',409); end if;
    if p_op='prepare_use' then
      select * into a from attractor.artifacts where id=exp.artifact_id;
      return jsonb_build_object('recipe',a.recipe,'content_hash',a.content_hash);
    end if;
    if exists(select 1 from attractor.events where exposure_id=exp.id and action='VERIFIED_USE') then return jsonb_build_object('error','Cette exposition a déjà été vérifiée.','status',409); end if;
    insert into attractor.events(session_id,action,artifact_id,exposure_id,detail) values(sid,'VERIFIED_USE',exp.artifact_id,exp.id,p_args->'verification');
    return jsonb_build_object('verified',true,'meaning','Résultat recalculé sur une entrée fournie ; indépendance et causalité non établies.');
  end if;
  if p_op='validate' then
    insert into attractor.events(session_id,action,detail) values(sid,'VALIDATE',p_args);
    return jsonb_build_object('recorded',true);
  end if;
  return jsonb_build_object('error','Opération inconnue.','status',404);
end $$;
revoke all on function public.attractor_rpc(text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.attractor_rpc(text,text,text,jsonb) to service_role;
