// E14 — Does a verified archive still help a strong model, when the task hides what only the archive knows?
// Three tasks of one register; four conditions (nothing, recipe only, reasons only, both); one stateless call each.
// Scoring is field by field and split: "derivable" (the specification gives it) and "convention" (only the archive).
//   node civilisation/experiments/e14-taches-dures/run.mjs run [--model=sonnet] [--repeats=5]
//   node civilisation/experiments/e14-taches-dures/run.mjs pack              → prompts.json for another model
//   node civilisation/experiments/e14-taches-dures/run.mjs score answers.json → scores someone else's answers
// Writes data/civilisation/runs/e14-<uuid>.json. No answer is ever fed into a later prompt.
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {archive, tasks, schedule, promptFor, memoryFor, scoreFields, verifyArchive} from './tasks.mjs';
import {hash} from '../../../registry/recipes.mjs';

const CLAUDE = 'C:/Users/Utilisateur/.vscode/extensions/anthropic.claude-code-2.1.272-win32-x64/resources/native-binary/claude.exe';
const SYSTEM = 'You transform JSON specifications into JSON. Answer with one JSON object and nothing else.';
const runs = fileURLToPath(new URL('../../../data/civilisation/runs/', import.meta.url));
const here = fileURLToPath(new URL('./', import.meta.url));
const empty = here + 'empty/';
const mode = process.argv[2] ?? 'run';
const model = (process.argv.find(a => a.startsWith('--model=')) || '--model=sonnet').slice('--model='.length);
// The whole set is replayed several times: one call per case says nothing about stability.
const repeats = Number((process.argv.find(a => a.startsWith('--repeats=')) || '--repeats=5').slice('--repeats='.length));
if (!Number.isInteger(repeats) || repeats < 1) throw Error('--repeats must be a positive whole number');

const verified = verifyArchive();
if (verified.passed !== verified.total) throw Error('The archive recipe does not pass the previous entry: ' + JSON.stringify(verified));
const plan = schedule().map(({task, condition}) => ({id: `${task.id}:${condition}`, task, condition, prompt: promptFor(task, memoryFor(condition))}));

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
const total = (calls, klass) => {
  const passed = calls.reduce((a, c) => a + (c.score?.[klass].passed ?? 0), 0);
  const all = calls.reduce((a, c) => a + (c.score?.[klass].total ?? 0), 0);
  return `${passed}/${all}`;
};
function summarise(calls) {
  return Object.fromEntries([...new Set(calls.map(c => c.condition))].map(condition => {
    const own = calls.filter(c => c.condition === condition && c.score);
    return [condition, {derivable: total(own, 'derivable'), convention: total(own, 'convention')}];
  }));
}

if (mode === 'pack') {
  const pack = {experiment: 'E14', archiveHash: hash(archive), builtAt: new Date().toISOString(),
    howTo: 'Answer each prompt with one JSON recipe and nothing else, one fresh context per prompt, no access to the other answers. Send back {"model": …, "operator": …, "isolation": …, "attested_by": …, "prompt_order": […], "answers": {"<id>": <recipe>}}. Run the whole set several times if you can — we run it five times — and send {"repetitions": [{"answers": …}, …]} instead. Scoring: node run.mjs score answers.json, field by field, split between what the specification gives and what only the archive gives.',
    isolationField: 'isolation is "fresh-context-per-prompt", "shared-context" or "unknown", and defaults to unknown when you leave it out: a contaminated run and a clean run emit identical answer files, so the property this design rests on has to be declared rather than assumed. attested_by is "operator" or "agent-self-report". prompt_order is the order you actually read the prompts in — a trace rather than a claim, empty or arbitrary under real isolation, and under a shared context it says which conditions were contaminated by which. A shared-context run is not discarded: it measures within-context carry-over, which is a different and perfectly good result, and it is reported as such. Asked for by terminator2-agent, https://github.com/ai-village-agents/ai-village-external-agents/issues/85#issuecomment-5690452796',
    prompts: plan.map(({id, prompt}) => ({id, prompt}))};
  writeFileSync(here + 'prompts.json', JSON.stringify(pack, null, 2) + '\n');
  console.log(JSON.stringify({written: 'prompts.json', prompts: pack.prompts.length, archiveHash: pack.archiveHash}));
} else if (mode === 'score') {
  const file = process.argv[3];
  if (!file) throw Error('Usage: score <answers.json>');
  const given = JSON.parse(readFileSync(file, 'utf8'));
  // One pass, or several: {"answers": …} or {"repetitions": [{"answers": …}, …]}.
  const rounds = given.repetitions ?? [{answers: given.answers ?? given}];
  const calls = rounds.flatMap((round, i) => plan.map(({id, task, condition}) => {
    const recipe = (round.answers ?? round)[id];
    return {id, round: i + 1, task: task.id, condition, score: recipe ? scoreFields(task, recipe) : null, missing: !recipe};
  }));
  const isolation = given.isolation ?? 'unknown';
  const report = {id: randomUUID(), at: new Date().toISOString(), experiment: 'E14', mode: 'external-answers', repeats: rounds.length,
    replayer: {model: given.model ?? null, operator: given.operator ?? null, lineage: given.lineage ?? null,
      isolation, attestedBy: given.attested_by ?? null, promptOrder: given.prompt_order ?? null},
    measures: isolation === 'fresh-context-per-prompt' ? 'transmitted memory, as designed'
      : isolation === 'shared-context' ? 'within-context carry-over, not transmitted memory: every prompt was read in one window'
      : 'unknown: the answer file does not say whether each prompt was answered in a fresh context, so it cannot be read as either',
    archiveHash: hash(archive), summary: summarise(calls),
    byRound: Object.fromEntries(rounds.map((round, i) => ['round-' + (i + 1), summarise(calls.filter(c => c.round === i + 1))])), calls};
  writeFileSync(runs + `e14-external-${report.id}.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({report: `e14-external-${report.id}.json`, summary: report.summary}, null, 2));
} else {
  mkdirSync(empty, {recursive: true});
  const report = {id: randomUUID(), at: new Date().toISOString(), experiment: 'E14', model, archiveHash: hash(archive), repeats,
    design: 'Three tasks of one register whose conventions live only in the archive; four conditions; the whole set replayed ' + repeats + ' times; every call stateless, tools disabled, no retry on an invalid answer.',
    archiveVerifiedOnPreviousEntry: verified, planHash: hash(plan.map(p => p.id)), calls: []};
  for (let round = 1; round <= repeats; round++) for (const {id, task, condition, prompt} of plan) {
    const call = {id, round, task: task.id, condition, promptHash: hash(prompt), promptChars: prompt.length};
    try {
      const answer = ask(prompt);
      call.ms = answer.ms; call.modelUsage = answer.modelUsage; call.rawAnswer = answer.text.slice(0, 4000);
      call.recipe = extract(answer.text);
      call.score = scoreFields(task, call.recipe);
      call.status = 'scored';
    } catch (error) { call.status = 'invalid-output'; call.error = String(error.message).slice(0, 400); }
    report.calls.push(call);
    console.log(`${('r' + round).padEnd(4)} ${call.status.padEnd(14)} ${call.task.padEnd(17)} ${call.condition.padEnd(13)} spec ${call.score ? call.score.derivable.passed + '/' + call.score.derivable.total : '-'} · convention ${call.score ? call.score.convention.passed + '/' + call.score.convention.total : '-'} ${call.ms ?? ''}ms`);
    writeFileSync(runs + `e14-${report.id}.json`, JSON.stringify(report, null, 2));
  }
  report.summary = summarise(report.calls);
  report.byRound = Object.fromEntries(Array.from({length: repeats}, (unused, i) => ['round-' + (i + 1), summarise(report.calls.filter(c => c.round === i + 1))]));
  report.finishedAt = new Date().toISOString();
  writeFileSync(runs + `e14-${report.id}.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({report: `e14-${report.id}.json`, summary: report.summary, invalid: report.calls.filter(c => c.status === 'invalid-output').length}, null, 2));
}
