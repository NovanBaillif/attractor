// ATTRACTOR v4, lot 3 (19/09/2026) : les trois outils de preuve, sur le profil de preuves
// (attractor-cooperation/evidence/EVIDENCE_PROTOCOL.md). Ils n'inventent aucun contrôle : ils appliquent les
// vérifications de référence de la norme, embarquées sans modification dans ./cooperation-reference/.
// Stockage : registry/evidence.sql (ajout seul, adressé par contenu). Aucun appel sortant : le serveur ne
// va chercher aucune adresse ; il enregistre et vérifie ce qu'on lui envoie.
import {InputError} from './recipes.mjs';
import {bounded} from './honey.mjs';
import {canonical, sha256} from './cooperation-reference/canonical.mjs';
import {inspectRecord, inspectHop, inspectReplay} from './cooperation-reference/index.mjs';

const ID = '^sha256:[0-9a-f]{64}$';
const obj = {type: 'object', additionalProperties: true};
const out = (properties, required = Object.keys(properties)) => ({type: 'object', properties, required});
export const evidenceTools = [
  {name: 'record_observation',
    description: 'Record what you observed when you ran a capability, as an attractor-cooperation record: at least one observed field whose `upstream` identifies the capability and whose `derivation.witness` holds the input and output. The record must pass the profile reference checks. It is stored append-only under its content digest, and your own words stay claims: states are derived by readers. PUBLIC write: public test inputs only, no personal data.',
    inputSchema: {type: 'object', properties: {record: obj}, required: ['record']},
    outputSchema: out({id: {type: 'string'}, stored: {type: 'boolean'}, check: obj}, ['id', 'stored']),
    annotations: {title: 'Record an observation', readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false}},
  {name: 'check_observation',
    description: 'Record a check of a stored observation: a receipt (action verify with a basis field holding your own evidence, or contest with an objection), or a replay (method witness: what you obtained for each witness input). The profile reference check decides whether it is accepted. A replay by the observer itself counts as self-replayed, never as reproduced, and independence is never established by a replay alone. PUBLIC write.',
    inputSchema: {type: 'object', properties: {about: {type: 'string', pattern: ID}, receipt: obj, replay: obj}, required: ['about']},
    outputSchema: out({id: {type: 'string'}, stored: {type: 'boolean'}, check: obj}, ['id', 'stored']),
    annotations: {title: 'Check an observation', readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false}},
  {name: 'find_evidence',
    description: 'Retrieve evidence. With id: the object, everything recorded about it, and the states a reader derives (observed, verified, self-replayed, reproduced, contradicted) with counts and the reason for each, never a score. With capability (a URI prefix): observations of that capability, newest first.',
    inputSchema: {type: 'object', properties: {id: {type: 'string', pattern: ID}, capability: {type: 'string', minLength: 8, maxLength: 600},
      kind: {enum: ['record', 'receipt', 'replay']}, limit: {type: 'integer', minimum: 1, maximum: 50}}},
    outputSchema: obj,
    annotations: {title: 'Find evidence', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false}}
];
export const evidenceNames = evidenceTools.map(t => t.name);

const exact = (body, required, optional = []) => {
  bounded(body);
  if (!body || typeof body !== 'object' || Array.isArray(body) || required.some(k => !Object.hasOwn(body, k)) ||
      Object.keys(body).some(k => ![...required, ...optional].includes(k)))
    throw new InputError('Expected fields: ' + [...required, ...optional.map(k => k + '?')].join(', '));
};
const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = (v, max) => typeof v === 'string' && v.trim() && v.length <= max ? v : null;
function stored(kind, object, extra) {
  const canon = canonical(object);
  if (Buffer.byteLength(canon) > 16000) throw new InputError('Evidence object limit: 16,000 bytes of canonical JSON.');
  return {id: 'sha256:' + sha256(canon), kind, canonical: canon, ...extra};
}

// Une observation : un record conforme, avec au moins un champ observé qui nomme la capacité et porte un témoin.
export function prepareObservation(body) {
  exact(body, ['record']);
  const record = body.record;
  if (!isObject(record)) throw new InputError('record must be an object.');
  // Membres obligatoires du record (SPEC 4.1). Le contrôle de référence 7.3 ne les vérifie pas tous : il s'en
  // remet au schéma, que ce serveur n'embarque pas. Un record sans auteur passait (trouvé par les tests, 19/09).
  if (!text(record.id, 200) || !(record.parent === null || text(record.parent, 200)) || !isObject(record.author) ||
      !text(record.author.actor, 200) || !text(record.author.lineage, 100) || !Array.isArray(record.fields) || !Array.isArray(record.objections))
    throw new InputError('Record is not conformant to the profile: id, parent, author {actor, lineage}, fields and objections are required (SPEC 4.1).');
  const check = inspectRecord(record);
  if (check.status !== 'conformant') throw new InputError('Record is not conformant to the profile: ' + check.violations.slice(0, 5).join(', '));
  const observed = (record.fields || []).find(f => f?.kind === 'observed' && text(f.upstream, 600) &&
    Array.isArray(f.derivation?.witness) && f.derivation.witness.length > 0);
  if (!observed) throw new InputError('An observation needs an observed field with `upstream` (the capability) and a non-empty `derivation.witness` (E1: reproducible means public inputs).');
  return {...stored('record', record, {capability: observed.upstream, actor: text(record.author?.actor, 200) || 'unknown',
    lineage: text(record.author?.lineage, 100)}), check};
}

// Un contrôle d'une observation déjà stockée : un reçu conforme (7.4) ou un rejeu recevable (7.6).
export function prepareCheck(body, storedObservation) {
  exact(body, ['about'], ['receipt', 'replay']);
  if (Boolean(body.receipt) === Boolean(body.replay)) throw new InputError('Send exactly one of receipt or replay.');
  if (!storedObservation || storedObservation.kind !== 'record') throw new InputError('about must be the id of a stored observation.');
  const record = JSON.parse(storedObservation.canonical);
  if (body.receipt) {
    const receipt = body.receipt;
    if (!isObject(receipt) || receipt.target !== record.id) throw new InputError('receipt.target must be the observed record id: ' + record.id);
    const check = inspectHop({sent: record, receipt});
    if (check.status !== 'conformant') throw new InputError('Receipt is not conformant to the profile: ' + check.violations.slice(0, 5).join(', '));
    return {...stored('receipt', receipt, {target: storedObservation.id, actor: text(receipt.record?.author?.actor, 200) || 'unknown',
      lineage: text(receipt.record?.author?.lineage, 100)}), check};
  }
  const replay = body.replay;
  if (!isObject(replay)) throw new InputError('replay must be an object.');
  const check = inspectReplay({record, replay});
  if (check.status === 'invalid') throw new InputError('Replay is invalid: ' + check.problems.slice(0, 5).join(', '));
  return {...stored('replay', replay, {target: storedObservation.id, actor: text(replay.by, 200) || 'unknown', lineage: text(replay.lineage, 100)}), check};
}

// Les états qu'un lecteur dérive (profil de preuves, section 4). Jamais écrits par le producteur, jamais une note.
export function deriveStates(observation, about) {
  const record = JSON.parse(observation.canonical);
  const observer = record.author?.actor;
  const details = [], counts = {verifications: 0, self_replays: 0, reproductions: 0, contradictions: 0};
  for (const item of about) {
    let status, reason;
    if (item.kind === 'receipt') {
      const receipt = JSON.parse(item.canonical), hop = inspectHop({sent: record, receipt});
      const actions = (receipt.dispositions || []).map(d => d.action);
      if (hop.status === 'conformant' && actions.includes('contest')) { counts.contradictions++; status = 'contradicted'; reason = 'a conformant receipt contests a field'; }
      else if (hop.status === 'conformant' && actions.includes('verify')) { counts.verifications++; status = 'verified'; reason = 'a conformant receipt verifies a field with an independent basis (7.4, 7.1)'; }
      else { status = 'no-state'; reason = 'receipt without verify or contest, or no longer conformant'; }
      details.push({id: item.id, kind: item.kind, actor: item.actor, lineage: item.lineage, status, reason, warnings: hop.warnings});
    } else if (item.kind === 'replay') {
      const replay = JSON.parse(item.canonical), check = inspectReplay({record, replay});
      if (check.status === 'refuted') { counts.contradictions++; status = 'contradicted'; reason = 'the replay obtained a different output'; }
      else if (check.status === 'confirmed' && (!replay.by || replay.by === observer)) { counts.self_replays++; status = 'self-replayed'; reason = replay.by ? 'confirmed by the observer itself' : 'confirmed by an undeclared actor'; }
      else if (check.status === 'confirmed') { counts.reproductions++; status = 'reproduced'; reason = 'confirmed by a different declared actor; independence is not established by a replay alone (7.6, 9)'; }
      else { status = 'no-state'; reason = 'replay status ' + check.status; }
      details.push({id: item.id, kind: item.kind, actor: item.actor, lineage: item.lineage, status, reason, warnings: check.warnings});
    }
  }
  const states = ['observed'];
  if (counts.verifications) states.push('verified');
  if (counts.self_replays) states.push('self-replayed');
  if (counts.reproductions) states.push('reproduced');
  if (counts.contradictions) states.push('contradicted');
  return {states, counts, details, independence: 'not-established',
    summary: `${counts.verifications} verification(s), ${counts.reproductions} reproduction(s) by another declared actor, ${counts.self_replays} self-replay(s), ${counts.contradictions} contradiction(s). No score: read the reasons.`};
}

export function findQuery(body) {
  exact(body, [], ['id', 'capability', 'kind', 'limit']);
  if (body.id !== undefined && !new RegExp(ID).test(body.id)) throw new InputError('id must be sha256:<64 hex>.');
  if (body.capability !== undefined && !(typeof body.capability === 'string' && body.capability.length >= 8 && body.capability.length <= 600)) throw new InputError('capability: 8–600 characters.');
  if (body.kind !== undefined && !['record', 'receipt', 'replay'].includes(body.kind)) throw new InputError('kind: record, receipt or replay.');
  if (body.limit !== undefined && !(Number.isInteger(body.limit) && body.limit >= 1 && body.limit <= 50)) throw new InputError('limit: 1–50.');
  if (body.id === undefined && body.capability === undefined) throw new InputError('Send id, or capability.');
  return body;
}
