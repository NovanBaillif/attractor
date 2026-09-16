// Re-scores the answers already obtained, with the corrected field-by-field scorer. No model is called:
// every recipe comes from report.json, so the correction owes nothing to a new sample.
// Reason for the correction: terminator2-agent's audit of 16 September 2026,
// https://github.com/ai-village-agents/ai-village-external-agents/issues/85#issuecomment-5693413381
//   node civilisation/experiments/e14-taches-dures/rescore.mjs [report.json]
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {tasks, scoreFields} from './tasks.mjs';
import {hash} from '../../../registry/recipes.mjs';

const here = fileURLToPath(new URL('./', import.meta.url));
const source = process.argv[2] ?? here + 'report.json';
const original = JSON.parse(readFileSync(source, 'utf8'));
const byId = new Map(tasks.map(t => [t.id, t]));

const calls = original.calls.map(call => {
  if (!call.recipe) return {...call, rescored: null};
  const score = scoreFields(byId.get(call.task), call.recipe);
  return {id: call.id, round: call.round, task: call.task, condition: call.condition, recipe: call.recipe, score};
});
const scored = calls.filter(c => c.score);
const sum = (list, klass, member) => list.reduce((a, c) => a + c.score[klass][member], 0);
const summarise = list => Object.fromEntries([...new Set(list.map(c => c.condition))].map(condition => {
  const own = list.filter(c => c.condition === condition);
  return [condition, {derivable: `${sum(own, 'derivable', 'passed')}/${sum(own, 'derivable', 'total')}`,
    convention: `${sum(own, 'convention', 'passed')}/${sum(own, 'convention', 'total')}`}];
}));
// What the defect actually cost: fields the old scorer wrote down as wrong only because a sibling field threw.
const fieldErrors = scored.flatMap(c => c.score.cases.flatMap(k => Object.entries(k.fields)
  .filter(([, f]) => f.error).map(([name, f]) => ({call: c.id, field: name, klass: f.klass, error: f.error}))));

const report = {id: original.id, rescoredAt: new Date().toISOString(), experiment: 'E14', mode: 'rescore-of-existing-answers',
  source: source.replace(here, ''), sourceCalls: original.calls.length, model: original.model, repeats: original.repeats,
  reason: 'The first scorer ran the whole recipe at once, so one field whose step threw aborted the case and its neighbours were recorded as wrong. Audit by terminator2-agent, 16 September 2026.',
  audit: 'https://github.com/ai-village-agents/ai-village-external-agents/issues/85#issuecomment-5693413381',
  originalSummary: original.summary, summary: summarise(scored),
  byRound: Object.fromEntries(Array.from({length: original.repeats}, (unused, i) =>
    ['round-' + (i + 1), summarise(scored.filter(c => c.round === i + 1))])),
  fieldsWithExecutionError: fieldErrors.length,
  fieldErrorsByClass: fieldErrors.reduce((a, f) => ({...a, [f.klass]: (a[f.klass] ?? 0) + 1}), {}),
  recipesHash: hash(calls.map(c => c.recipe ?? null)), calls};
writeFileSync(here + 'report-rescored.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({written: 'report-rescored.json', avant: original.summary, apres: report.summary,
  champsEnErreur: report.fieldsWithExecutionError, parClasse: report.fieldErrorsByClass}, null, 2));
