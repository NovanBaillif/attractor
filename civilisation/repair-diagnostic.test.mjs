import test from 'node:test';
import assert from 'node:assert/strict';
import { applyAnswer, fieldCases, diagnosticPrompt, initialFrom, task } from './repair-diagnostic.mjs';
import { score } from './transmission-task.mjs';

const broken = { fields: [
  { from: 'unitPrice', to: 'net', steps: ['trim', 'decimal-comma', 'number'] },
  { from: 'sku', to: 'productCode', steps: ['trim'] },
  { from: 'active', to: 'isActive', steps: ['trim', 'boolean'] },
] };
test('isolated evidence reveals both defects despite whole-recipe boolean error', () => {
  assert.equal(score(task, broken).filter(t => t.passed).length, 0);
  const code = fieldCases(broken, 'productCode')[0]; assert.equal(code.actual, '00ab-7'); assert.equal(code.expected, '00AB-7');
  assert.ok(fieldCases(broken, 'isActive')[0].error);
});
test('field patch freezes other fields and never mutates the prior version', () => {
  const before = structuredClone(broken);
  const first = applyAnswer(broken, 'productCode', 'field', { steps: ['trim', 'uppercase'] });
  assert.deepEqual(broken, before); assert.deepEqual(first.fields[0], broken.fields[0]); assert.deepEqual(first.fields[2], broken.fields[2]);
  const second = applyAnswer(first, 'isActive', 'field', { steps: ['trim', 'lowercase', 'boolean'] });
  assert.equal(score(task, second).filter(t => t.passed).length, 8);
});
test('patch cannot redirect a field or inject an executable operation', () => {
  assert.throws(() => applyAnswer(broken, 'productCode', 'field', { steps: ['trim'], to: 'net' }));
  assert.throws(() => applyAnswer(broken, 'productCode', 'field', { steps: ['shell'] }));
  assert.throws(() => applyAnswer(broken, 'missing', 'field', { steps: [] }));
});
test('whole-recipe condition is allowed to regress and evaluation catches it', () => {
  const candidate = structuredClone(broken); candidate.fields[0].steps = [];
  const result = applyAnswer(broken, 'productCode', 'whole', candidate);
  assert.equal(result, candidate); assert.ok(fieldCases(result, 'net').every(t => !t.passed));
});
test('both prompts use the same evidence and valid ancestor is rejected', () => {
  const a = diagnosticPrompt(broken, 'productCode', 'whole').prompt;
  const b = diagnosticPrompt(broken, 'productCode', 'field').prompt;
  assert.equal(a.split('\nReturn')[0], b.split('\nReturn')[0]);
  assert.equal(initialFrom({ id: 'failed', calls: [{ condition: 'repair', recipe: broken }] }).sourceId, 'failed');
  const fixed = applyAnswer(applyAnswer(broken, 'productCode', 'field', { steps: ['trim', 'uppercase'] }), 'isActive', 'field', { steps: ['trim', 'lowercase', 'boolean'] });
  assert.throws(() => initialFrom({ calls: [{ condition: 'repair', recipe: fixed }] }));
});
