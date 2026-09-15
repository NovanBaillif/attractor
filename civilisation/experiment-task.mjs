import { canonical, runRecipe, checkRecipe, operations } from '../registry/recipes.mjs';

export const specification = 'Normalize an object with exactly price, ref, enabled strings. price: nonnegative French decimal (1-6 digits, optionally comma and 1-2 digits), with optional surrounding whitespace; output amount as number. ref: 1-12 digits with optional surrounding whitespace; output reference as trimmed STRING preserving leading zeros. enabled: true or false in any letter case with optional surrounding whitespace; output active as boolean. Output exactly amount, reference, active.';
export const contract = 'Produce a recipe with a fields array. Each field object has from (actual source field name), to (actual destination field name), steps (array of operation names). Include all three requested outputs. Steps execute in order. Available: trim (string), lowercase (string), uppercase (string), decimal-comma (French numeric string to dot numeric STRING), number (numeric string to number), boolean (exact "true"/"false" to boolean). Empty steps copy a value. No code, constants or other operations.';
export const recipeSchema = { type: 'object', additionalProperties: false, required: ['fields'], properties: { fields: { type: 'array', minItems: 1, maxItems: 12, items: { type: 'object', additionalProperties: false, required: ['from', 'to', 'steps'], properties: { from: { type: 'string' }, to: { type: 'string' }, steps: { type: 'array', maxItems: 5, items: { type: 'string', enum: operations } } } } } } };
export const inputSchema = { type: 'object', additionalProperties: false, required: ['price', 'ref', 'enabled'], properties: Object.fromEntries(['price', 'ref', 'enabled'].map(k => [k, { type: 'string', maxLength: 40 }])) };
export function oracle(input) {
  if (!input || Object.keys(input).sort().join(',') !== 'enabled,price,ref' || Object.values(input).some(v => typeof v !== 'string' || v.length > 40)) throw Error('Input outside task domain');
  const { price, ref, enabled } = Object.fromEntries(Object.entries(input).map(([k, v]) => [k, v.trim()]));
  if (!/^\d{1,6}(,\d{1,2})?$/.test(price) || !/^\d{1,12}$/.test(ref) || !/^(true|false)$/i.test(enabled)) throw Error('Input outside task domain');
  return { amount: Number(price.replace(',', '.')), reference: ref, active: enabled.toLowerCase() === 'true' };
}
export const publicInputs = [{ price: '12,50', ref: '00042', enabled: 'true' }, { price: ' 8,2 ', ref: ' 007 ', enabled: ' FALSE ' }];
// Fixed before inference; never included in prompts or repair feedback.
export const heldOut = ['0', '000012,05', '999999,99', '\t42\n'].flatMap(price => ['000000000001', ' 0 '].flatMap(ref => ['TrUe', '\tFaLsE\n'].map(enabled => ({ price, ref, enabled }))));
export function evaluate(recipe, inputs) {
  checkRecipe(recipe);
  return inputs.map(input => {
    const expected = oracle(input);
    try { const output = runRecipe(recipe, input); return { input, expected, output, passed: canonical(expected) === canonical(output) }; }
    catch (e) { return { input, expected, passed: false, error: e.message }; }
  });
}
export function novelInput(input, previous) {
  const expected = canonical(oracle(input));
  return previous.every(other => {
    try { return canonical(oracle(other)) !== expected; } catch { return true; }
  });
}
