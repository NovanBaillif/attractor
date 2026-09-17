import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {scoreReplay, plan, REFERENCE} from './replay-e15.mjs';
import {createHandler} from './api.mjs';

const codex = JSON.parse(readFileSync(new URL('../civilisation/experiments/e15-archive-fausse/answers-codex-shared-2026-09-16.json', import.meta.url), 'utf8'));
const published = JSON.parse(readFileSync(new URL('../civilisation/experiments/e15-archive-fausse/report-external-1f308137-d3a9-4af2-9370-6bce5d6f8017.json', import.meta.url), 'utf8'));

test('the site scorer gives the numbers of the published external report', () => {
  const r = scoreReplay({answers: codex.answers, model: codex.model, isolation: codex.isolation});
  assert.equal(r.stored, false);
  assert.equal(r.missing.length, 0);
  for (const [condition, s] of Object.entries(published.summary)) {
    assert.equal(r.byCondition[condition].correct, s.convention_corrompue.juste);
    assert.equal(r.byCondition[condition].copied, s.convention_corrompue.erreur_recopiee);
    assert.equal(r.byCondition[condition].total, s.convention_corrompue.total);
  }
  assert.match(r.measures, /within-context/);
  assert.equal(Object.keys(REFERENCE.perRound).length, 5);
});

test('a copied error is scored as copied, a missing or broken answer is reported, bad input refused', async () => {
  const {corrupted} = await import('../civilisation/experiments/e15-archive-fausse/archives.mjs');
  // The correct answers, with the archive's error copied into the corrupted field of every prompt.
  const copying = Object.fromEntries(plan.map(p => [p.id, {fields: codex.answers[p.id].fields.map(f =>
    f.to === corrupted[p.task.id].field ? {...f, steps: f.steps.map(s => s === 'uppercase' ? 'lowercase' : s)} : f)}]));
  const all = scoreReplay({answers: copying, isolation: 'fresh-context-per-prompt'});
  for (const t of Object.values(all.byCondition)) assert.deepEqual([t.copied, t.correct, t.total], [24, 0, 24]);
  assert.match(all.measures, /as designed/);
  delete copying[plan[0].id];
  copying[plan[1].id] = {fields: 'not a list'};
  const r = scoreReplay({answers: copying});
  assert.deepEqual(r.missing, [plan[0].id]);
  const second = r.byCondition[plan[1].condition];
  assert.ok(second.copied < 24, 'a structurally broken recipe copies nothing');
  assert.match(r.measures, /unknown/);
  assert.throws(() => scoreReplay({answers: {'nope:honest': {}}}), /inconnues/);
  assert.throws(() => scoreReplay({answers: {}, isolation: 'maybe'}), /isolation/);
  assert.throws(() => scoreReplay({answers: []}), /answers/);
  assert.throws(() => scoreReplay({answers: {}, model: 'x'.repeat(101)}), /model/);
});

test('route: POST /api/v3/replay/e15 scores without touching the database', async () => {
  const env = {ATTRACTOR_DB_URL: 'test', ATTRACTOR_DB_KEY: 'test', ATTRACTOR_NETWORK_KEY: 'test', ATTRACTOR_ADMIN_KEY: 'test', ATTRACTOR_ORIGIN: 'https://attractor.example'};
  const handler = createHandler({env, rpc: async () => { throw Error('no database call expected'); }});
  const call = async body => {
    let out = '', statusCode = 200;
    const res = {setHeader() {}, get statusCode() { return statusCode; }, set statusCode(v) { statusCode = v; }, end: v => { out = v; }};
    await handler({url: '/api/v3/replay/e15', method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body), socket: {}}, res);
    return {statusCode, body: JSON.parse(out)};
  };
  const ok = await call({answers: codex.answers, isolation: 'shared-context'});
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.body.byCondition['wrong-coherent'].total, 24);
  assert.equal((await call({answers: 'x'})).statusCode, 400);
});
