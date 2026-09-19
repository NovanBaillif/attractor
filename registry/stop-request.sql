-- Demande d'arrêt publique, en une seule opération (19/09/2026).
-- Avant : le serveur lisait le mode, puis l'écrivait sans condition. Un arrêt total (FULL_STOP) posé par
-- l'opérateur entre les deux pouvait être ramené à CONTRIBUTIONS_PAUSED. Ici, la ligne est verrouillée, et
-- seul NORMAL passe à CONTRIBUTIONS_PAUSED ; tout autre mode reste tel quel. Base dédiée d'Attractor seulement.
create or replace function public.attractor_stop_request()
returns jsonb
language plpgsql volatile security invoker set search_path = '' as $$
declare previous text;
begin
  select mode into previous from attractor.settings where id = true for update;
  if previous = 'NORMAL' then
    update attractor.settings set mode = 'CONTRIBUTIONS_PAUSED' where id = true;
    return jsonb_build_object('mode', 'CONTRIBUTIONS_PAUSED', 'changed', true);
  end if;
  return jsonb_build_object('mode', previous, 'changed', false);
end $$;
revoke all on function public.attractor_stop_request() from public, anon, authenticated;
grant execute on function public.attractor_stop_request() to service_role;
