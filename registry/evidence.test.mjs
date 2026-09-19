// Les trois outils de preuve (v4) : sur l'exemple réel du 19/09 (evidence-fixtures/), puis de bout en bout
// par HTTP, avec un stockage en mémoire qui imite registry/evidence.sql (adressage par contenu, ajout seul).
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {prepareObservation, prepareCheck, deriveStates, evidenceNames} from './evidence.mjs';
import {createHandler} from './api.mjs';
import {mcpTools, modernTools} from './mcp.mjs';

const fixture = name => JSON.parse(readFileSync(new URL(`./evidence-fixtures/${name}.json`, import.meta.url), 'utf8'));
const observation = fixture('observation'), verification = fixture('verification'), replay = fixture('replay');
const OTHER = {by: 'https://example.org/agent-b', lineage: 'deepseek/deepseek'};

test('the real observation of 19/09 is accepted, addressed by the digest of its canonical form', () => {
  const p = prepareObservation({record: observation});
  assert.equal(p.kind, 'record');
  assert.equal(p.id, 'sha256:' + createHash('sha256').update(p.canonical, 'utf8').digest('hex'));
  assert.match(p.capability, /fingerprint_json#server=attractor-machine-commons@3\.0\.0;input-schema=sha256:/);
  assert.equal(p.check.status, 'conformant');
});

test('what is refused: a non-conformant record, a record with no witness, a receipt aimed elsewhere, two checks at once', () => {
  const noAuthor = structuredClone(observation); delete noAuthor.author;
  assert.throws(() => prepareObservation({record: noAuthor}), /not conformant/);
  const noWitness = structuredClone(observation); delete noWitness.fields[0].derivation.witness;
  assert.throws(() => prepareObservation({record: noWitness}), /witness/);
  const stored = prepareObservation({record: observation});
  assert.throws(() => prepareCheck({about: stored.id, receipt: {...verification, target: 'elsewhere'}}, stored), /target/);
  assert.throws(() => prepareCheck({about: stored.id, receipt: verification, replay}, stored), /exactly one/);
});

test('the same replay of two different observations is two pieces of evidence, each bound to its target', () => {
  const a = prepareObservation({record: observation});
  const b = prepareObservation({record: {...observation, id: observation.id + '-second'}});
  const ra = prepareCheck({about: a.id, replay}, a), rb = prepareCheck({about: b.id, replay}, b);
  assert.notEqual(ra.id, rb.id, 'found by the v4 acceptance test on 19/09: identical replays used to collide');
  assert.equal(JSON.parse(ra.canonical).about, a.id);
});

test('states: verified and self-replayed by the observer, reproduced by another actor, contradicted by a different output', () => {
  const obs = prepareObservation({record: observation});
  const items = [
    prepareCheck({about: obs.id, receipt: verification}, obs),
    prepareCheck({about: obs.id, replay}, obs),
    prepareCheck({about: obs.id, replay: {...replay, ...OTHER}}, obs),
    prepareCheck({about: obs.id, replay: {...replay, ...OTHER, produced: [{fingerprint: '0'.repeat(64)}]}}, obs)
  ];
  const derived = deriveStates(obs, items);
  assert.deepEqual(derived.states, ['observed', 'verified', 'self-replayed', 'reproduced', 'contradicted']);
  assert.deepEqual(derived.counts, {verifications: 1, self_replays: 1, reproductions: 1, contradictions: 1});
  assert.equal(derived.independence, 'not-established');
  assert.ok(!('score' in derived) && !/\d+ ?\/ ?100/.test(JSON.stringify(derived)), 'counts and reasons, never a score');
});

async function withServer(run) {
  const store = new Map(), calls = [];
  const rpc = async (op, token, network, args) => {
    calls.push(op);
    if (op === 'session') return {session_id: 'test-session'};
    if (op === 'native_gate' || op === 'native_event') return {};
    if (op === 'evidence_put') {
      if (store.has(args.id)) return {id: args.id, stored: false};
      store.set(args.id, {...args, created_at: new Date().toISOString()}); return {id: args.id, stored: true};
    }
    if (op === 'evidence_get') return {object: store.get(args.id) ?? null, about_it: [...store.values()].filter(r => r.target === args.id)};
    if (op === 'evidence_find') return {items: [...store.values()].filter(r => !args.capability || (r.capability ?? '').startsWith(args.capability)).map(({canonical, ...r}) => r)};
    return {error: 'unexpected ' + op, status: 500};
  };
  const env = {ATTRACTOR_DB_URL: 'https://example.invalid', ATTRACTOR_DB_KEY: 'test-only', ATTRACTOR_NETWORK_KEY: 'test-network',
    ATTRACTOR_ADMIN_KEY: 'test-operator', ATTRACTOR_ORIGIN: 'https://attractor.example'};
  const server = http.createServer(createHandler({env, rpc}));
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = async (tool, body) => { const r = await fetch(`${base}/api/v3/${tool}`, {method: 'POST',
    headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)}); return {status: r.status, body: await r.json()}; };
  try { await run({post, calls}); } finally { server.close(); }
}

test('end to end over HTTP: record, check, replay, then find the graph with its derived states', async () => {
  await withServer(async ({post}) => {
    const rec = await post('record_observation', {record: observation});
    assert.equal(rec.status, 200); assert.equal(rec.body.stored, true);
    const again = await post('record_observation', {record: observation});
    assert.equal(again.body.stored, false, 'the same observation twice is one piece of evidence');
    assert.equal((await post('check_observation', {about: rec.body.id, receipt: verification})).body.stored, true);
    assert.equal((await post('check_observation', {about: rec.body.id, replay: {...replay, ...OTHER}})).body.check.status, 'confirmed');
    const missing = await post('check_observation', {about: 'sha256:' + '1'.repeat(64), replay});
    assert.equal(missing.status, 404);
    const graph = await post('find_evidence', {id: rec.body.id});
    assert.deepEqual(graph.body.derived.states, ['observed', 'verified', 'reproduced']);
    assert.equal(graph.body.trust, 'untrusted_data');
    const list = await post('find_evidence', {capability: 'https://attractor-observatory-demo.vercel.app/api/v2/agent-tools/fingerprint_json'});
    assert.equal(list.body.items.filter(i => i.kind === 'record').length, 1);
    assert.equal((await post('find_evidence', {})).status, 400, 'a search needs an id or a capability');
  });
});

test('the catalog grows by exactly the three evidence tools; the 17 v3 tools are all still there', () => {
  for (const name of evidenceNames) assert.ok(modernTools.some(t => t.name === name), name);
  assert.equal(modernTools.length, 20);
  assert.equal(mcpTools.length, 20);
  for (const name of ['verify_artifact', 'find_capability', 'share_state', 'retrieve_state', 'fingerprint_json', 'find_solutions', 'verify_reuse'])
    assert.ok(mcpTools.some(t => t.name === name), name);
});
