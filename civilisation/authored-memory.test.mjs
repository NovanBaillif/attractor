import test from 'node:test';
import assert from 'node:assert/strict';
import { authoredSchedule, authorPrompt, noteSchema, validateNote, successorTasks } from './authored-memory.mjs';
import { score } from './transmission-task.mjs';

test('model note is preserved verbatim; invalid evidence or structure is refused', () => {
  const note = Object.fromEntries(noteSchema.required.map(k => [k, [{ text: 'An observation', evidence: 'scope' }]]));
  assert.equal(validateNote(note), note);
  for (const alter of [n => { n.errors[0].evidence = 'invented'; }, n => { n.worked = []; }, n => { n.extra = []; }, n => { n.conditions[0].text = 'x'.repeat(351); }]) {
    const invalid = structuredClone(note); alter(invalid); assert.throws(() => validateNote(invalid));
  }
});
test('author precedes paired successors and receives no future-task data', () => {
  const plan = authoredSchedule(); assert.equal(plan.length, 5); assert.equal(plan[0].condition, 'author');
  for (const task of successorTasks) assert.deepEqual(plan.filter(x => x.task.id === task.id).map(x => x.condition).sort(), ['control', 'memory']);
  const prompt = authorPrompt({ scope: 'past', success: { recipe: {} }, failure: { error: 'past error' } });
  for (const task of successorTasks) {
    assert.ok(!prompt.includes(task.spec)); assert.ok(!prompt.includes(task.id));
    for (const input of task.inputs) assert.ok(!prompt.includes(JSON.stringify(input)));
  }
});
test('new tasks require adaptation, including signed decimals and text preservation', () => {
  const fields = [
    [['unitPrice', 'net', ['trim', 'decimal-comma', 'number']], ['sku', 'productCode', ['trim', 'uppercase']], ['active', 'isActive', ['trim', 'lowercase', 'boolean']]],
    [['gross', 'printedPrice', ['trim']], ['serial', 'serialNumber', ['trim']], ['ready', 'readyText', ['trim', 'lowercase']]],
  ];
  successorTasks.forEach((task, i) => {
    const recipe = { fields: fields[i].map(([from, to, steps]) => ({ from, to, steps })) };
    assert.equal(score(task, recipe).filter(t => t.passed).length, 8);
    assert.equal(score(task, null).filter(t => t.passed).length, 0);
  });
});
