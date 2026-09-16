import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as checks from './index.mjs';
import { canonical, equal } from './common.mjs';

const clone = value => structuredClone(value);
const observe = (id, value = 1, extra = {}) => ({ id, value, kind: 'observed', sources: [], channel: 'direct', ...extra });
const derive = (id, sources, extra = {}) => ({ id, value: 1, kind: 'derived', sources, ...extra });
const record = (fields = [], extra = {}) => ({ id: 'A', parent: null, author: { actor: 'alice', lineage: 'one' },
  fields, objections: [], ...extra });
const hop = (fields, dispositions, receivedFields = clone(fields)) => ({ sent: record(fields), receipt: {
  id: 'receipt', target: 'A', dispositions, record: record(receivedFields,
    { id: 'B', parent: 'A', author: { actor: 'bob', lineage: 'two' } }),
} });
const lineage = (fields, left = 'a', right = 'b') => checks.inspectLineage({ fields, comparison: { left, right } });
const includes = (result, property, codes) => { for (const code of codes) assert.ok(result[property].includes(code), code); };
const hashText = text => createHash('sha256').update(text).digest('hex');
// Independent straightforward JCS serializer for the plain-object fixtures below.
const fixtureCanonical = value => Array.isArray(value) ? '[' + value.map(fixtureCanonical).join(',') + ']'
  : value !== null && typeof value === 'object' ? '{' + Object.keys(value).sort()
    .map(key => JSON.stringify(key) + ':' + fixtureCanonical(value[key])).join(',') + '}' : JSON.stringify(value);

test('canonical equality sorts keys, retains arrays and rejects non-JSON values', () => {
  assert.equal(canonical({ 2: 'two', 10: 'ten', a: -0 }), '{"10":"ten","2":"two","a":0}');
  assert.equal(equal({ x: [1, 2], z: null }, { z: null, x: [1, 2] }), true);
  assert.equal(equal([1, 2], [2, 1]), false);
  for (const value of [undefined, NaN, Infinity, 1n, { x: undefined }, [, 2]]) assert.equal(equal(value, value), false);
  const cyclic = {}; cyclic.self = cyclic; assert.equal(equal(cyclic, cyclic), false);
});

test('lineage independent, dependent, partial, visible and known-limit outcomes', () => {
  assert.equal(lineage([observe('a'), observe('b')]).status, 'independent');
  assert.equal(lineage([observe('a', 1, { upstream: 'u' }), observe('b', 2, { upstream: 'u' })]).status, 'dependent');
  const fields = [observe('root'), observe('extra'), derive('a', ['root']), derive('b', ['root', 'extra'])];
  const result = lineage(fields);
  assert.equal(result.status, 'dependent-partial');
  assert.deepEqual(result.independentRoots, { left: [], right: ['extra'] });
  assert.deepEqual(result.limits, ['derivation-undeclared']);
  const visible = lineage([observe('a', 1, { derivation: { operation: 'measured', inputs: [], available: ['b'] } }), observe('b')]);
  assert.equal(visible.status, 'unknown'); assert.deepEqual(visible.warnings, ['comparand-visible']);
});

test('lineage declaration failures and global duplicate exclusion', () => {
  const missingChannel = observe('a'); delete missingChannel.channel;
  assert.equal(lineage([missingChannel, observe('b')]).status, 'unknown');
  const cases = [
    [[derive('a', ['a']), observe('b')], 'source-cycle'],
    [[derive('a', ['gone']), observe('b')], 'missing-field'],
    [[observe('a', 1, { sources: null }), observe('b')], 'missing-or-invalid-sources'],
    [[observe('a', 1, { kind: 'unknown' }), observe('b')], 'unknown-or-inconsistent-provenance'],
    [[observe('a', 1, { upstream: null }), observe('b')], 'invalid-upstream'],
    [[observe('a', 1, { channel: 'magic' }), observe('b')], 'invalid-channel'],
    [[observe('a'), observe('b'), observe('unused'), observe('unused')], 'missing-or-duplicate-field-id'],
  ];
  for (const [fields, problem] of cases) {
    const result = lineage(fields); assert.equal(result.status, 'unknown');
    includes(result, 'problems', [problem]); assert.deepEqual(result.sharedSources, []);
  }
});

const disputeInput = () => ({ claim: { id: 'c', value: 1, domain: 'd', version: 'v' },
  objection: { id: 'o', claimId: 'c', proposedValue: 2, sourceId: 'local' },
  policy: { claimId: 'c', sourceId: 'local', domain: 'd', version: 'v', verified: true },
  sources: [{ id: 'local', value: 1, domain: 'd', version: 'v', status: 'verified' }],
});
test('dispute establishes status separately from citation and never applies corrections', () => {
  const input = disputeInput();
  for (const [value, status] of [[1, 'confirmed'], [2, 'correction_supported'], [3, 'contradicted']]) {
    input.sources[0].value = value; input.objection.sourceId = 'secondary';
    const result = checks.inspectDispute(input); assert.equal(result.status, status);
    assert.equal(result.applied, false); assert.equal(result.objectionAssessment.citation, 'secondary');
    assert.equal(result.value, 1); assert.deepEqual(result.original, input.claim);
    assert.notEqual(result.original, input.claim); assert.notEqual(result.objection, input.objection);
  }
  input.policy.verified = false; assert.equal(checks.inspectDispute(input).status, 'unresolved');
});

test('dispute supersession blocks only verified contradictions and preserves warnings', () => {
  const input = disputeInput();
  input.sources.push({ ...input.sources[0], id: 'new', value: 2 });
  let result = checks.inspectDispute(input);
  assert.equal(result.status, 'confirmed'); assert.deepEqual(result.warnings, ['contradicted-undeclared:new']);
  input.sources[1].supersedes = ['local']; result = checks.inspectDispute(input);
  assert.equal(result.status, 'unresolved'); assert.equal(result.objectionAssessment.citation, 'controlling');
  assert.equal(result.objectionAssessment.proposedValueSupported, null);
  input.sources[1].status = 'unverified'; assert.equal(checks.inspectDispute(input).status, 'confirmed');
  input.sources.push(clone(input.sources[0])); assert.equal(checks.inspectDispute(input).status, 'unresolved');
});

test('record conformance checks provenance, seals, objections and channel warnings', () => {
  assert.equal(checks.inspectRecord(record([observe('a')])).status, 'conformant');
  const input = record([derive('a', ['a', 'gone'], { expect: 're_derive' }),
    observe('b', 1, { channel: 'cached' })], { objections: [{ id: 'o', target: 'gone', basis: {} }] });
  const result = checks.inspectRecord(input);
  includes(result, 'violations', ['source-cycle', 'provenance-truncated:a', 're-derive-unsealed:a',
    'objection-target-missing:o', 'objection-basis-missing:o']);
  includes(result, 'warnings', ['upstream-undeclared:b']);
  const sealed = { id: 's', kind: 'unknown', sources: [], expect: 're_derive',
    sealed: { alg: 'sha256-jcs', commitment: '0'.repeat(64) } };
  includes(checks.inspectRecord(record([sealed, derive('f', ['s'])])), 'violations', ['sealed-value-leak:f']);
});

test('record validates operation matching, input declarations, quotes, self state and witness claims', () => {
  const source = observe('s');
  const base = derive('a', ['s'], { derivation: { operation: 'computed', inputs: ['s'], sufficient: ['s'] } });
  assert.equal(checks.inspectRecord(record([source, base])).status, 'conformant');
  const bad = clone(base); bad.derivation.available = ['s'];
  includes(checks.inspectRecord(record([source, bad])), 'violations', ['derivation-inconsistent:a']);
  bad.derivation.inputs = ['s', 's'];
  includes(checks.inspectRecord(record([source, bad])), 'violations', ['invalid-derivation:a']);
  includes(checks.inspectRecord(record([observe('q', 'text', { derivation: { operation: 'quoted', inputs: [] } })])),
    'violations', ['quote-missing:q']);
  includes(checks.inspectRecord(record([observe('s', 1, { upstream: 'self:prior' })])), 'violations', ['self-state-not-cached:s']);
  base.derivation.verifiedOn = 'yesterday';
  includes(checks.inspectRecord(record([source, base])), 'warnings', ['verification-unsupported:a']);
  base.derivation.witness = [{ input: 1, output: 2 }];
  assert.deepEqual(checks.inspectRecord(record([source, base])).warnings, []);
  base.derivation.witness = [{ input: 1 }];
  includes(checks.inspectRecord(record([source, base])), 'violations', ['invalid-witness:a']);
});

test('hop carries values and provenance, excludes duplicate dispositions and counts sealed rejection', () => {
  const input = hop([observe('a')], [{ field: 'a', action: 'accept' }]);
  assert.equal(checks.inspectHop(input).status, 'conformant');
  input.receipt.record.fields[0].value = 2;
  includes(checks.inspectHop(input), 'violations', ['altered-on-accept:a']);
  input.receipt.dispositions.push({ field: 'a', action: 'drop', reason: 'obsolete' });
  const result = checks.inspectHop(input); assert.equal(result.counts.accept, 0);
  assert.deepEqual(result.violations, ['duplicate-disposition:a']);
  input.sent.fields[0].sealed = { alg: 'sha256-jcs', commitment: '0'.repeat(64) };
  input.receipt.dispositions.pop();
  assert.equal(checks.inspectHop(input).counts.accept, 1);
  assert.deepEqual(checks.inspectHop(input).violations, ['sealed-field-not-re-derived:a']);
});

test('hop verification detects circular and reconciled bases and dependent roots', () => {
  const input = hop([observe('a', 1, { upstream: 'u' })], [{ field: 'a', action: 'verify', basis: 'b' }]);
  input.receipt.record.fields.push(observe('b', 1, { upstream: 'u' }));
  includes(checks.inspectHop(input), 'warnings', ['verification-dependent:a']);
  input.receipt.record.fields[1] = derive('b', ['a']);
  includes(checks.inspectHop(input), 'violations', ['circular-verification:a']);
  input.receipt.record.fields[1] = derive('b', ['c'], { derivation: { operation: 'reconciled', inputs: ['c'] } });
  input.receipt.record.fields.push(observe('c'));
  includes(checks.inspectHop(input), 'violations', ['reconciled-basis:a']);
});

test('hop modification warns carried descendants and contest preserves objections', () => {
  const input = hop([observe('a'), derive('b', ['a'])],
    [{ field: 'a', action: 'modify', basis: 'c' }, { field: 'b', action: 'accept' }]);
  input.receipt.record.fields[0] = derive('a', ['c'], { value: 2 }); input.receipt.record.fields.push(observe('c', 2));
  includes(checks.inspectHop(input), 'warnings', ['ancestor-modified:b']);
  const contest = hop([observe('a')], [{ field: 'a', action: 'contest', objection: 'o' }]);
  contest.receipt.record.objections.push({ id: 'o', target: 'a', basis: { citation: 'none' } });
  assert.equal(checks.inspectHop(contest).status, 'conformant');
  contest.sent.objections.push(clone(contest.receipt.record.objections[0]));
  contest.receipt.record.objections[0].basis = { citation: 'secondary', sourceId: 's' };
  includes(checks.inspectHop(contest), 'violations', ['contest-objection-missing:a', 'objection-basis-lost:o']);
});

function sealedHop() {
  const commitment = hashText('{"field":"s","salt":"secret","value":{"answer":2}}');
  const input = hop([{ id: 's', kind: 'unknown', sources: [], expect: 're_derive', sealed: { alg: 'sha256-jcs', commitment } }],
    [{ field: 's', action: 're_derive' }], [observe('s', { answer: 2 })]);
  input.reveal = { target: 'receipt', receiptDigest: hashText(fixtureCanonical(input.receipt)),
    reveals: [{ field: 's', salt: 'secret', value: { answer: 2 } }] };
  return input;
}

test('reveal verifies binding, agreement, missing, duplicate and changed values', () => {
  const input = sealedHop(); let result = checks.inspectReveal(input);
  assert.equal(result.status, 'verified'); assert.equal(result.results[0].outcome, 'agree');
  input.reveal.reveals[0].value.answer = 3;
  includes(checks.inspectReveal(input), 'violations', ['commitment-mismatch:s']);
  input.reveal.reveals = []; result = checks.inspectReveal(input);
  assert.equal(result.status, 'incomplete'); assert.deepEqual(result.missing, ['s']);
  input.reveal.reveals = [sealedHop().reveal.reveals[0], sealedHop().reveal.reveals[0]];
  includes(checks.inspectReveal(input), 'violations', ['duplicate-or-invalid-reveal']);
  input.receipt.id = 'changed';
  includes(checks.inspectReveal(input), 'violations', ['receipt-digest-mismatch', 'reveal-target-mismatch']);
});

test('replay sufficiency and quote compare exactly while reporting lineage', () => {
  const input = { record: record([observe('s'), derive('a', ['s'],
    { derivation: { operation: 'computed', inputs: ['s'], sufficient: ['s'] } })]),
  replay: { field: 'a', method: 'sufficiency', input: 's', value: 1, lineage: 'one' } };
  let result = checks.inspectReplay(input); assert.equal(result.status, 'confirmed');
  assert.deepEqual(result.warnings, ['same-lineage-replay']); assert.equal(result.independence, 'not-established');
  input.replay.value = 2; assert.equal(checks.inspectReplay(input).status, 'refuted');
  input.record.fields[1].derivation.sufficient = []; assert.equal(checks.inspectReplay(input).status, 'undeclared');
  input.record.fields[1].derivation = { operation: 'quoted', inputs: [], quote: 'Exact' };
  input.replay = { field: 'a', method: 'quote', sourceText: 'An Exact quotation', lineage: 'two' };
  assert.equal(checks.inspectReplay(input).status, 'confirmed'); input.replay.sourceText = 'exact';
  assert.equal(checks.inspectReplay(input).status, 'refuted');
});

test('witness replay counts all matches, flags self-refutation and rejects malformed shapes', () => {
  const input = { record: record([observe('rule', 'x', { derivation: { operation: 'measured', inputs: [],
    witness: [{ input: 1, output: 2 }, { input: 2, output: 4 }] } })]),
  replay: { field: 'rule', method: 'witness', produced: [2, 3], lineage: 'two' } };
  let result = checks.inspectReplay(input); assert.equal(result.status, 'refuted');
  assert.deepEqual(result.cases, { matched: 1, total: 2 }); assert.deepEqual(result.warnings, ['self-refuting-witness']);
  input.replay.produced = [2, 4]; assert.equal(checks.inspectReplay(input).status, 'confirmed');
  input.replay.produced = [2]; result = checks.inspectReplay(input);
  assert.equal(result.reproduced, null); includes(result, 'problems', ['replay-produced-invalid']);
  input.record.fields[0].derivation.witness[0] = { input: 1 }; input.replay.produced = [2, 4];
  includes(checks.inspectReplay(input), 'problems', ['witness-invalid']);
});

test('drift report distinguishes green, orange, red and disagreement without violations', () => {
  const input = sealedHop(); assert.equal(checks.driftReport(input).level, 'green');
  const pending = clone(input); delete pending.reveal; assert.equal(checks.driftReport(pending).level, 'orange');
  input.receipt.record.fields[0].value.answer = 3;
  input.reveal.receiptDigest = hashText(fixtureCanonical(input.receipt));
  const result = checks.driftReport(input); assert.equal(result.level, 'orange'); assert.equal(result.counts.re_derive_disagree, 1);
  input.reveal.receiptDigest = 'bad'; assert.equal(checks.driftReport(input).level, 'red');
});

function freeze(value) {
  if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freeze); }
  return value;
}
test('all seven public checks accept frozen input without mutation', () => {
  const sample = sealedHop(); const inputs = {
    inspectLineage: { fields: [observe('a'), observe('b')], comparison: { left: 'a', right: 'b' } },
    inspectDispute: disputeInput(), inspectRecord: sample.sent, inspectHop: sample,
    inspectReveal: sample, driftReport: sample,
    inspectReplay: { record: record([observe('q', 1, { derivation: { operation: 'quoted', inputs: [], quote: 'x' } })]),
      replay: { field: 'q', method: 'quote', sourceText: 'x', lineage: 'two' } },
  };
  for (const [name, input] of Object.entries(inputs)) {
    const before = clone(input); checks[name](freeze(input)); assert.deepEqual(input, before);
  }
});

test('semantic array permutations preserve lineage, record and hop diagnostics', () => {
  const fields = [observe('s'), observe('t'), derive('a', ['s', 't']), derive('b', ['s'])];
  const reversed = clone(fields).reverse(); reversed.forEach(field => field.sources.reverse());
  assert.deepEqual(lineage(fields), lineage(reversed));
  assert.deepEqual(checks.inspectRecord(record(fields)), checks.inspectRecord(record(reversed)));
  const first = hop(fields, fields.map(field => ({ field: field.id, action: 'accept' })));
  const second = clone(first); second.sent.fields.reverse(); second.receipt.record.fields.reverse(); second.receipt.dispositions.reverse();
  assert.deepEqual(checks.inspectHop(first), checks.inspectHop(second));
});
