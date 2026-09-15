import test from 'node:test';
import assert from 'node:assert/strict';
import { thinkingPlan, sameCondition } from './thinking-comparison.mjs';
test('thinking comparison changes only the mode on identical target sequences', () => {
  const targets = ['productCode', 'isActive'], plan = thinkingPlan('qwen3:4b', targets);
  assert.equal(plan.length, 2); assert.deepEqual(plan.map(c => c.think), [false, true]);
  assert.deepEqual({ ...plan[0], think: true }, plan[1]);
  plan[0].targets.pop(); assert.deepEqual(plan[1].targets, targets);
});
test('metrics never mix modes for the same model and method', () => {
  const [off, on] = thinkingPlan('qwen3:4b', ['target']);
  assert.equal(sameCondition(off, on), false); assert.equal(sameCondition({ ...on, target: 'target' }, on), true);
  assert.equal(sameCondition({ model: 'qwen3:4b', method: 'whole' }, { model: 'qwen3:4b', method: 'whole' }), true);
});
