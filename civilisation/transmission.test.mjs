import test from 'node:test';
import assert from 'node:assert/strict';
import { tasks, score, promptFor, schedule, memoryFrom } from './transmission-task.mjs';
const ancestor = { fields: [
  { from: 'price', to: 'amount', steps: ['trim', 'decimal-comma', 'number'] },
  { from: 'ref', to: 'reference', steps: ['trim'] },
  { from: 'enabled', to: 'active', steps: ['trim', 'lowercase', 'boolean'] },
] };
test('archive must reproduce a verified success and a real failure', () => {
  const success = { id: 'ancestor', multi: { recipe: ancestor } };
  const failure = { id: 'failure', multi: { recipe: { fields: [{ from: 'inputField', to: 'outputField', steps: [] }] } } };
  assert.equal(memoryFrom(success, failure).sourceId, 'ancestor');
  assert.throws(() => memoryFrom(failure, success), /not verified/);
  assert.throws(() => memoryFrom(success, success), /not verified/);
});
test('paired schedule gives each condition one call per task and alternates order', () => {
  const s = schedule(); assert.equal(s.length, 6);
  for (const t of tasks) assert.deepEqual(s.filter(x => x.task.id === t.id).map(x => x.condition).sort(), ['control', 'memory']);
  assert.deepEqual(s.map(x => x.condition), ['control', 'memory', 'memory', 'control', 'control', 'memory']);
});
test('control sees no archive and neither prompt includes evaluation cases', () => {
  for (const t of tasks) {
    const control = promptFor(t, null), memory = promptFor(t, { marker: 'ANCESTOR_ONLY' });
    assert.ok(!control.includes('ANCESTOR_ONLY')); assert.ok(memory.includes('ANCESTOR_ONLY'));
    for (const input of t.inputs) { assert.ok(!control.includes(JSON.stringify(input))); assert.ok(!memory.includes(JSON.stringify(input))); }
  }
});
test('new oracles reject verbatim inheritance and accept adapted semantics', () => {
  const adapted = [
    [['fee', 'cost', ['trim', 'decimal-comma', 'number']], ['code', 'identifier', ['trim']], ['live', 'available', ['trim', 'lowercase', 'boolean']]],
    [['quantity', 'count', ['trim', 'number']], ['label', 'sku', ['trim', 'uppercase']], ['flag', 'active', ['trim', 'lowercase', 'boolean']]],
    [['price', 'priceText', ['trim']], ['ref', 'slug', ['trim', 'lowercase']], ['enabled', 'flagText', ['trim', 'uppercase']]],
  ];
  tasks.forEach((task, i) => {
    assert.equal(score(task, ancestor).filter(t => t.passed).length, 0);
    const recipe = { fields: adapted[i].map(([from, to, steps]) => ({ from, to, steps })) };
    assert.equal(score(task, recipe).filter(t => t.passed).length, 8);
    assert.equal(score(task, null).filter(t => t.passed).length, 0);
  });
});
