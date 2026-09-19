// Le stockage des preuves (registry/evidence.sql) : ajout seul, adressage par contenu recalculé par la base,
// modes, quota propre, lecture du graphe. Base Postgres en mémoire (PGlite) : rien n'est écrit sur le disque.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {canonical} from './recipes.mjs';

async function base() {
  const db = new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  await db.exec(readFileSync(new URL('./evidence.sql', import.meta.url), 'utf8'));
  await db.exec('set role service_role');
  return db;
}
const piece = (kind, object, extra = {}) => {
  const text = canonical(object);
  return {id: 'sha256:' + createHash('sha256').update(text, 'utf8').digest('hex'), kind, canonical: text, ...extra};
};
const call = async (db, op, args, network = 'net-a') =>
  (await db.query('select public.attractor_evidence($1, $2, $3::jsonb) as r', [op, network, JSON.stringify(args)])).rows[0].r;
const CAP = 'https://attractor-observatory-demo.vercel.app/api/v2/agent-tools/fingerprint_json#server=attractor-machine-commons@3.0.0';
const observation = piece('record', {id: 'obs-1', parent: null, fields: []}, {capability: CAP, actor: 'observer-a', lineage: 'anthropic/claude'});

test('an object is stored under its own digest, once, and the database recomputes the digest', async () => {
  const db = await base();
  try {
    assert.equal((await call(db, 'put', observation)).stored, true);
    assert.deepEqual((await call(db, 'put', observation)).stored, false, 'a second copy is not a second piece of evidence');
    const faux = {...observation, id: 'sha256:' + '0'.repeat(64)};
    await assert.rejects(() => call(db, 'put', faux), /check constraint/, 'a digest that does not match the text is refused by the database itself');
  } finally { await db.close(); }
});

test('evidence can be neither modified nor deleted', async () => {
  const db = await base();
  try {
    await call(db, 'put', observation);
    // First barrier: the server role holds no UPDATE or DELETE right at all.
    await assert.rejects(() => db.query(`update attractor.evidence set actor = 'someone else'`), /permission denied/);
    await assert.rejects(() => db.query('delete from attractor.evidence'), /permission denied/);
    // Second barrier: even the owner of the table is refused by the trigger.
    await db.exec('reset role');
    await assert.rejects(() => db.query(`update attractor.evidence set actor = 'someone else'`), /append-only/);
    await assert.rejects(() => db.query('delete from attractor.evidence'), /append-only/);
  } finally { await db.close(); }
});

test('the graph: an observation and what was recorded about it, and a search by capability', async () => {
  const db = await base();
  try {
    await call(db, 'put', observation);
    const replay = piece('replay', {field: 'result', method: 'witness', produced: [1]}, {target: observation.id, actor: 'replayer-b', lineage: 'deepseek/deepseek'});
    await call(db, 'put', replay);
    const graph = await call(db, 'get', {id: observation.id});
    assert.equal(graph.object.id, observation.id);
    assert.equal(graph.about_it.length, 1);
    assert.equal(graph.about_it[0].actor, 'replayer-b');
    assert.equal(graph.object.network_day, undefined, 'the network pseudonym is never returned');
    const found = await call(db, 'find', {capability: 'https://attractor-observatory-demo.vercel.app/api/v2/agent-tools/fingerprint_json'});
    assert.equal(found.items.length, 1);
    assert.equal(found.items[0].canonical, undefined, 'a search returns summaries, not bodies');
    const other = await call(db, 'find', {capability: 'https://attractor-observatory-demo.vercel.app/api/v2/agent-tools/fingerprintXjson'});
    assert.equal(other.items.length, 0, 'an underscore in the capability is matched literally, not as a wildcard');
  } finally { await db.close(); }
});

test('modes: a pause stops new evidence, a full stop stops everything', async () => {
  const db = await base();
  try {
    await db.exec(`update attractor.settings set mode = 'CONTRIBUTIONS_PAUSED' where id = true`);
    assert.equal((await call(db, 'put', observation)).status, 503);
    await db.exec(`update attractor.settings set mode = 'FULL_STOP' where id = true`);
    assert.equal((await call(db, 'get', {id: observation.id})).status, 503);
  } finally { await db.close(); }
});

test('a network has its own daily quota, separate from the site-wide quota', async () => {
  const db = await base();
  try {
    for (let i = 0; i < 100; i++) assert.equal((await call(db, 'put', piece('record', {id: 'o' + i}), 'net-q')).stored, true);
    assert.equal((await call(db, 'put', piece('record', {id: 'o-100'}), 'net-q')).status, 429);
    assert.equal((await call(db, 'put', piece('record', {id: 'o-100'}), 'net-other')).stored, true, 'another network is not blocked');
  } finally { await db.close(); }
});

test('only the server role may read or write evidence', async () => {
  const db = await base();
  try {
    await db.exec('reset role; set role anon');
    await assert.rejects(() => call(db, 'get', {id: observation.id}), /permission denied/);
    await assert.rejects(() => db.query('select * from attractor.evidence'), /permission denied/);
  } finally { await db.close(); }
});
