// Installe ou vérifie la fonction atomique de la demande d'arrêt (registry/stop-request.sql).
// Base dédiée d'Attractor seulement, par l'API de gestion (même méthode que thread-db.mjs, ADR 0004).
//   node registry/stop-request-db.mjs apply    → installe puis vérifie
//   node registry/stop-request-db.mjs verify   → vérifie seulement
// La vérification lit les droits de la fonction ; elle ne l'appelle jamais, car l'appeler mettrait en pause.
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
if (!['apply', 'verify'].includes(command)) throw Error('Usage: stop-request-db.mjs apply|verify');
const sql = readFileSync('registry/stop-request.sql', 'utf8'), sha = createHash('sha256').update(sql).digest('hex');
if (command === 'apply') await management('/database/query', {query: 'begin;\n' + sql + '\ncommit;'});
const [v] = await management('/database/query', {query: `select
  p.provolatile = 'v' as volatile, not p.prosecdef as security_invoker,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as server_allowed,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_allowed,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_allowed,
  (select mode from attractor.settings where id = true) as current_mode
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'attractor_stop_request';`});
if (!v?.volatile || !v.security_invoker || !v.server_allowed || v.anon_allowed || v.authenticated_allowed)
  throw Error('Stop function verification failed: ' + JSON.stringify(v ?? null));
const report = {checked_at: new Date().toISOString(), project_id: db.project_id, sql_sha256: sha, command, verification: v};
writeFileSync('.vercel/stop-request-db-check.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
