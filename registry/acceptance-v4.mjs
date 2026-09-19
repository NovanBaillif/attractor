// Test d'acceptation de la v4 (plan V4, §21), côté opérateur, jamais sur le serveur public.
// Un outil EXTÉRIEUR (le serveur de référence officiel du protocole MCP, « everything », version figée) est
// inspecté, appelé sans effet, observé, vérifié, rejoué, contredit, puis retrouvé par MCP, à travers les trois
// outils de preuve d'ATTRACTOR servis par un serveur LOCAL (vrai chemin d'appel, vrai SQL dans PGlite). Rien
// n'est publié. Le rapport est écrit dans registry/acceptance/.
//   node registry/acceptance-v4.mjs <chemin vers server-everything/dist/index.js>
// Sécurité : seul l'outil de la liste blanche peut être appelé ; le serveur extérieur reçoit un environnement
// vide (il possède un outil qui afficherait les variables d'environnement) ; ses sorties sont des données.
import http from 'node:http';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {createHandler} from './api.mjs';
import {canonical, sha256} from './cooperation-reference/canonical.mjs';

const ENTRY = process.argv[2];
if (!ENTRY) throw Error('Usage: node registry/acceptance-v4.mjs <server-everything/dist/index.js>');
const PACKAGE = '@modelcontextprotocol/server-everything@2026.8.31';
const ALLOWED = new Set(['get-sum']);
const OPERATOR = 'https://attractor-observatory-demo.vercel.app/#operator';
const steps = [];
const step = (n, name, ok, detail) => { steps.push({step: n, name, ok, ...detail}); console.log(`${ok ? 'OK ' : 'KO '} ${n}. ${name}`); };

// ——— Le serveur de preuves local : ATTRACTOR (api.mjs) → imitation PostgREST → vrai SQL en mémoire ———
const db = new PGlite();
await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
for (const f of ['schema.sql', 'stop-request.sql', 'evidence.sql']) await db.exec(readFileSync(new URL('./' + f, import.meta.url), 'utf8'));
await db.exec('set role service_role');
const postgrest = http.createServer(async (req, res) => {
  let body = ''; for await (const c of req) body += c;
  const fn = req.url.replace('/rest/v1/rpc/', ''), a = JSON.parse(body || '{}');
  const q = fn === 'attractor_rpc' ? ['select public.attractor_rpc($1,$2,$3,$4::jsonb) as r', [a.p_op, a.p_token_hash, a.p_network_hash, JSON.stringify(a.p_args ?? {})]]
    : fn === 'attractor_evidence' ? ['select public.attractor_evidence($1,$2,$3::jsonb) as r', [a.p_op, a.p_network, JSON.stringify(a.p_args ?? {})]] : null;
  if (!q) { res.writeHead(404); res.end('{}'); return; }
  try { const r = (await db.query(...q)).rows[0].r; res.writeHead(200, {'Content-Type': 'application/json'}); res.end(JSON.stringify(r)); }
  catch (e) { res.writeHead(400, {'Content-Type': 'application/json'}); res.end(JSON.stringify({message: e.message})); }
});
await new Promise(r => postgrest.listen(0, '127.0.0.1', r));
const origin = console.log; console.log = (...a) => { if (!String(a[0]).startsWith('{')) origin(...a); };
const server = http.createServer(createHandler({env: {ATTRACTOR_DB_URL: 'http://127.0.0.1:' + postgrest.address().port, ATTRACTOR_DB_KEY: 'local',
  ATTRACTOR_NETWORK_KEY: 'local', ATTRACTOR_ADMIN_KEY: 'local', ATTRACTOR_ORIGIN: 'https://attractor.example'}}));
await new Promise(r => server.listen(0, '127.0.0.1', r));
const commons = new Client({name: 'attractor-acceptance', version: '4.0.0'});
await commons.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${server.address().port}/mcp`)));
const evidence = async (name, args) => { const r = await commons.callTool({name, arguments: args}); return r.structuredContent ?? JSON.parse(r.content[0].text); };

// ——— L'outil extérieur ———
const external = new Client({name: 'attractor-observer', version: '4.0.0'});
await external.connect(new StdioClientTransport({command: process.execPath, args: [ENTRY], env: {SystemRoot: process.env.SystemRoot ?? ''}, stderr: 'ignore'}));
const safeCall = async (name, args) => { if (!ALLOWED.has(name)) throw Error('Refused: ' + name + ' is not on the allowlist.'); return external.callTool({name, arguments: args}); };
const strip = result => ({content: result.content, ...(result.structuredContent ? {structuredContent: result.structuredContent} : {})});

try {
  // 1. Enregistrer la capacité (pas de découverte par un annuaire : ce serveur de référence n'y figure pas).
  const info = external.getServerVersion();
  step(1, 'register an external MCP capability', Boolean(info?.name), {package: PACKAGE, server: info});
  // 2. Capturer capacité, version, schéma, empreinte du tools/list.
  const {tools} = await external.listTools();
  const tool = tools.find(t => t.name === 'get-sum');
  const schemaHash = sha256(canonical(tool.inputSchema)), listHash = sha256(canonical(tools));
  const upstream = `mcp+stdio://npm/${PACKAGE}#server=${info.name}@${info.version};tool=get-sum;input-schema=sha256:${schemaHash}`;
  step(2, 'capture capability, version, schema and tools/list digest', Boolean(tool), {tool: 'get-sum', annotations: tool.annotations,
    input_schema_sha256: schemaHash, tools_list_sha256: listHash, tools_count: tools.length});
  // 3. Un appel autorisé, sans effet.
  const input = {a: 2, b: 3};
  const first = strip(await safeCall('get-sum', input)), firstAt = new Date().toISOString();
  step(3, 'one allowlisted, read-only call', true, {input, output: first});
  // 4. Enregistrer l'observation.
  const record = {id: `obs-get-sum-${firstAt}`, parent: null, author: {actor: OPERATOR, lineage: 'anthropic/claude'}, objections: [],
    fields: [{id: 'result', value: first, kind: 'observed', sources: [], channel: 'direct', upstream, expect: 'verify', observedAt: firstAt,
      derivation: {operation: 'measured', inputs: [], witness: [{input, output: first}]}}]};
  const rec = await evidence('record_observation', {record});
  step(4, 'record the observation', rec.stored === true, {id: rec.id, check: rec.check?.status});
  // 5. Vérifier une propriété déterministe : le nombre annoncé est a + b, calculé ici, sans l'outil.
  const said = Number((JSON.stringify(first).match(/is (-?\d+(?:\.\d+)?)/) || [])[1]);
  const { expect: _e, ...kept } = record.fields[0];
  const receipt = {id: 'receipt-get-sum-' + firstAt, target: record.id, dispositions: [{field: 'result', action: 'verify', basis: 'recompute'}],
    record: {id: 'rec-verified-get-sum', parent: record.id, author: {actor: OPERATOR + '-check', lineage: 'human'}, objections: [],
      fields: [kept, {id: 'recompute', value: {a: 2, b: 3, expected: 2 + 3, stated_by_tool: said, equal: said === 2 + 3},
        kind: 'observed', sources: [], channel: 'direct', upstream: 'urn:attractor:local-recompute:arithmetic', derivation: {operation: 'measured', inputs: []}}]}};
  const ver = await evidence('check_observation', {about: rec.id, receipt});
  step(5, 'verify a deterministic property (the stated sum equals a + b computed independently)', ver.stored === true && said === 5, {stated: said, expected: 5, check: ver.check?.status});
  // 6. Empreintes et provenance publiées (ici : dans le stockage local, par contenu).
  const graph0 = await evidence('find_evidence', {id: rec.id});
  step(6, 'fingerprints and provenance recorded', graph0.object?.id === rec.id && graph0.object?.capability === upstream,
    {id: rec.id, capability: graph0.object?.capability, actor: graph0.object?.actor, lineage: graph0.object?.lineage});
  // 7-8. Refaire l'expérience, et la relier à l'observation initiale.
  const second = strip(await safeCall('get-sum', input));
  const rep = await evidence('check_observation', {about: rec.id, replay: {field: 'result', method: 'witness', by: OPERATOR, lineage: 'anthropic/claude', produced: [second]}});
  step(7, 'redo the experiment', canonical(second) === canonical(first), {same_output: canonical(second) === canonical(first)});
  step(8, 'link the replay to the initial observation', rep.stored === true && rep.check?.status === 'confirmed', {id: rep.id, check: rep.check?.status, warnings: rep.check?.warnings});
  // 9. Tout retrouver par MCP.
  const byCap = await evidence('find_evidence', {capability: `mcp+stdio://npm/${PACKAGE}`});
  const graph = await evidence('find_evidence', {id: rec.id});
  step(9, 'retrieve everything through find_evidence', byCap.items?.length >= 1 && graph.about_it?.length === 2,
    {found_by_capability: byCap.items?.length, derived: graph.derived});
  // 10. Une contradiction : une observation plantée qui rapporte un faux résultat, rejouée pour de vrai.
  const wrong = {content: [{type: 'text', text: JSON.stringify(first).includes('5') ? 'The sum of 2 and 3 is 6.' : 'wrong'}]};
  const planted = {id: 'obs-get-sum-PLANTED-FAULT', parent: null, author: {actor: 'https://example.invalid/faulty-observer', lineage: 'test/planted'}, objections: [],
    fields: [{id: 'result', value: wrong, kind: 'observed', sources: [], channel: 'direct', upstream, observedAt: firstAt,
      derivation: {operation: 'measured', inputs: [], witness: [{input, output: wrong}]}}]};
  const pl = await evidence('record_observation', {record: planted});
  const third = strip(await safeCall('get-sum', input));
  await evidence('check_observation', {about: pl.id, replay: {field: 'result', method: 'witness', by: OPERATOR, lineage: 'anthropic/claude', produced: [third]}});
  const contra = await evidence('find_evidence', {id: pl.id});
  step(10, 'show a contradiction when a second execution is incompatible (planted faulty observation)', contra.derived?.states?.includes('contradicted'),
    {planted: true, id: pl.id, derived: contra.derived});
} finally {
  await external.close(); await commons.close();
  server.closeAllConnections(); postgrest.closeAllConnections();
  await new Promise(r => server.close(r)); await new Promise(r => postgrest.close(r)); await db.close();
  console.log = origin;
}

const report = {test: 'ATTRACTOR v4 acceptance (plan V4 §21)', ran_at: new Date().toISOString(), external: PACKAGE,
  where: 'local evidence server (real server call path, real SQL in PGlite); nothing published',
  independence: 'not established: every observation, check and replay here was made by the same operator, except the planted faulty observer',
  passed: steps.filter(s => s.ok).length, total: steps.length, steps};
mkdirSync(new URL('./acceptance/', import.meta.url), {recursive: true});
writeFileSync(new URL('./acceptance/acceptance-v4.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(`\n${report.passed}/${report.total} steps passed. Report: registry/acceptance/acceptance-v4.json`);
process.exitCode = report.passed === report.total ? 0 : 1;
