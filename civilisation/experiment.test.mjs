import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, heldOut, oracle, novelInput } from './experiment-task.mjs';

const recipe = { fields: [
  { from: 'price', to: 'amount', steps: ['trim', 'decimal-comma', 'number'] },
  { from: 'ref', to: 'reference', steps: ['trim'] },
  { from: 'enabled', to: 'active', steps: ['trim', 'lowercase', 'boolean'] },
] };
test('reuse must change semantic values, not only whitespace or case', () => {
  const previous = [{ price: '1,00', ref: '001', enabled: 'true' }];
  assert.equal(novelInput({ price: ' 1 ', ref: '001 ', enabled: 'TRUE' }, previous), false);
  assert.equal(novelInput({ price: '2', ref: '001', enabled: 'true' }, previous), true);
});
test('independent oracle preserves identifiers and handles case and whitespace', () => {
  assert.deepEqual(oracle({ price: '\t000012,05\n', ref: ' 0001 ', enabled: ' FaLsE ' }), { amount: 12.05, reference: '0001', active: false });
  assert.equal(evaluate(recipe, heldOut).filter(t => t.passed).length, 16);
});
test('out-of-domain critic examples cannot become evidence of a defect', () => {
  for (const price of ['12.50', '-1', 'NaN', '1,234', '1000000', '']) {
    assert.throws(() => evaluate(recipe, [{ price, ref: '001', enabled: 'true' }]), /outside task domain/);
  }
});
test('valid counterexample detects destructive identifier conversion', () => {
  const bad = structuredClone(recipe); bad.fields[1].steps.push('number');
  const result = evaluate(bad, [{ price: '1', ref: '001', enabled: 'true' }])[0];
  assert.equal(result.passed, false); assert.equal(result.expected.reference, '001'); assert.equal(result.output.reference, 1);
});
test('execution failure counts as failure, unknown executable operations are rejected', () => {
  const bad = structuredClone(recipe); bad.fields[0].steps = ['number'];
  assert.equal(evaluate(bad, [{ price: '1,20', ref: '1', enabled: 'true' }])[0].passed, false);
  bad.fields[0].steps = ['shell']; assert.throws(() => evaluate(bad, heldOut));
});
