-- ATTRACTOR v4, lot 2 (19/09/2026) : le stockage des preuves. Base dédiée d'Attractor seulement.
-- Conserve, sans jamais les modifier, les objets du profil de preuves (attractor-cooperation/evidence) :
-- observations (records), vérifications (receipts) et reproductions (replays).
-- Trois garanties, tenues par la base elle-même et non par le serveur :
--   1. Ajout seul : ni mise à jour ni suppression, un déclencheur les refuse.
--   2. Adressage par contenu : l'identifiant EST l'empreinte SHA-256 du texte canonique (RFC 8785), et la base
--      la recalcule elle-même (contrainte) au lieu de croire celle qu'on lui donne (défaut relevé par l'audit).
--   3. Un quota propre, séparé du quota global du site : saturer l'un ne bloque pas l'autre.
-- Aucune donnée personnelle : pas d'adresse IP (seulement le pseudonyme réseau du jour, déjà utilisé ailleurs),
-- un acteur déclaré ou « unknown ».

create table if not exists attractor.evidence(
  id text primary key check (id ~ '^sha256:[0-9a-f]{64}$'),
  kind text not null check (kind in ('record', 'receipt', 'replay')),
  canonical text not null check (octet_length(canonical) <= 16000),
  target text check (target is null or length(target) between 1 and 200),
  capability text check (capability is null or length(capability) between 1 and 600),
  actor text not null default 'unknown' check (length(actor) between 1 and 200),
  lineage text check (lineage is null or length(lineage) between 1 and 100),
  network_day text,
  created_at timestamptz not null default now(),
  check (id = 'sha256:' || encode(sha256(convert_to(canonical, 'UTF8')), 'hex'))
);
create index if not exists evidence_target on attractor.evidence(target);
create index if not exists evidence_capability on attractor.evidence(capability text_pattern_ops);
create index if not exists evidence_created on attractor.evidence(created_at);
alter table attractor.evidence enable row level security;
revoke all on attractor.evidence from public, anon, authenticated;
grant select, insert on attractor.evidence to service_role;

create or replace function attractor.evidence_append_only() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'evidence is append-only: % refused', tg_op using errcode = 'insufficient_privilege';
end $$;
drop trigger if exists evidence_append_only on attractor.evidence;
create trigger evidence_append_only before update or delete on attractor.evidence
  for each row execute function attractor.evidence_append_only();

create or replace function public.attractor_evidence(p_op text, p_network text, p_args jsonb)
returns jsonb
language plpgsql volatile security invoker set search_path = '' as $$
declare current_mode text; inserted attractor.evidence; n integer;
begin
  select mode into current_mode from attractor.settings where id = true;
  if current_mode = 'FULL_STOP' then return jsonb_build_object('error', 'Registry stopped.', 'status', 503); end if;

  if p_op = 'put' then
    if current_mode <> 'NORMAL' then return jsonb_build_object('error', 'Contributions are paused.', 'status', 503); end if;
    select count(*) into n from attractor.evidence where created_at > now() - interval '1 day';
    if n >= 1000 then return jsonb_build_object('error', 'Daily evidence quota reached.', 'status', 429); end if;
    select count(*) into n from attractor.evidence where created_at > now() - interval '1 day' and network_day = p_network;
    if n >= 100 then return jsonb_build_object('error', 'Evidence quota for this network reached.', 'status', 429); end if;
    insert into attractor.evidence(id, kind, canonical, target, capability, actor, lineage, network_day)
      values (p_args->>'id', p_args->>'kind', p_args->>'canonical', p_args->>'target', p_args->>'capability',
              coalesce(nullif(p_args->>'actor', ''), 'unknown'), p_args->>'lineage', p_network)
      on conflict (id) do nothing
      returning * into inserted;
    if inserted.id is null then
      return jsonb_build_object('id', p_args->>'id', 'stored', false, 'reason', 'already recorded: evidence is content-addressed');
    end if;
    return jsonb_build_object('id', inserted.id, 'stored', true, 'created_at', inserted.created_at);
  end if;

  if p_op = 'get' then
    return jsonb_build_object(
      'object', (select to_jsonb(e) - 'network_day' from attractor.evidence e where e.id = p_args->>'id'),
      'about_it', coalesce((select jsonb_agg(to_jsonb(e) - 'network_day' order by e.created_at)
                            from attractor.evidence e where e.target = p_args->>'id'), '[]'::jsonb));
  end if;

  if p_op = 'find' then
    return jsonb_build_object('items', coalesce((select jsonb_agg(s.x order by s.t desc) from (
      select to_jsonb(e) - 'network_day' - 'canonical' as x, e.created_at as t from attractor.evidence e
      where (p_args->>'capability' is null or e.capability like replace(replace(p_args->>'capability', '%', ''), '_', '\_') || '%')
        and (p_args->>'kind' is null or e.kind = p_args->>'kind')
        and (p_args->>'actor' is null or e.actor = p_args->>'actor')
      order by e.created_at desc limit least(coalesce((p_args->>'limit')::int, 20), 50)) s), '[]'::jsonb));
  end if;

  return jsonb_build_object('error', 'Unknown evidence operation.', 'status', 400);
end $$;
revoke all on function public.attractor_evidence(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.attractor_evidence(text, text, jsonb) to service_role;
