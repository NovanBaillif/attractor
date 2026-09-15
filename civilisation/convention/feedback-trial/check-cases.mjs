import assert from 'node:assert/strict';
import {inspectLineage, inspectDispute} from './guard.mjs';

export function checkCases(cases) {
  assert.ok(Array.isArray(cases) && cases.length > 0, 'Expected a nonempty case array.');
  assert.equal(new Set(cases.map(c => c.id)).size, cases.length, 'Duplicate fixture ID.');
  const results = [];
  for (const c of cases) {
    const before = structuredClone(c.input);
    const check = c.kind === 'lineage' ? inspectLineage : c.kind === 'dispute' ? inspectDispute : null;
    assert.ok(check, 'Unknown case kind.');
    assert.ok(c.expected && Object.hasOwn(c.expected, 'status'), `${c.id}: expected status missing`);
    const actual = check(c.input);
    for (const [key, expected] of Object.entries(c.expected)) assert.deepEqual(actual[key], expected, `${c.id}: ${key}`);
    assert.deepEqual(c.input, before, `${c.id}: input mutated`);
    const reordered = structuredClone(c.input);
    if (reordered.fields) reordered.fields.reverse();
    if (reordered.sources) reordered.sources.reverse();
    assert.deepEqual(check(reordered), actual, `${c.id}: arrival order changed the decision`);
    if (c.kind === 'dispute') {
      assert.deepEqual(actual.original, before.claim, `${c.id}: original lost`);
      assert.deepEqual(actual.objection, before.objection, `${c.id}: objection lost`);
      assert.equal(actual.applied, false, `${c.id}: a revision was applied automatically`);
      actual.original.value = 'mutation outside the checker';
      assert.deepEqual(c.input, before, `${c.id}: output aliases input`);
    }
    results.push({id: c.id, kind: c.kind, expected: c.expected, status: check(before).status,
      expectation_met: true, original_preserved: true, why: c.why});
  }
  return results;
}
