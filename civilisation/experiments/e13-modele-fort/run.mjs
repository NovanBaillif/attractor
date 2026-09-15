// E13 — Replay of experiments E2 to E5 on a stronger model, with the material of 13 September unchanged.
// The tasks, memories, prompts and scoring come from civilisation/*.mjs; only the model changes: instead of the
// local Qwen3 4B through Ollama, one stateless call per condition to Claude through its command line, with tools
// disabled, an empty working directory and a minimal system prompt.
//   node civilisation/experiments/e13-modele-fort/run.mjs transmission|ablation|authored [--model sonnet]
// Writes data/civilisation/runs/e13-<mode>-<uuid>.json. Never reads a previous answer into a later prompt.
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {memoryFrom, promptFor, score, schedule} from '../../transmission-task.mjs';
import {selectMemory, ablationSchedule} from '../../ablation.mjs';
import {authoredSchedule, authorEvidence, authorPrompt, validateNote} from '../../authored-memory.mjs';
import {hash} from '../../../registry/recipes.mjs';

const CLAUDE = 'C:/Users/Utilisateur/.vscode/extensions/anthropic.claude-code-2.1.272-win32-x64/resources/native-binary/claude.exe';
const SYSTEM = 'You transform JSON specifications into JSON. Answer with one JSON object and nothing else.';
const runs = fileURLToPath(new URL('../../../data/civilisation/runs/', import.meta.url));
const empty = fileURLToPath(new URL('./empty/', import.meta.url));
const mode = process.argv[2];
const model = (process.argv.find(a => a.startsWith('--model=')) || '--model=sonnet').slice('--model='.length);
if (!['transmission', 'ablation', 'authored'].includes(mode)) throw Error('Usage: transmission | ablation | authored');
mkdirSync(empty, {recursive: true});

const read = name => JSON.parse(readFileSync(runs + name, 'utf8'));
const source = read('2d6411d2-84e9-43b1-910f-e9604e2a0830.json');
const failed = read('499dcc78-19cd-4b27-aee5-534fdd915fc3.json');
let memory = memoryFrom(source, failed);
let evidence = null;
if (mode === 'authored') { const {reasons, ...rest} = memory; void reasons; memory = rest; evidence = authorEvidence(source, failed); }
const plan = mode === 'ablation' ? ablationSchedule() : mode === 'authored' ? authoredSchedule() : schedule();

// One stateless call: no session reuse, no tools, no project context.
function ask(prompt) {
  const started = Date.now();
  const r = spawnSync(CLAUDE, ['-p', '--model', model, '--output-format', 'json', '--max-turns', '1',
    '--system-prompt', SYSTEM, '--exclude-dynamic-system-prompt-sections', '--no-session-persistence',
    '--disallowedTools', 'Bash,Read,Write,Edit,Glob,Grep,Task,WebFetch,WebSearch,NotebookEdit'],
    {cwd: empty, input: prompt, encoding: 'utf8', maxBuffer: 1 << 26, timeout: 300000});
  if (r.error) throw r.error;
  const envelope = JSON.parse(r.stdout);
  return {text: envelope.result ?? '', ms: Date.now() - started, usage: envelope.usage, modelUsage: Object.keys(envelope.modelUsage ?? {})};
}
// The answer must contain one JSON object; fenced blocks and surrounding prose are tolerated, nothing else is.
function extract(text) {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const body = fenced ? fenced[1] : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  return JSON.parse(body);
}

const report = {id: randomUUID(), at: new Date().toISOString(), experiment: 'E13', mode, model, replaces: 'E2, E3, E4 of 13/09/2026 (Qwen3 4B)',
  design: 'Same tasks, memories, prompts and scoring as 13/09; one stateless call per condition; tools disabled; no retry on an invalid answer.',
  memoryHash: hash(memory), calls: []};
const protocol = plan.map(({task, condition}) => ({task: task.id, condition}));
report.protocolHash = hash(protocol);

for (const {task, condition} of plan) {
  const prompt = condition === 'author' ? authorPrompt(evidence)
    : promptFor(task, condition === 'control' ? null : mode === 'ablation' ? selectMemory(memory, condition) : selectMemory(memory, 'memory'));
  const call = {task: task.id, condition, promptHash: hash(prompt), promptChars: prompt.length};
  try {
    const answer = ask(prompt);
    call.ms = answer.ms; call.outputChars = answer.text.length; call.modelUsage = answer.modelUsage;
    call.rawAnswer = answer.text.slice(0, 4000);
    const value = extract(answer.text);
    if (condition === 'author') { call.note = validateNote(value); memory = {...memory, note: call.note}; call.status = 'note-recorded'; }
    else {
      call.recipe = value;
      call.tests = score(task, value);
      call.passed = call.tests.filter(t => t.passed).length;
      call.total = call.tests.length;
      call.status = 'scored';
    }
  } catch (error) { call.status = 'invalid-output'; call.error = String(error.message).slice(0, 400); call.rawAnswer = (call.rawAnswer ?? '').slice(0, 4000); }
  report.calls.push(call);
  console.log(`${call.status.padEnd(14)} ${call.task.padEnd(16)} ${call.condition.padEnd(13)} ${call.passed ?? ''}${call.total ? '/' + call.total : ''} ${call.ms ?? ''}ms`);
  writeFileSync(runs + `e13-${mode}-${report.id}.json`, JSON.stringify(report, null, 2));
}
const scored = report.calls.filter(c => c.status === 'scored');
report.summary = Object.fromEntries([...new Set(scored.map(c => c.condition))].map(condition => {
  const own = scored.filter(c => c.condition === condition);
  return [condition, `${own.reduce((a, c) => a + c.passed, 0)}/${own.reduce((a, c) => a + c.total, 0)}`];
}));
report.finishedAt = new Date().toISOString();
writeFileSync(runs + `e13-${mode}-${report.id}.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({report: `e13-${mode}-${report.id}.json`, summary: report.summary, invalid: report.calls.filter(c => c.status === 'invalid-output').length}));
