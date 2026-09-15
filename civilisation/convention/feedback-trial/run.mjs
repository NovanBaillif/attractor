// Reproduce this bounded experiment: node .../feedback-trial/run.mjs
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import Ajv from '../../../registry/node_modules/ajv/dist/2020.js';
import addFormats from '../../../registry/node_modules/ajv-formats/dist/index.js';
import {inspectLineage} from './guard.mjs';
import {checkCases} from './check-cases.mjs';

const bytes = name => readFileSync(new URL(name, import.meta.url));
const read = name => JSON.parse(bytes(name));
const hash = value => createHash('sha256').update(value).digest('hex');
const write = (name, value) => writeFileSync(new URL(name, import.meta.url), JSON.stringify(value, null, 2) + '\n');
const schema = bytes('../message.schema.json');
const ajv = new Ajv({strict: false, allErrors: true}); addFormats(ajv);
const validate = ajv.compile(JSON.parse(schema));
const source = read('source.json'), contest = read('external-contest.json');
const manifest = read('../../../registry/cooperation-pilot.json');
const cases = read('cases.json');
assert.equal(hash(schema), source.schema_sha256, 'Published profile changed since source capture.');
assert.ok(validate(contest), JSON.stringify(validate.errors));
assert.deepEqual(contest.data.target, {source: manifest.proposal.event.source, id: manifest.proposal.event.id});
assert.deepEqual(contest.data.question, {source: manifest.question.event.source, id: manifest.question.event.id});
assert.ok(Array.isArray(cases) && cases.length >= 12);
assert.equal(new Set(cases.map(c => c.id)).size, cases.length, 'Duplicate fixture ID.');

function envelope(id, payload) {
  return {specversion: '1.0', source: 'https://example.org/attractor-controlled-trial', id,
    type: 'org.attractor.cooperation.propose.v0.1', time: '2026-09-14T00:00:00Z',
    datacontenttype: 'application/json', data: {profile: 'attractor-cooperation/0.1',
      community: 'https://example.org/attractor-controlled-trial', actor: 'https://example.org/operator',
      question: contest.data.question, body: JSON.stringify(payload),
      reason: 'Synthetic test payload carried as text by the current public profile.',
      limitations: 'No real incident, independent agent or authority is represented.'}};
}

const results = checkCases(cases);
for (const [i, c] of cases.entries()) {
  assert.ok(validate(envelope(c.id, c.input)), `${c.id}: fixture cannot be transported by current profile`);
  results[i].current_profile_shape_valid = true;
}

// The existing profile has no native typed slots for either proposed mechanism.
const extension = envelope('unsupported-extension', {});
extension.data.field_provenance = [];
assert.equal(validate(extension), false);
const native_extension_errors = structuredClone(validate.errors);

// Identical transmitted records can have different private histories. Metadata cannot
// be reconstructed or authenticated from the numeric/text value alone.
const identical = {fields: [
  {id: 'observation-a', value: 7, kind: 'observed', sources: []},
  {id: 'observation-b', value: 7, kind: 'observed', sources: []}
], comparison: {left: 'observation-a', right: 'observation-b'}};
const honestWorld = structuredClone(identical), concealedCopyWorld = structuredClone(identical);
assert.deepEqual(honestWorld, concealedCopyWorld);
assert.deepEqual(inspectLineage(honestWorld), inspectLineage(concealedCopyWorld));
assert.equal(inspectLineage(honestWorld).status, 'independent');

const report = {
  experiment: 'Attractor external feedback: synthetic receiver checks', controlled_project_test: true,
  checked_at: new Date().toISOString(), external_contest: {
    url: source.external_event_url, revision: source.external_event_revision, schema_valid: true, references_match: true
  }, hashes: Object.fromEntries(['run.mjs', 'check-cases.mjs', 'guard.mjs', 'cases.json', 'external-contest.json', '../message.schema.json'].map(n => [n, hash(bytes(n))])),
  results, total_cases: results.length, expected_outcomes_met: results.length,
  current_profile: {all_test_envelopes_shape_valid: true, semantic_checks_implemented: false,
    proposed_native_field_rejected: true, native_extension_errors},
  falsification: {identical_records_different_private_histories: true,
    checker_distinguishes_hidden_copy: false, equality_alone_proves_obedience: false},
  limitations: [...source.limits,
    'Independence is computed over declared source identifiers; forged roots or aliases can evade it.',
    'Source applicability and verified flags come from a local synthetic trust policy, never from an authenticated real authority.',
    'The checker tests exact JSON values, not general natural-language equivalence or real-world truth.',
    'A controlling document is useful in these scoped examples; this is not a universal rule for all scientific or factual claims.',
    'No model behavior, production API integration, accuracy gain or community adoption was measured.']
};
write('report.json', report);
const experimentEvent = {specversion: '1.0', id: 'feedback-synthetic-trial-' + hash(bytes('report.json')).slice(0, 16),
  source: manifest.proposal.event.source, type: 'org.attractor.cooperation.experiment.v0.1',
  time: report.checked_at, datacontenttype: 'application/json', data: {
    profile: 'attractor-cooperation/0.1', community: manifest.origin, actor: manifest.proposal.event.data.actor,
    question: contest.data.question, target: contest.data.target,
    reason: 'Test the field-provenance and objection-source mechanisms proposed in external responses.',
    limitations: report.limitations.join(' '), outcome: 'pass',
    procedure: `Run feedback-trial/run.mjs. All ${results.length} closed synthetic cases match separately authored expectations; original claims and objections remain intact. Outcome covers only these checks.`,
    evidence: [source.external_event_url, ...source.comment_urls, 'urn:sha256:' + hash(bytes('report.json'))]
  }};
assert.ok(validate(experimentEvent), JSON.stringify(validate.errors));
write('experiment-event.json', experimentEvent);
console.log(JSON.stringify({cases: results.length, expected_outcomes_met: results.length,
  preserved_originals: true, external_event_valid: true, published: false,
  hidden_provenance_detectable: false}, null, 2));
