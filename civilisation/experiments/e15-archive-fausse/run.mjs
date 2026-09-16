// E15 — What happens when the archive handed over is wrong?
// Same three tasks as E14; five archives that differ only in what would let the receiver catch the error.
//   node civilisation/experiments/e15-archive-fausse/run.mjs run [--model=sonnet] [--repeats=5]
//   node civilisation/experiments/e15-archive-fausse/run.mjs pack               → prompts.json for another model
//   node civilisation/experiments/e15-archive-fausse/run.mjs score answers.json → scores someone else's answers
// Writes the report beside this file. No answer is ever fed into a later prompt.
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {schedule, promptFor, scoreE15, verifyMaterial, archiveFor, conditions} from './archives.mjs';
import {hash} from '../../../registry/recipes.mjs';

const CLAUDE = 'C:/Users/Utilisateur/.vscode/extensions/anthropic.claude-code-2.1.272-win32-x64/resources/native-binary/claude.exe';
const SYSTEM = 'You transform JSON specifications into JSON. Answer with one JSON object and nothing else.';
const here = fileURLToPath(new URL('./', import.meta.url));
const empty = here + 'empty/';
const mode = process.argv[2] ?? 'run';
const model = (process.argv.find(a => a.startsWith('--model=')) || '--model=sonnet').slice('--model='.length);
const repeats = Number((process.argv.find(a => a.startsWith('--repeats=')) || '--repeats=5').slice('--repeats='.length));
if (!Number.isInteger(repeats) || repeats < 1) throw Error('--repeats must be a positive whole number');

const material = verifyMaterial();
if (material.honestCorrect !== material.honestTotal || material.wrongPropagated !== material.wrongTotal
  || material.refutableCasesFailedByItsOwnRecipe !== material.refutableCases) {
  throw Error('The material does not behave as designed: ' + JSON.stringify(material));
}
const plan = schedule().map(({task, condition}) => ({id: `${task.id}:${condition}`, task, condition, prompt: promptFor(task, condition)}));

function ask(prompt) {
  const started = Date.now();
  const r = spawnSync(CLAUDE, ['-p', '--model', model, '--output-format', 'json', '--max-turns', '1',
    '--system-prompt', SYSTEM, '--exclude-dynamic-system-prompt-sections', '--no-session-persistence',
    '--disallowedTools', 'Bash,Read,Write,Edit,Glob,Grep,Task,WebFetch,WebSearch,NotebookEdit'],
    {cwd: empty, input: prompt, encoding: 'utf8', maxBuffer: 1 << 26, timeout: 300000});
  if (r.error) throw r.error;
  const envelope = JSON.parse(r.stdout);
  return {text: envelope.result ?? '', ms: Date.now() - started, modelUsage: Object.keys(envelope.modelUsage ?? {})};
}
function extract(text) {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const body = fenced ? fenced[1] : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  return JSON.parse(body);
}
const add = (calls, path) => calls.reduce((a, c) => a + (path(c.score) ?? 0), 0);
function summarise(calls) {
  return Object.fromEntries(conditions.filter(condition => calls.some(c => c.condition === condition)).map(condition => {
    const own = calls.filter(c => c.condition === condition && c.score);
    return [condition, {
      derivable: `${add(own, s => s.derivable.passed)}/${add(own, s => s.derivable.total)}`,
      convention_corrompue: {
        juste: add(own, s => s.corruptedField.correct),
        erreur_recopiee: add(own, s => s.corruptedField.propagated),
        autre: add(own, s => s.corruptedField.other),
        total: add(own, s => s.corruptedField.total)
      },
      convention_intacte: `${add(own, s => s.intactConvention.passed)}/${add(own, s => s.intactConvention.total)}`
    }];
  }));
}

if (mode === 'pack') {
  const pack = {experiment: 'E15', builtAt: new Date().toISOString(),
    archiveHashes: Object.fromEntries(conditions.map(c => [c, hash(archiveFor(c))])),
    howTo: 'Answer each prompt with one JSON recipe and nothing else, one fresh context per prompt, no access to the other answers, no tools. Send back {"model": …, "operator": …, "answers": {"<id>": <recipe>}}, or {"repetitions": [{"answers": …}, …]} if you can run the set several times — we run it five times. Scoring: node run.mjs score answers.json. Warning, read after answering: one of the archives you are given is wrong on purpose; the experiment measures what becomes of that error.',
    prompts: plan.map(({id, prompt}) => ({id, prompt}))};
  writeFileSync(here + 'prompts.json', JSON.stringify(pack, null, 2) + '\n');
  console.log(JSON.stringify({written: 'prompts.json', prompts: pack.prompts.length}));
} else if (mode === 'score') {
  const file = process.argv[3];
  if (!file) throw Error('Usage: score <answers.json>');
  const given = JSON.parse(readFileSync(file, 'utf8'));
  const rounds = given.repetitions ?? [{answers: given.answers ?? given}];
  const calls = rounds.flatMap((round, i) => plan.map(({id, task, condition}) => {
    const recipe = (round.answers ?? round)[id];
    return {id, round: i + 1, task: task.id, condition, score: recipe ? scoreE15(task, recipe) : null, missing: !recipe};
  }));
  const report = {id: randomUUID(), at: new Date().toISOString(), experiment: 'E15', mode: 'external-answers', repeats: rounds.length,
    replayer: {model: given.model ?? null, operator: given.operator ?? null, lineage: given.lineage ?? null},
    material, summary: summarise(calls),
    byRound: Object.fromEntries(rounds.map((round, i) => ['round-' + (i + 1), summarise(calls.filter(c => c.round === i + 1))])), calls};
  writeFileSync(here + `report-external-${report.id}.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({report: `report-external-${report.id}.json`, summary: report.summary}, null, 2));
} else {
  mkdirSync(empty, {recursive: true});
  const report = {id: randomUUID(), at: new Date().toISOString(), experiment: 'E15', model, repeats,
    design: 'The three tasks of E14 with an archive wrong in one convention; five archives differing only in what would let the error be caught; the whole set replayed ' + repeats + ' times; every call stateless, tools disabled, no retry on an invalid answer.',
    material, archiveHashes: Object.fromEntries(conditions.map(c => [c, hash(archiveFor(c))])),
    planHash: hash(plan.map(p => p.id)), calls: []};
  for (let round = 1; round <= repeats; round++) for (const {id, task, condition, prompt} of plan) {
    const call = {id, round, task: task.id, condition, promptHash: hash(prompt), promptChars: prompt.length};
    try {
      const answer = ask(prompt);
      call.ms = answer.ms; call.modelUsage = answer.modelUsage; call.rawAnswer = answer.text.slice(0, 4000);
      call.recipe = extract(answer.text);
      call.score = scoreE15(task, call.recipe);
      call.status = 'scored';
    } catch (error) { call.status = 'invalid-output'; call.error = String(error.message).slice(0, 400); }
    report.calls.push(call);
    const c = call.score?.corruptedField;
    console.log(`${('r' + round).padEnd(4)} ${call.status.padEnd(14)} ${call.task.padEnd(17)} ${call.condition.padEnd(23)} ${c ? 'juste ' + c.correct + ' · recopié ' + c.propagated + ' · autre ' + c.other : '-'} ${call.ms ?? ''}ms`);
    writeFileSync(here + `report-${report.id}.json`, JSON.stringify(report, null, 2));
  }
  report.summary = summarise(report.calls);
  report.byRound = Object.fromEntries(Array.from({length: repeats}, (unused, i) => ['round-' + (i + 1), summarise(report.calls.filter(c => c.round === i + 1))]));
  report.finishedAt = new Date().toISOString();
  writeFileSync(here + `report-${report.id}.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({report: `report-${report.id}.json`, summary: report.summary, invalid: report.calls.filter(c => c.status === 'invalid-output').length}, null, 2));
}
