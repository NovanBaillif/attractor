// Installe ou vérifie le stockage des preuves (registry/evidence.sql), v4 lot 2.
// Base dédiée d'Attractor seulement, par l'API de gestion (même méthode que thread-db.mjs, ADR 0004).
// Le fichier est idempotent (create if not exists / or replace) et n'ajoute que des objets nouveaux :
// il ne touche à aucune table ni fonction existante.
//   node registry/evidence-db.mjs apply    → installe puis vérifie
//   node registry/evidence-db.mjs verify   → vérifie seulement (lecture du catalogue, aucune écriture)
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const db = JSON.parse(readFileSync('.vercel/registry-database.json', 'utf8'));
if (db.project_id !== 'ingmqxzwrwpjyxgmbrhe') throw Error('Dedicated Attractor project required.');
const token = readFileSync(process.env.USERPROFILE + '/.supabase/access-token', 'utf8').trim();
async function management(path, body) {
  const response = await fetch('https://api.supabase.com/v1/projects/' + db.project_id + path, {method: body ? 'POST' : 'GET',
    headers: {Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'},
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000)});
  if (!response.ok) throw Error('Attractor Management API HTTP ' + response.status);
  return response.json();
}
const project = await management('');
if (project.id !== db.project_id || project.name !== 'Attractor') throw Error('Unexpected database project.');
const command = process.argv[2];
if (!['apply', 'verify'].includes(command)) throw Error('Usage: evidence-db.mjs apply|verify');
const sql = readFileSync('registry/evidence.sql', 'utf8'), sha = createHash('sha256').update(sql).digest('hex');
if (command === 'apply') await management('/database/query', {query: 'begin;\n' + sql + '\ncommit;'});
const [v] = await management('/database/query', {query: `select
  (select relrowsecurity from pg_class where oid = 'attractor.evidence'::regclass) as rls,
  (select count(*) from pg_policies where schemaname = 'attractor' and tablename = 'evidence') as policies,
  has_table_privilege('anon', 'attractor.evidence', 'SELECT') as anon_select,
  has_table_privilege('authenticated', 'attractor.evidence', 'SELECT') as authenticated_select,
  has_table_privilege('service_role', 'attractor.evidence', 'INSERT') as server_insert,
  has_table_privilege('service_role', 'attractor.evidence', 'UPDATE') as server_update,
  has_table_privilege('service_role', 'attractor.evidence', 'DELETE') as server_delete,
  (select count(*) from pg_trigger where tgrelid = 'attractor.evidence'::regclass and tgname = 'evidence_append_only') as append_only_trigger,
  has_function_privilege('service_role', 'public.attractor_evidence(text,text,jsonb)', 'EXECUTE') as server_execute,
  has_function_privilege('anon', 'public.attractor_evidence(text,text,jsonb)', 'EXECUTE') as anon_execute,
  (select count(*) from attractor.evidence) as rows,
  (select mode from attractor.settings where id = true) as current_mode;`});
const ok = v && v.rls && Number(v.policies) === 0 && !v.anon_select && !v.authenticated_select && v.server_insert &&
  !v.server_update && !v.server_delete && Number(v.append_only_trigger) === 1 && v.server_execute && !v.anon_execute;
if (!ok) throw Error('Evidence storage verification failed: ' + JSON.stringify(v ?? null));
const report = {checked_at: new Date().toISOString(), project_id: db.project_id, sql_sha256: sha, command, verification: v};
writeFileSync('.vercel/evidence-db-check.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
