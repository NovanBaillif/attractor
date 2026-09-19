// Remplace public.attractor_rpc en base par celle de schema.sql (limites vérifiées de la plus étroite à la plus
// large, plafond par réseau et par jour), puis vérifie. Base dédiée d'Attractor seulement, par l'API de gestion
// (même méthode que stop-request-db.mjs, ADR 0004). « create or replace » garde les droits de la fonction.
//   node registry/quota-db.mjs verify   → compare la base au dépôt, sans rien changer
//   node registry/quota-db.mjs apply    → remplace la fonction, puis vérifie
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {rpcFunctionSql, rpcBody} from './rpc-function.mjs';

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
if (!['apply', 'verify'].includes(command)) throw Error('Usage: quota-db.mjs apply|verify');
const sql = rpcFunctionSql(readFileSync('registry/schema.sql', 'utf8')), sha = createHash('sha256').update(sql).digest('hex');
if (command === 'apply') await management('/database/query', {query: 'begin;\n' + sql + '\ncommit;'});
const [v] = await management('/database/query', {query: `select pg_get_functiondef(p.oid) as definition,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as server_allowed,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_allowed,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_allowed,
  (select mode from attractor.settings where id = true) as current_mode
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'attractor_rpc';`});
const matches = Boolean(v) && rpcBody(v.definition) === rpcBody(sql);
const report = {checked_at: new Date().toISOString(), project_id: db.project_id, command, function_sha256: sha, matches_repository: matches,
  day_ceiling_per_network: Boolean(v?.definition?.includes("'netday:'")), server_allowed: v?.server_allowed, anon_allowed: v?.anon_allowed,
  authenticated_allowed: v?.authenticated_allowed, current_mode: v?.current_mode};
writeFileSync('.vercel/quota-db-check.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
if (!v?.server_allowed || v.anon_allowed || v.authenticated_allowed) throw Error('Function privileges are wrong.');
if (command === 'apply' && !matches) throw Error('The database function differs from schema.sql after apply.');
