import test from 'node:test';
import assert from 'node:assert/strict';
import { repairEvidence, repairPrompt, validateRepair, repairSchedule, transferTask, rejectedDraftEvidence } from './memory-repair.mjs';
import { score } from './transmission-task.mjs';

const note = Object.fromEntries(['worked', 'conditions', 'errors', 'uncertainties'].map(k => [k, [{ text: 'Past observation', evidence: 'scope' }]]));
const recipe = { fields: [
  { from: 'unitPrice', to: 'net', steps: ['trim', 'decimal-comma', 'number'] },
  { from: 'sku', to: 'productCode', steps: ['trim', 'uppercase'] },
  { from: 'active', to: 'isActive', steps: ['trim', 'lowercase', 'boolean'] },
] };
test('retry feedback must come from a reproduced rejected repair', () => {
  const bad = structuredClone(recipe); bad.fields[1].steps = ['trim'];
  const prior = { id: 'rejected', outcome: 'repair_failed_no_transfer', calls: [{ condition: 'repair', recipe: bad }] };
  assert.equal(rejectedDraftEvidence(prior).counterexample.passed, false);
  prior.calls[0].recipe = recipe; assert.throws(() => rejectedDraftEvidence(prior), /not reproducible/);
});
test('failure is recomputed and ancestry preserved; a false failure is refused', () => {
  const bad = structuredClone(recipe); bad.fields[1].steps = ['trim'];
  const prior = { id: 'ancestor', memory: { note, recipe }, calls: [{ task: 'signed-invoice', condition: 'memory', recipe: bad, tests: [{ passed: true }] }] };
  const before = structuredClone(prior), evidence = repairEvidence(prior);
  assert.equal(evidence.failure.passed, false); assert.equal(evidence.failure.expected.productCode, '00AB-7');
  assert.equal(evidence.failure.output.productCode, '00ab-7'); assert.deepEqual(prior, before);
  prior.calls[0].recipe = recipe; assert.throws(() => repairEvidence(prior), /No independently reproduced failure/);
});
test('repair gate rejects regressions and requires both recipe and bounded note', () => {
  assert.equal(validateRepair({ recipe, note }).filter(t => t.passed).length, 8);
  const bad = structuredClone(recipe); bad.fields[1].steps = ['trim'];
  assert.equal(validateRepair({ recipe: bad, note }).filter(t => t.passed).length, 0);
  assert.throws(() => validateRepair({ recipe }));
  assert.throws(() => validateRepair({ recipe, note, extra: true }));
});
test('future task is absent from repair prompt and old/new contexts share its oracle', () => {
  const prompt = repairPrompt({ scope: 'old', recipe, note, failure: { passed: false } });
  assert.ok(!prompt.includes(transferTask.spec)); assert.ok(!prompt.includes('shippingCode'));
  const plan = repairSchedule(); assert.equal(plan.length, 3); assert.equal(plan[0].condition, 'repair');
  assert.equal(plan[1].task, plan[2].task);
  const adapted = { fields: [
    { from: 'chargeFr', to: 'amountN', steps: ['trim', 'decimal-comma', 'number'] },
    { from: 'label', to: 'shippingCode', steps: ['trim', 'uppercase'] },
    { from: 'flag', to: 'billable', steps: ['trim', 'lowercase', 'boolean'] },
  ] };
  assert.equal(score(transferTask, adapted).filter(t => t.passed).length, 8);
  assert.equal(score(transferTask, recipe).filter(t => t.passed).length, 0);
});
