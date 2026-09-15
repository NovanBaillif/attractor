import test from 'node:test';
import assert from 'node:assert/strict';
import { conditions, selectMemory, ablationSchedule } from './ablation.mjs';
import { promptFor, tasks } from './transmission-task.mjs';

const memory = { sourceId: 'verified', sourceHash: 'hash', recipe: { fields: [{ from: 'UNIQUE_RECIPE', to: 'result', steps: [] }] }, reasons: ['UNIQUE_REASON'] };
test('ablation isolates recipe and reasons without changing provenance or original archive', () => {
  const before = structuredClone(memory);
  assert.equal(selectMemory(memory, 'control'), null);
  assert.deepEqual(selectMemory(memory, 'memory'), memory);
  assert.ok(!('reasons' in selectMemory(memory, 'recipe-only')));
  assert.ok(!('recipe' in selectMemory(memory, 'reasons-only')));
  for (const condition of conditions.slice(1)) assert.equal(selectMemory(memory, condition).sourceHash, 'hash');
  assert.deepEqual(memory, before);
  assert.throws(() => selectMemory(memory, 'unknown'));
});
test('all four conditions receive identical tasks, once each, in rotated positions', () => {
  const plan = ablationSchedule(); assert.equal(plan.length, 12);
  for (const task of tasks) {
    const entries = plan.filter(x => x.task.id === task.id);
    assert.deepEqual(entries.map(x => x.condition).sort(), [...conditions].sort());
    assert.ok(entries.every(x => x.task === task));
  }
  assert.deepEqual(plan.filter((_, i) => i % 4 === 0).map(x => x.condition), conditions.slice(0, 3));
});
test('prompts contain only the assigned archive component', () => {
  for (const condition of conditions) {
    const prompt = promptFor(tasks[0], selectMemory(memory, condition));
    assert.equal(prompt.includes('UNIQUE_RECIPE'), ['recipe-only', 'memory'].includes(condition));
    assert.equal(prompt.includes('UNIQUE_REASON'), ['reasons-only', 'memory'].includes(condition));
    assert.ok(prompt.includes(tasks[0].spec));
  }
});
