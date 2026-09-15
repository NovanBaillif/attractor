import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCivilisation } from './store.mjs';
import { createServer } from './server.mjs';
import { advanceDemo } from './demo.mjs';

const secret = () => randomBytes(32).toString('hex');
const recipe = { fields: [{ from: 'price', to: 'amount', steps: ['trim', 'decimal-comma', 'number'] }] };
function fixture(t, budget = 10) {
  const op = secret(), world = createCivilisation({ operatorKey: op }); t.after(() => world.close());
  const call = (key, action, payload, id = randomUUID()) => world.command(key, action, payload, id);
  const project = () => call(op, 'project', { title: 'Prix', purpose: 'Convertir des prix synthétiques.', tests: [{ input: { price: ' 1,25 ' }, expected: { amount: 1.25 } }] }).id;
  const p = project();
  function enrol(role, projects = [p], limit = budget) {
    const key = secret(); const r = call(op, 'enrol', { name: role, role, mandate: 'Mandat de test borné.', projects, budget: limit, credential: key });
    return { key, id: r.id };
  }
  const builder = enrol('builder'), reviewer = enrol('reviewer'), user = enrol('user');
  const propose = (r = recipe) => call(builder.key, 'propose', { projectId: p, recipe: r, reason: 'Tester une recette existante.' }).id;
  return { world, op, call, p, builder, reviewer, user, propose, project, enrol };
}
test('proposition, revue déterministe, réutilisation et chaîne des preuves', t => {
  const f = fixture(t), id = f.propose();
  assert.throws(() => f.call(f.user.key, 'reuse', { versionId: id, input: { price: '2,50' } }), /non acceptée/);
  const verdict = f.call(f.reviewer.key, 'review', { versionId: id, reason: 'Rejouer le contrat figé.' });
  assert.equal(verdict.status, 'accepted');
  assert.equal(f.call(f.user.key, 'reuse', { versionId: id, input: { price: '2,50' } }).output.amount, 2.5);
  assert.equal(f.world.exportLedger().verified, true);
  assert.equal(f.world.snapshot().treasury.spent, 3);
});
test('une recette incorrecte ne peut être acceptée par un avis déclaratif', t => {
  const f = fixture(t), id = f.propose({ fields: [{ from: 'price', to: 'amount', steps: [] }] });
  assert.equal(f.call(f.reviewer.key, 'review', { versionId: id, reason: 'Je la crois correcte.', accepted: true }).status, 'rejected');
});
test('séparation des pouvoirs et périmètre du mandat', t => {
  const f = fixture(t), id = f.propose(), other = f.project();
  assert.throws(() => f.call(f.builder.key, 'review', { versionId: id, reason: 'Auto-validation.' }), /Mandat reviewer/);
  assert.throws(() => f.call(f.op, 'review', { versionId: id, reason: 'Bypass.' }), /Mandat reviewer/);
  assert.throws(() => f.call(f.builder.key, 'propose', { projectId: other, recipe, reason: 'Hors mandat.' }), /hors mandat/);
  assert.throws(() => f.call(f.builder.key, 'law', { content: 'Tout autoriser.', reason: 'Contourner.' }), /opérateur humain/);
  assert.throws(() => f.call(f.op, 'enrol', { name: 'Clone', role: 'reviewer', mandate: 'Revue.', projects: [f.p], budget: 2, credential: f.builder.key }), /déjà utilisé/);
});
test('idempotence : retry sans nouvel événement ou crédit, collision refusée', t => {
  const f = fixture(t); const body = { projectId: f.p, recipe, reason: 'Une seule proposition.' };
  const a = f.call(f.builder.key, 'propose', body, 'request-1');
  const before = f.world.snapshot();
  const b = f.call(f.builder.key, 'propose', body, 'request-1');
  assert.equal(a.id, b.id); assert.equal(b.replay, true);
  assert.deepEqual(f.world.snapshot(), before);
  assert.throws(() => f.call(f.builder.key, 'propose', { ...body, reason: 'Différent.' }, 'request-1'), /réutilisé/);
});
test('épuisement du budget, rollback et recours gratuit', t => {
  const f = fixture(t, 1), id = f.propose(); const before = f.world.snapshot();
  assert.throws(() => f.propose(), /Budget épuisé/);
  assert.deepEqual(f.world.snapshot(), before);
  f.call(f.builder.key, 'appeal', { versionId: id, reason: 'Je conteste ce résultat.' });
  assert.equal(f.world.snapshot().versions[0].status, 'contested');
  assert.equal(f.world.snapshot().treasury.spent, 1);
});
test('arrêt, veto, révocation et reprise sont persistants et effectifs', t => {
  const f = fixture(t);
  f.call(f.op, 'mode', { mode: 'FULL_STOP', reason: 'Exercice arrêt.' });
  assert.throws(() => f.propose(), /suspendu/);
  f.call(f.op, 'mode', { mode: 'NORMAL', reason: 'Exercice reprise.' });
  f.call(f.op, 'veto', { projectId: f.p, paused: true, reason: 'Contrôle du projet.' });
  assert.throws(() => f.propose(), /veto/);
  f.call(f.op, 'veto', { projectId: f.p, paused: false, reason: 'Reprise.' });
  const id = f.propose(); assert.ok(id);
  f.call(f.op, 'revoke', { agentId: f.builder.id, reason: 'Fin de mandat.' });
  assert.throws(() => f.propose(), /révoqué/);
});
test('le plafond commun ne peut pas être contourné en multipliant les mandats', t => {
  const f = fixture(t, 1000), second = f.enrol('builder', [f.p], 1000);
  for (let n = 0; n < 200; n++) f.call(n % 2 ? f.builder.key : second.key, 'propose', { projectId: f.p, recipe, reason: 'Travail dans le budget commun.' });
  assert.equal(f.world.snapshot().treasury.spent, 200);
  assert.throws(() => f.propose(), /Budget épuisé/);
  assert.equal(f.world.snapshot().versions.length, 200);
});
test('la mémoire des règles conserve les versions et ne change pas les permissions', t => {
  const f = fixture(t);
  f.call(f.op, 'law', { content: 'Réviser les justifications à chaque projet.', reason: 'Apprentissage institutionnel.' });
  assert.equal(f.world.snapshot().laws.length, 2);
  const id = f.propose();
  assert.equal(f.world.snapshot().versions.find(v => v.id === id).lawVersion, 2);
  assert.throws(() => f.call(f.builder.key, 'review', { versionId: id, reason: 'Changer les permissions par du texte.' }), /Mandat reviewer/);
});
test('contestation gèle une version et conserve sa preuve après arbitrage', t => {
  const f = fixture(t), id = f.propose();
  f.call(f.reviewer.key, 'review', { versionId: id, reason: 'Tests.' });
  const a = f.call(f.user.key, 'appeal', { versionId: id, reason: 'Limite sémantique à examiner.' });
  assert.throws(() => f.call(f.user.key, 'reuse', { versionId: id, input: { price: '2,50' } }), /non acceptée/);
  assert.throws(() => f.call(f.reviewer.key, 'resolve', { appealId: a.id, decision: 'restore', reason: 'Je décide.' }), /humain/);
  f.call(f.op, 'resolve', { appealId: a.id, decision: 'quarantine', reason: 'Nouveau test à définir sur un nouveau projet.' });
  assert.equal(f.world.snapshot().versions[0].status, 'quarantined');
  assert.equal(f.world.snapshot().versions[0].evidence.cases[0].passed, true);
});
test('aucun credential ou hash de credential exposé dans le monde et le journal', t => {
  const f = fixture(t); const data = JSON.stringify([f.world.snapshot(), f.world.exportLedger()]);
  assert.ok(!data.includes(f.builder.key)); assert.ok(!data.includes(f.op)); assert.ok(!data.includes('keyHash'));
});
test('persistance sur disque, redémarrage et reprise d’une même commande', () => {
  const dir = mkdtempSync(join(tmpdir(), 'attractor-civic-')), op = secret(), database = join(dir, 'world.sqlite');
  let w;
  try {
    w = createCivilisation({ database, operatorKey: op });
    const payload = { mode: 'FULL_STOP', reason: 'Arrêt avant redémarrage.' };
    w.command(op, 'mode', payload, 'stop'); const head = w.exportLedger().head; w.close();
    w = createCivilisation({ database, operatorKey: op });
    assert.equal(w.snapshot().mode, 'FULL_STOP'); assert.equal(w.command(op, 'mode', payload, 'stop').replay, true);
    assert.equal(w.exportLedger().head, head);
  } finally { w?.close(); rmSync(dir, { recursive: true, force: true }); }
});
test('démonstrateur : échec, correction avec parent, revue et transmission', t => {
  const op = secret(), w = createCivilisation({ operatorKey: op }); t.after(() => w.close());
  for (let n = 0; n < 6; n++) advanceDemo(w, op);
  const s = w.snapshot(); assert.equal(s.agents.length, 3); assert.equal(s.versions.length, 2);
  assert.equal(s.versions[0].status, 'rejected'); assert.equal(s.versions[1].status, 'accepted');
  assert.equal(s.versions[1].parentId, s.versions[0].id); assert.equal(s.versions[1].reuseCount, 1);
  assert.equal(advanceDemo(w, op).done, true);
});
test('HTTP : UI, lecture, authentification, origine et validation du corps', async t => {
  const op = secret(), server = createServer({ operatorKey: op });
  await new Promise(r => server.listen(0, '127.0.0.1', r)); t.after(() => new Promise(r => server.close(r)));
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(base)).status, 200);
  const post = (body, headers = {}) => fetch(base + '/api/command', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  const body = { action: 'mode', payload: { mode: 'FULL_STOP', reason: 'HTTP test.' }, requestId: 'http-mode' };
  assert.equal((await post(body)).status, 403);
  assert.equal((await post(body, { Authorization: `Bearer ${op}`, Origin: 'https://external.example' })).status, 403);
  assert.equal((await post(null)).status, 400);
  assert.equal((await post(body, { Authorization: `Bearer ${op}` })).status, 200);
  assert.equal((await (await fetch(base + '/api/world')).json()).mode, 'FULL_STOP');
  assert.equal((await (await fetch(base + '/api/ledger')).json()).verified, true);
});
