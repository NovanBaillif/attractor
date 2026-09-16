// One fresh Codex CLI invocation per frozen prompt. The orchestrator reads the pack;
// the model receives the prompt text only through stdin.
// Usage: node civilisation/experiments/run-codex-fresh.mjs E15
import {createHash, randomUUID} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const experiment = (process.argv[2] ?? '').toUpperCase();
const packs = {
  E14: resolve(here, 'e14-taches-dures/prompts.json'),
  E15: resolve(here, 'e15-archive-fausse/prompts.json')
};
if (!packs[experiment]) throw new Error('Usage: node run-codex-fresh.mjs E14|E15');
const binary = 'C:/Users/Utilisateur/.vscode/extensions/openai.chatgpt-26.5908.31748-win32-x64/bin/windows-x86_64/codex.exe';
if (!existsSync(binary)) throw new Error('Codex CLI from the extension is unavailable.');
const packBytes = readFileSync(packs[experiment]);
const pack = JSON.parse(packBytes);
const runId = `${experiment.toLowerCase()}-codex-fresh-${randomUUID()}`;
const root = resolve(here, '../data/civilisation/codex-fresh', runId);
const empty = resolve(root, 'empty');
mkdirSync(empty, {recursive: true});
const hash = value => createHash('sha256').update(value).digest('hex');
const meta = {
  id: runId, experiment, startedAt: new Date().toISOString(),
  cli: binary, cliVersion: null, model: 'Codex CLI default (reported in event logs when available)',
  lineage: 'openai/codex', operator: 'projet', isolation: 'fresh-context-per-prompt',
  attested_by: 'agent-self-report',
  prompt_order: pack.prompts.map(item => item.id),
  pack: {file: packs[experiment], sha256: hash(packBytes), prompts: pack.prompts.map(item => ({id: item.id, sha256: hash(item.prompt), chars: item.prompt.length}))},
  controls: {
    session: 'one --ephemeral process per prompt; no resume or shared thread',
    workspace: 'fresh empty directory per run; prompts are sent on stdin by the orchestrator',
    sandbox: 'read-only',
    config: 'user configuration and project rules ignored',
    caveat: 'The installed CLI exposes no no-tools switch. Its read-only sandbox and empty workspace prevent repository access; event logs are retained to disclose any tool attempt.'
  },
  calls: [], answers: {}
};
const version = spawnSync(binary, ['--version'], {encoding: 'utf8', windowsHide: true});
meta.cliVersion = version.stdout.trim() || version.stderr.trim() || null;
for (const item of pack.prompts) {
  const output = resolve(root, `${item.id.replaceAll(':', '__')}.txt`);
  const log = resolve(root, `${item.id.replaceAll(':', '__')}.jsonl`);
  const args = ['exec', '--ephemeral', '--ignore-user-config', '--ignore-rules', '--skip-git-repo-check',
    '--sandbox', 'read-only', '--cd', empty, '--json', '--output-last-message', output, '-'];
  const started = Date.now();
  // The VS Code extension's executable needs its genuine Windows profile even
  // when this orchestrator is sandboxed. This is process configuration only;
  // the model still starts in `empty` with a read-only sandbox.
  const run = spawnSync(binary, args, {input: item.prompt, encoding: 'utf8', windowsHide: true,
    env: {...process.env, USERPROFILE: 'C:\\Users\\Utilisateur', HOMEDRIVE: 'C:', HOMEPATH: '\\Users\\Utilisateur'},
    timeout: 300000, maxBuffer: 8 * 1024 * 1024});
  writeFileSync(log, run.stdout ?? '');
  const call = {id: item.id, promptSha256: hash(item.prompt), startedAt: new Date(started).toISOString(),
    ms: Date.now() - started, exitCode: run.status, signal: run.signal ?? null, stderr: run.stderr || null,
    eventLog: log};
  let raw = null;
  try { raw = readFileSync(output, 'utf8'); } catch { /* invalid response is retained below */ }
  call.rawAnswer = raw;
  try {
    const answer = JSON.parse(raw);
    if (!answer || Array.isArray(answer) || !Array.isArray(answer.fields)) throw new Error('expected a JSON object with fields array');
    meta.answers[item.id] = answer;
    call.status = 'valid-json';
  } catch (error) {
    call.status = 'invalid-output';
    call.error = String(error.message);
  }
  meta.calls.push(call);
  writeFileSync(resolve(root, 'run.json'), JSON.stringify(meta, null, 2) + '\n');
  console.log(`${item.id}: ${call.status} (${call.ms} ms)`);
}
meta.finishedAt = new Date().toISOString();
meta.summary = {total: meta.calls.length, valid: meta.calls.filter(call => call.status === 'valid-json').length,
  invalid: meta.calls.filter(call => call.status !== 'valid-json').length};
writeFileSync(resolve(root, 'run.json'), JSON.stringify(meta, null, 2) + '\n');
console.log(JSON.stringify({run: resolve(root, 'run.json'), summary: meta.summary}, null, 2));
