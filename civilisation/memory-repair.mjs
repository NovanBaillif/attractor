import { successorTasks, noteSchema, validateNote } from './authored-memory.mjs';
import { recipeSchema, contract } from './experiment-task.mjs';
import { score } from './transmission-task.mjs';
import { checkRecipe, hash } from '../registry/recipes.mjs';

export const repairSchema = { type: 'object', additionalProperties: false, required: ['recipe', 'note'], properties: { recipe: recipeSchema, note: noteSchema } };
export const transferTask = { id: 'shipping-code', spec: 'Input chargeFr, label, flag are strings. Convert signed French decimal chargeFr with surrounding whitespace into numeric amountN. Trim label and UPPERCASE it into shippingCode, retaining zeros. Trim flag, normalize case and convert true/false into boolean billable. Output exactly amountN, shippingCode, billable.',
  inputs: [' -2,15 ', '0', '+004,80', '\t91,2\n'].flatMap(chargeFr => ['tRuE', ' FALSE '].map(flag => ({ chargeFr, label: ' 000cd-8 ', flag }))),
  expected: i => ({ amountN: Number(i.chargeFr.trim().replace(',', '.')), shippingCode: i.label.trim().toUpperCase(), billable: i.flag.trim().toLowerCase() === 'true' }) };
export function repairEvidence(prior) {
  const call = prior.calls?.find(c => c.task === 'signed-invoice' && c.condition === 'memory');
  if (!call?.recipe || !prior.memory?.note) throw Error('Missing ancestor memory or failed recipe');
  validateNote(prior.memory.note);
  const failures = score(successorTasks[0], call.recipe).filter(t => !t.passed);
  if (!failures.length) throw Error('No independently reproduced failure');
  return { parentId: prior.id, parentHash: hash(prior), memoryHash: hash(prior.memory), scope: successorTasks[0].spec,
    recipe: call.recipe, note: prior.memory.note, failure: failures[0] };
}
export function repairPrompt(evidence) {
  if (evidence.rejectedDraft) return contract + '\nYour attempted repair was rejected. Produce a corrected recipe for the CURRENT scope and a NEW note about this correction. Do not repeat obsolete lessons from a different task. Every output must match the current requirements. The prior counterexample and the failed attempt are below. Future task is unknown. Evidence labels: scope=current contract, failure=verified failures, success=only actual observations.\n' + JSON.stringify({ scope: evidence.scope, priorCounterexample: evidence.failure, rejectedDraft: evidence.rejectedDraft });
  return contract + '\nRepair the failed recipe for the scope below and write a revised handover note. Use the verified counterexample. Explain what changed and limits of transfer. Do not claim success beyond observed evidence. Evidence labels: scope is the task contract, failure is the counterexample, success refers only to earlier observations described in the note. You do not know the next task. Return recipe and note.\n' +
    JSON.stringify({ scope: evidence.scope, recipe: evidence.recipe, note: evidence.note, failure: evidence.failure });
}
export function rejectedDraftEvidence(prior) {
  const call = prior.calls?.find(c => c.condition === 'repair');
  if (prior.outcome !== 'repair_failed_no_transfer' || !call?.recipe) throw Error('Rejected repair required');
  const failures = score(successorTasks[0], call.recipe).filter(t => !t.passed);
  if (!failures.length) throw Error('Repair failure not reproducible');
  return { reportId: prior.id, reportHash: hash(prior), recipe: call.recipe, counterexample: failures[0] };
}
export function validateRepair(value) {
  if (!value || Object.keys(value).sort().join(',') !== 'note,recipe') throw Error('Invalid repair envelope');
  checkRecipe(value.recipe); validateNote(value.note);
  return score(successorTasks[0], value.recipe);
}
export function repairSchedule() {
  return [{ task: { id: 'memory-repair', spec: successorTasks[0].spec, inputs: [] }, condition: 'repair' },
    { task: transferTask, condition: 'old-memory' }, { task: transferTask, condition: 'revised-memory' }];
}
