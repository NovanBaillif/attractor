// De bout en bout, sans raccourci : client MCP officiel → serveur ATTRACTOR (son vrai chemin d'appel à la base,
// celui de la production) → une imitation du point d'accès RPC de Supabase → le vrai SQL (schema.sql,
// stop-request.sql, evidence.sql) dans PostgreSQL en mémoire (PGlite). Vérifie que le serveur appelle la bonne
// fonction avec les bons arguments, ce qu'un test qui remplace la base par une fonction ne peut pas voir.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {createHandler} from './api.mjs';

const fixture = name => JSON.parse(readFileSync(new URL(`./evidence-fixtures/${name}.json`, import.meta.url), 'utf8'));

test('official MCP client → real server path → real SQL: record, verify, replay, find', async t => {
  t.mock.method(console, 'log', () => {});
  const db = new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  for (const f of ['schema.sql', 'stop-request.sql', 'evidence.sql']) await db.exec(readFileSync(new URL('./' + f, import.meta.url), 'utf8'));
  await db.exec('set role service_role');

  // Imitation minimale de PostgREST : POST /rest/v1/rpc/<fonction> avec des arguments nommés.
  const calls = [];
  const postgrest = http.createServer(async (req, res) => {
    let body = ''; for await (const c of req) body += c;
    const fn = req.url.replace('/rest/v1/rpc/', ''), a = JSON.parse(body || '{}');
    calls.push({fn, keys: Object.keys(a).sort()});
    let sql, params;
    if (fn === 'attractor_rpc') { sql = 'select public.attractor_rpc($1,$2,$3,$4::jsonb) as r'; params = [a.p_op, a.p_token_hash, a.p_network_hash, JSON.stringify(a.p_args ?? {})]; }
    else if (fn === 'attractor_evidence') { sql = 'select public.attractor_evidence($1,$2,$3::jsonb) as r'; params = [a.p_op, a.p_network, JSON.stringify(a.p_args ?? {})]; }
    else if (fn === 'attractor_stop_request') { sql = 'select public.attractor_stop_request() as r'; params = []; }
    else { res.writeHead(404); res.end('{}'); return; }
    try { const r = (await db.query(sql, params)).rows[0].r; res.writeHead(200, {'Content-Type': 'application/json'}); res.end(JSON.stringify(r)); }
    catch (e) { res.writeHead(400, {'Content-Type': 'application/json'}); res.end(JSON.stringify({message: e.message})); }
  });
  await new Promise(r => postgrest.listen(0, '127.0.0.1', r));
  const env = {ATTRACTOR_DB_URL: 'http://127.0.0.1:' + postgrest.address().port, ATTRACTOR_DB_KEY: 'test', ATTRACTOR_NETWORK_KEY: 'test',
    ATTRACTOR_ADMIN_KEY: 'test', ATTRACTOR_ORIGIN: 'https://attractor.example'};
  const server = http.createServer(createHandler({env}));
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  t.after(async () => { server.closeAllConnections(); postgrest.closeAllConnections();
    await new Promise(r => server.close(r)); await new Promise(r => postgrest.close(r)); await db.close(); });

  const client = new Client({name: 'attractor-evidence-test', version: '1.0.0'});
  await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${server.address().port}/mcp`)));
  t.after(() => client.close());
  const call = async (name, args) => { const r = await client.callTool({name, arguments: args}); return r.structuredContent ?? JSON.parse(r.content[0].text); };

  const names = (await client.listTools()).tools.map(x => x.name);
  for (const n of ['record_observation', 'check_observation', 'find_evidence']) assert.ok(names.includes(n), n);

  const rec = await call('record_observation', {record: fixture('observation')});
  assert.equal(rec.stored, true, JSON.stringify(rec));
  assert.match(rec.id, /^sha256:[0-9a-f]{64}$/);
  const row = (await db.query('select id, canonical from attractor.evidence where id = $1', [rec.id])).rows[0];
  assert.ok(row, 'the observation is in the evidence table, under the id the server returned');

  assert.equal((await call('check_observation', {about: rec.id, receipt: fixture('verification')})).stored, true);
  const other = {...fixture('replay'), by: 'https://example.org/agent-b', lineage: 'deepseek/deepseek'};
  assert.equal((await call('check_observation', {about: rec.id, replay: other})).check.status, 'confirmed');

  const graph = await call('find_evidence', {id: rec.id});
  assert.deepEqual(graph.derived.states, ['observed', 'verified', 'reproduced']);
  assert.equal(graph.about_it.length, 2);
  assert.equal(graph.object.network_day, undefined);

  assert.ok(calls.some(c => c.fn === 'attractor_evidence' && c.keys.join() === 'p_args,p_network,p_op'),
    'the server calls attractor_evidence with exactly p_op, p_network and p_args');
  assert.equal((await db.query('select count(*)::int as n from attractor.evidence')).rows[0].n, 3);
});
