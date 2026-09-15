import { DatabaseSync } from 'node:sqlite';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { canonical, hash, checkRecipe, runRecipe } from '../registry/recipes.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const text = (v, max = 1000) => {
  if (typeof v !== 'string' || !v.trim() || v.length > max) fail(`Texte requis (1–${max} caractères).`);
  return v.trim();
};
const integer = (n, max = 1000) => {
  if (!Number.isSafeInteger(n) || n < 1 || n > max) fail(`Entier requis (1–${max}).`);
  return n;
};
const initial = () => ({ mode: 'NORMAL', agents: [], projects: [], versions: [], appeals: [], receipts: {},
  treasury: { limit: 200, spent: 0 },
  laws: [{ version: 1, at: new Date().toISOString(), reason: 'Constitution initiale : coopération vérifiable sous mandat humain.',
    content: 'Mandats limités. Budget partagé. Auteur et réviseur distincts. Tests publics figés par projet. Arrêt humain. Recours possible. Identités contrôlées, indépendance non établie.' }] });

/** Local institutional kernel. All mutations, receipts and journal entries commit together. */
export function createCivilisation({ database = ':memory:', operatorKey } = {}) {
  if (typeof operatorKey !== 'string' || operatorKey.length < 24) throw Error('Clé opérateur de 24 caractères minimum.');
  const operatorHash = digest(operatorKey);
  const db = new DatabaseSync(database);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS civic_state(id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS civic_events(seq INTEGER PRIMARY KEY, at TEXT NOT NULL, actor TEXT NOT NULL,
      action TEXT NOT NULL, detail TEXT NOT NULL, previous TEXT NOT NULL, hash TEXT NOT NULL);
    CREATE TRIGGER IF NOT EXISTS civic_no_update BEFORE UPDATE ON civic_events BEGIN SELECT RAISE(ABORT,'Journal immuable'); END;
    CREATE TRIGGER IF NOT EXISTS civic_no_delete BEFORE DELETE ON civic_events BEGIN SELECT RAISE(ABORT,'Journal immuable'); END;`);
  db.prepare('INSERT OR IGNORE INTO civic_state VALUES(1,?)').run(JSON.stringify(initial()));
  const read = () => JSON.parse(db.prepare('SELECT value FROM civic_state WHERE id=1').get().value);
  const identity = (state, token) => {
    if (typeof token !== 'string') fail('Authentification requise.', 401);
    const h = digest(token);
    if (h === operatorHash) return { id: 'human', role: 'operator' };
    const a = state.agents.find(a => a.keyHash === h);
    if (!a || a.revoked) fail('Mandat absent ou révoqué.', 403);
    return a;
  };
  function command(token, action, payload = {}, requestId) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) fail('Objet requis.');
    if (Buffer.byteLength(JSON.stringify(payload)) > 24000) fail('Proposition trop volumineuse.', 413);
    text(requestId, 100);
    db.exec('BEGIN IMMEDIATE');
    try {
      const s = read(), actor = identity(s, token), operator = actor.role === 'operator';
      const fingerprint = hash({ action, payload });
      const key = `${actor.id}:${requestId}`, receipt = s.receipts[key];
      if (receipt) {
        if (receipt.fingerprint !== fingerprint) fail('Identifiant de reprise réutilisé pour une autre commande.', 409);
        db.exec('COMMIT'); return { ...receipt.result, replay: true };
      }
      if (Object.keys(s.receipts).length >= 5000) fail('Capacité du prototype atteinte. Exporter avant de poursuivre.', 409);
      if (!operator && action !== 'appeal' && s.mode !== 'NORMAL') fail('Travail suspendu par décision humaine.', 423);
      if (!operator && action !== 'appeal' && (actor.spent >= actor.budget || s.treasury.spent >= s.treasury.limit)) fail('Budget épuisé.', 429);
      const human = () => { if (!operator) fail('Décision réservée à l’opérateur humain.', 403); };
      const role = required => { if (operator || actor.role !== required) fail(`Mandat ${required} requis.`, 403); };
      const project = id => {
        const p = s.projects.find(p => p.id === id); if (!p) fail('Projet introuvable.', 404);
        if (!operator && !actor.projects.includes(id)) fail('Projet hors mandat.', 403);
        if (!operator && action !== 'appeal' && p.paused) fail('Projet sous veto humain.', 423);
        return p;
      };
      const version = id => { const v = s.versions.find(v => v.id === id); if (!v) fail('Version introuvable.', 404); project(v.projectId); return v; };
      let result = { ok: true };
      let detail = { reason: payload.reason || null };
      switch (action) {
        case 'project': {
          human(); if (s.projects.length >= 100) fail('100 projets maximum.');
          const title = text(payload.title, 100), purpose = text(payload.purpose);
          if (!Array.isArray(payload.tests) || payload.tests.length < 1 || payload.tests.length > 8) fail('1 à 8 tests requis.');
          for (const t of payload.tests) {
            if (!t || typeof t.input !== 'object' || !t.input || !t.expected || typeof t.expected !== 'object') fail('Test input/expected requis.');
          }
          const p = { id: randomUUID(), title, purpose, tests: payload.tests, testsHash: hash(payload.tests), paused: false };
          s.projects.push(p); result.id = p.id; detail = { id: p.id, purpose, testsHash: p.testsHash }; break;
        }
        case 'enrol': {
          human(); if (s.agents.length >= 100) fail('100 mandats maximum.');
          if (!['builder', 'reviewer', 'user'].includes(payload.role)) fail('Rôle inconnu.');
          if (!Array.isArray(payload.projects) || !payload.projects.length) fail('Projets autorisés requis.');
          payload.projects.forEach(project);
          const credential = text(payload.credential, 100);
          if (credential.length < 32) fail('Credential agent : 32 caractères minimum.');
          const keyHash = digest(credential);
          if (keyHash === operatorHash || s.agents.some(a => a.keyHash === keyHash)) fail('Credential déjà utilisé.');
          const a = { id: randomUUID(), name: text(payload.name, 80), role: payload.role, mandate: text(payload.mandate),
            projects: [...new Set(payload.projects)], budget: integer(payload.budget), spent: 0, revoked: false, keyHash,
            origin: 'operator-provisioned', independence: 'not-established' };
          s.agents.push(a); result.id = a.id; detail = { id: a.id, name: a.name, role: a.role, mandate: a.mandate }; break;
        }
        case 'propose': {
          role('builder'); const p = project(payload.projectId); checkRecipe(payload.recipe);
          if (s.versions.length >= 300) fail('300 versions maximum.');
          if (payload.parentId) { const parent = version(payload.parentId); if (parent.projectId !== p.id) fail('Parent d’un autre projet.'); }
          const v = { id: randomUUID(), projectId: p.id, parentId: payload.parentId || null, author: actor.id,
            recipe: payload.recipe, recipeHash: hash(payload.recipe), testsHash: p.testsHash, reason: text(payload.reason),
            lawVersion: s.laws.at(-1).version, status: 'proposed', evidence: null, reuseCount: 0 };
          s.versions.push(v); result.id = v.id; detail = { id: v.id, projectId: p.id, recipeHash: v.recipeHash, reason: v.reason }; break;
        }
        case 'review': {
          role('reviewer'); const v = version(payload.versionId), p = project(v.projectId);
          if (v.author === actor.id || v.status !== 'proposed') fail('Revue séparée d’une proposition ouverte requise.', 409);
          const reason = text(payload.reason);
          const cases = p.tests.map(t => { try { const output = runRecipe(v.recipe, t.input); return { passed: canonical(output) === canonical(t.expected), output }; }
            catch (e) { return { passed: false, error: e.message }; } });
          v.evidence = { reviewer: actor.id, reason, testsHash: p.testsHash, cases, at: new Date().toISOString() };
          v.status = cases.every(c => c.passed) ? 'accepted' : 'rejected';
          result = { ok: true, id: v.id, status: v.status, evidence: v.evidence }; detail = result; break;
        }
        case 'reuse': {
          role('user'); const v = version(payload.versionId);
          if (v.status !== 'accepted') fail('Version non acceptée ou contestée.', 409);
          const output = runRecipe(v.recipe, payload.input); v.reuseCount++;
          result = { ok: true, output, versionId: v.id, recipeHash: v.recipeHash }; detail = result; break;
        }
        case 'appeal': {
          if (operator) fail('Utiliser une identité sous mandat pour un recours.');
          const v = version(payload.versionId);
          if (s.appeals.some(a => a.versionId === v.id && a.status === 'open')) fail('Recours déjà ouvert.', 409);
          const a = { id: randomUUID(), versionId: v.id, author: actor.id, reason: text(payload.reason), previousStatus: v.status, status: 'open' };
          s.appeals.push(a); v.status = 'contested'; result.id = a.id; detail = a; break;
        }
        case 'resolve': {
          human(); const a = s.appeals.find(a => a.id === payload.appealId);
          if (!a || a.status !== 'open') fail('Recours ouvert introuvable.', 409);
          if (!['restore', 'quarantine'].includes(payload.decision)) fail('Décision invalide.');
          a.reasonResolved = text(payload.reason); a.status = payload.decision;
          version(a.versionId).status = payload.decision === 'restore' ? a.previousStatus : 'quarantined'; detail = a; break;
        }
        case 'mode': human(); if (!['NORMAL', 'OBSERVATION_ONLY', 'FULL_STOP'].includes(payload.mode)) fail('Mode inconnu.');
          s.mode = payload.mode; detail = { mode: s.mode, reason: text(payload.reason) }; break;
        case 'veto': human(); if (typeof payload.paused !== 'boolean') fail('paused booléen requis.');
          project(payload.projectId).paused = payload.paused; detail = { projectId: payload.projectId, paused: payload.paused, reason: text(payload.reason) }; break;
        case 'revoke': { human(); const a = s.agents.find(a => a.id === payload.agentId); if (!a) fail('Agent introuvable.');
          a.revoked = true; detail = { agentId: a.id, reason: text(payload.reason) }; break; }
        case 'law': human(); s.laws.push({ version: s.laws.length + 1, at: new Date().toISOString(), content: text(payload.content, 3000), reason: text(payload.reason) });
          detail = s.laws.at(-1); break;
        default: fail('Commande inconnue.', 404);
      }
      if (!operator && action !== 'appeal') { actor.spent++; s.treasury.spent++; }
      const prior = db.prepare('SELECT seq,hash FROM civic_events ORDER BY seq DESC LIMIT 1').get();
      const event = { seq: (prior?.seq || 0) + 1, at: new Date().toISOString(), actor: actor.id, action, detail, previous: prior?.hash || 'GENESIS' };
      const eventHash = hash(event);
      db.prepare('INSERT INTO civic_events VALUES(?,?,?,?,?,?,?)').run(event.seq, event.at, event.actor, action, JSON.stringify(detail), event.previous, eventHash);
      result.receipt = { seq: event.seq, hash: eventHash };
      s.receipts[key] = { fingerprint, result };
      db.prepare('UPDATE civic_state SET value=? WHERE id=1').run(JSON.stringify(s));
      db.exec('COMMIT'); return result;
    } catch (e) { db.exec('ROLLBACK'); throw e; }
  }
  function snapshot() {
    const s = read(); delete s.receipts;
    s.agents = s.agents.map(({ keyHash: _, ...a }) => a);
    s.events = db.prepare('SELECT * FROM civic_events ORDER BY seq DESC LIMIT 100').all().map(e => ({ ...e, detail: JSON.parse(e.detail) }));
    s.scope = 'Local controlled prototype. Operation credits, not money or measured energy. Optional local LLM experiments have separate reports; worker activity is not tracked here.';
    return s;
  }
  function exportLedger() {
    const events = db.prepare('SELECT * FROM civic_events ORDER BY seq').all().map(e => ({ ...e, detail: JSON.parse(e.detail) }));
    let previous = 'GENESIS';
    for (const { hash: h, ...e } of events) { if (e.previous !== previous || hash(e) !== h) fail('Intégrité du journal invalide.', 500); previous = h; }
    return { events, head: previous, verified: true, limitation: 'Chaîne locale, sans ancrage externe. Le propriétaire du fichier peut réécrire la base.' };
  }
  return { command, snapshot, exportLedger, close: () => db.close(), credential: () => randomBytes(32).toString('hex') };
}
