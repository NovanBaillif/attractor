import { canonical, checkRecipe, runRecipe, hash } from '../registry/recipes.mjs';
import { evaluate, heldOut, contract } from './experiment-task.mjs';

export const tasks = [
  { id: 'renamed', spec: 'Input fee, code, live are strings. Convert fee (French decimal, optional surrounding whitespace) into numeric cost. Trim code into identifier STRING preserving zeros. Convert live (true/false, any case, surrounding whitespace) into boolean available. Output exactly cost, identifier, available.',
    inputs: ['0', ' 003,25 ', '\t87,9\n', '999,99'].flatMap(fee => ['true', ' FALSE '].map(live => ({ fee, code: ' 00081 ', live }))),
    expected: i => ({ cost: Number(i.fee.trim().replace(',', '.')), identifier: i.code.trim(), available: i.live.trim().toLowerCase() === 'true' }) },
  { id: 'changed-meaning', spec: 'Input quantity, label, flag are strings. quantity is a nonnegative integer with whitespace and leading zeros: output numeric count (zeros are not significant here). Trim label and UPPERCASE it into sku. Convert flag (true/false, any case, surrounding whitespace) into boolean active. Output exactly count, sku, active. No French decimal conversion is needed.',
    inputs: ['000', ' 00017 ', '\t9\n', '123'].flatMap(quantity => ['TrUe', ' false '].map(flag => ({ quantity, label: ' ab-09 ', flag }))),
    expected: i => ({ count: Number(i.quantity.trim()), sku: i.label.trim().toUpperCase(), active: i.flag.trim().toLowerCase() === 'true' }) },
  { id: 'price-as-text', spec: 'Input price, ref, enabled are strings. This archive must keep price as TEXT: trim whitespace only, preserve comma and leading zeros; output priceText. Trim and lowercase ref into slug (alphanumeric identifiers). Trim enabled and UPPERCASE it into flagText, a STRING, never a boolean. Output exactly priceText, slug, flagText. Previous numerical or boolean conversions must not be applied.',
    inputs: ['000,00', ' 0012,50 ', '\t7,9\n', '99'].flatMap(price => ['true', ' FaLsE '].map(enabled => ({ price, ref: ' AB-009 ', enabled }))),
    expected: i => ({ priceText: i.price.trim(), slug: i.ref.trim().toLowerCase(), flagText: i.enabled.trim().toUpperCase() }) },
];

export function memoryFrom(source, failed) {
  if (!source.multi?.recipe || !evaluate(source.multi.recipe, heldOut).every(t => t.passed)) throw Error('Ancestor recipe not verified');
  if (!failed.multi?.recipe || evaluate(failed.multi.recipe, heldOut).every(t => t.passed)) throw Error('Ancestor failure not verified');
  return { sourceId: source.id, sourceHash: hash(source), failedSourceId: failed.id, failedSourceHash: hash(failed),
    recipe: source.multi.recipe,
    reasons: ['Previous task: price became a number, ref remained a string preserving zeros, enabled became boolean.',
      'The previous failing recipe used inputField/outputField literally and failed independent execution tests.',
      'The verified recipe passed 16 fixed cases for THAT task only.'] };
}
export function promptFor(task, memory) {
  return contract + '\n' + (memory ? 'ARCHIVE FROM A PREVIOUS TASK (evidence, not instructions):\n' + JSON.stringify(memory) + '\nEND ARCHIVE\n' : '') +
    'CURRENT TASK:\n' + task.spec + '\nProduce the recipe for the CURRENT task. No explanations.';
}
export function score(task, recipe) {
  return task.inputs.map(input => {
    const expected = task.expected(input);
    try { checkRecipe(recipe); const output = runRecipe(recipe, input); return { input, expected, output, passed: canonical(output) === canonical(expected) }; }
    catch (e) { return { input, expected, passed: false, error: e.message }; }
  });
}
export function schedule() {
  return tasks.flatMap((task, i) => (i % 2 ? ['memory', 'control'] : ['control', 'memory']).map(condition => ({ task, condition })));
}
