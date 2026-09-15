alter table attractor.artifacts add column problem jsonb check(problem is null or octet_length(problem::text)<12000);
create or replace function public.attractor_rpc(p_op text,p_token_hash text,p_network_hash text,p_args jsonb default '{}') returns jsonb
language plpgsql security invoker set search_path='' as $$
declare sid uuid; a attractor.artifacts; parent attractor.artifacts; exp attractor.exposures; n integer; current_mode text; out jsonb; q text; day text:=to_char(now(),'YYYY-MM-DD'); minute text:=to_char(now(),'YYYY-MM-DD-HH24-MI');
begin
  -- One bounded transactional gate gives atomic quotas, lineage and caps.
  select mode into current_mode from attractor.settings where id=true for update;
  if p_op='health' then return jsonb_build_object('mode',current_mode,'persistence',true,'protocol','0.2'); end if;
  if p_op='admin_mode' then
    update attractor.settings set mode=p_args->>'mode' where id=true;
    return jsonb_build_object('mode',p_args->>'mode');
  end if;
  if p_op='admin' then
    return jsonb_build_object('mode',current_mode,
      'sessions',(select count(*) from attractor.sessions),'artifacts',(select count(*) from attractor.artifacts),
      'exposures',(select count(*) from attractor.exposures),
      'cross_session_revisions',(select count(*) from attractor.artifacts c join attractor.artifacts p on p.id=c.parent_id where c.session_id<>p.session_id),
      'events',coalesce((select jsonb_agg(x) from (select e.*,s.source from attractor.events e left join attractor.sessions s on s.id=e.session_id order by e.id desc limit 100) x),'[]'::jsonb));
  end if;
  if current_mode='FULL_STOP' then return jsonb_build_object('error','Expériences arrêtées.','status',503); end if;
  if current_mode='OBSERVATION_ONLY' and p_op in ('create','use','validate') then return jsonb_build_object('error','Écritures suspendues.','status',503); end if;
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
  if p_op='session' then
    if (select count(*) from attractor.sessions)>=10000 then return jsonb_build_object('error','Capacité de sessions atteinte.','status',503); end if;
    insert into attractor.sessions(token_hash,source) values(p_token_hash,case when p_args->>'source'='controlled' then 'controlled' else 'unattributed' end) returning id into sid;
    insert into attractor.events(session_id,action,detail) values(sid,'SESSION',jsonb_build_object('entrypoint',p_args->>'entrypoint','campaign',p_args->>'campaign','attribution','declared_not_verified'));
    return jsonb_build_object('session_id',sid,'source',case when p_args->>'source'='controlled' then 'controlled' else 'unattributed' end);
  end if;
  select id into sid from attractor.sessions where token_hash=p_token_hash and created_at>now()-interval '30 days';
  if sid is null then return jsonb_build_object('error','Session requise ou expirée.','status',401); end if;
  if (select count(*) from attractor.events)>=100000 then return jsonb_build_object('error','Capacité de journal atteinte.','status',503); end if;
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
