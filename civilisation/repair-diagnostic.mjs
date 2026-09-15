import { checkRecipe, runRecipe, canonical, hash, operations } from '../registry/recipes.mjs';
import { successorTasks } from './authored-memory.mjs';
import { score } from './transmission-task.mjs';
import { contract, recipeSchema } from './experiment-task.mjs';

export const task = successorTasks[0];
export const targets = ['productCode', 'isActive'];
export const stepsSchema = { type: 'object', additionalProperties: false, required: ['steps'], properties: { steps: { type: 'array', maxItems: 5, items: { type: 'string', enum: operations } } } };
export function initialFrom(report) {
  const recipe = report.calls?.find(c => c.condition === 'repair')?.recipe;
  checkRecipe(recipe);
  if (score(task, recipe).every(t => t.passed)) throw Error('Expected a reproduced failed repair');
  return { recipe: structuredClone(recipe), sourceId: report.id, sourceHash: hash(report) };
}
export function fieldCases(recipe, target) {
  const field = recipe.fields.find(f => f.to === target);
  return task.inputs.map(input => {
    const expected = task.expected(input)[target];
    try {
      if (!field) throw Error('Missing output field');
      const actual = runRecipe({ fields: [field] }, input)[target];
      return { input, expected, actual, passed: canonical(actual) === canonical(expected) };
    } catch (e) { return { input, expected, passed: false, error: e.message }; }
  });
}
export function applyAnswer(recipe, target, method, answer) {
  if (method === 'whole') return checkRecipe(answer);
  if (method !== 'field' || !answer || Object.keys(answer).join(',') !== 'steps') throw Error('Invalid field patch');
  const next = structuredClone(recipe), field = next.fields.find(f => f.to === target);
  if (!field) throw Error('Missing target');
  field.steps = answer.steps; checkRecipe(next);
  return next;
}
export function diagnosticPrompt(recipe, target, method) {
  const cases = fieldCases(recipe, target), example = cases.find(c => !c.passed) || cases[0];
  return { format: method === 'whole' ? recipeSchema : stepsSchema,
    prompt: contract + '\nCURRENT CONTRACT: ' + task.spec + '\nCurrent recipe: ' + JSON.stringify(recipe) +
      '\nFocus ONLY on output ' + target + '. Preserve every other behavior. Verified field test: ' + JSON.stringify(example) +
      (method === 'whole' ? '\nReturn the complete recipe after fixing this output. If already correct, preserve it.' : '\nReturn only the steps array for this output inside a JSON object. Other fields are frozen by the executor. If already correct, preserve its steps.') };
}
